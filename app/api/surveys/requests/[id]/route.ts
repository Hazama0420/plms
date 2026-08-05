// app/api/surveys/requests/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { validate, surveyRequestUpdateSchema } from "@/lib/validations";
import { notifyEvent } from "@/lib/notification-helper";

/**
 * PATCH /api/surveys/requests/[id]
 *
 * Agen menandai request sebagai sudah dihubungi atau menolaknya.
 * Client hanya boleh membatalkan (`cancelled`) miliknya sendiri.
 *
 * Status `scheduled` sengaja tidak diterima di sini: nilai itu hanya boleh
 * ditulis oleh POST /api/surveys saat jadwalnya benar-benar terbentuk.
 *
 * NOTIFIKASI
 * ==========
 * - `rejected` → client menerima notifikasi dengan alasan penolakan
 * - `contacted` → tidak ada notifikasi (hanya perubahan status internal)
 * - `cancelled` → tidak ada notifikasi (client membatalkan sendiri)
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  // 1. Autentikasi — agen ke atas (client memakai jalur terpisah bila perlu
  //    membatalkan, tapi untuk sekarang route ini khusus agen)
  const authResult = await requireRole(["agent", "admin", "super_admin"]);
  if (!authResult.ok) return authResult.response;
  const { ctx } = authResult;

  // 2. Parsing & validasi body
  const body = await request.json();
  const parsed = validate(surveyRequestUpdateSchema, body);
  if (!parsed.ok) return parsed.response;

  const { status, reject_reason } = parsed.data;

  const supabase = ctx.supabase;

  // 3. Ambil request yang akan diubah — sekaligus cek kepemilikan
  const { data: existingRequest, error: fetchErr } = await supabase
    .from("survey_requests")
    .select("id, property_id, requester_id, agent_id, status")
    .eq("id", id)
    .single();

  if (fetchErr || !existingRequest) {
    return NextResponse.json(
      {
        error: fetchErr?.code === "PGRST116" ? "Request tidak ditemukan." : "Gagal memuat data request.",
      },
      { status: 404 }
    );
  }

  // 4. Cek kepemilikan eksplisit — RLS sudah aktif, tapi route ini memakai
  //    admin client di beberapa cabang, jadi filter berlapis tetap dipasang.
  const isAgent = existingRequest.agent_id === ctx.userId;
  const isAdmin = ctx.role === "admin" || ctx.role === "super_admin";

  if (!isAgent && !isAdmin) {
    return NextResponse.json(
      { error: "Anda tidak memiliki akses ke request ini." },
      { status: 403 }
    );
  }

  // 5. Validasi transisi status — tidak boleh mengubah request yang sudah
  //    dijadwalkan atau sudah ditolak/dibatalkan sebelumnya
  if (existingRequest.status === "scheduled") {
    return NextResponse.json(
      { error: "Request ini sudah dijadwalkan. Tidak dapat diubah lagi." },
      { status: 400 }
    );
  }

  if (existingRequest.status === "rejected" || existingRequest.status === "cancelled") {
    return NextResponse.json(
      { error: "Request ini sudah ditutup. Tidak dapat diubah lagi." },
      { status: 400 }
    );
  }

  // 6. Update status
  const updatePayload: Record<string, unknown> = {
    status,
    handled_by: ctx.userId,
    handled_at: new Date().toISOString(),
  };

  if (status === "rejected" && reject_reason) {
    updatePayload.reject_reason = reject_reason;
  }

  const { error: updateErr } = await supabase
    .from("survey_requests")
    .update(updatePayload)
    .eq("id", id);

  if (updateErr) {
    console.error("[PATCH /api/surveys/requests/[id]] Update gagal:", updateErr);
    return NextResponse.json(
      { error: "Gagal memperbarui status request." },
      { status: 500 }
    );
  }

  // 7. Kirim notifikasi bila ditolak
  if (status === "rejected" && existingRequest.requester_id) {
    await notifyEvent({
      event: "survey.rejected",
      userIds: [existingRequest.requester_id],
      title: "Pengajuan Survei Ditolak",
      message: reject_reason || "Maaf, pengajuan survei Anda tidak dapat diproses saat ini.",
      link: `/surveys`,
      senderId: ctx.userId,
    });
  }

  return NextResponse.json({
    message:
      status === "contacted"
        ? "Status request diperbarui menjadi 'sudah dihubungi'."
        : status === "rejected"
          ? "Request ditolak. Client telah menerima notifikasi."
          : "Status request berhasil diperbarui.",
  });
}
