// app/api/surveys/requests/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/api-auth";
import { validate, surveyRequestSchema } from "@/lib/validations";
import { notifyEvent } from "@/lib/notification-helper";
import type { SurveyRequest } from "@/types/survey.types";

/**
 * POST /api/surveys/requests
 *
 * Pengajuan survei properti oleh client (viewer+).
 *
 * POLA PENUGASAN AGEN (PENTING)
 * =============================
 * `agent_id` diisi server dari pemilik properti, bukan dari body request.
 * Rantai fallback: `assigned_to → created_by`. Pola yang sama diterapkan di
 * app/api/leads/route.ts:95-96 — tidak boleh menyimpang, supaya notifikasi
 * selalu sampai ke satu orang yang bertanggung jawab.
 *
 * Tabel `properties` TIDAK punya kolom `user_id` (lihat properties/route.ts:63);
 * menyebutnya di select membuat PostgREST menolak seluruh query. Jangan
 * menambahkannya kembali sebagai fallback ketiga.
 *
 * Bila kedua field itu null (seharusnya tidak mungkin — `created_by` terisi saat
 * properti dibuat), request ditolak dengan pesan yang jelas. Ini lebih baik
 * daripada menerima request tanpa penerima.
 *
 * PENGECEKAN GANDA
 * ================
 * Request ditolak bila client sudah punya request `pending` untuk properti yang
 * sama. "Pending" di sini termasuk `contacted` — yang artinya agen sudah mulai
 * menangani, tapi jadwal belum terbentuk. Hanya setelah status berubah jadi
 * `scheduled`, `rejected`, atau `cancelled` client boleh mengajukan lagi.
 */
export async function POST(request: NextRequest) {
  // 1. Autentikasi — viewer ke atas
  const authResult = await requireAuth();
  if (!authResult.ok) return authResult.response;
  const { ctx } = authResult;

  // 2. Parsing & validasi body
  const body = await request.json();
  const parsed = validate(surveyRequestSchema, body);
  if (!parsed.ok) return parsed.response;

  const { property_id, requester_name, requester_phone, preferred_date, preferred_time, message } =
    parsed.data;

  const supabase = ctx.supabase;

  // 3. Ambil properti beserta pemiliknya. Hanya properti `published` yang bisa
  //    diminta survei — listing draft/sold/archived tidak layak ditampilkan
  //    di form pengajuan, dan tidak boleh diajukan walau client punya linknya.
  const { data: property, error: propErr } = await supabase
    .from("properties")
    .select("id, title, listing_code, status, assigned_to, created_by")
    .eq("id", property_id)
    .eq("status", "published")
    .single();

  if (propErr || !property) {
    // Galat selain "baris tidak ada" (mis. kolom salah nama) sebelumnya lenyap
    // di balik pesan umum, sehingga pengajuan gagal tanpa satu pun petunjuk di
    // log. Sekarang penyebab aslinya selalu tercatat.
    if (propErr && propErr.code !== "PGRST116") {
      console.error("[POST /api/surveys/requests] Query properti gagal:", propErr);
    }

    return NextResponse.json(
      {
        error:
          !propErr || propErr.code === "PGRST116"
            ? "Properti tidak ditemukan atau belum dipublikasikan."
            : "Gagal memuat data properti.",
      },
      { status: 404 }
    );
  }

  // 4. Tentukan agen penanggung jawab (sepola leads/route.ts:95-96).
  //
  // Tabel `properties` TIDAK punya kolom `user_id` — lihat catatan di
  // properties/route.ts:63. Menyebutnya di select membuat PostgREST menolak
  // seluruh query (42703), dan setiap pengajuan gagal dengan pesan yang tidak
  // menjelaskan apa pun. Rantainya cukup `assigned_to → created_by`.
  const agentId = property.assigned_to || property.created_by;

  if (!agentId) {
    // Tidak mungkin terjadi kecuali ada manipulasi basis data — properti tanpa
    // pemilik/pembuat. Lebih baik ditolak eksplisit daripada diterima lalu
    // notifikasinya hilang tanpa jejak.
    return NextResponse.json(
      {
        error: "Properti ini belum memiliki agen yang ditugaskan. Silakan hubungi admin.",
      },
      { status: 400 }
    );
  }

  // 5. Periksa apakah client sudah punya request aktif untuk properti ini.
  //    "Aktif" = pending atau contacted; scheduled/rejected/cancelled sudah selesai.
  const { data: existingRequest } = await supabase
    .from("survey_requests")
    .select("id, status")
    .eq("property_id", property_id)
    .eq("requester_id", ctx.userId)
    .in("status", ["pending", "contacted"])
    .maybeSingle();

  if (existingRequest) {
    return NextResponse.json(
      {
        error:
          existingRequest.status === "contacted"
            ? "Anda sudah mengajukan survei untuk properti ini dan sedang ditangani agen. Silakan tunggu konfirmasi."
            : "Anda sudah mengajukan survei untuk properti ini. Silakan tunggu respons agen.",
      },
      { status: 409 }
    );
  }

  // 6. Buat request
  const { data: newRequest, error: insertErr } = await supabase
    .from("survey_requests")
    .insert({
      property_id,
      requester_id: ctx.userId,
      requester_name,
      requester_phone,
      preferred_date: preferred_date || null,
      preferred_time: preferred_time || null,
      message: message || null,
      agent_id: agentId,
      status: "pending",
    })
    .select("id, property_id, requester_id, status, created_at")
    .single();

  if (insertErr || !newRequest) {
    console.error("[POST /api/surveys/requests] Insert gagal:", insertErr);
    return NextResponse.json(
      { error: "Gagal menyimpan pengajuan survei. Silakan coba lagi." },
      { status: 500 }
    );
  }

  // 7. Kirim notifikasi ke agen — lonceng + push
  await notifyEvent({
    event: "survey.requested",
    userIds: [agentId],
    title: "Pengajuan Survei Baru",
    message: `${requester_name} mengajukan survei untuk ${property.listing_code || property.title}`,
    link: `/surveys`,
    senderId: ctx.userId,
  });

  return NextResponse.json(
    {
      message: "Pengajuan survei berhasil dikirim. Agen akan menghubungi Anda segera.",
      data: newRequest,
    },
    { status: 201 }
  );
}

/**
 * GET /api/surveys/requests
 *
 * Daftar pengajuan survei sesuai peran.
 *
 * - **Agen:** request yang ditugaskan ke dirinya (`agent_id = userId`)
 * - **Client (viewer/marketing):** request miliknya sendiri (`requester_id = userId`)
 * - **Admin:** semua request
 *
 * HIDRASI RELASI
 * ==============
 * `property` diambil lewat embed PostgREST biasa. `requester` dan `agent` TIDAK
 * bisa: kedua kolom itu ber-FK ke `auth.users`, bukan `public.users`, jadi
 * PostgREST tidak menemukan jalur embed dan seluruh query gagal — bukan sekadar
 * relasinya kosong. Keduanya diambil dengan satu query terpisah ke
 * `public.users`, memakai admin client karena RLS tabel itu menghalangi
 * pembacaan baris akun lain.
 */
export async function GET(request: NextRequest) {
  // 1. Autentikasi — viewer ke atas
  const authResult = await requireAuth();
  if (!authResult.ok) return authResult.response;
  const { ctx } = authResult;
  const supabase = ctx.supabase;

  // 2. Bangun query sesuai peran
  let query = supabase
    .from("survey_requests")
    .select(
      `
      id, property_id, requester_id, requester_name, requester_phone,
      preferred_date, preferred_time, message, status,
      agent_id, handled_by, handled_at, reject_reason, survey_id,
      created_at, updated_at,
      property:properties(
        id, title, listing_code, property_type, listing_type,
        address:property_address(*)
      )
    `
    )
    .order("created_at", { ascending: false });

  // Filter kepemilikan — RLS sudah menegakkan hal yang sama di basis data;
  // filter di sini adalah lapis kedua, sepola properties/[id]/status/route.ts:60-69.
  if (ctx.role === "admin" || ctx.role === "super_admin") {
    // Admin melihat semua — tidak ada filter tambahan
  } else {
    // Satu user bisa berperan ganda: agen yang menangani request orang lain,
    // sekaligus pernah mengajukan sendiri atas properti rekannya.
    query = query.or(`agent_id.eq.${ctx.userId},requester_id.eq.${ctx.userId}`);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[GET /api/surveys/requests] Query gagal:", error);
    return NextResponse.json(
      { error: "Gagal memuat daftar pengajuan survei." },
      { status: 500 }
    );
  }

  const rows = (data ?? []) as unknown as SurveyRequest[];

  // 3. Hidrasi requester & agent dalam satu query gabungan.
  //    Nama & telepon pengaju sudah tersalin di baris request, jadi kegagalan
  //    di sini hanya menghilangkan avatar dan email — daftarnya tetap terbaca.
  const userIds = [
    ...new Set(
      rows.flatMap((r) => [r.requester_id, r.agent_id]).filter((v): v is string => Boolean(v))
    ),
  ];

  if (userIds.length > 0) {
    try {
      const { data: users } = await createAdminClient()
        .from("users")
        .select("id, full_name, email, phone, avatar_url")
        .in("id", userIds);

      const byId = new Map((users ?? []).map((u) => [u.id as string, u]));

      for (const row of rows) {
        const requester = byId.get(row.requester_id);
        if (requester) {
          row.requester = {
            id: requester.id,
            full_name: requester.full_name,
            email: requester.email,
            avatar_url: requester.avatar_url,
          };
        }

        const agent = row.agent_id ? byId.get(row.agent_id) : undefined;
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
      console.error("[GET /api/surveys/requests] Hidrasi user gagal:", err);
    }
  }

  return NextResponse.json({ data: rows });
}
