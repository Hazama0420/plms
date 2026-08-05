// app/api/surveys/reminders/route.ts

import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyEvent } from "@/lib/notification-helper";

/**
 * GET /api/surveys/reminders
 *
 * Pengingat T-1 jam sebelum survei. Dirancang untuk dipanggil penjadwal luar
 * tiap 15 menit.
 *
 * PENJADWALNYA DI LUAR VERCEL
 * ===========================
 * Sempat dijadwalkan lewat `vercel.json`, tapi akun Hobby membatasi cron ke
 * sekali sehari — dan Vercel menolak SELURUH deployment bila jadwalnya lebih
 * rapat, bukan hanya melewati cron-nya. Berkas itu dihapus supaya deployment
 * bisa berjalan.
 *
 * Gunakan penjadwal luar (cron-job.org, GitHub Actions, atau cron di server
 * sendiri) yang memanggil endpoint ini tiap 15 menit dengan header
 * `Authorization: Bearer <CRON_SECRET>`. Selama pemanggilnya belum dipasang,
 * pengingat otomatis tidak berjalan — sisa alur survei tidak terpengaruh.
 *
 * JENDELA 45–75 MENIT
 * ===================
 * Pemanggilan tiap 15 menit terhadap jendela selebar 30 menit menjamin setiap
 * jadwal tersapu minimal sekali — bahkan bila satu jalannya terlewat. Yang
 * menjamin tidak lebih dari sekali adalah kolom `reminder_sent_at`, bukan lebar
 * jendela. Interval yang lebih longgar dari 30 menit akan melewatkan jadwal.
 *
 * URUTAN TANDAI-LALU-KIRIM
 * ========================
 * `reminder_sent_at` ditulis SEBELUM notifikasi dikirim. Bila pengiriman gagal
 * setelah itu, satu pengingat hilang. Bila urutannya dibalik dan penulisan yang
 * gagal, pengingat yang sama terkirim ulang tiap 15 menit sampai jadwalnya
 * lewat — empat notifikasi identik per jam ke agen dan client sekaligus.
 * Kehilangan satu lebih baik daripada itu.
 *
 * KEAMANAN
 * ========
 * Endpoint ini menulis ke basis data dan mengirim push, jadi tidak boleh
 * terbuka. Dibandingkan dengan `timingSafeEqual` supaya lama pembandingan tidak
 * membocorkan berapa banyak karakter awal yang sudah tepat.
 */
export async function GET(request: NextRequest) {
  // 1. Verifikasi CRON_SECRET sebelum menyentuh basis data
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    // Tanpa secret, endpoint ini akan terbuka untuk siapa saja. Menolak lebih
    // aman daripada berjalan tanpa penjagaan.
    console.error("[cron/reminders] CRON_SECRET belum diatur.");
    return NextResponse.json(
      { error: "Endpoint belum dikonfigurasi." },
      { status: 503 }
    );
  }

  const header = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;

  // timingSafeEqual menuntut panjang buffer yang sama; panjang yang berbeda
  // sudah pasti tidak cocok, jadi diperiksa lebih dulu.
  const headerBuf = Buffer.from(header);
  const expectedBuf = Buffer.from(expected);

  if (headerBuf.length !== expectedBuf.length || !timingSafeEqual(headerBuf, expectedBuf)) {
    return NextResponse.json({ error: "Tidak diizinkan." }, { status: 401 });
  }

  // 2. Ambil jadwal yang jatuh dalam jendela 45–75 menit ke depan
  const supabase = createAdminClient();
  const now = Date.now();

  const { data: due, error: queryErr } = await supabase
    .from("surveys")
    .select("id, client_id, agent_id, client_name, scheduled_at, type, location_note, meeting_url")
    .gte("scheduled_at", new Date(now + 45 * 60_000).toISOString())
    .lte("scheduled_at", new Date(now + 75 * 60_000).toISOString())
    .is("reminder_sent_at", null)
    .eq("status", "scheduled");

  if (queryErr) {
    console.error("[cron/reminders] Query gagal:", queryErr);
    return NextResponse.json(
      { error: "Gagal memuat jadwal yang perlu diingatkan." },
      { status: 500 }
    );
  }

  if (!due || due.length === 0) {
    return NextResponse.json({ sent: 0, failed: 0 });
  }

  // 3. Tandai seluruhnya sebagai terkirim SEBELUM mengirim — lihat catatan di
  //    atas soal urutan. Satu update untuk semua baris sekaligus.
  const ids = due.map((s) => s.id as string);

  const { error: markErr } = await supabase
    .from("surveys")
    .update({ reminder_sent_at: new Date().toISOString() })
    .in("id", ids);

  if (markErr) {
    // Bila penandaan gagal, jangan kirim apa pun: jalan cron berikutnya akan
    // mengambil baris yang sama dan mengirim ulang. Lebih baik tertunda 15
    // menit daripada terkirim berulang tanpa henti.
    console.error("[cron/reminders] Penandaan gagal, pengiriman dibatalkan:", markErr);
    return NextResponse.json(
      { error: "Gagal menandai pengingat. Pengiriman dibatalkan." },
      { status: 500 }
    );
  }

  // 4. Kirim pengingat ke agen + client untuk tiap jadwal.
  //
  // Dikirim terpisah, bukan satu panggilan untuk keduanya: agen perlu tahu ia
  // bertemu siapa, sedangkan client tidak perlu dikabari bahwa ia akan bertemu
  // dirinya sendiri.
  let sent = 0;
  let failed = 0;

  for (const survey of due) {
    const waktu = new Date(survey.scheduled_at as string).toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const tempat =
      survey.type === "virtual"
        ? survey.meeting_url
          ? `Tautan: ${survey.meeting_url}`
          : "Survei dilakukan secara virtual."
        : survey.location_note
          ? `Lokasi: ${survey.location_note}`
          : "";

    const results = await Promise.all([
      notifyEvent({
        event: "survey.reminder",
        userIds: [survey.agent_id as string],
        title: "Survei 1 Jam Lagi",
        message: `Survei pukul ${waktu} bersama ${survey.client_name}. ${tempat}`.trim(),
        link: "/surveys",
      }),
      // client_id null pada jadwal manual (client bukan pengguna terdaftar);
      // notifyEvent membuang nilai kosong dan mengembalikan success apa adanya.
      notifyEvent({
        event: "survey.reminder",
        userIds: [survey.client_id as string | null],
        title: "Survei 1 Jam Lagi",
        message: `Survei properti Anda dijadwalkan pukul ${waktu}. ${tempat}`.trim(),
        link: "/surveys",
      }),
    ]);

    if (results.every((r) => r.success)) sent += 1;
    else failed += 1;
  }

  return NextResponse.json({ sent, failed, scanned: due.length });
}
