// hooks/use-user.ts
"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";

// ============================================================
// TIPE DATA USER (gabungan dari Auth + Tabel users)
// ============================================================
export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  role: string;
  phone?: string | null;
  avatar_url?: string | null;
  company?: string | null;
  created_at: string;
  updated_at: string;
}

export interface UseUserReturn {
  user: (SupabaseUser & Partial<UserProfile>) | null;
  profile: UserProfile | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

// ============================================================
// HOOK
// ============================================================
export function useUser(): UseUserReturn {
  const [user, setUser] = useState<(SupabaseUser & Partial<UserProfile>) | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchUser = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 1. Ambil auth user dari Supabase
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authData.user) {
        setUser(null);
        setProfile(null);
        return;
      }

      // 2. Ambil profile dari tabel users
      const { data: profileData, error: profileError } = await supabase
        .from("users")
        .select("*")
        .eq("id", authData.user.id)
        .single();

      if (profileError && profileError.code !== "PGRST116") {
        // PGRST116 = not found, biarkan profile null
        console.warn("Profile not found for user:", profileError);
      }

      // 3. Gabungkan auth user + profile
      const mergedUser = {
        ...authData.user,
        full_name: profileData?.full_name || authData.user.user_metadata?.full_name || "",
        role: profileData?.role || "viewer",
        phone: profileData?.phone || null,
        avatar_url: profileData?.avatar_url || authData.user.user_metadata?.avatar_url || null,
        company: profileData?.company || null,
        created_at: profileData?.created_at || authData.user.created_at,
        updated_at: profileData?.updated_at || authData.user.updated_at,
      };

      setUser(mergedUser);
      setProfile(profileData || null);
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error("Failed to fetch user");
      setError(errorObj);
      setUser(null);
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ===== AUTO FETCH =====
  useEffect(() => {
    fetchUser();

    // ===== LISTEN AUTH CHANGES =====
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
          await fetchUser();
        } else if (event === "SIGNED_OUT") {
          setUser(null);
          setProfile(null);
          setIsLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [fetchUser]);

  return {
    user,
    profile,
    isLoading,
    error,
    refetch: fetchUser,
  };
}