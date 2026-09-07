-- ============================================================================
-- MIGRATION 022: Pembersihan Indeks Redundan pada Tabel CRM
-- Penjelasan: Menghapus 4 indeks B-tree duplikat untuk mengoptimalkan
--             kecepatan penulisan (INSERT/UPDATE/DELETE) pada database CRM.
-- Status: Terverifikasi aman melalui inspeksi katalog pg_indexes.
-- ============================================================================

BEGIN;

-- 1. Hapus indeks redundan pada crm_activities (kolom lead_id)
--    Indeks utama yang dipertahankan: idx_crm_activities_lead_id
DROP INDEX IF EXISTS public.idx_crm_activities_lead;

-- 2. Hapus indeks redundan pada crm_followups (kolom assigned_to dan lead_id)
--    Indeks utama yang dipertahankan: idx_crm_followups_assigned_to & idx_crm_followups_lead_id
DROP INDEX IF EXISTS public.idx_crm_followups_assigned;
DROP INDEX IF EXISTS public.idx_crm_followups_lead;

-- 3. Hapus indeks redundan pada crm_leads (kolom assigned_to)
--    Indeks utama yang dipertahankan: idx_crm_leads_assigned_to
DROP INDEX IF EXISTS public.idx_crm_leads_assigned;

COMMIT;