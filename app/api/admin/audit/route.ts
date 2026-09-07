// app/api/admin/audit/route.ts
//
// Membaca jejak audit aksi administratif (public.admin_audit_log, migrasi 011).
//
// Hanya Super Admin. Sengaja lewat Route Handler dan bukan PostgREST langsung
// dari peramban: nama pelaku dan sasaran diambil dari public.users, dan baris
// sasaran untuk aksi 'user.delete' sudah tidak ada — penyusunannya lebih jelas
// dikerjakan di server sekali daripada ditambal di setiap pemanggil.

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";

/** Sama dengan tab aktivitas CRM di /admin/logs supaya terasa satu halaman. */
const PAGE_SIZE = 50;

export async function GET(req: NextRequest) {
  const auth = await requireRole(["super_admin"]);
  if (!auth.ok) return auth.response;

  try {
    const pageParam = req.nextUrl.searchParams.get("page");
    const parsed = pageParam ? parseInt(pageParam, 10) : 1;
    const page = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
    const offset = (page - 1) * PAGE_SIZE;

    // Service role: tabelnya punya policy SELECT untuk super_admin, tetapi
    // route ini juga membaca public.users untuk melengkapi nama pelaku —
    // memakai satu klien yang sama menghindari dua perilaku RLS berbeda dalam
    // satu respons.
    const admin = createAdminClient();

    const { data, error, count } = await admin
      .from("admin_audit_log")
      .select(
        "id, actor_id, actor_email, actor_role, action, target_id, target_email, target_role, detail, created_at",
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const rows = data ?? [];

    // Nama lengkap dan avatar dilengkapi dari public.users lewat satu query
    // untuk seluruh halaman, bukan embed PostgREST: actor_id bernilai null
    // setelah akun pelakunya dihapus (on delete set null), dan target_id tidak
    // punya foreign key sama sekali — embed akan gagal menampilkan keduanya.
    const ids = Array.from(
      new Set(
        rows
          .flatMap((row) => [row.actor_id, row.target_id])
          .filter((value): value is string => Boolean(value))
      )
    );

    const profiles = new Map<string, { full_name: string | null; avatar_url: string | null }>();

    if (ids.length > 0) {
      const { data: users } = await admin
        .from("users")
        .select("id, full_name, avatar_url")
        .in("id", ids);

      (users ?? []).forEach((user) => {
        profiles.set(user.id, {
          full_name: user.full_name ?? null,
          avatar_url: user.avatar_url ?? null,
        });
      });
    }

    const enriched = rows.map((row) => ({
      ...row,
      actor_name: (row.actor_id && profiles.get(row.actor_id)?.full_name) || null,
      actor_avatar: (row.actor_id && profiles.get(row.actor_id)?.avatar_url) || null,
      target_name: (row.target_id && profiles.get(row.target_id)?.full_name) || null,
    }));

    return NextResponse.json({
      success: true,
      data: enriched,
      count: count ?? 0,
      page,
      pageSize: PAGE_SIZE,
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error("[admin/audit GET] Gagal membaca jejak audit:", detail);
    return NextResponse.json({ success: false, error: detail }, { status: 500 });
  }
}
