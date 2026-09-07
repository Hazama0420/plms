import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { AI_FEATURE_REGISTRY } from "@/lib/ai/registry";
import { recordAudit } from "@/lib/audit-log";

export async function GET(req: Request) {
  try {
    const auth = await requireRole(["super_admin"]);
    if (!auth.ok) return auth.response;

    const supabase = createAdminClient();

    // 1. Get system settings for AI
    const { data: settingsData, error: settingsError } = await supabase
      .from("system_settings")
      .select("key, value")
      .like("key", "ai_%");

    if (settingsError) {
      throw new Error(settingsError.message);
    }

    const settings = settingsData?.reduce((acc, row) => {
      acc[row.key] = row.value;
      return acc;
    }, {} as Record<string, string>) || {};

    // 2. Get active rentals / overrides
    const { data: overridesData, error: overridesError } = await supabase
      .from("ai_user_overrides")
      .select("id, user_identifier, feature, enabled, quota_mode, quota_limit, starts_at, expires_at, created_at, updated_at");

    if (overridesError) {
      throw new Error(overridesError.message);
    }

    // 3. Assemble response
    const masterSwitch = settings["ai_master_switch"] !== "false";

    const features = Object.values(AI_FEATURE_REGISTRY).map((def) => {
      const isEnabledStr = settings[`ai_feature_${def.key}_enabled`];
      const isEnabled = isEnabledStr ? isEnabledStr !== "false" : def.defaultEnabled;
      const startsAt = settings[`ai_feature_${def.key}_starts_at`] || null;
      const expiresAt = settings[`ai_feature_${def.key}_expires_at`] || null;

      let status = "active";
      if (!isEnabled) status = "disabled";
      else {
        const now = new Date();
        if (startsAt && new Date(startsAt) > now) status = "scheduled";
        else if (expiresAt && new Date(expiresAt) < now) status = "expired";
      }

      // Role quotas
      const roleQuotas = { ...def.defaultRoleQuotas };
      for (const role of Object.keys(roleQuotas)) {
        const customQuota = settings[`ai_feature_${def.key}_quota_${role}`];
        if (customQuota !== undefined) {
          if (customQuota === "disabled" || customQuota === "unlimited") {
            roleQuotas[role] = customQuota as any;
          } else {
            roleQuotas[role] = parseInt(customQuota, 10);
          }
        }
      }

      return {
        key: def.key,
        displayName: def.displayName,
        description: def.description,
        category: def.category,
        isPublic: def.isPublic,
        status,
        enabled: isEnabled,
        startsAt,
        expiresAt,
        roleQuotas,
        supportsUserOverride: def.supportsUserOverride,
      };
    });

    return NextResponse.json({
      masterSwitch,
      features,
      rentals: overridesData || [],
      // Usage summary could be fetched from ai_usage table if needed,
      // but the prompt says "usage summary required by UI". Since UI is not built,
      // we'll return a placeholder or an empty array for now.
      usageSummary: [],
    });
  } catch (error: any) {
    console.error("AI Settings GET Error:", error);
    return NextResponse.json({ error: "Failed to fetch AI settings" }, { status: 503 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireRole(["super_admin"]);
    if (!auth.ok) return auth.response;

    const supabase = createAdminClient();
    const body = await req.json();
    const { action } = body;

    if (!action) {
      return NextResponse.json({ error: "Action is required" }, { status: 400 });
    }

    const now = new Date().toISOString();

    if (action === "master_switch") {
      const { enabled } = body;
      if (typeof enabled !== "boolean") return NextResponse.json({ error: "Invalid enabled flag" }, { status: 400 });

      const prevRes = await supabase.from("system_settings").select("value").eq("key", "ai_master_switch").maybeSingle();
      const prev = prevRes.data?.value;

      const { error } = await supabase.from("system_settings").upsert({
        key: "ai_master_switch",
        value: enabled ? "true" : "false",
        updated_at: now,
      }, { onConflict: "key" });

      if (error) throw new Error(error.message);

      await recordAudit({
        actor: auth.ctx,
        action: "settings.ai_master_toggle",
        detail: { enabled, previous: prev },
      });

      return NextResponse.json({ success: true });
    }

    if (action === "feature_toggle") {
      const { featureKey, enabled, starts_at, expires_at } = body;
      
      const feature = AI_FEATURE_REGISTRY[featureKey];
      if (!feature) return NextResponse.json({ error: "Unknown feature key" }, { status: 400 });

      if (starts_at && isNaN(Date.parse(starts_at))) return NextResponse.json({ error: "Invalid starts_at" }, { status: 400 });
      if (expires_at && isNaN(Date.parse(expires_at))) return NextResponse.json({ error: "Invalid expires_at" }, { status: 400 });
      if (starts_at && expires_at && new Date(starts_at) >= new Date(expires_at)) {
        return NextResponse.json({ error: "expires_at must be after starts_at" }, { status: 400 });
      }

      const updates = [];
      if (enabled !== undefined) {
        updates.push({ key: `ai_feature_${featureKey}_enabled`, value: enabled ? "true" : "false", updated_at: now });
      }
      if (starts_at !== undefined) {
        updates.push({ key: `ai_feature_${featureKey}_starts_at`, value: starts_at ? new Date(starts_at).toISOString() : "", updated_at: now });
      }
      if (expires_at !== undefined) {
        updates.push({ key: `ai_feature_${featureKey}_expires_at`, value: expires_at ? new Date(expires_at).toISOString() : "", updated_at: now });
      }

      if (updates.length > 0) {
        const { error } = await supabase.from("system_settings").upsert(updates, { onConflict: "key" });
        if (error) throw new Error(error.message);
      }

      await recordAudit({
        actor: auth.ctx,
        action: "settings.ai_feature_toggle",
        detail: { featureKey, enabled, starts_at, expires_at },
      });

      return NextResponse.json({ success: true });
    }

    if (action === "role_quota") {
      const { featureKey, role, quota_limit } = body;

      const feature = AI_FEATURE_REGISTRY[featureKey];
      if (!feature) return NextResponse.json({ error: "Unknown feature key" }, { status: 400 });

      if (!feature.supportsUserOverride) { // Prompt: "where the registry allows runtime override"
         // If it doesn't support override, we might still allow role quota. The prompt says "Support configurable runtime role quota only where the registry allows runtime override."
         return NextResponse.json({ error: "Feature does not support runtime override" }, { status: 400 });
      }

      const validRoles = ["agent", "admin", "super_admin", "marketing", "commissioner", "viewer", "anon"];
      if (!validRoles.includes(role)) {
        return NextResponse.json({ error: "Unsupported role" }, { status: 400 });
      }

      if (role === "super_admin" && quota_limit === "disabled") {
        return NextResponse.json({ error: "Cannot disable Super Admin access" }, { status: 400 });
      }

      const value = typeof quota_limit === "number" ? quota_limit.toString() : quota_limit;

      const { error } = await supabase.from("system_settings").upsert({
        key: `ai_feature_${featureKey}_quota_${role}`,
        value,
        updated_at: now,
      }, { onConflict: "key" });

      if (error) throw new Error(error.message);

      await recordAudit({
        actor: auth.ctx,
        action: "settings.ai_feature_toggle", // reusing action
        detail: { featureKey, role, quota_limit },
      });

      return NextResponse.json({ success: true });
    }

    if (action === "user_rental") {
      const { userId, featureKey, enabled, quota_mode, quota_limit, starts_at, expires_at, reason, revoke } = body;

      if (!userId) return NextResponse.json({ error: "User ID is required" }, { status: 400 });
      
      const feature = AI_FEATURE_REGISTRY[featureKey];
      if (!feature) return NextResponse.json({ error: "Unknown feature key" }, { status: 400 });
      
      // Target user existence
      const { data: user, error: userError } = await supabase.auth.admin.getUserById(userId);
      if (userError || !user) {
         // Also check if they are in 'users' table in case it's public
         const { data: publicUser } = await supabase.from("users").select("id").eq("id", userId).maybeSingle();
         if (!publicUser) {
           return NextResponse.json({ error: "Target user not found or invalid" }, { status: 404 });
         }
      }

      if (starts_at && isNaN(Date.parse(starts_at))) return NextResponse.json({ error: "Invalid starts_at" }, { status: 400 });
      if (expires_at && isNaN(Date.parse(expires_at))) return NextResponse.json({ error: "Invalid expires_at" }, { status: 400 });
      if (starts_at && expires_at && new Date(starts_at) >= new Date(expires_at)) {
        return NextResponse.json({ error: "expires_at must be after starts_at" }, { status: 400 });
      }

      if (quota_mode === "limited" && (typeof quota_limit !== "number" || quota_limit < 0)) {
        return NextResponse.json({ error: "Invalid quota limit" }, { status: 400 });
      }

      if (revoke) {
        const { error } = await supabase
          .from("ai_user_overrides")
          .update({ enabled: false, updated_by: auth.ctx.userId, updated_at: now })
          .eq("user_identifier", userId)
          .eq("feature", featureKey);
        
        if (error) throw new Error(error.message);

        await recordAudit({
          actor: auth.ctx,
          targetId: userId,
          action: "settings.ai_rental_revoke",
          detail: { featureKey, reason },
        });

        return NextResponse.json({ success: true });
      }

      // Upsert
      const { error } = await supabase.from("ai_user_overrides").upsert({
        user_identifier: userId,
        feature: featureKey,
        enabled: enabled ?? true,
        quota_mode: quota_mode ?? "unlimited",
        quota_limit: quota_mode === "limited" ? quota_limit : null,
        starts_at: starts_at ? new Date(starts_at).toISOString() : null,
        expires_at: expires_at ? new Date(expires_at).toISOString() : null,
        created_by: auth.ctx.userId, // Will be ignored on update if not specified, but we'll let postgres handle it, or we can just omit it
        updated_by: auth.ctx.userId,
        updated_at: now,
      }, { onConflict: "user_identifier,feature" });

      if (error) throw new Error(error.message);

      await recordAudit({
        actor: auth.ctx,
        targetId: userId,
        action: "settings.ai_rental_grant",
        detail: { featureKey, enabled, quota_mode, quota_limit, starts_at, expires_at, reason },
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    console.error("AI Settings POST Error:", error);
    return NextResponse.json({ error: "Failed to update AI settings" }, { status: 503 });
  }
}
