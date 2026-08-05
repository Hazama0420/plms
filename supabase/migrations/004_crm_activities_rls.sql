-- ============================================================
-- 004_crm_activities_rls.sql
-- ============================================================
--
-- RLS untuk tabel crm_activities.
--
-- STRUKTUR AKSES
-- Activity log adalah jejak interaksi dengan lead: telepon, meeting, email, WA,
-- dan catatan agen. Privasi sama dengan lead itu sendiri:
--
-- - Seluruh staf internal (agen, admin, super admin, commissioner) → lihat semua aktivitas
-- - Tulis aktivitas → hanya pembuat aktivitas (user_id = auth.uid()) yang owns lead atau staff
-- - Viewer & tamu → tidak ada akses
--
-- Alasan membuka akses baca ke seluruh staf internal sama dengan `crm_contacts`:
-- `crm_leads` belum punya RLS, jadi agen bisa membuka lead agen lain. Membatasi
-- aktivitas per-agen membuat aktivitas tidak terbaca di lead yang bisa dilihat,
-- dan koordinasi antar-agen jadi sulit. Pemisahan viewer/tamu dari staf internal
-- adalah batas yang benar-benar berarti di sini.
--
-- Insert hanya dari user yang login (agen/admin), karena setiap aktivitas perlu
-- user_id untuk audit trail. Endpoint publik tidak menyentuh tabel ini.
--
-- JALANKAN DI: Supabase Dashboard → SQL Editor
-- Jalankan SETELAH 002_survey_system.sql (butuh fungsi is_staff)
-- ============================================================

-- Pastikan fungsi is_staff() dan is_internal_staff() sudah ada (dibuat oleh
-- 002 atau 003). Diulang di sini supaya berkas ini bisa dijalankan sendiri.
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid()
      and role in ('admin', 'super_admin', 'superadmin')
  );
$$;

create or replace function public.is_internal_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid()
      and role in ('agent', 'admin', 'super_admin', 'superadmin', 'commissioner')
  );
$$;

alter table public.crm_activities enable row level security;

-- ============================================================
-- SELECT — seluruh staf internal, plus aktivitas milik sendiri
-- ============================================================

drop policy if exists crm_activities_select on public.crm_activities;
create policy crm_activities_select on public.crm_activities
  for select using (
    public.is_internal_staff()

    -- Client (role viewer) melihat aktivitas yang tercatat atas namanya
    -- sendiri — mis. klik WhatsApp yang dicatat /api/leads. Ia tidak melihat
    -- aktivitas orang lain.
    or user_id = auth.uid()
  );

-- ============================================================
-- INSERT — hanya user yang login (agen/admin)
-- ============================================================

-- Aktivitas dicatat saat agen melakukan tindakan (telepon, WA, meeting). Client
-- tidak mencatat aktivitas sendiri — mereka hanya memicu lead di /api/leads.
--
-- Policy ini mengikat user_id ke auth.uid() — tidak bisa menulis aktivitas atas
-- nama orang lain.

drop policy if exists crm_activities_insert on public.crm_activities;
create policy crm_activities_insert on public.crm_activities
  for insert with check (
    user_id = auth.uid()

    -- Pastikan lead yang akan dicatat memang assigned ke user ini atau ia admin.
    and (
      public.is_staff()
      or exists (
        select 1 from public.crm_leads
        where crm_leads.id = crm_activities.lead_id
          and crm_leads.assigned_to = auth.uid()
      )
    )
  );

-- ============================================================
-- UPDATE — hanya pembuat aktivitas atau staff
-- ============================================================

-- Agen bisa mengedit catatan aktivitasnya sendiri (typo, detail tambahan).
-- Admin bisa mengedit semua aktivitas (moderasi).

drop policy if exists crm_activities_update on public.crm_activities;
create policy crm_activities_update on public.crm_activities
  for update using (
    user_id = auth.uid() or public.is_staff()
  ) with check (
    user_id = auth.uid() or public.is_staff()
  );

-- ============================================================
-- DELETE — hanya staff
-- ============================================================

-- Agen tidak boleh menghapus log aktivitas — audit trail harus lengkap.
-- Hanya admin yang boleh menghapus (mis. aktivitas yang salah catat).

drop policy if exists crm_activities_delete on public.crm_activities;
create policy crm_activities_delete on public.crm_activities
  for delete using (
    public.is_staff()
  );
