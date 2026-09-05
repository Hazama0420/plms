BEGIN;

ALTER TABLE public.crm_leads
  ADD COLUMN IF NOT EXISTS lost_reason text,
  ADD COLUMN IF NOT EXISTS lost_explanation text,
  ADD COLUMN IF NOT EXISTS deal_state text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS deal_submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deal_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS deal_rejection_reason text;

ALTER TABLE public.crm_leads
  DROP CONSTRAINT IF EXISTS crm_leads_lost_reason_check;
ALTER TABLE public.crm_leads
  ADD CONSTRAINT crm_leads_lost_reason_check
  CHECK (lost_reason IS NULL OR lost_reason IN (
    'customer_not_responding', 'budget_mismatch', 'not_interested',
    'chose_another_property', 'purchase_postponed', 'property_unsuitable',
    'duplicate', 'other'
  ));

ALTER TABLE public.crm_leads
  DROP CONSTRAINT IF EXISTS crm_leads_deal_state_check;
ALTER TABLE public.crm_leads
  ADD CONSTRAINT crm_leads_deal_state_check
  CHECK (deal_state IN ('none', 'submitted', 'pending_verification', 'verified', 'rejected'));

ALTER TABLE public.crm_followups
  ADD COLUMN IF NOT EXISTS completed_by uuid REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.crm_followups
  DROP CONSTRAINT IF EXISTS crm_followups_status_check;
ALTER TABLE public.crm_followups
  ADD CONSTRAINT crm_followups_status_check
  CHECK (status IS NULL OR status IN ('pending', 'completed', 'cancelled', 'overdue'));

CREATE INDEX IF NOT EXISTS idx_crm_leads_deal_state ON public.crm_leads(deal_state);

COMMIT;
