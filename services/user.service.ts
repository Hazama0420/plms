// services/user.service.ts - TAMBAHKAN

import { supabase } from "@/lib/supabase/client";
import type { UserRole, UserWithRole } from "@/types/user.types";

export const userService = {
  // ... existing methods (getProfile, updateProfile, updatePassword, uploadAvatar)

  /**
   * Ambil semua user dengan role (hanya untuk admin/super_admin)
   */
  async getAllUsers(): Promise<UserWithRole[]> {
    const { data, error } = await supabase
      .from("users")
      .select("id, email, full_name, avatar_url, role, created_at, updated_at")
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return data as UserWithRole[];
  },

  /**
   * Ambil user by ID dengan role
   */
  async getUserById(id: string): Promise<UserWithRole | null> {
    const { data, error } = await supabase
      .from("users")
      .select("id, email, full_name, avatar_url, role, created_at, updated_at")
      .eq("id", id)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data as UserWithRole | null;
  },

  /**
   * Update role user (hanya super_admin)
   */
  async updateUserRole(userId: string, role: UserRole): Promise<UserWithRole> {
    const { data, error } = await supabase
      .from("users")
      .update({ role, updated_at: new Date().toISOString() })
      .eq("id", userId)
      .select("id, email, full_name, avatar_url, role, created_at, updated_at")
      .single();

    if (error) throw new Error(error.message);
    return data as UserWithRole;
  },

  /**
   * Delete user (hanya super_admin)
   */
  async deleteUser(userId: string): Promise<void> {
    const { error } = await supabase.from("users").delete().eq("id", userId);
    if (error) throw new Error(error.message);
  },

  /**
   * Ambil role user saat ini
   */
  async getCurrentUserRole(): Promise<UserRole | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data?.role as UserRole || null;
  },
};