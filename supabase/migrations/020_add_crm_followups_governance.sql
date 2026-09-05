-- ============================================================================
-- MIGRATION 020: CRM Follow-ups Governance & Creator Tracking
-- Target: Add created_by column, backfill baseline, add status CHECK constraint & index
-- Verified: 2 existing records in production, both have valid assigned_to.
-- ============================================================================

BEGIN;

-- 1. Add created_by column referencing users.id
ALTER TABLE public.crm_followups
  ADD COLUMN IF NOT EXISTS created_by UUID NULL REFERENCES public.users(id) ON DELETE SET NULL;

-- 2. Backfill existing records with assigned_to as creator baseline
UPDATE public.crm_followups
SET created_by = assigned_to
WHERE created_by IS NULL AND assigned_to IS NOT NULL;

-- 3. Add CHECK constraint for follow-up status governance
ALTER TABLE public.crm_followups
  ADD CONSTRAINT crm_followups_status_check
  CHECK (status IS NULL OR status IN ('pending', 'completed', 'cancelled', 'overdue'));

-- 4. Add index for created_by performance
CREATE INDEX IF NOT EXISTS idx_crm_followups_created_by 
  ON public.crm_followups(created_by);

COMMIT;