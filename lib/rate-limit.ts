// lib/rate-limit.ts
//
// Pembatas laju sederhana berbasis memori proses.
//
// Dipakai untuk endpoint yang WAJIB tetap publik (form inquiry & chat AI
// pengunjung) agar tidak bisa dipakai membakar kuota Gemini/Groq/Fonnte.
//
// Catatan penyebaran: penyimpanan ada di memori tiap instance. Pada serverless
// dengan banyak instance, batas efektifnya adalah (limit × jumlah instance).
// Ini disengaja sebagai rem darurat berbiaya nol. Untuk penegakan ketat lintas
// instance, pindahkan penyimpanan ke Redis/Upstash atau tabel Postgres.

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Bersihkan entri kedaluwarsa sesekali agar Map tidak tumbuh tanpa batas.
function sweep(now: number) {
  if (buckets.size < 5000) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * @param key       Pengenal unik (mis. "leads:1.2.3.4")
 * @param limit     Jumlah permintaan maksimal per jendela waktu
 * @param windowMs  Panjang jendela waktu dalam milidetik
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  return {
    allowed: true,
    remaining: limit - existing.count,
    retryAfterSeconds: 0,
  };
}

/** Mengambil IP klien dari header proxy/CDN. */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}
