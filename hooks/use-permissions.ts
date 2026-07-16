"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useUser } from "./use-user";
import type { UserRole } from "@/types/user.types";

export function usePermissions() {
  const { user, isLoading: userLoading } = useUser();
  const [userRole, setUserRole] = useState<UserRole>("viewer");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchRole() {
      if (!user) {
        setUserRole("viewer");
        setIsLoading(false);
        return;
      }

      try {
        // Coba ambil role
        let { data, error } = await supabase
          .from("users")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();

        // Jika data tidak ada, insert dulu
        if (!data && !error) {
          const { data: newUser, error: insertError } = await supabase
            .from("users")
            .insert({
              id: user.id,
              email: user.email,
              full_name: user.user_metadata?.full_name || "",
              avatar_url: user.user_metadata?.avatar_url || "",
              role: "viewer",
            })
            .select("role")
            .single();

          if (!insertError && newUser) {
            data = newUser;
          }
        }

        setUserRole((data?.role as UserRole) || "viewer");
      } catch (err) {
        console.warn("Error fetching role:", err);
        setUserRole("viewer");
      } finally {
        setIsLoading(false);
      }
    }

    if (!userLoading) {
      fetchRole();
    }
  }, [user, userLoading]);

  return {
    isLoading: userLoading || isLoading,
    userRole,
    isSuperAdmin: userRole === "super_admin",
    isAdmin: userRole === "admin" || userRole === "super_admin",
    isAgent: userRole === "agent" || userRole === "admin" || userRole === "super_admin",
    isMarketing: userRole === "marketing" || userRole === "agent" || userRole === "admin" || userRole === "super_admin",
  };
}