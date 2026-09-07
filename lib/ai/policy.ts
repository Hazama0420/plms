import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/api-auth';
import { getClientIp, rateLimit } from '@/lib/rate-limit';
import { createAdminClient } from '@/lib/supabase/admin';
import { consume, addTokens, refundAiQuota } from '@/lib/ai-quota';
import { AI_FEATURE_REGISTRY, AIQuotaMode } from './registry';

const UNLIMITED_INT = 2_147_483_647;
const UNLIMITED_BIGINT = Number.MAX_SAFE_INTEGER;
const BURST_WINDOW_MS = 60_000;

// Hardcoded budgets (can be moved to system_settings or env)
const DAILY_TOKEN_BUDGET_PER_USER = 60_000;
const GLOBAL_DAILY_TOKEN_BUDGET = 1_500_000;

export interface AuthorizeAIOptions {
  featureKey: string;
  req: Request;
  estimatedTokens?: number;
}

export type AIGuard = 
  | { ok: true; actor: { id: string, role: string, ip: string }; feature: string; commit: (actualTokens: number) => Promise<void>; rollback: () => Promise<void> }
  | { ok: false; response: NextResponse };

export async function authorizeAI(opts: AuthorizeAIOptions): Promise<AIGuard> {
  const ip = getClientIp(opts.req);

  // 1. Authenticate actor
  const auth = await getAuthContext();

  // 3. Resolve registry feature
  const feature = AI_FEATURE_REGISTRY[opts.featureKey];
  if (!feature) {
    return { ok: false, response: NextResponse.json({ error: "Unknown AI feature" }, { status: 400 }) };
  }

  let identifier: string;
  let role: string;

  if (feature.isPublic) {
    identifier = auth ? `user:${auth.userId}` : `ip:${ip}`;
    role = auth ? auth.role : 'anon';
  } else {
    // 2. Validate account status (already blocked = null in getAuthContext)
    if (!auth) {
      return { ok: false, response: NextResponse.json({ error: "Authentication required" }, { status: 401 }) };
    }
    identifier = auth.userId;
    role = auth.role;
  }

  // 4. Load global AI configuration
  const supabase = createAdminClient();
  const { data: settings, error: settingsError } = await supabase.from('system_settings').select('key, value').like('key', 'ai_%');
  
  if (settingsError) {
    return { ok: false, response: NextResponse.json({ error: "Layanan infrastruktur AI sedang tidak tersedia." }, { status: 503 }) };
  }

  const config = settings?.reduce((acc, row) => {
    acc[row.key] = row.value;
    return acc;
  }, {} as Record<string, string>) || {};

  // 5. Master switch
  if (config['ai_master_switch'] === 'false') {
    return { ok: false, response: NextResponse.json({ error: "AI is temporarily disabled globally." }, { status: 503 }) };
  }

  // 6. Feature enabled
  const isEnabledStr = config[`ai_feature_${feature.key}_enabled`];
  const isEnabled = isEnabledStr ? isEnabledStr !== 'false' : feature.defaultEnabled;
  if (!isEnabled) {
    return { ok: false, response: NextResponse.json({ error: "This AI feature is currently disabled." }, { status: 403 }) };
  }

  // 7 & 8. starts_at & expires_at (global rollout/maintenance scheduling)
  const startsAtStr = config[`ai_feature_${feature.key}_starts_at`];
  const expiresAtStr = config[`ai_feature_${feature.key}_expires_at`];
  const now = new Date();

  if (startsAtStr) {
    const startsAt = new Date(startsAtStr);
    if (startsAt > now) {
      return { ok: false, response: NextResponse.json({ error: "This AI feature is not yet available." }, { status: 403 }) };
    }
  }
  if (expiresAtStr) {
    const expiresAt = new Date(expiresAtStr);
    if (expiresAt < now) {
      return { ok: false, response: NextResponse.json({ error: "This AI feature is no longer available." }, { status: 403 }) };
    }
  }

  // 9. Resolve user override
  let quotaMode: AIQuotaMode = 'disabled';
  let quotaLimit = 0;
  let overrideResolved = false;

  if (auth && feature.supportsUserOverride) {
    const { data: overrideData } = await supabase.from('ai_user_overrides')
      .select('*')
      .eq('user_identifier', auth.userId)
      .eq('feature', feature.key)
      .maybeSingle();

    if (overrideData && overrideData.enabled) {
      const rentalStartsAt = overrideData.starts_at ? new Date(overrideData.starts_at) : null;
      const rentalExpiresAt = overrideData.expires_at ? new Date(overrideData.expires_at) : null;
      
      const hasStarted = !rentalStartsAt || rentalStartsAt <= now;
      const hasNotExpired = !rentalExpiresAt || rentalExpiresAt > now;

      if (hasStarted && hasNotExpired) {
        quotaMode = overrideData.quota_mode as AIQuotaMode;
        quotaLimit = overrideData.quota_limit || 0;
        overrideResolved = true;
      }
    }
  }

  // 10. Resolve role entitlement
  if (!overrideResolved) {
    const customRoleQuotaStr = config[`ai_feature_${feature.key}_quota_${role}`];
    let roleQuota = feature.defaultRoleQuotas[role];

    if (customRoleQuotaStr !== undefined) {
      if (customRoleQuotaStr === 'disabled' || customRoleQuotaStr === 'unlimited') {
        roleQuota = customRoleQuotaStr;
      } else {
        const parsed = parseInt(customRoleQuotaStr, 10);
        if (!isNaN(parsed)) roleQuota = parsed;
      }
    }

    if (roleQuota === undefined || roleQuota === 'disabled') {
      quotaMode = 'disabled';
    } else if (roleQuota === 'unlimited') {
      quotaMode = 'unlimited';
    } else {
      quotaMode = 'limited';
      quotaLimit = roleQuota as number;
    }
  }

  // 11. Resolve quota mode
  if (quotaMode === 'disabled') {
    return { ok: false, response: NextResponse.json({ error: "Your role does not have access to this AI feature." }, { status: 403 }) };
  }

  // 12. Apply burst rate limit
  const burst = rateLimit(`ai:${feature.key}:${ip}`, 10, BURST_WINDOW_MS);
  if (!burst.allowed) {
    return { 
      ok: false, 
      response: NextResponse.json(
        { error: "Too many requests. Please try again later.", limitExceeded: true, retryAfterSeconds: burst.retryAfterSeconds }, 
        { status: 429, headers: { 'Retry-After': String(burst.retryAfterSeconds) } }
      ) 
    };
  }

  // 13. Claim quota slot if limited
  const tokens = Math.max(0, Math.round(opts.estimatedTokens || 0));

  if (quotaMode === 'limited') {
    // 1. Feature specific quota
    const perFeature = await consume(identifier, feature.key, quotaLimit, UNLIMITED_BIGINT, 0);
    if (!perFeature) {
      return { ok: false, response: NextResponse.json({ error: "Layanan infrastruktur AI sedang tidak tersedia." }, { status: 503 }) };
    }
    if (!perFeature.granted) {
      return { ok: false, response: NextResponse.json({ error: "Daily AI quota exceeded for this feature.", limitExceeded: true }, { status: 429 }) };
    }

    // 2. Global budget per user
    const perUser = await consume(identifier, "__total__", UNLIMITED_INT, DAILY_TOKEN_BUDGET_PER_USER, 0);
    if (!perUser) {
      await refundAiQuota(identifier, feature.key);
      return { ok: false, response: NextResponse.json({ error: "Layanan infrastruktur AI sedang tidak tersedia." }, { status: 503 }) };
    }
    if (!perUser.granted) {
      await refundAiQuota(identifier, feature.key);
      return { ok: false, response: NextResponse.json({ error: "Daily global AI token budget exceeded.", limitExceeded: true }, { status: 429 }) };
    }
  }

  // 3. System-wide budget (always applied even if unlimited to protect credentials)
  const global = await consume("__global__", "all", UNLIMITED_INT, GLOBAL_DAILY_TOKEN_BUDGET, 0);
  if (!global) {
    if (quotaMode === 'limited') {
      await refundAiQuota(identifier, feature.key);
      await refundAiQuota(identifier, "__total__");
    }
    return { ok: false, response: NextResponse.json({ error: "Layanan infrastruktur AI sedang tidak tersedia." }, { status: 503 }) };
  }
  if (!global.granted) {
    if (quotaMode === 'limited') {
      await refundAiQuota(identifier, feature.key);
      await refundAiQuota(identifier, "__total__");
    }
    return { ok: false, response: NextResponse.json({ error: "System-wide AI capacity reached.", limitExceeded: true }, { status: 429 }) };
  }

  return {
    ok: true,
    actor: { id: identifier, role, ip },
    feature: feature.key,
    async commit(actualTokens: number) {
      // Token aktual langsung dicatat tanpa dikurangi estimasi,
      // karena consume tidak lagi memesan token_count
      const tokensToAdd = Math.round(actualTokens);
      if (tokensToAdd > 0) {
        if (quotaMode === 'limited') {
          await addTokens(identifier, feature.key, tokensToAdd);
          await addTokens(identifier, "__total__", tokensToAdd);
        }
        await addTokens("__global__", "all", tokensToAdd);
      }
    },
    async rollback() {
      // Refund decreases message_count, no token rollback
      if (quotaMode === 'limited') {
        await refundAiQuota(identifier, feature.key);
        // We also refund __total__ slot, although it tracks tokens mostly, we decrement its message_count for consistency
        await refundAiQuota(identifier, "__total__");
      }
      await refundAiQuota("__global__", "all");
    }
  };
}
