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
