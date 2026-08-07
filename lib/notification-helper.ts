// lib/notification-helper.ts
//
// Pengirim notifikasi sistem: satu baris di tabel `notifications` (lonceng web)
// plus satu push ke perangkat penerima.
//
// Push-nya ditujukan ke External ID penerima lewat lib/onesignal.ts. Versi lama
// memakai segment "All", sehingga pesan seperti "X tertarik dengan listing Y"
// tersiar ke seluruh pelanggan push, bukan ke agen yang bersangkutan.
//
// Tipe notifikasi dan sakelar preferensi yang mengendalikannya tidak lagi
// ditulis manual di sini, melainkan diambil dari lib/notification-events.ts —
// lihat berkas itu untuk alasannya.

import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToUsers } from "@/lib/onesignal";
import {
  EVENT_SPECS,
  type NotificationEventName,
} from "@/lib/notification-events";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Ejaan role admin sebagaimana TERSIMPAN di kolom `users.role`.
 *
 * Bukan hasil normalizeRole(): penyeragaman itu memetakan nilai yang KELUAR
 * dari database menjadi satu bentuk aplikasi, sedangkan daftar ini dipakai
 * sebagai filter `.in()` yang masuk KE database — nilainya harus persis seperti
 * yang tersimpan. Data produksi memuat kedua ejaan Super Admin, dan kueri yang
 * hanya mencocokkan "super_admin" diam-diam melewatkan sebagian admin.
 */
const ADMIN_ROLE_SPELLINGS = ["super_admin", "superadmin", "admin"];

/**
 * Bentuk siap-pakai untuk kueri lain yang perlu menyertakan admin di dalam
 * kelompok peran yang lebih luas — mis. ROLE_GROUPS.internal pada endpoint
 * pengumuman. Dibagikan agar ejaan Super Admin diperbaiki di satu tempat saja.
 */
export const ADMIN_ROLES_FOR_QUERY: readonly string[] = ADMIN_ROLE_SPELLINGS;

/**
 * Daftar id seluruh admin — penerima untuk kejadian yang menuntut tindakan
 * administratif (permintaan bantuan, pendaftaran agen baru, pengumuman).
 *
 * Mengembalikan array kosong bila kueri gagal; pemanggil yang menganggap
 * "tidak ada admin" sebagai kondisi galat harus memeriksanya sendiri — helper
 * ini sengaja tidak melempar agar satu kegagalan notifikasi tidak menjatuhkan
 * alur utama yang memanggilnya.
 */
export async function getAdminRecipientIds(
  client: SupabaseClient
): Promise<string[]> {
  const { data, error } = await client
    .from("users")
    .select("id")
    .in("role", ADMIN_ROLE_SPELLINGS);

  if (error) {
    console.error("[notifikasi] Gagal mengambil daftar admin:", error.message);
    return [];
  }

  return (data ?? []).map((row) => row.id as string).filter(Boolean);
}

export interface NotifyEventParams {
  event: NotificationEventName;
  /**
   * Calon penerima (auth.users.id). Nilai kosong/duplikat dibersihkan di dalam,
   * jadi pemanggil boleh mengirim `[assigned_to, created_by]` apa adanya.
   */
  userIds: (string | null | undefined)[];
  title: string;
  message: string;
  /** URL tujuan saat notifikasi diklik. */
  link?: string;
  /**
   * Pengirim, bila notifikasi dipicu oleh user lain.
   * Kolom `sender_id` berstatus NOT NULL; bila kosong dipakai penerima sendiri.
   */
  senderId?: string;
}

export interface NotifyEventResult {
  /** false hanya bila baris lonceng gagal tersimpan. */
  success: boolean;
  /** Jumlah baris lonceng yang tersimpan. */
  delivered: number;
  /** Jumlah penerima yang dilewati karena preferensinya. */
  suppressed: number;
  /** Kegagalan push tidak menggagalkan keseluruhan — dilaporkan terpisah. */
  pushError?: string;
  error?: string;
}

/**
 * Kirim satu event notifikasi ke sejumlah penerima sekaligus.
 *
 *   await notifyEvent({
 *     event: "property.status",
 *     userIds: [property.assigned_to, property.created_by],
 *     title: "Status listing diperbarui",
 *     message: `${property.title} kini berstatus ${status}`,
 *     link: `/properties/${property.id}`,
 *     senderId: actorId,
 *   });
 */
export async function notifyEvent({
  event,
  userIds,
  title,
  message,
  link,
  senderId,
}: NotifyEventParams): Promise<NotifyEventResult> {
  // Dedupe penting untuk event seperti property.status yang mengirim ke
  // assigned_to + created_by — pada listing milik sendiri keduanya orang yang
  // sama, dan tanpa ini penerimanya dapat dua notifikasi identik.
  const recipients = [...new Set(userIds.filter((id): id is string => Boolean(id)))];

  if (recipients.length === 0) {
    return { success: true, delivered: 0, suppressed: 0 };
  }

  const spec = EVENT_SPECS[event];

  let supabaseAdmin: ReturnType<typeof createAdminClient>;
  try {
    // Memakai createAdminClient() agar kegagalan konfigurasi terlihat sebagai
    // galat yang jelas. Kode lama diam-diam mundur ke kunci anon, yang tunduk
    // pada RLS sehingga insert untuk user lain ditolak tanpa penjelasan.
    supabaseAdmin = createAdminClient();
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error("[notifikasi] Klien admin Supabase tidak tersedia:", detail);
    return { success: false, delivered: 0, suppressed: 0, error: detail };
  }

  try {
    // 1. Ambil preferensi seluruh penerima dalam SATU query.
    const { data: userDocs, error: prefError } = await supabaseAdmin
      .from("users")
      .select("id, preferences")
      .in("id", recipients);

    if (prefError) {
      console.error("[notifikasi] Gagal membaca preferensi:", prefError.message);
      return { success: false, delivered: 0, suppressed: 0, error: prefError.message };
    }

    const prefsById = new Map<string, Record<string, unknown>>(
      (userDocs ?? []).map((row) => [
        row.id as string,
        (row.preferences ?? {}) as Record<string, unknown>,
      ])
    );

    // 2. Saring penerima yang mematikan sakelar untuk event ini.
    //
    // Sengaja `=== false`: preferensi yang belum pernah disimpan bernilai
    // undefined dan harus tetap menerima notifikasi.
    const allowed = spec.prefKey
      ? recipients.filter((id) => prefsById.get(id)?.[spec.prefKey!] !== false)
      : recipients;

    const suppressed = recipients.length - allowed.length;

    if (allowed.length === 0) {
      return { success: true, delivered: 0, suppressed };
    }

    // 3. Simpan baris lonceng web (satu insert untuk semua penerima).
    //
    // `link` dan `action_url` diisi nilai sama: lonceng membaca
    // `notification.link || action_url`, dan /api/notifications/send sudah
    // memakai pola dua kolom ini. Menulis salah satunya saja membuat perilaku
    // klik bergantung pada endpoint mana yang membuat barisnya.
    const { error: dbError } = await supabaseAdmin.from("notifications").insert(
      allowed.map((userId) => ({
        user_id: userId,
        sender_id: senderId ?? userId,
        type: spec.uiType,
        title,
        message,
        link: link ?? null,
        action_url: link ?? null,
        is_read: false,
      }))
    );

    if (dbError) {
      console.error("[notifikasi] Gagal menyimpan baris lonceng:", dbError.message);
      return { success: false, delivered: 0, suppressed, error: dbError.message };
    }

    // 4. Push hanya ke penerima yang tidak mematikan sakelar push.
    //
    // Sakelar push dipisahkan dari lonceng: mematikan push tidak boleh ikut
    // menghilangkan riwayat notifikasi di dalam aplikasi.
    const pushTargets = allowed.filter(
      (id) => prefsById.get(id)?.push_notifications !== false
    );

    if (pushTargets.length === 0) {
      return { success: true, delivered: allowed.length, suppressed };
    }

    const push = await sendPushToUsers(pushTargets, {
      title,
      message,
      url: link,
      data: { type: spec.uiType, event, link: link ?? null },
    });

    if (!push.success) {
      // Bukan kegagalan fatal: barisnya sudah tersimpan dan tetap muncul di
      // lonceng web meski perangkat tidak menerima push.
      console.warn("[notifikasi] Push gagal dikirim:", push.error);
      return {
        success: true,
        delivered: allowed.length,
        suppressed,
        pushError: push.error,
      };
    }

    return { success: true, delivered: allowed.length, suppressed };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error("[notifikasi] Kesalahan tak terduga:", detail);
    return { success: false, delivered: 0, suppressed: 0, error: detail };
  }
}

// ============================================================
// Pembungkus lama — satu penerima.
// ============================================================

interface TriggerNotificationProps {
  /** ID user penerima (auth.users.id) — sekaligus External ID di OneSignal. */
  userId: string;
  title: string;
  message: string;
  event: NotificationEventName;
  link?: string;
  senderId?: string;
}

export interface NotificationResult {
  success: boolean;
  /** true bila dibatalkan oleh preferensi penerima. */
  suppressed?: boolean;
  pushError?: string;
  error?: string;
}

/**
 * Bentuk ringkas untuk penerima tunggal. Sepenuhnya berjalan di atas
 * notifyEvent() — tidak ada jalur pengiriman kedua.
 */
export async function sendSystemNotification({
  userId,
  event,
  ...rest
}: TriggerNotificationProps): Promise<NotificationResult> {
  if (!userId) {
    return { success: false, error: "userId wajib diisi." };
  }

  const result = await notifyEvent({ event, userIds: [userId], ...rest });

  return {
    success: result.success,
    suppressed: result.suppressed > 0,
    pushError: result.pushError,
    error: result.error,
  };
}
