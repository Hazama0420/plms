// app/api/surveys/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { validate, surveyUpdateSchema } from "@/lib/validations";
import { notifyEvent } from "@/lib/notification-helper";

/**
 * PATCH /api/surveys/[id]
 *
 * Pembaruan jadwal survei oleh agen.
 *
 * RESCHEDULE BEHAVIOR
 * ===================
 * Bila `scheduled_at` diubah (menjadwalkan ulang), `reminder_sent_at` dikosongkan
 * supaya pengingat terkirim lagi di waktu yang baru — tanpa ini, jadwal yang
 * dimundurkan tidak akan mendapat pengingat sama sekali karena kolom itu masih
 * terisi dari waktu lama.
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  // 1. Autentikasi — agen ke atas
  const authResult = await requireRole(["agent", "admin", "super_admin"]);
  if (!authResult.ok) return authResult.response;
  const { ctx } = authResult;
  const supabase = ctx.supabase;

  // 2. Parsing & validasi body
  const body = await request.json();
  const parsed = validate(surveyUpdateSchema, body);
  if (!parsed.ok) return parsed.response;

  const { scheduled_at, duration_min, type, status, location_note, meeting_url, notes } =
    parsed.data;

  // 3. Ambil jadwal yang akan diubah — sekaligus cek kepemilikan
  const { data: existing, error: fetchErr } = await supabase
    .from("surveys")
    .select("id, agent_id, created_by, client_id, scheduled_at, status")
    .eq("id", id)
    .single();

  if (fetchErr || !existing) {
    return NextResponse.json(
      {
        error:
          fetchErr?.code === "PGRST116"
            ? "Jadwal survei tidak ditemukan."
            : "Gagal memuat data jadwal.",
      },
      { status: 404 }
    );
  }

  // 4. Cek kepemilikan eksplisit
  const isOwner = existing.agent_id === ctx.userId || existing.created_by === ctx.userId;
  const isAdmin = ctx.role === "admin" || ctx.role === "super_admin";

  if (!isOwner && !isAdmin) {
    return NextResponse.json(
      { error: "Anda tidak memiliki akses ke jadwal ini." },
      { status: 403 }
    );
  }

  // 5. Update jadwal
  const updatePayload: Record<string, unknown> = {};

  if (scheduled_at !== undefined) {
    updatePayload.scheduled_at = scheduled_at;
    // Kosongkan reminder_sent_at bila waktu diubah — pengingat perlu dikirim lagi
    updatePayload.reminder_sent_at = null;
  }
  if (duration_min !== undefined) updatePayload.duration_min = duration_min;
  if (type !== undefined) updatePayload.type = type;
  if (status !== undefined) updatePayload.status = status;
  if (location_note !== undefined) updatePayload.location_note = location_note;
  if (meeting_url !== undefined) updatePayload.meeting_url = meeting_url;
  if (notes !== undefined) updatePayload.notes = notes;

  // Bila tidak ada perubahan sama sekali
  if (Object.keys(updatePayload).length === 0) {
    return NextResponse.json({ message: "Tidak ada perubahan yang diterapkan." });
  }

  const { error: updateErr } = await supabase
    .from("surveys")
    .update(updatePayload)
    .eq("id", id);

  if (updateErr) {
    console.error("[PATCH /api/surveys/[id]] Update gagal:", updateErr);
    return NextResponse.json(
      { error: "Gagal memperbarui jadwal survei." },
      { status: 500 }
    );
  }

  // 6. Beri tahu client bila yang berubah menyangkut kehadirannya.
  //
  // Hanya dua hal yang perlu dikabarkan: waktunya bergeser, atau jadwalnya
  // dibatalkan. Tanpa ini client tetap datang di jam lama — persis kegagalan
  // yang membuat sistem lama terasa "berhasil" padahal tidak.
  const isReschedule = scheduled_at !== undefined && scheduled_at !== existing.scheduled_at;
  const isCancelled = status === "cancelled" && existing.status !== "cancelled";

  if (existing.client_id && (isReschedule || isCancelled)) {
    const notif = isCancelled
      ? {
          title: "Jadwal Survei Dibatalkan",
          message: "Jadwal survei Anda dibatalkan. Agen akan menghubungi Anda untuk pengaturan ulang.",
        }
      : {
          title: "Jadwal Survei Diubah",
          message: `Waktu survei Anda dipindah ke ${new Date(scheduled_at!).toLocaleString("id-ID", {
            dateStyle: "full",
            timeStyle: "short",
          })}.`,
        };

    await notifyEvent({
      event: "survey.scheduled",
      userIds: [existing.client_id],
      ...notif,
      link: "/surveys",
      senderId: ctx.userId,
    });
  }

  return NextResponse.json({
    message: scheduled_at
      ? "Jadwal survei berhasil diperbarui. Pengingat akan dikirim ulang sesuai waktu baru."
      : "Jadwal survei berhasil diperbarui.",
  });
}
