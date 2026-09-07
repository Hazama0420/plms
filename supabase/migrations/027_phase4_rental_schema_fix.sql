-- 027_phase4_rental_schema_fix.sql
-- Drop old columns and add normalized columns to ai_user_overrides

ALTER TABLE public.ai_user_overrides
  DROP COLUMN IF EXISTS rental_active,
  DROP COLUMN IF EXISTS rental_expires_at,
  DROP COLUMN IF EXISTS custom_quota;

ALTER TABLE public.ai_user_overrides
  ADD COLUMN enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN quota_mode text CHECK (quota_mode IN ('limited', 'unlimited')),
  ADD COLUMN quota_limit integer,
  ADD COLUMN starts_at timestamptz,
  ADD COLUMN expires_at timestamptz;

-- Re-apply RLS policies just in case (should already be restricted to service_role)
-- The table already has RLS enabled from 026.
-- We'll make sure it remains isolated.
