// app/api/auth/agent-registered/route.ts
//
// Notifikasi untuk admin: ada permohonan agen baru yang menunggu persetujuan.
//
// Dipanggil oleh /register/agent segera setelah signUp() berhasil. Rute ini
// TIDAK dapat memakai requireAuth(): akun yang baru mendaftar berstatus
// "pending", dan gerbang status di getAuthContext() menolaknya — justru itulah
// keadaan yang hendak dilaporkan ke admin. Karena itu satu-satunya isi yang
// diterima adalah `userId`, dan route memverifikasinya sendiri ke tabel `users`
// sebelum mengirim apa pun.
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminRecipientIds, notifyEvent } from "@/lib/notification-helper";
import { validate } from "@/lib/validations";
import { z } from "zod";

const agentRegisteredSchema = z.object({ userId: z.string().uuid() });

export async function POST(req: Request) {
  try {
    const parsed = validate(agentRegisteredSchema, await req.json());
    if (!parsed.ok) return parsed.response;

    const { userId } = parsed.data;
    const supabaseAdmin = createAdminClient();

    // Verifikasi bahwa userId benar-benar baris agen pending yang sah.
    const { data: agent, error: agentError } = await supabaseAdmin
      .from("users")
      .select("id, full_name, email, role, status")
      .eq("id", userId)
      .maybeSingle();

    if (agentError) {
      throw new Error("Gagal membaca data pendaftar: " + agentError.message);
    }

    if (!agent) {
      return NextResponse.json(
        { success: false, error: "Pengguna tidak ditemukan." },
        { status: 404 }
      );
    }

    if (agent.role !== "agent") {
      return NextResponse.json(
        { success: false, error: "Hanya pendaftaran agen yang dilaporkan lewat rute ini." },
        { status: 400 }
      );
    }

    // Sudah tidak pending = sudah pernah disetujui/ditolak. Notifikasi hanya
    // dikirim sekali saat pertama kali mendaftar, bukan setiap halaman dimuat.
    if (agent.status !== "pending") {
      return NextResponse.json({
        success: true,
        note: "Akun ini sudah tidak berstatus pending. Notifikasi tidak dikirim ulang.",
      });
    }

    const adminIds = await getAdminRecipientIds(supabaseAdmin);

    if (adminIds.length === 0) {
      // Bukan kegagalan fatal: barisnya sudah tersimpan dan akun ada di antrean
      // persetujuan. Notifikasi yang tidak sampai lebih baik daripada pendaftaran
      // yang terblokir.
      console.warn("[agent-registered] Tidak ada admin yang menerima notifikasi.");
      return NextResponse.json({
        success: true,
        note: "Pendaftaran berhasil, tetapi notifikasi tidak dapat dikirim (tidak ada admin).",
      });
    }

    const agentName = agent.full_name?.trim() || agent.email?.split("@")[0] || "Agen Baru";

    const result = await notifyEvent({
      event: "account.registered",
      userIds: adminIds,
      title: "Permohonan Agen Baru",
      message: `${agentName} mendaftar sebagai agen dan menunggu persetujuan Anda.`,
      link: "/admin/users",
      senderId: userId,
    });

    if (!result.success) {
      // Sama seperti di atas: barisnya sudah ada, jadi kegagalan notifikasi
      // tidak boleh membuat pendaftaran terlihat gagal.
      console.error("[agent-registered] Gagal mengirim notifikasi:", result.error);
      return NextResponse.json({
        success: true,
        note: "Pendaftaran berhasil, tetapi notifikasi gagal dikirim.",
      });
    }

    return NextResponse.json({
      success: true,
      delivered: result.delivered,
      suppressed: result.suppressed,
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error("[agent-registered]", detail);
    return NextResponse.json({ success: false, error: detail }, { status: 500 });
  }
}
