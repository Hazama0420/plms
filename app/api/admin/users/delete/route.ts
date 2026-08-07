// app/api/admin/users/delete/route.ts
//
// Penghapusan akun permanen: melepas relasi di tabel operasional, menghapus
// baris public.users, lalu menghapus akun auth.users.
//
// Otorisasi lewat requireRole(["super_admin"]) di lib/api-auth.ts. Versi
// sebelumnya membangun klien sesi sendiri dan mencocokkan role secara manual —
// jalur itu melewatkan pemeriksaan status akun yang dilakukan getAuthContext().

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAudit } from "@/lib/audit-log";

export async function POST(req: Request) {
  const auth = await requireRole(["super_admin"]);
  if (!auth.ok) return auth.response;

  try {
    const { targetUserId } = await req.json();

    if (!targetUserId) {
      return NextResponse.json({ error: "Target User ID wajib diisi" }, { status: 400 });
    }

    if (auth.ctx.userId === targetUserId) {
      return NextResponse.json(
        { error: "Anda tidak dapat menghapus akun Anda sendiri!" },
        { status: 400 }
      );
    }

    const supabaseAdmin = createAdminClient();

    // Lindungi akun Super Admin.
    //
    // Role target dibaca dengan service role, bukan dengan klien sesi: policy
    // users_select memang mengizinkan orang dalam membaca baris ini, tetapi
    // keputusan otorisasi tidak boleh bergantung pada policy yang bisa berubah.
    //
    // Berlaku juga bagi Super Admin lain. Role ini memegang seluruh kewenangan
    // sistem, dan penghapusannya menyentuh auth.users — tidak bisa dibatalkan.
    // Bila memang perlu dihapus, turunkan rolenya lebih dulu lewat
    // PUT /api/admin/users.
    const { data: targetProfile, error: targetError } = await supabaseAdmin
      .from("users")
      .select("id, email, role")
      .eq("id", targetUserId)
      .maybeSingle();

    if (targetError) {
      return NextResponse.json(
        { error: `Gagal memeriksa akun target: ${targetError.message}` },
        { status: 500 }
      );
    }

    if (!targetProfile) {
      return NextResponse.json({ error: "Pengguna tidak ditemukan." }, { status: 404 });
    }

    const targetRole = (targetProfile.role || "").toLowerCase();
    if (targetRole === "super_admin" || targetRole === "superadmin") {
      return NextResponse.json(
        {
          error:
            "Akun Super Admin tidak dapat dihapus. Turunkan rolenya lebih dulu bila memang perlu dihapus.",
        },
        { status: 403 }
      );
    }

    // Unassign / Lepaskan relasi Foreign Key di berbagai tabel
    try {
      await supabaseAdmin.from("properties").update({ assigned_to: null }).eq("assigned_to", targetUserId);
      await supabaseAdmin.from("crm_leads").update({ assigned_to: null }).eq("assigned_to", targetUserId);
      await supabaseAdmin.from("crm_followups").update({ assigned_to: null }).eq("assigned_to", targetUserId);
      await supabaseAdmin.from("crm_activities").update({ assigned_to: null }).eq("assigned_to", targetUserId);
    } catch (e) {
      console.warn("Unassign FK minor notice:", e);
    }

    // Hapus data di public.users terlebih dahulu
    const { error: publicDeleteError } = await supabaseAdmin
      .from("users")
      .delete()
      .eq("id", targetUserId);

    if (publicDeleteError) {
      console.error("Gagal hapus dari public.users:", publicDeleteError.message);
      return NextResponse.json(
        { error: `Gagal menghapus profil tabel users: ${publicDeleteError.message}` },
        { status: 500 }
      );
    }

    // Hapus User dari Auth Supabase (auth.users)
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);

    if (deleteAuthError) {
      console.error("Gagal hapus dari auth.users:", deleteAuthError.message || deleteAuthError);
      return NextResponse.json(
        {
          error:
            deleteAuthError.message ||
            "Gagal menghapus akun autentikasi dari auth.users",
        },
        { status: 500 }
      );
    }

    // Dicatat setelah penghapusan berhasil, dan sengaja menyalin email serta
    // role target: barisnya sudah tidak ada, jadi tanpa salinan ini catatan
    // auditnya hanya berisi sebuah uuid tanpa arti.
    await recordAudit({
      actor: auth.ctx,
      action: "user.delete",
      targetId: targetUserId,
      targetEmail: targetProfile.email,
      targetRole: targetProfile.role,
      detail: { permanent: true, auth_user_deleted: true },
    });

    return NextResponse.json({
      success: true,
      message: "User berhasil dihapus secara permanen dari sistem.",
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error("API User Delete Exception:", detail);
    return NextResponse.json({ error: detail }, { status: 500 });
  }
}
