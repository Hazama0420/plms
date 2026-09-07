-- ============================================================================
-- MIGRATION 019: CRM Data Integrity & Pipeline Check Constraints
-- Target: Enforce UNIQUE interest per lead-property & restrict lead pipeline status
-- Verified: 0 duplicates in crm_interests, all existing leads use valid status.
-- ============================================================================

BEGIN;

-- 1. Add UNIQUE constraint to crm_interests to prevent duplicate property interests per lead
ALTER TABLE public.crm_interests
  DROP CONSTRAINT IF EXISTS crm_interests_lead_property_key;
ALTER TABLE public.crm_interests
  ADD CONSTRAINT crm_interests_lead_property_key UNIQUE (lead_id, property_id);

-- 2. Add CHECK constraint to crm_leads to strictly govern CRM Pipeline stages
ALTER TABLE public.crm_leads
  DROP CONSTRAINT IF EXISTS crm_leads_status_check;
ALTER TABLE public.crm_leads
  ADD CONSTRAINT crm_leads_status_check
  CHECK (status IS NULL OR status IN ('new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'));

COMMIT;