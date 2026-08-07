// services/user.service.ts - TAMBAHKAN

import { supabase } from "@/lib/supabase/client";
import type { UserRole, UserWithRole } from "@/types/user.types";

const USER_SELECT = "id, email, full_name, avatar_url, role, status, is_approved, created_at, updated_at";

export const userService = {
  // ... existing methods (getProfile, updateProfile, updatePassword, uploadAvatar)

  /**
   * Ambil semua user dengan role (hanya untuk admin/super_admin)
   */
  async getAllUsers(): Promise<UserWithRole[]> {
    const { data, error } = await supabase
      .from("users")
      .select(USER_SELECT)
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
      .select(USER_SELECT)
      .eq("id", id)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data as UserWithRole | null;
  },

  /**
   * Ubah role seorang pengguna. Hanya super_admin.
   *
   * Lewat API Route, bukan PostgREST langsung. Versi sebelumnya menulis
   * `.from("users").update({ role })` dari peramban, sehingga pemeriksaan
   * "hanya super_admin yang dapat mengubah role" di app/api/admin/users/route.ts
   * tidak pernah dijalankan — seorang admin bisa menaikkan pangkat dirinya
   * sendiri atau menurunkan pangkat super_admin. Migrasi 010 menutupnya di
   * basis data; pengalihan ini yang membuat galatnya terbaca sebagai pesan
   * wewenang, bukan pelanggaran constraint.
   */
  async updateUserRole(userId: string, role: UserRole): Promise<UserWithRole> {
    const res = await fetch("/api/admin/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, role }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Gagal memperbarui role pengguna.");
    return json.data as UserWithRole;
  },

  /**
   * Setujui / tolak / nonaktifkan seorang pengguna.
   *
   * Lewat API Route, bukan PostgREST langsung: `status` dan `is_approved`
   * dijaga trigger di database, sehingga hanya admin/super_admin yang
   * diakui handler-nya sendiri yang boleh menulisnya.
   */
  async updateUserStatus(
    userId: string,
    payload: { status?: string; is_approved?: boolean }
  ): Promise<UserWithRole> {
    const res = await fetch("/api/admin/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, ...payload }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Gagal memperbarui status pengguna.");
    return json.data as UserWithRole;
  },

  /**
   * Hapus akun secara permanen. Hanya super_admin, dan tidak pernah terhadap
   * akun super_admin lain.
   *
   * Lewat /api/admin/users/delete: penghapusan harus menyentuh auth.users dan
   * melepas relasi foreign key di properties/crm_*, dan itu butuh service role.
   * Versi sebelumnya memanggil PostgREST langsung — 007 tidak memasang policy
   * DELETE pada public.users, jadi jalur itu memang tidak pernah bisa berhasil.
   */
  async deleteUser(userId: string): Promise<void> {
    const res = await fetch("/api/admin/users/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUserId: userId }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Gagal menghapus pengguna.");
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