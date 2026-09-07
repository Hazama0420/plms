// app/api/admin/logs/route.ts
//
// Endpoint DELETE untuk Super Admin menghapus log aktivitas CRM.
//
// Daftar aktivitas (`crm_activities`) adalah audit trail operasional — hapus
// permanen hanya untuk Super Admin, dengan jejak melalui notifikasi sehingga
// aksi tercatat tanpa menyentuh schema (kolom `lead_id` NOT NULL memblokir
// insert log audit tanpa lead dummy).

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAudit } from "@/lib/audit-log";

export async function DELETE(req: Request) {
  const auth = await requireRole(["super_admin"]);
  if (!auth.ok) return auth.response;

  try {
    const { ids } = await req.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "IDs wajib array non-kosong." },
        { status: 400 }
      );
    }

    // Batas 500 per panggilan — pagar ukuran payload. Super Admin bisa panggil
    // ulang untuk batch lebih besar kalau perlu.
    if (ids.length > 500) {
      return NextResponse.json(
        { error: "Maksimal 500 ID per panggilan." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Hapus permanen — user sudah konfirmasi di UI
    const { error } = await supabase.from("crm_activities").delete().in("id", ids);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Jejak audit ke admin_audit_log (migrasi 011) — tabel append-only yang
    // tidak bisa dihapus lewat PostgREST oleh siapa pun.
    await recordAudit({
      actor: auth.ctx,
      action: "logs.delete",
      detail: { count: ids.length },
    });

    // Notifikasi lonceng untuk Super Admin yang menghapus. Dipertahankan meski
    // catatan auditnya kini ada di tabel sendiri: ini konfirmasi yang terlihat
    // pengguna, bukan jejak audit.
    await supabase.from("notifications").insert({
      user_id: auth.ctx.userId,
      sender_id: auth.ctx.userId,
      type: "announcement",
      title: "Log Aktivitas Dihapus",
      message: `Super Admin menghapus ${ids.length} baris log aktivitas CRM.`,
      link: "/admin/logs",
    });

    return NextResponse.json({ success: true, deleted: ids.length });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error("[admin/logs DELETE] Gagal menghapus log:", detail);
    return NextResponse.json({ error: detail }, { status: 500 });
  }
}
