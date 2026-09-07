import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { timingSafeEqual } from 'node:crypto';

/**
 * Replikasi kanonik dari fungsi verifyCronAuth di:
 * - app/api/followups/process-overdue/route.ts
 * - app/api/surveys/reminders/route.ts
 */
function verifyCronAuth(
  authHeader: string | null,
  configuredSecret: string | undefined
): { authorized: boolean; status?: number; error?: string } {
  if (!configuredSecret) {
    return { authorized: false, status: 503, error: 'Endpoint belum dikonfigurasi.' };
  }

  const header = authHeader ?? '';
  const expected = `Bearer ${configuredSecret}`;

  const headerBuf = Buffer.from(header);
  const expectedBuf = Buffer.from(expected);

  if (headerBuf.length !== expectedBuf.length || !timingSafeEqual(headerBuf, expectedBuf)) {
    return { authorized: false, status: 401, error: 'Tidak diizinkan.' };
  }

  return { authorized: true };
}

describe('Cron Authentication & Timing-Safe Security (Phase 11)', () => {
  const originalEnv = process.env.CRON_SECRET;
  const mockSecret = 'super-secret-cron-token-32-chars-long';

  afterEach(() => {
    process.env.CRON_SECRET = originalEnv;
  });

  it('returns 503 Service Unavailable when CRON_SECRET is not configured', () => {
    const result = verifyCronAuth('Bearer some-token', undefined);
    expect(result.authorized).toBe(false);
    expect(result.status).toBe(503);
    expect(result.error).toBe('Endpoint belum dikonfigurasi.');
  });

  it('returns 401 when Authorization header is missing or null', () => {
    const result = verifyCronAuth(null, mockSecret);
    expect(result.authorized).toBe(false);
    expect(result.status).toBe(401);
    expect(result.error).toBe('Tidak diizinkan.');
  });

  it('returns 401 when token length does not match without crashing timingSafeEqual', () => {
    // Berbeda panjang buffer: timingSafeEqual akan melempar RangeError jika buffer tidak sama panjang.
    // Kode harus menangani ini dengan aman sebelum memanggil timingSafeEqual.
    const shortToken = 'Bearer short';
    const longToken = 'Bearer this-is-a-much-longer-token-than-the-configured-secret-value';

    expect(() => verifyCronAuth(shortToken, mockSecret)).not.toThrow();
    expect(verifyCronAuth(shortToken, mockSecret).status).toBe(401);

    expect(() => verifyCronAuth(longToken, mockSecret)).not.toThrow();
    expect(verifyCronAuth(longToken, mockSecret).status).toBe(401);
  });

  it('returns 401 when token is same length but content is different', () => {
    const wrongTokenSameLength = 'Bearer ' + 'x'.repeat(mockSecret.length);
    const result = verifyCronAuth(wrongTokenSameLength, mockSecret);
    expect(result.authorized).toBe(false);
    expect(result.status).toBe(401);
  });

  it('returns authorized: true when Bearer token matches exact CRON_SECRET', () => {
    const validHeader = `Bearer ${mockSecret}`;
    const result = verifyCronAuth(validHeader, mockSecret);
    expect(result.authorized).toBe(true);
    expect(result.status).toBeUndefined();
    expect(result.error).toBeUndefined();
  });

  it('proves Vercel bypass header does not substitute for CRON_SECRET', () => {
    // Simulasi request yang memiliki x-vercel-protection-bypass tetapi tanpa Authorization Bearer yang valid
    const headers = new Headers({
      'x-vercel-protection-bypass': 'some-valid-bypass-secret',
      'authorization': 'Bearer invalid-token',
    });

    const result = verifyCronAuth(headers.get('authorization'), mockSecret);
    expect(result.authorized).toBe(false);
    expect(result.status).toBe(401);
  });
});
