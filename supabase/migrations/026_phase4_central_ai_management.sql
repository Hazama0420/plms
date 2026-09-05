-- ============================================================
-- 026_phase4_central_ai_management.sql
-- ============================================================
--
-- PHASE 4 - CENTRAL AI MANAGEMENT SYSTEM (STAGE 1 MIGRATION)
--
-- This migration implements:
-- 1. ai_user_overrides table for rental and quotas.
-- 2. Strict RLS isolation blocking admin from AI keys in system_settings.
-- 3. New 6-argument consume_ai_quota with atomic lock and granted flag.
-- 4. New add_ai_tokens and refund_ai_quota supporting Asia/Jakarta dates.
--
-- JALANKAN DI: Supabase Dashboard -> SQL Editor
-- ============================================================

-- ------------------------------------------------------------
-- 1. AI USER OVERRIDES TABLE
-- ------------------------------------------------------------
create table if not exists public.ai_user_overrides (
  id uuid primary key default gen_random_uuid(),
  user_identifier text not null,
  feature text,
  rental_active boolean not null default false,
  rental_expires_at timestamptz,
  custom_quota integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_identifier, feature)
);

alter table public.ai_user_overrides enable row level security;
revoke all on public.ai_user_overrides from anon, authenticated;
-- The service_role bypasses RLS by default, but it's good practice to grant explicitly.
grant all on public.ai_user_overrides to service_role;

-- ------------------------------------------------------------
-- 2. SYSTEM SETTINGS AI RLS PROTECTION
-- ------------------------------------------------------------
-- Standard admins can no longer INSERT, UPDATE, or DELETE keys matching 'ai_%'
-- Only super_admin (checked via canonical public.is_super_admin()) can do this.
drop policy if exists system_settings_write on public.system_settings;

create policy system_settings_insert on public.system_settings
for insert with check (
  public.is_staff() and (
    key not like 'ai_%' or public.is_super_admin()
  )
);

create policy system_settings_update on public.system_settings
for update using (
  public.is_staff()
) with check (
  public.is_staff() and (
    key not like 'ai_%' or public.is_super_admin()
  )
);

create policy system_settings_delete on public.system_settings
for delete using (
  public.is_staff() and (
    key not like 'ai_%' or public.is_super_admin()
  )
);

-- ------------------------------------------------------------
-- 3. NEW CONSUME_AI_QUOTA (6 Arguments)
-- ------------------------------------------------------------
-- Replaces allowed with granted.
-- Strictly reserves request count ONLY (no token_count mutation).
-- Resolves Asia/Jakarta timezone.
create or replace function public.consume_ai_quota(
  p_identifier   text,
  p_feature      text,
  p_max_requests integer,
  p_max_tokens   bigint,
  p_tokens       bigint,
  p_usage_date   date default null
)
returns table (granted boolean, requests_used integer, tokens_used bigint)
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_date date;
  v_new_requests integer;
begin
  v_date := coalesce(p_usage_date, (now() at time zone 'Asia/Jakarta')::date);

  -- 1. Ensure row exists (atomically ignore if present)
  insert into public.ai_usage (user_identifier, usage_date, feature, message_count, token_count)
  values (p_identifier, v_date, p_feature, 0, 0)
  on conflict (user_identifier, usage_date, feature) do nothing;

  -- 2. Atomic conditional increment (reserves request slot only)
  update public.ai_usage
  set message_count = message_count + 1,
      updated_at = now()
  where user_identifier = p_identifier
    and usage_date = v_date
    and feature = p_feature
    and message_count < p_max_requests
  returning message_count into v_new_requests;

  -- 3. Explicit grant resolution
  if v_new_requests is null then
    granted := false;
    select message_count, token_count into requests_used, tokens_used
    from public.ai_usage
    where user_identifier = p_identifier and usage_date = v_date and feature = p_feature;
  else
    granted := true;
    requests_used := v_new_requests;
    select token_count into tokens_used
    from public.ai_usage
    where user_identifier = p_identifier and usage_date = v_date and feature = p_feature;
  end if;

  return next;
end
$fn$;

-- ------------------------------------------------------------
-- 4. NEW ADD_AI_TOKENS (4 Arguments)
-- ------------------------------------------------------------
-- Canonical token commit mechanism. Does not touch message_count.
create or replace function public.add_ai_tokens(
  p_identifier text,
  p_feature    text,
  p_tokens     bigint,
  p_usage_date date default null
)
returns bigint
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_date date;
  v_tokens bigint;
begin
  v_date := coalesce(p_usage_date, (now() at time zone 'Asia/Jakarta')::date);

  if coalesce(p_tokens, 0) <= 0 then
    select ai_usage.token_count into v_tokens
    from public.ai_usage
    where user_identifier = p_identifier
      and usage_date = v_date
      and feature = p_feature;
    return coalesce(v_tokens, 0);
  end if;

  insert into public.ai_usage (
    user_identifier, usage_date, feature, message_count, token_count
  )
  values (p_identifier, v_date, p_feature, 0, p_tokens)
  on conflict (user_identifier, usage_date, feature) do update
    set token_count = ai_usage.token_count + p_tokens,
        updated_at  = now()
  returning ai_usage.token_count into v_tokens;

  return v_tokens;
end
$fn$;

-- ------------------------------------------------------------
-- 5. NEW REFUND_AI_QUOTA (3 Arguments)
-- ------------------------------------------------------------
-- Compensatory rollback mechanism. Decrements slot, no token modification.
create or replace function public.refund_ai_quota(
  p_identifier text,
  p_feature    text,
  p_usage_date date default null
)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_date date;
begin
  v_date := coalesce(p_usage_date, (now() at time zone 'Asia/Jakarta')::date);

  update public.ai_usage
  set message_count = greatest(0, message_count - 1),
      updated_at = now()
  where user_identifier = p_identifier
    and usage_date = v_date
    and feature = p_feature;
end
$fn$;

-- ------------------------------------------------------------
-- 6. SECURITY & GRANTS
-- ------------------------------------------------------------
revoke all on function public.consume_ai_quota(text, text, integer, bigint, bigint, date) from public, anon, authenticated;
revoke all on function public.add_ai_tokens(text, text, bigint, date) from public, anon, authenticated;
revoke all on function public.refund_ai_quota(text, text, date) from public, anon, authenticated;

grant execute on function public.consume_ai_quota(text, text, integer, bigint, bigint, date) to service_role;
grant execute on function public.add_ai_tokens(text, text, bigint, date) to service_role;
grant execute on function public.refund_ai_quota(text, text, date) to service_role;
