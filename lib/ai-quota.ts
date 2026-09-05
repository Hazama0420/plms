// lib/ai-quota.ts
//
// Lapis 2-4 memakai fungsi Postgres `consume_ai_quota()` yang
// menggabungkan cek dan tambah dalam satu pernyataan atomik.

import { createAdminClient } from "@/lib/supabase/admin";

const UNLIMITED_INT = 2_147_483_647;
const UNLIMITED_BIGINT = Number.MAX_SAFE_INTEGER;

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
// Pembungkus RPC
// ------------------------------------------------------------

interface ConsumeResult {
  granted: boolean;
  requests_used: number;
  tokens_used: number;
}

/**
 * Mengembalikan null bila penghitung tidak bisa dihubungi. Pemanggil sengaja
 * memilih fail-open dalam kasus itu: migrasi 005 dijalankan manual lewat SQL
 * Editor, jadi database yang belum dimigrasi tidak boleh mematikan seluruh
 * fitur AI. Rem burst per-IP tetap berlaku sebagai jaring pengaman.
 */
export async function consume(
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
      p_tokens: 0,
      p_usage_date: null,
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
export async function addTokens(
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
      p_usage_date: null,
    });
    if (error) console.error("[ai-quota] add_ai_tokens gagal:", error.message);
  } catch (err) {
    console.error("[ai-quota] add_ai_tokens tidak tersedia:", err);
  }
}

export async function refundAiQuota(
  identifier: string,
  feature: string
): Promise<void> {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.rpc("refund_ai_quota", {
      p_identifier: identifier,
      p_feature: feature,
      p_usage_date: null,
    });
    if (error) console.error("[ai-quota] refund_ai_quota gagal:", error.message);
  } catch (err) {
    console.error("[ai-quota] refund_ai_quota tidak tersedia:", err);
  }
}
