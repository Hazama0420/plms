// lib/validations.ts
//
// Skema zod untuk validasi body request pada Route Handler.
//
// Sebelumnya validasi dilakukan manual (regex, typeof, cek panjang) yang
// tersebar di tiap endpoint. Skema di sini menyeragamkannya sekaligus
// memangkas kode berulang.
//
// Catatan versi: proyek memakai zod ^4.4.3, yang berbeda cukup jauh dari v3.
// Yang relevan di berkas ini:
//   - `{ required_error: "..." }` sudah tidak ada; pesan kustom memakai
//     `{ error: "..." }`.
//   - `z.string().email()` / `.uuid()` digantikan fungsi tingkat atas
//     `z.email()` dan `z.uuid()`.

import { z } from "zod";
import { NextResponse } from "next/server";
import { SUPPORT_MESSAGE_MAX, SUPPORT_MESSAGE_MIN } from "@/lib/support-config";

// ---------------------------------------------------------------------------
// Helper: bungkus safeParse, hasilkan 400 yang seragam apabila gagal.
// ---------------------------------------------------------------------------

export type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; response: NextResponse };

/**
 * Validasi `value` terhadap `schema`.
 *
 * Pola pemakaian di Route Handler sama dengan requireAuth() di lib/api-auth.ts,
 * sehingga penjagaan berlapis terbaca konsisten:
 *
 *   const parsed = validate(leadInsertSchema, body);
 *   if (!parsed.ok) return parsed.response;
 *   // parsed.data sudah bertipe dan bersih
 */
export function validate<S extends z.ZodType>(
  schema: S,
  value: unknown
): ValidationResult<z.infer<S>> {
  const result = schema.safeParse(value);

  if (!result.success) {
    // Dibaca dari `issues` alih-alih flattenError(): bentuknya konkret
    // (`path: PropertyKey[]`, `message: string`), sedangkan flattenError
    // menghasilkan tipe mapped yang bergantung pada skema — menyulitkan
    // penulisan helper generik seperti ini.
    const issues = result.error.issues.map((issue) => {
      const field = issue.path.map(String).join(".");
      return field ? `${field}: ${issue.message}` : issue.message;
    });

    return {
      ok: false,
      response: NextResponse.json(
        { error: "Data tidak valid.", details: issues },
        { status: 400 }
      ),
    };
  }

  return { ok: true, data: result.data };
}

// ---------------------------------------------------------------------------
// Potongan skema yang dipakai berulang
// ---------------------------------------------------------------------------

/**
 * Nomor telepon Indonesia. Dibersihkan dulu dari spasi, tanda kurung, dan
 * tanda hubung, baru panjangnya diperiksa — jadi "0812-3456-7890" lolos dan
 * tersimpan sebagai "081234567890".
 */
const phoneSchema = z
  .string()
  .transform((v) => v.replace(/[^0-9]/g, ""))
  .pipe(
    z
      .string()
      .min(8, "Nomor telepon minimal 8 digit.")
      .max(15, "Nomor telepon maksimal 15 digit.")
  );

/** UUID v4 — dipakai untuk id properti dan id pengguna. */
const uuidSchema = z.uuid("Format ID tidak valid.");

/**
 * Form di sisi klien kerap mengirim string kosong untuk isian opsional yang
 * tidak diisi. Tanpa penanganan ini, "" akan gagal validasi email/UUID
 * padahal maksudnya "kosong".
 *
 * Tipe hasilnya dibiarkan disimpulkan sendiri: z.preprocess() sudah membawa
 * tipe keluaran dari skema dalamnya, jadi `parsed.data.email` tetap terbaca
 * sebagai `string | undefined`.
 */
function emptyToUndefined<S extends z.ZodType>(schema: S) {
  return z.preprocess(
    (v) => (v === "" || v === null ? undefined : v),
    schema.optional()
  );
}

/**
 * Waktu ISO yang wajib berada di masa depan.
 *
 * Pemeriksaan validitas dipisah dari pemeriksaan masa depan supaya string
 * ngawur ("besok pagi") tidak dilaporkan sebagai "harus di masa depan" —
 * pesan itu menyesatkan dan membuat pengirim mengubah tanggal, bukan formatnya.
 */
const futureDateTimeSchema = z
  .string({ error: "Waktu jadwal wajib diisi." })
  .refine((v) => !Number.isNaN(new Date(v).getTime()), {
    error: "Format waktu tidak valid.",
  })
  .refine((v) => new Date(v).getTime() > Date.now(), {
    error: "Waktu jadwal harus di masa depan.",
  });

// ---------------------------------------------------------------------------
// Skema per endpoint
// ---------------------------------------------------------------------------

// --- /api/leads (POST, publik — form tanya properti) ---
//
// Endpoint ini bisa diakses pengunjung anonim, jadi batas panjang di sini
// sekaligus berperan sebagai pembatas ukuran payload.
//
// Pemanggilnya beragam (form detail properti, widget chat, form kontak) dan
// memakai nama field yang berbeda-beda untuk maksud yang sama. Alias itu
// diseragamkan lebih dulu lewat preprocess supaya sisa skemanya tetap datar
// dan route tidak perlu lagi menulis rantai `a || b`.
const leadAliases = z.preprocess((raw) => {
  if (typeof raw !== "object" || raw === null) return raw;
  const b = raw as Record<string, unknown>;

  return {
    ...b,
    name: b.name ?? b.full_name,
    phone: b.phone ?? b.whatsapp,
    property_id: b.property_id ?? b.propertyId,
    notes: b.notes ?? b.message,
  };
}, z.object({
  name: z
    .string({ error: "Nama calon pembeli wajib diisi." })
    .trim()
    .min(2, "Nama minimal 2 karakter.")
    .max(120, "Nama maksimal 120 karakter."),
  phone: emptyToUndefined(phoneSchema),
  email: emptyToUndefined(z.email("Format email tidak valid.")),

  // Diterima sebagai string bebas karena bisa berupa UUID maupun kode listing;
  // bentuk pastinya diperiksa lagi di route sebelum masuk filter PostgREST.
  property_id: emptyToUndefined(z.string().max(64)),

  source: z.string().max(100).optional(),
  notes: emptyToUndefined(z.string().max(2000, "Catatan maksimal 2000 karakter.")),
}).loose());

export const leadInsertSchema = leadAliases;

// --- /api/leads/[id]/assign (PATCH, agen ke atas) ---
//
// Penugasan agen penanggung jawab untuk sebuah lead. Bentuknya meniru
// propertyAssignSchema di bawah, dengan satu tambahan: `kind`.
//
// Rute ini ada karena notifikasi lead kini diproduksi aplikasi, bukan lagi
// trigger basis data (M-17). services/crm.service.ts memakai klien peramban
// sehingga tidak bisa memanggil notifyEvent() yang menuntut service role.
//
// `kind` HANYA memilih event mana yang dipakai — "created" untuk lead yang baru
// dibuat untuk seorang agen (ikon 🎯 Prospek Lead), "reassigned" untuk lead yang
// berpindah tangan (ikon 👤 Penugasan). Ia tidak pernah menentukan penerima:
// penerimanya selalu dibaca ulang dari baris hasil UPDATE, sehingga pemanggil
// tidak punya jalan mengirimi orang sembarangan.
export const leadAssignSchema = z.object({
  /** null berarti melepas penugasan; tidak ada notifikasi yang dikirim. */
  assigned_to: uuidSchema.nullable(),
  kind: z.enum(["created", "reassigned"], {
    error: "kind wajib salah satu dari: created, reassigned.",
  }),
});

// --- /api/chat (POST, publik — widget chat di layout root) ---
//
// AIChatWidget mengirim seluruh riwayat percakapan setiap kali, sementara route
// hanya memakai pesan terakhir. Batas 200 itu murni pagar ukuran payload; jangan
// diturunkan ke sekitar kuota harian (15 pesan), sebab satu putaran tanya-jawab
// menambah dua entri sehingga percakapan yang masih sah bisa ikut tertolak.
export const chatMessageSchema = z.object({
  messages: z
    .array(
      z
        .object({
          text: z.string().max(2000, "Pesan maksimal 2000 karakter."),
        })
        .loose()
    )
    .min(1, "Minimal satu pesan.")
    .max(200, "Riwayat percakapan terlalu panjang."),
});

// --- /api/ai/followup (POST, agen ke atas) ---
//
// `userRole` sengaja tidak ada di sini: peran ditentukan server dari sesi,
// bukan dari body. Lihat lib/api-auth.ts.
//
// Ketiga field dibiarkan opsional karena pemanggil kerap meneruskan nilai yang
// bisa kosong (mis. `item.lead_name`), dan route sudah menyiapkan teks
// penggantinya sendiri. Yang dijaga di sini murni tipe dan batas panjang —
// nilainya ikut masuk ke prompt AI.
export const followupSchema = z.object({
  leadName: z.string().max(120).optional(),
  property: z.string().max(200).optional(),
  status: z.string().max(80).optional(),
});

// --- /api/notifications/send (POST, Admin & Super Admin) ---
//
// Pengumuman resmi. `targetRole` menentukan kelompok penerima; route
// menerjemahkannya menjadi daftar user nyata dari tabel `users`, lalu memakai
// daftar itu untuk baris lonceng maupun penargetan push.
export const notificationSendSchema = z.object({
  title: z.string().trim().min(1, "Judul wajib diisi.").max(120),
  message: z.string().trim().min(1, "Isi pesan wajib diisi.").max(500),
  targetRole: z.enum(["internal", "viewer", "all"]).default("internal"),
  category: z.string().max(50).optional(),
  type: z.string().max(50).optional(),
  actionUrl: emptyToUndefined(z.string().max(300)),
});

// --- /api/support (POST, semua pengguna terautentikasi) ---
//
// Pesan bantuan dari pengguna ke seluruh admin. Hanya isi pesan yang datang
// dari klien: judul, penerima, dan pengirim ditentukan server agar pengguna
// tidak bisa menyamar atau mengarahkan pesannya ke orang lain.
//
// Batasnya diambil dari lib/support-config.ts supaya modal chat di Pengaturan
// menegakkan angka yang sama tanpa ikut menarik "next/server" ke bundel klien.
export const supportMessageSchema = z.object({
  message: z
    .string()
    .trim()
    .min(SUPPORT_MESSAGE_MIN, `Ceritakan kendala Anda minimal ${SUPPORT_MESSAGE_MIN} karakter.`)
    .max(
      SUPPORT_MESSAGE_MAX,
      `Pesan terlalu panjang; ringkas menjadi maksimal ${SUPPORT_MESSAGE_MAX} karakter.`
    ),
});

// Tambahkan di bawah agentRegisteredSchema
// --- /api/auth/register-agent (POST, publik — pendaftaran agen) ---
//
// Dipanggil oleh halaman /register/agent setelah upload KTP berhasil. Rute ini
// memakai service role sehingga tidak terhalang RLS users_insert, dan
// menangani pembuatan akun Auth, penyisipan profil, serta notifikasi ke admin
// dalam satu panggilan.
export const registerAgentSchema = z.object({
  fullName: z.string().trim().min(2, "Nama minimal 2 karakter.").max(120),
  email: z.email("Format email tidak valid."),
  phone: phoneSchema,
  password: z.string().min(6, "Password minimal 6 karakter."),
  address: z.string().trim().min(5, "Alamat terlalu pendek.").max(500),
  ktpUrl: z.string().url("URL KTP tidak valid."),
  socials: z.array(z.string().max(50)).max(10).optional().default([]),
  experience: z.string().max(50).optional().default("Tidak ada"),
  vehicle: z.string().max(50).optional().default("Motor"),
  reason: z.string().max(500).optional().default(""),
});

// --- /api/notifications/push-test (POST, Admin & Super Admin) ---
//
// Uji coba push tanpa menyentuh tabel `notifications`. Bentuknya sengaja
// menyerupai notificationSendSchema agar keduanya bisa diuji bergantian.
export const pushTestSchema = z.object({
  title: z.string().trim().min(1, "Judul wajib diisi.").max(120),
  message: z.string().trim().min(1, "Isi pesan wajib diisi.").max(500),
  targetRole: z.enum(["internal", "viewer", "all", "self"]).default("self"),
  category: z.string().max(50).optional(),
  actionUrl: emptyToUndefined(z.string().max(300)),
});

// --- /api/notifications (POST, Admin & Super Admin) ---
//
// Pengiriman terarah ke user tertentu atau ke satu kelompok role.
export const notificationCreateSchema = z
  .object({
    recipient_type: z.enum(["specific", "all_agents", "all_admins", "all_users"], {
      error: "recipient_type wajib salah satu dari: specific, all_agents, all_admins, all_users.",
    }),
    user_ids: z.array(uuidSchema).max(1000).optional(),
    type: z.string().trim().min(1, "type wajib diisi.").max(50),
    title: z.string().trim().min(1, "Judul wajib diisi.").max(120),
    message: z.string().trim().min(1, "Isi pesan wajib diisi.").max(500),
    link: emptyToUndefined(z.string().max(300)),
  })
  .refine(
    (v) => v.recipient_type !== "specific" || (v.user_ids?.length ?? 0) > 0,
    { error: "user_ids wajib diisi bila recipient_type bernilai \"specific\".", path: ["user_ids"] }
  );

// --- /api/notifications/whatsapp (POST, agen ke atas) ---
//
// `leadName`, `clientPhone`, dan `propertyInterest` dibiarkan opsional karena
// helper Fonnte sudah menyiapkan nilai penggantinya sendiri.
export const whatsappNotificationSchema = z.object({
  agentId: uuidSchema,
  leadName: z.string().max(120).optional(),
  clientPhone: z.string().max(30).optional(),
  propertyInterest: z.string().max(200).optional(),
});

// --- /api/properties/[id]/assign (PATCH, Super Admin) ---
//
// Penugasan listing ke agen. Dipisahkan dari PUT properti biasa karena aksinya
// memberi tahu orang lain: barisnya harus ditulis dengan service role, dan
// peramban tidak boleh melakukannya sendiri (RLS menolak insert notifikasi
// atas nama akun lain).
export const propertyAssignSchema = z.object({
  /** null berarti melepas penugasan. */
  assigned_to: uuidSchema.nullable(),
});

// --- /api/properties/[id]/status (PATCH, agen ke atas) ---
//
// Daftar nilainya mengikuti PropertyStatus di types/property.types.ts. Kolomnya
// bertipe enum di Postgres: nilai di luar daftar ini memicu galat 22P02, bukan
// sekadar update yang tidak berpengaruh.
export const propertyStatusSchema = z.object({
  status: z.enum(["draft", "review", "published", "sold", "rented", "archived"], {
    error: "status wajib salah satu dari: draft, review, published, sold, rented, archived.",
  }),
});

// --- /api/properties (POST, butuh izin manage_own_properties) ---
//
// Route ini menyusun sendiri nilai pengganti untuk hampir semua field — `title`
// bahkan dibentuk dari `property_type` + `listing_type` bila kosong. Karena itu
// tidak ada field yang diwajibkan di sini; yang dijaga adalah tipe dan batas
// panjang teks bebas yang akan tersimpan ke basis data.
//
// `.loose()` disengaja: body memuat puluhan field untuk tabel alamat, harga,
// spesifikasi, dan media yang tetap dibaca route secara langsung. Menyetel
// strict akan menolak permintaan yang sah setiap kali form menambah kolom.
export const propertyInsertSchema = z
  .object({
    title: z.string().max(200, "Judul maksimal 200 karakter.").optional(),
    property_type: z.string().max(50).optional(),
    listing_type: z.string().max(50).optional(),
    status: z.string().max(50).optional(),
    listing_code: z.string().max(64).optional(),
    description: z.string().max(10000, "Deskripsi maksimal 10.000 karakter.").optional(),
    selling_point: z.string().max(2000).optional(),
    youtube_url: z.string().max(300).optional(),
  })
  .loose();

// --- /api/surveys/requests (POST, viewer ke atas) ---
//
// Pengajuan survei properti oleh client. `requester_id` diisi server dari
// auth.uid(), bukan dari body; `agent_id` ditentukan server dari pemilik
// properti (assigned_to → created_by → user_id). Tanggal & jam preferensi
// opsional karena itu hanya permintaan awal — waktu final disepakati lewat WA.
export const surveyRequestSchema = z.object({
  property_id: uuidSchema,
  requester_name: z
    .string({ error: "Nama wajib diisi." })
    .trim()
    .min(2, "Nama minimal 2 karakter.")
    .max(120, "Nama maksimal 120 karakter."),
  requester_phone: phoneSchema,
  preferred_date: emptyToUndefined(z.string().max(20)),
  preferred_time: emptyToUndefined(z.string().max(10)),
  message: emptyToUndefined(z.string().max(2000, "Pesan maksimal 2000 karakter.")),
});

// --- /api/surveys/requests/[id] (PATCH, agen ke atas atau pengaju sendiri) ---
//
// Agen menandai pengajuan sebagai sudah dihubungi atau menolaknya; pengaju
// hanya boleh membatalkan miliknya sendiri (pemeriksaan itu di route, bukan
// di sini). Status 'scheduled' sengaja tidak diterima: nilai itu hanya boleh
// ditulis oleh POST /api/surveys saat jadwalnya benar-benar terbentuk.
export const surveyRequestUpdateSchema = z
  .object({
    status: z.enum(["contacted", "rejected", "cancelled"], {
      error: "Status harus salah satu dari: contacted, rejected, cancelled.",
    }),
    reject_reason: emptyToUndefined(z.string().max(500, "Alasan maksimal 500 karakter.")),
  })
  .refine(
    (v) => v.status !== "rejected" || (v.reject_reason && v.reject_reason.length > 0),
    { error: "Alasan penolakan wajib diisi.", path: ["reject_reason"] }
  );

// --- /api/surveys (POST, agen ke atas) ---
//
// Pembuatan jadwal survei. `scheduled_at` wajib di masa depan; bila dibuatkan
// dari request, route akan menyalin `client_id` dan `property_id` dari request
// tersebut. `meeting_url` wajib bila tipe survei virtual.
export const surveyCreateSchema = z
  .object({
    property_id: uuidSchema,
    request_id: emptyToUndefined(uuidSchema),
    client_id: emptyToUndefined(uuidSchema),
    client_name: z
      .string({ error: "Nama klien wajib diisi." })
      .trim()
      .min(2, "Nama klien minimal 2 karakter.")
      .max(120, "Nama klien maksimal 120 karakter."),
    client_phone: emptyToUndefined(phoneSchema),
    scheduled_at: futureDateTimeSchema,
    duration_min: z
      .number({ error: "Durasi harus berupa angka." })
      .int("Durasi harus bilangan bulat.")
      .min(15, "Durasi minimal 15 menit.")
      .max(480, "Durasi maksimal 480 menit (8 jam).")
      .default(60),
    type: z.enum(["lapangan", "virtual"], { error: "Tipe harus 'lapangan' atau 'virtual'." }).default("lapangan"),
    status: z
      .enum(["scheduled", "completed", "cancelled", "no_show"], {
        error: "Status tidak valid.",
      })
      .default("scheduled"),
    location_note: emptyToUndefined(z.string().max(500, "Catatan lokasi maksimal 500 karakter.")),
    meeting_url: emptyToUndefined(z.string().max(300, "URL meeting maksimal 300 karakter.")),
    notes: emptyToUndefined(z.string().max(2000, "Catatan maksimal 2000 karakter.")),
  })
  .refine(
    (v) => v.type !== "virtual" || (v.meeting_url && v.meeting_url.length > 0),
    { error: "URL meeting wajib diisi untuk survei virtual.", path: ["meeting_url"] }
  );

// --- /api/surveys/[id] (PATCH, agen ke atas) ---
//
// Pembaruan jadwal survei. Bila `scheduled_at` diubah, route akan mengosongkan
// `reminder_sent_at` supaya pengingat terkirim lagi di waktu yang baru.
export const surveyUpdateSchema = z
  .object({
    scheduled_at: futureDateTimeSchema.optional(),
    duration_min: z
      .number({ error: "Durasi harus berupa angka." })
      .int("Durasi harus bilangan bulat.")
      .min(15, "Durasi minimal 15 menit.")
      .max(480, "Durasi maksimal 480 menit (8 jam).")
      .optional(),
    type: z.enum(["lapangan", "virtual"], { error: "Tipe harus 'lapangan' atau 'virtual'." }).optional(),
    status: z
      .enum(["scheduled", "completed", "cancelled", "no_show"], {
        error: "Status tidak valid.",
      })
      .optional(),
    location_note: emptyToUndefined(z.string().max(500, "Catatan lokasi maksimal 500 karakter.")),
    meeting_url: emptyToUndefined(z.string().max(300, "URL meeting maksimal 300 karakter.")),
    notes: emptyToUndefined(z.string().max(2000, "Catatan maksimal 2000 karakter.")),
  })
  .refine(
    (v) => {
      // Hanya periksa bila `type` diubah menjadi 'virtual'; bila `type` tidak
      // dikirim (undefined), biarkan saja — nilai lama di basis data tetap berlaku.
      if (v.type === "virtual") {
        return v.meeting_url && v.meeting_url.length > 0;
      }
      return true;
    },
    { error: "URL meeting wajib diisi untuk survei virtual.", path: ["meeting_url"] }
  );
