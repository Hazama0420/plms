// app/api/surveys/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth, requireRole } from "@/lib/api-auth";
import { validate, surveyCreateSchema } from "@/lib/validations";
import { notifyEvent } from "@/lib/notification-helper";
import type { Survey } from "@/types/survey.types";

/**
 * POST /api/surveys
 *
 * Pembuatan jadwal survei oleh agen.
 *
 * DUA JALUR MASUK
 * ===============
 * 1. Dari request (`request_id` diisi): salin `client_id`, `property_id`, dan
 *    ubah status request menjadi `scheduled`.
 * 2. Manual (`request_id` kosong): agen menjadwalkan langsung tanpa pengajuan
 *    (mis. client menelepon).
 *
 * PENGECEKAN BENTROK
 * ==================
 * Tolak bila agen sudah punya jadwal beririsan (rentang waktu tumpang tindih).
 * Query: scheduled_at <= new_end AND (scheduled_at + duration_min) >= new_start.
 *
 * NOTIFIKASI
 * ==========
 * Client menerima `survey.scheduled` dengan waktu dan lokasi.
 */
export async function POST(request: NextRequest) {
  // 1. Autentikasi — agen ke atas
  const authResult = await requireRole(["agent", "admin", "super_admin"]);
  if (!authResult.ok) return authResult.response;
  const { ctx } = authResult;
  const supabase = ctx.supabase;

  // 2. Parsing & validasi body
  const body = await request.json();
  const parsed = validate(surveyCreateSchema, body);
  if (!parsed.ok) return parsed.response;

  const {
    property_id,
    request_id,
    client_id,
    client_name,
    client_phone,
    scheduled_at,
    duration_min,
    type,
    status,
    location_note,
    meeting_url,
    notes,
  } = parsed.data;

  const scheduledDate = new Date(scheduled_at);
  const endDate = new Date(scheduledDate.getTime() + duration_min * 60_000);

  // 3. Bila dibuat dari request, ambil request tersebut dan salin datanya
  let finalPropertyId = property_id;
  let finalClientId = client_id;
  let finalClientName = client_name;
  let finalClientPhone = client_phone;
  let requestData: any = null;

  if (request_id) {
    const { data: req, error: reqErr } = await supabase
      .from("survey_requests")
      .select("id, property_id, requester_id, requester_name, requester_phone, agent_id, status")
      .eq("id", request_id)
      .single();

    if (reqErr || !req) {
      return NextResponse.json(
        { error: "Request survei tidak ditemukan." },
        { status: 404 }
      );
    }

    // Hanya agen yang bertanggung jawab atau admin yang boleh menjadwalkan
    const isAgent = req.agent_id === ctx.userId;
    const isAdmin = ctx.role === "admin" || ctx.role === "super_admin";

    if (!isAgent && !isAdmin) {
      return NextResponse.json(
        { error: "Anda tidak memiliki akses ke request ini." },
        { status: 403 }
      );
    }

    // Request yang sudah dijadwalkan atau ditolak tidak boleh diproses lagi
    if (req.status === "scheduled") {
      return NextResponse.json(
        { error: "Request ini sudah dijadwalkan sebelumnya." },
        { status: 400 }
      );
    }

    if (req.status === "rejected" || req.status === "cancelled") {
      return NextResponse.json(
        { error: "Request ini sudah ditutup. Tidak dapat dijadwalkan." },
        { status: 400 }
      );
    }

    // Salin data dari request
    finalPropertyId = req.property_id;
    finalClientId = req.requester_id;
    finalClientName = req.requester_name;
    finalClientPhone = req.requester_phone;
    requestData = req;
  }

  // 4. Periksa bentrok jadwal agen.
  //
  // Jendela pengambilan sengaja dilebarkan 8 jam ke belakang (durasi maksimum
  // satu survei) supaya jadwal panjang yang dimulai jauh sebelum waktu baru
  // tetap ikut terambil. Irisan sebenarnya dihitung di JS, bukan di SQL:
  // Postgres di sini tidak menyimpan kolom waktu selesai, jadi perbandingan
  // rentangnya harus memakai scheduled_at + duration_min per baris.
  //
  // `.maybeSingle()` sengaja TIDAK dipakai: jendela ini bisa memuat lebih dari
  // satu jadwal, dan maybeSingle() akan melempar galat begitu barisnya lebih
  // dari satu — bentrokan justru lolos tanpa terdeteksi.
  const { data: candidates, error: overlapErr } = await supabase
    .from("surveys")
    .select("id, scheduled_at, duration_min")
    .eq("agent_id", ctx.userId)
    .eq("status", "scheduled")
    .lte("scheduled_at", endDate.toISOString())
    .gte("scheduled_at", new Date(scheduledDate.getTime() - 480 * 60_000).toISOString());

  if (overlapErr) {
    // Gagal memeriksa bentrok bukan alasan untuk menerima jadwal diam-diam:
    // agen bisa berakhir dengan dua janji di jam yang sama tanpa peringatan.
    console.error("[POST /api/surveys] Cek bentrok gagal:", overlapErr);
    return NextResponse.json(
      { error: "Gagal memeriksa bentrok jadwal. Silakan coba lagi." },
      { status: 500 }
    );
  }

  const clash = (candidates ?? []).find((row) => {
    const existingStart = new Date(row.scheduled_at);
    const existingEnd = new Date(existingStart.getTime() + row.duration_min * 60_000);
    return scheduledDate < existingEnd && endDate > existingStart;
  });

  if (clash) {
    const clashStart = new Date(clash.scheduled_at);
    return NextResponse.json(
      {
        error: `Anda sudah memiliki jadwal survei pada ${clashStart.toLocaleString("id-ID", {
          dateStyle: "medium",
          timeStyle: "short",
        })}. Pilih waktu lain.`,
      },
      { status: 409 }
    );
  }

  // 5. Buat jadwal survei
  const { data: newSurvey, error: insertErr } = await supabase
    .from("surveys")
    .insert({
      property_id: finalPropertyId,
      request_id: request_id || null,
      client_id: finalClientId || null,
      client_name: finalClientName,
      client_phone: finalClientPhone || null,
      agent_id: ctx.userId,
      scheduled_at: scheduledDate.toISOString(),
      duration_min,
      type,
      status: status || "scheduled",
      location_note: location_note || null,
      meeting_url: meeting_url || null,
      notes: notes || null,
      created_by: ctx.userId,
    })
    .select("id, scheduled_at, type, property_id, client_id")
    .single();

  if (insertErr || !newSurvey) {
    console.error("[POST /api/surveys] Insert gagal:", insertErr);
    return NextResponse.json(
      { error: "Gagal menyimpan jadwal survei. Silakan coba lagi." },
      { status: 500 }
    );
  }

  // 6. Bila dibuat dari request, tandai request sebagai scheduled dan isi survey_id
  if (requestData) {
    const supabaseAdmin = createAdminClient();

    const { error: updateReqErr } = await supabaseAdmin
      .from("survey_requests")
      .update({
        status: "scheduled",
        survey_id: newSurvey.id,
        handled_by: ctx.userId,
        handled_at: new Date().toISOString(),
      })
      .eq("id", request_id);

    if (updateReqErr) {
      console.error("[POST /api/surveys] Update request gagal:", updateReqErr);
      // Jadwal sudah terbentuk — tidak rollback, cukup log
    }
  }

  // 7. Kirim notifikasi ke client
  if (finalClientId) {
    const scheduledTime = scheduledDate.toLocaleString("id-ID", {
      dateStyle: "full",
      timeStyle: "short",
    });

    await notifyEvent({
      event: "survey.scheduled",
      userIds: [finalClientId],
      title: "Jadwal Survei Dikonfirmasi",
      message: `Survei Anda dijadwalkan pada ${scheduledTime}. ${type === "virtual" ? "Link meeting akan dikirim sebelum waktu survei." : ""}`,
      link: `/surveys/${newSurvey.id}`,
      senderId: ctx.userId,
    });
  }

  return NextResponse.json(
    {
      message: "Jadwal survei berhasil dibuat.",
      data: newSurvey,
    },
    { status: 201 }
  );
}

/**
 * GET /api/surveys
 *
 * Daftar jadwal survei sesuai peran — INI YANG MENUTUP KEBOCORAN UTAMA.
 *
 * - **Client (viewer/marketing):** jadwal miliknya sendiri (`client_id = userId`)
 * - **Agen:** jadwal yang ditugaskan ke dirinya (`agent_id = userId`)
 * - **Admin:** semua jadwal
 *
 * FILTER KEPEMILIKAN
 * ==================
 * RLS sudah aktif di basis data, tapi route ini juga memasang filter eksplisit
 * sebagai lapis kedua — pola yang sama diterapkan di properties/[id]/status/route.ts:60-69.
 * Tanpa filter ini, halaman /surveys menampilkan nama, nomor telepon, dan catatan
 * pribadi milik agen lain ke semua orang.
 *
 * HIDRASI AGEN
 * ============
 * `agent_id` ber-FK ke `auth.users`, bukan `public.users`, jadi embed PostgREST
 * tidak mungkin (jalurnya tidak ada dan seluruh query akan gagal, bukan sekadar
 * relasinya kosong). Nama dan nomor agen diambil dengan satu query terpisah —
 * tanpa itu client tidak punya cara menghubungi agen dari kartu jadwalnya.
 * Hanya nama dan telepon yang diikutkan: keduanya memang perlu diketahui client
 * yang sudah punya janji, sedangkan email tidak.
 */
export async function GET(request: NextRequest) {
  // 1. Autentikasi — viewer ke atas
  const authResult = await requireAuth();
  if (!authResult.ok) return authResult.response;
  const { ctx } = authResult;
  const supabase = ctx.supabase;

  // 2. Bangun query sesuai peran
  let query = supabase
    .from("surveys")
    .select(
      `
      id, property_id, request_id, client_id, client_name, client_phone,
      agent_id, scheduled_at, duration_min, type, status,
      location_note, meeting_url, notes, reminder_sent_at,
      created_by, created_at, updated_at,
      property:properties(id, title, listing_code, property_type, listing_type, address:property_address(*))
    `
    )
    .order("scheduled_at", { ascending: true });

  // Filter kepemilikan — inti dari perbaikan privasi
  if (ctx.role === "admin" || ctx.role === "super_admin") {
    // Admin melihat semua — tidak ada filter tambahan
  } else if (ctx.role === "agent") {
    // Agen melihat jadwal yang ditugaskan ke dirinya — dan juga jadwal di mana
    // dirinya berperan sebagai client. Seorang agen bisa mengajukan survei atas
    // properti rekannya; tanpa cabang kedua, jadwal itu hilang dari daftarnya
    // sendiri padahal dialah yang akan datang.
    query = query.or(`agent_id.eq.${ctx.userId},client_id.eq.${ctx.userId}`);
  } else {
    // Client (viewer/marketing) hanya melihat jadwal miliknya sendiri
    query = query.eq("client_id", ctx.userId);
  }

  const { data, error } = await query.returns<Survey[]>();

  if (error) {
    console.error("[GET /api/surveys] Query gagal:", error);
    return NextResponse.json(
      { error: "Gagal memuat daftar jadwal survei." },
      { status: 500 }
    );
  }

  const rows = data ?? [];

  // 3. Hidrasi data agen — lihat catatan HIDRASI AGEN di atas.
  //    Kegagalan di sini tidak membatalkan permintaan: jadwalnya tetap terbaca,
  //    hanya tombol "Hubungi Agen" yang kehilangan nomor tujuan.
  const agentIds = [...new Set(rows.map((r) => r.agent_id).filter(Boolean))];

  if (agentIds.length > 0) {
    try {
      const { data: agents } = await createAdminClient()
        .from("users")
        .select("id, full_name, email, phone, avatar_url")
        .in("id", agentIds);

      const byId = new Map((agents ?? []).map((u) => [u.id as string, u]));

      for (const row of rows) {
        const agent = byId.get(row.agent_id);
        if (agent) {
          row.agent = {
            id: agent.id,
            full_name: agent.full_name,
            email: agent.email,
            phone: agent.phone,
            avatar_url: agent.avatar_url,
          };
        }
      }
    } catch (err) {
      console.error("[GET /api/surveys] Hidrasi agen gagal:", err);
    }
  }

  return NextResponse.json({ data: rows });
}
