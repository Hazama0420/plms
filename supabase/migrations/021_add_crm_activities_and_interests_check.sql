-- ============================================================================
-- MIGRATION 021 (REVISED): Safe Idempotent Check Constraints
-- Target: Enforce interest_level & activity_type integrity safely
-- Verified: Accommodates existing production values & handles duplicate runs.
-- ============================================================================

BEGIN;

-- 1. Safe recreation for crm_interests_level_check
ALTER TABLE public.crm_interests
  DROP CONSTRAINT IF EXISTS crm_interests_level_check;

ALTER TABLE public.crm_interests
  ADD CONSTRAINT crm_interests_level_check
  CHECK (interest_level IS NULL OR interest_level IN ('low', 'medium', 'high'));

-- 2. Safe recreation for crm_activities_type_check
ALTER TABLE public.crm_activities
  DROP CONSTRAINT IF EXISTS crm_activities_type_check;

ALTER TABLE public.crm_activities
  ADD CONSTRAINT crm_activities_type_check
  CHECK (activity_type IN (
    -- Production Existing Historical Values
    'created',
    'Lead Masuk (Website)',
    'followup_completed',
    'Status Update',
    -- Standard Future Activity Types
    'call',
    'whatsapp',
    'email',
    'meeting',
    'site_visit',
    'note',
    'status_change',
    'system'
  ));

COMMIT;