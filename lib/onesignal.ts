// lib/onesignal.ts
//
// Satu-satunya pintu keluar ke OneSignal REST API.
//
// Sebelumnya tiap route menyalin blok fetch-nya sendiri, dan tiga di antaranya
// mengirim `included_segments: ["All"]` padahal maksudnya menyapa satu orang.
// Akibatnya notifikasi yang memuat nama calon pembeli tersiar ke seluruh
// pelanggan push — termasuk pengunjung publik yang kebetulan pernah menekan
// "Izinkan". Modul ini memisahkan kedua maksud itu menjadi dua fungsi berbeda
// supaya salah target tidak bisa terjadi diam-diam lagi.
//
// HANYA untuk sisi server: ONESIGNAL_REST_API_KEY sengaja tidak berawalan
// NEXT_PUBLIC_, jadi nilainya kosong bila berkas ini ikut terbundel ke klien.

const ONESIGNAL_ENDPOINT = "https://onesignal.com/api/v1/notifications";

// OneSignal membatasi jumlah alias per permintaan. Daftar penerima yang lebih
// panjang dipecah menjadi beberapa permintaan.
const MAX_ALIASES_PER_REQUEST = 2000;

export interface PushContent {
  title: string;
  message: string;
  /** URL tujuan saat notifikasi diklik. */
  url?: string | null;
  /** Muatan tambahan yang ikut terkirim ke perangkat. */
  data?: Record<string, unknown>;
}

/**
 * Hasil sebuah percobaan push, dinyatakan tegas.
 *
 * Dibuat karena `success` saja pernah menyembunyikan kerusakan berhari-hari:
 * nol penerima dilaporkan sebagai sukses, sehingga push CRM yang tidak pernah
 * mendarat di perangkat mana pun tampak persis seperti push yang berhasil.
 * Yang membedakannya sekarang adalah field ini, bukan `success`.
 */
export type PushOutcome =
  /** Setidaknya satu perangkat menerima. */
  | "delivered"
  /** Permintaannya sah, tetapi tidak ada perangkat yang cocok. BUKAN sukses. */
  | "no_recipient"
  /** Kredensial, jaringan, atau tolakan API. */
  | "failed";

export interface PushResult {
  /**
   * @deprecated Baca `outcome`. Dipertahankan agar pemanggil lama tetap jalan.
   *
   * Artinya "tidak ada kegagalan sistem" — bernilai true juga ketika tidak ada
   * satu pun perangkat yang menerima.
   */
  success: boolean;
  /** Sumber kebenaran. `no_recipient` bukan keberhasilan. */
  outcome: PushOutcome;
  /** Jumlah perangkat yang benar-benar menerima. */
  recipients: number;
  /** Terisi bila push memang tidak perlu/tidak bisa dikirim — bukan galat. */
  skipped?: string;
  error?: string;
}

function readCredentials() {
  const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
  const apiKey = process.env.ONESIGNAL_REST_API_KEY;
  if (!appId || !apiKey) return null;
  return { appId, apiKey };
}

/** Balasan OneSignal bisa berupa array pesan maupun objek per-kategori. */
function describeErrors(errors: unknown): string {
  if (!errors) return "";
  if (Array.isArray(errors)) return errors.map(String).join(", ");
  if (typeof errors === "object") return JSON.stringify(errors);
  return String(errors);
}

// Penanda bahwa permintaannya sendiri sah, hanya saja tidak ada perangkat yang
// cocok — biasanya karena penerima belum pernah mengizinkan notifikasi.
const NO_RECIPIENT_MARKERS = [
  "not subscribed",
  "no subscribed",
  "invalid_aliases",
  "invalid_external_user_ids",
  "invalid_player_ids",
];

function isNoRecipient(detail: string): boolean {
  const lower = detail.toLowerCase();
  return NO_RECIPIENT_MARKERS.some((marker) => lower.includes(marker));
}

function buildContent({ title, message, url, data }: PushContent) {
  return {
    // Dua bahasa dikirim sekaligus: OneSignal memilih sesuai bahasa perangkat,
    // dan menolak permintaan yang tidak memuat "en".
    headings: { en: title, id: title },
    contents: { en: message, id: message },
    ...(url ? { url } : {}),
    ...(data ? { data } : {}),
  };
}

async function post(
  payload: Record<string, unknown>,
  apiKey: string
): Promise<PushResult> {
  let response: Response;

  try {
    response = await fetch(ONESIGNAL_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Authorization: `Basic ${apiKey}`,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
  } catch (err) {
    return {
      success: false,
      outcome: "failed",
      recipients: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  const body = await response.json().catch(() => ({} as Record<string, unknown>));
  const detail = describeErrors((body as Record<string, unknown>)?.errors);

  // OneSignal kerap membalas 200 tetapi menyelipkan `errors`, jadi status HTTP
  // saja tidak cukup untuk menyimpulkan berhasil.
  if (!response.ok || detail) {
    if (detail && isNoRecipient(detail)) {
      return { success: true, outcome: "no_recipient", recipients: 0, skipped: detail };
    }
    return {
      success: false,
      outcome: "failed",
      recipients: 0,
      error: detail || `OneSignal membalas HTTP ${response.status}`,
    };
  }

  const recipients = Number((body as Record<string, unknown>)?.recipients) || 0;

  // Balasan sehat dengan nol penerima: permintaannya diterima, tetapi tidak ada
  // perangkat yang cocok. OneSignal tidak selalu menyertakan `errors` untuk
  // keadaan ini, jadi tanpa cabang ini ia lolos sebagai "delivered".
  return recipients > 0
    ? { success: true, outcome: "delivered", recipients }
    : {
        success: true,
        outcome: "no_recipient",
        recipients: 0,
        skipped: "OneSignal menerima permintaan tetapi melaporkan 0 penerima.",
      };
}

function chunk<T>(items: T[], size: number): T[][] {
  const groups: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    groups.push(items.slice(i, i + size));
  }
  return groups;
}

/**
 * Kirim push ke pengguna tertentu berdasarkan External ID.
 *
 * External ID di sini adalah `auth.users.id` Supabase; pendaftarannya dilakukan
 * di komponen OneSignalProvider lewat OneSignal.login(). Tanpa pendaftaran itu
 * OneSignal tidak mengenali siapa pun dan hasilnya nol penerima.
 */
export async function sendPushToUsers(
  externalIds: string[],
  content: PushContent
): Promise<PushResult> {
  const creds = readCredentials();
  if (!creds) {
    return {
      success: false,
      outcome: "failed",
      recipients: 0,
      error:
        "Kredensial OneSignal (NEXT_PUBLIC_ONESIGNAL_APP_ID / ONESIGNAL_REST_API_KEY) belum diatur.",
    };
  }

  const targets = Array.from(
    new Set(externalIds.filter((id): id is string => typeof id === "string" && id.length > 0))
  );

  if (targets.length === 0) {
    return {
      success: true,
      outcome: "no_recipient",
      recipients: 0,
      skipped: "Tidak ada penerima.",
    };
  }

  const results: PushResult[] = [];
  for (const group of chunk(targets, MAX_ALIASES_PER_REQUEST)) {
    results.push(
      await post(
        {
          app_id: creds.appId,
          // `include_aliases` + `target_channel` adalah cara SDK v16 menargetkan
          // External ID. Pendahulunya, `include_external_user_ids`, hanya
          // berlaku untuk SDK v15 dan diabaikan diam-diam di sini — itulah
          // sebabnya penargetan per-pengguna sebelumnya tidak pernah bekerja.
          target_channel: "push",
          include_aliases: { external_id: group },
          ...buildContent(content),
        },
        creds.apiKey
      )
    );
  }

  // Satu permintaan gagal membuat seluruh pengiriman dilaporkan gagal: sebagian
  // penerima tidak diketahui nasibnya, dan itu bukan keberhasilan.
  const failed = results.find((r) => r.outcome === "failed");
  if (failed) return failed;

  const recipients = results.reduce((total, r) => total + r.recipients, 0);
  const skipped = results.find((r) => r.skipped)?.skipped;

  return recipients > 0
    ? { success: true, outcome: "delivered", recipients }
    : {
        success: true,
        outcome: "no_recipient",
        recipients: 0,
        skipped: skipped ?? "Tidak ada perangkat aktif.",
      };
}

/**
 * Kirim push ke segment OneSignal.
 *
 * Dipakai hanya untuk siaran yang memang ditujukan ke publik. Untuk pesan yang
 * menyebut nama orang atau data prospek, pakai sendPushToUsers().
 */
export async function sendPushToSegments(
  segments: string[],
  content: PushContent
): Promise<PushResult> {
  const creds = readCredentials();
  if (!creds) {
    return {
      success: false,
      outcome: "failed",
      recipients: 0,
      error:
        "Kredensial OneSignal (NEXT_PUBLIC_ONESIGNAL_APP_ID / ONESIGNAL_REST_API_KEY) belum diatur.",
    };
  }

  const targets = segments.filter((s) => typeof s === "string" && s.length > 0);
  if (targets.length === 0) {
    return {
      success: true,
      outcome: "no_recipient",
      recipients: 0,
      skipped: "Tidak ada segment tujuan.",
    };
  }

  return post(
    {
      app_id: creds.appId,
      included_segments: targets,
      ...buildContent(content),
    },
    creds.apiKey
  );
}
