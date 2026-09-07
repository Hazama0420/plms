-- ============================================================
-- 030_phase10b_survey_lead_relation.sql
-- ============================================================
-- 
-- Phase 10B: Workflow Integration & Data Reconciliation
-- BUG-10: Menghubungkan tabel surveys ke crm_leads
--
-- Karakteristik:
-- - Non-destructive (ADD COLUMN IF NOT EXISTS)
-- - Nullable (kompatibel penuh dengan data existing)
-- - ON DELETE SET NULL (penghapusan lead tidak menghapus riwayat survei)
-- - Indexed untuk optimasi query timeline CRM
-- ============================================================

ALTER TABLE public.surveys
  ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES public.crm_leads (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_surveys_lead_id ON public.surveys (lead_id);
