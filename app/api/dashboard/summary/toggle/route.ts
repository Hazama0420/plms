// app/api/dashboard/summary/toggle/route.ts
//
// Menyalakan / mematikan fitur ringkasan AI di dashboard.
//
// Otorisasi lewat requireRole() di lib/api-auth.ts, bukan pemeriksaan buatan
// sendiri. Versi sebelumnya membaca role langsung dari tabel users dan
// mencocokkannya dengan daftar ejaan manual, sehingga melewatkan pemeriksaan
// status akun yang dilakukan getAuthContext(): admin yang sudah dinonaktifkan
// (`status = 'suspended'`) tetap lolos dan masih bisa mematikan fitur AI
// untuk semua orang.

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { recordAudit } from "@/lib/audit-log";

export async function POST(req: Request) {
  const auth = await requireRole(["super_admin", "admin"]);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const enabled = Boolean(body.enabled);

    // Tetap memakai klien sesi, bukan service role: penulisannya sudah
    // berjalan lewat jalur ini dan tidak ada alasan menaikkan hak aksesnya.
    const { error: dbError } = await auth.ctx.supabase.from("system_settings").upsert(
      {
        key: "ai_summary_enabled",
        value: enabled ? "true" : "false",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" }
    );

    if (dbError) {
      console.error("Gagal menyimpan ke system_settings:", dbError);
      return NextResponse.json(
        { error: "Gagal menyimpan konfigurasi ke database." },
        { status: 500 }
      );
    }

    await recordAudit({
      actor: auth.ctx,
      action: "settings.ai_toggle",
      detail: { key: "ai_summary_enabled", enabled },
    });

    return NextResponse.json({ success: true, enabled });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error("[dashboard/summary/toggle] Gagal:", detail);
    return NextResponse.json({ error: detail }, { status: 500 });
  }
}
