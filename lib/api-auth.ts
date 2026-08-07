// lib/api-auth.ts
//
// Lapisan penjaga (guard) untuk Route Handler.
//
// Next.js secara eksplisit menyarankan agar Proxy TIDAK dijadikan satu-satunya
// lapisan keamanan — pengecekan harus dilakukan sedekat mungkin dengan sumber
// data. File ini menyediakan pengecekan tersebut untuk seluruh route /api.
//
// Selalu memakai supabase.auth.getUser() (memverifikasi token ke server Auth),
// BUKAN getSession() yang hanya membaca cookie tanpa verifikasi.

import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerClientInstance } from "@/lib/supabase/server";
import { hasPermission, isBlockedStatus, normalizeRole } from "@/lib/permissions";
import type { Permission, UserRole } from "@/types/user.types";

export { normalizeRole };

export interface AuthContext {
  supabase: SupabaseClient;
  userId: string;
  email: string | null;
  role: UserRole;
}

export type GuardResult =
  | { ok: true; ctx: AuthContext }
  | { ok: false; response: NextResponse };

function unauthorized(message = "Sesi tidak valid atau telah berakhir.") {
  return NextResponse.json({ success: false, error: message }, { status: 401 });
}

function forbidden(message = "Anda tidak memiliki akses ke sumber daya ini.") {
  return NextResponse.json({ success: false, error: message }, { status: 403 });
}

/**
 * Mengambil user terverifikasi beserta role-nya, atau null bila tidak login.
 * Dipakai untuk endpoint publik yang perilakunya berbeda saat user login.
 */
export async function getAuthContext(): Promise<AuthContext | null> {
  const supabase = await createServerClientInstance();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("role, status")
    .eq("id", user.id)
    .maybeSingle();

  // Akun yang belum disetujui admin (atau dinonaktifkan) diperlakukan sama
  // dengan tamu: seluruh guard di bawah menerjemahkan null menjadi 401.
  if (isBlockedStatus(profile?.status)) {
    return null;
  }

  return {
    supabase,
    userId: user.id,
    email: user.email ?? null,
    role: normalizeRole(profile?.role ?? user.user_metadata?.role),
  };
}

/**
 * Wajib login.
 *
 *   const auth = await requireAuth();
 *   if (!auth.ok) return auth.response;
 *   const { supabase, userId, role } = auth.ctx;
 */
export async function requireAuth(): Promise<GuardResult> {
  const ctx = await getAuthContext();
  if (!ctx) return { ok: false, response: unauthorized() };
  return { ok: true, ctx };
}

/** Wajib login DAN memiliki salah satu role yang diizinkan. */
export async function requireRole(allowed: UserRole[]): Promise<GuardResult> {
  const auth = await requireAuth();
  if (!auth.ok) return auth;

  if (!allowed.includes(auth.ctx.role)) {
    return {
      ok: false,
      response: forbidden(
        `Aksi ini hanya untuk: ${allowed.join(", ")}. Role Anda: ${auth.ctx.role}.`
      ),
    };
  }
  return auth;
}

/** Wajib login DAN memiliki permission tertentu. */
export async function requirePermission(
  permission: Permission
): Promise<GuardResult> {
  const auth = await requireAuth();
  if (!auth.ok) return auth;

  if (!hasPermission(auth.ctx.role, permission)) {
    return {
      ok: false,
      response: forbidden(`Role Anda tidak memiliki izin "${permission}".`),
    };
  }
  return auth;
}
