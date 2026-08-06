// lib/ai-quota.ts
//
// Penegakan kuota terpusat untuk seluruh fitur AI berbayar.
//
// Sebelum berkas ini ada, hanya /api/chat yang punya batas; lima endpoint AI
// lainnya hanya dijaga `requireAuth()` sehingga satu akun agen yang login bisa
// menekan "Generate Deskripsi" ratusan kali dan menghabiskan kredit provider.
//
// Empat lapis, dari yang termurah ke termahal:
//
//   1. Rem burst per-IP (memori proses, tanpa biaya database).
//   2. Kuota permintaan harian per pengguna PER FITUR — jatah "generate" habis
//      tidak ikut mematikan "scan invoice".
//   3. Anggaran token harian per pengguna — satu parse-listing 20.000 karakter
//      jauh lebih mahal daripada satu permintaan judul, padahal sama-sama "1".
//   4. Plafon token harian seluruh sistem sebagai sekring bila kredensial bocor.
//
// Lapis 2-4 memakai fungsi Postgres `consume_ai_quota()` (migrasi 005) yang
// menggabungkan cek dan tambah dalam satu pernyataan atomik.

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

export type AiFeature =
  | "chat"
  | "generate"
  | "followup"
  | "scan_invoice"
  | "parse_listing"
  | "dashboard_summary";

/** Identitas baris penampung plafon seluruh sistem. */
const GLOBAL_IDENTIFIER = "__global__";
const GLOBAL_FEATURE = "all";

/**
 * Baris agregat per pengguna: menampung total token semua fitur sehingga satu
 * anggaran harian berlaku lintas fitur, bukan per fitur.
 */
const TOTAL_FEATURE = "__total__";

const BURST_WINDOW_MS = 60_000;

/**
 * Pengganti "tak terbatas". Dipisah karena `p_max_requests` bertipe `integer`
 * di Postgres — mengirim MAX_SAFE_INTEGER ke sana akan meluap dan menggagalkan
 * RPC-nya, sementara `p_max_tokens` bertipe bigint dan aman.
 */
const UNLIMITED_INT = 2_147_483_647;
const UNLIMITED_BIGINT = Number.MAX_SAFE_INTEGER;

// ------------------------------------------------------------
// Tabel batas: konstanta di kode, bisa ditimpa lewat .env
// ------------------------------------------------------------

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

interface FeatureLimit {
  /** Permintaan maksimal per hari, per pengguna. */
  requests: number;
  /** Permintaan maksimal per menit, per IP. */
  burst: number;
}

const DEFAULT_LIMITS: Record<AiFeature, FeatureLimit> = {
  chat: { requests: 15, burst: 10 }, // sama seperti perilaku lama /api/chat
  generate: { requests: 40, burst: 8 },
  followup: { requests: 30, burst: 8 },
  scan_invoice: { requests: 20, burst: 5 },
  parse_listing: { requests: 20, burst: 5 },
  dashboard_summary: { requests: 6, burst: 3 },
};

/** `AI_LIMIT_GENERATE=80` menaikkan batas tanpa menyentuh kode. */
function limitFor(feature: AiFeature): FeatureLimit {
  const base = DEFAULT_LIMITS[feature];
  const suffix = feature.toUpperCase();
  return {
    requests: envInt(`AI_LIMIT_${suffix}`, base.requests),
    burst: envInt(`AI_BURST_${suffix}`, base.burst),
  };
}

/**
 * Pengali per role. Agen bekerja jauh lebih banyak daripada pengunjung, dan
 * admin memakai fitur AI untuk meninjau pekerjaan banyak agen sekaligus.
 */
const ROLE_MULTIPLIER: Record<string, number> = {
  viewer: 0.5,
  client: 0.5,
  marketing: 1,
  agent: 1,
  commissioner: 1,
  admin: 3,
  super_admin: Infinity,
  superadmin: Infinity,
};

/**
 * Fitur yang batasnya tetap berlaku bagi super admin. Isinya fitur yang memang
 * hanya bisa dipanggil super admin — tanpa ini, batasnya tidak berarti apa-apa.
 */
const NO_ROLE_BYPASS = new Set<AiFeature>(["dashboard_summary"]);

const DAILY_TOKEN_BUDGET_PER_USER = envInt("AI_DAILY_TOKEN_BUDGET", 60_000);
const GLOBAL_DAILY_TOKEN_BUDGET = envInt("AI_GLOBAL_DAILY_TOKEN_BUDGET", 1_500_000);

// ------------------------------------------------------------
// Estimasi token
// ------------------------------------------------------------
//
// aiService.generateWithFallback() hanya mengembalikan { text, provider } —
// tidak ada metadata usage dari provider. Rasio ~4 karakter per token cukup
// akurat untuk penagihan internal dan tidak butuh tokenizer sebagai dependensi.

export function estimateTokens(input: string | null | undefined): number {
  if (!input) return 0;
  return Math.ceil(input.length / 4);
}

/** Untuk gambar: 1 KB berkas ≈ 1 token, kasar tapi konsisten. */
export function estimateImageTokens(bytes: number): number {
  return Math.ceil(Math.max(bytes, 0) / 1000);
}

// ------------------------------------------------------------
// Nama fitur untuk pesan penolakan
// ------------------------------------------------------------

const FEATURE_LABEL: Record<AiFeature, string> = {
  chat: "chat AI",
  generate: "generator teks AI",
  followup: "saran follow-up AI",
  scan_invoice: "pemindai kuitansi AI",
  parse_listing: "pembaca listing AI",
  dashboard_summary: "ringkasan eksekutif AI",
};

/**
 * Tengah malam UTC berikutnya. Sengaja UTC, bukan waktu server: penghitungnya
 * memakai `current_date` Postgres yang juga UTC, jadi memakai waktu lokal akan
 * menjanjikan reset pada jam yang salah.
 */
function nextReset(): Date {
  const reset = new Date();
  reset.setUTCHours(24, 0, 0, 0);
  return reset;
}

function nextResetIso(): string {
  return nextReset().toISOString();
}

function secondsUntilReset(): number {
  return Math.max(1, Math.ceil((nextReset().getTime() - Date.now()) / 1000));
}

// ------------------------------------------------------------
// Penolakan
// ------------------------------------------------------------

export interface QuotaInfo {
  used: number;
  limit: number;
  resetsAt: string;
}

/**
 * Bentuk respons 429 dipertahankan persis seperti /api/chat versi lama:
 * AIChatWidget mendeteksi batas lewat kunci `limitExceeded`.
 */
function reject(message: string, quota: QuotaInfo): NextResponse {
  const retryAfterSeconds = secondsUntilReset();
  return NextResponse.json(
    { error: message, limitExceeded: true, retryAfterSeconds, quota },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
  );
}

export type QuotaGuard =
  | { ok: true; commit: (actualTokens: number) => Promise<void> }
  | { ok: false; response: NextResponse };

/** Tidak ada yang perlu dicatat — dipakai saat penghitung tidak tersedia. */
const noopCommit = async () => {};

// ------------------------------------------------------------
// Pembungkus RPC
// ------------------------------------------------------------

interface ConsumeResult {
  allowed: boolean;
  requests_used: number;
  tokens_used: number;
}

/**
 * Mengembalikan null bila penghitung tidak bisa dihubungi. Pemanggil sengaja
 * memilih fail-open dalam kasus itu: migrasi 005 dijalankan manual lewat SQL
 * Editor, jadi database yang belum dimigrasi tidak boleh mematikan seluruh
 * fitur AI. Rem burst per-IP tetap berlaku sebagai jaring pengaman.
 */
async function consume(
  identifier: string,
  feature: string,
  maxRequests: number,
  maxTokens: number,
  tokens: number
): Promise<ConsumeResult | null> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc("consume_ai_quota", {
      p_identifier: identifier,
      p_feature: feature,
      p_max_requests: Math.min(maxRequests, UNLIMITED_INT),
      p_max_tokens: Math.min(maxTokens, UNLIMITED_BIGINT),
      p_tokens: Math.max(0, Math.round(tokens)),
    });

    if (error) {
      console.error("[ai-quota] consume_ai_quota gagal:", error.message);
      return null;
    }

    const row = Array.isArray(data) ? data[0] : data;
    return (row as ConsumeResult) ?? null;
  } catch (err) {
    console.error("[ai-quota] penghitung tidak tersedia:", err);
    return null;
  }
}

/** Menambah token setelah AI menjawab, tanpa menaikkan hitungan permintaan. */
async function addTokens(
  identifier: string,
  feature: string,
  tokens: number
): Promise<void> {
  if (!Number.isFinite(tokens) || tokens <= 0) return;
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.rpc("add_ai_tokens", {
      p_identifier: identifier,
      p_feature: feature,
      p_tokens: Math.round(tokens),
    });
    if (error) console.error("[ai-quota] add_ai_tokens gagal:", error.message);
  } catch (err) {
    console.error("[ai-quota] add_ai_tokens tidak tersedia:", err);
  }
}

// ------------------------------------------------------------
// enforceAiQuota()
// ------------------------------------------------------------

export interface EnforceAiQuotaOptions {
  feature: AiFeature;
  req: Request;
  /** null untuk pengunjung yang belum login — kuota jatuh ke alamat IP. */
  userId?: string | null;
  role?: string | null;
  /** Perkiraan token prompt; selisihnya dikoreksi lewat commit(). */
  estimatedTokens?: number;
}

/**
 * Pola pemakaian:
 *
 *   const quota = await enforceAiQuota({ feature: "generate", req, userId, role,
 *                                        estimatedTokens: estimateTokens(prompt) });
 *   if (!quota.ok) return quota.response;
 *   const result = await aiService.generateWithFallback(prompt);
 *   await quota.commit(estimateTokens(result.text));
 */
export async function enforceAiQuota(
  opts: EnforceAiQuotaOptions
): Promise<QuotaGuard> {
  const { feature, req, userId, role, estimatedTokens = 0 } = opts;

  const limits = limitFor(feature);
  const rawMultiplier = ROLE_MULTIPLIER[role ?? ""] ?? 1;

  // Super admin lewat sepenuhnya — termasuk rem burst, karena merekalah yang
  // menguji fitur berbayar ini dan tidak boleh terkunci dari sistemnya sendiri.
  //
  // Pengecualiannya fitur di NO_ROLE_BYPASS: /api/dashboard/summary kini hanya
  // bisa diakses super admin, jadi kalau mereka ikut dilewati batasnya menjadi
  // mati sama sekali dan memuat ulang dashboard tetap memanggil AI tiap kali.
  if (rawMultiplier === Infinity && !NO_ROLE_BYPASS.has(feature)) {
    return { ok: true, commit: noopCommit };
  }

  // Infinity yang lolos ke sini berasal dari fitur NO_ROLE_BYPASS; dijadikan 1
  // agar perhitungan di bawah tidak menghasilkan batas Infinity.
  const multiplier = rawMultiplier === Infinity ? 1 : rawMultiplier;

  // Lapis 1 — rem burst per-IP. Murah, tanpa database, menahan skrip yang
  // menembak berulang kali dalam hitungan detik.
  const ip = getClientIp(req);
  const burst = rateLimit(`ai:${feature}:${ip}`, limits.burst, BURST_WINDOW_MS);
  if (!burst.allowed) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: `Terlalu banyak permintaan ${FEATURE_LABEL[feature]}. Coba lagi sebentar.`,
          limitExceeded: true,
          retryAfterSeconds: burst.retryAfterSeconds,
        },
        {
          status: 429,
          headers: { "Retry-After": String(burst.retryAfterSeconds) },
        }
      ),
    };
  }

  // Identitas kuota harian: akun bila login, kalau tidak alamat IP. Pengunjung
  // di belakang NAT yang sama memang berbagi jatah — itu konsekuensi yang
  // diterima agar chat publik tetap bisa dibatasi tanpa memaksa login.
  const identifier = userId ? `user:${userId}` : `ip:${ip}`;

  const maxRequests = Math.max(1, Math.floor(limits.requests * multiplier));
  const maxTokens = Math.max(
    1,
    Math.floor(DAILY_TOKEN_BUDGET_PER_USER * multiplier)
  );

  const tokens = Math.max(0, Math.round(estimatedTokens));

  // Lapis 2 — batas permintaan harian per fitur. Token pada baris ini hanya
  // dicatat untuk pelaporan, bukan penegakan; penegakan token ada di lapis 3
  // agar satu anggaran berlaku lintas fitur.
  const perFeature = await consume(
    identifier,
    feature,
    maxRequests,
    UNLIMITED_BIGINT,
    tokens
  );

  if (perFeature && !perFeature.allowed) {
    return {
      ok: false,
      response: reject(
        `Batas harian ${FEATURE_LABEL[feature]} sudah tercapai (${maxRequests} permintaan). ` +
          `Kuota direset otomatis tengah malam.`,
        {
          used: perFeature.requests_used,
          limit: maxRequests,
          resetsAt: nextResetIso(),
        }
      ),
    };
  }

  // Lapis 3 — anggaran token harian, satu ember untuk semua fitur. Inilah yang
  // menahan permintaan besar: 20 parse-listing panjang bisa lebih mahal
  // daripada 40 permintaan judul singkat.
  const perUser = await consume(
    identifier,
    TOTAL_FEATURE,
    UNLIMITED_INT,
    maxTokens,
    tokens
  );

  if (perUser && !perUser.allowed) {
    return {
      ok: false,
      response: reject(
        `Anggaran token AI harian Anda sudah habis (${maxTokens.toLocaleString("id-ID")} token). ` +
          `Kuota direset otomatis tengah malam.`,
        {
          used: perUser.tokens_used,
          limit: maxTokens,
          resetsAt: nextResetIso(),
        }
      ),
    };
  }

  // Lapis 4 — sekring seluruh sistem. Melindungi tagihan bila ada kredensial
  // bocor atau satu bug memicu panggilan berulang dari banyak akun sekaligus.
  const global = await consume(
    GLOBAL_IDENTIFIER,
    GLOBAL_FEATURE,
    UNLIMITED_INT,
    GLOBAL_DAILY_TOKEN_BUDGET,
    tokens
  );

  if (global && !global.allowed) {
    console.warn(
      `[ai-quota] plafon token harian sistem terlampaui: ${global.tokens_used}`
    );
    return {
      ok: false,
      response: reject(
        "Layanan AI mencapai batas pemakaian harian sistem. Silakan coba lagi besok.",
        {
          used: global.tokens_used,
          limit: GLOBAL_DAILY_TOKEN_BUDGET,
          resetsAt: nextResetIso(),
        }
      ),
    };
  }

  return {
    ok: true,
    async commit(actualTokens: number) {
      // Selisih antara pemakaian sebenarnya dan estimasi prompt yang sudah
      // dicatat di atas. Negatif diabaikan — meteran tidak pernah turun.
      const delta = Math.round(actualTokens) - tokens;
      if (delta <= 0) return;
      await Promise.all([
        addTokens(identifier, feature, delta),
        addTokens(identifier, TOTAL_FEATURE, delta),
        addTokens(GLOBAL_IDENTIFIER, GLOBAL_FEATURE, delta),
      ]);
    },
  };

}


