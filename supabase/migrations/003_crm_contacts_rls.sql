-- ============================================================
-- 003_crm_contacts_rls.sql
-- ============================================================
--
-- RLS untuk tabel crm_contacts.
--
-- MASALAH YANG DIPERBAIKI
-- Sebelumnya RLS tidak aktif, sehingga siapa pun (termasuk viewer) yang tahu
-- URL Supabase bisa memanggil PostgREST langsung dari konsol peramban dan
-- menarik seluruh tabel — nama lengkap, nomor telepon, WhatsApp, email, dan
-- catatan pribadi seluruh kontak CRM.
--
-- Pengaktifan RLS tanpa policy yang tepat menyebabkan error karena:
-- 1. Fungsi is_staff() belum ada (ada di 002_survey_system.sql yang belum
--    dijalankan)
-- 2. Agen tidak bisa melihat kontak yang sedang mereka tangani
--
-- STRUKTUR AKSES
-- - Admin, super admin, agen, commissioner → lihat semua kontak
-- - Ubah/hapus/tambah kontak manual → hanya admin & super admin
-- - Viewer & tamu → tidak ada akses sama sekali
--
-- Endpoint publik /api/leads tetap berfungsi karena memakai admin client
-- (service role) yang melewati RLS.
--
-- JALANKAN DI: Supabase Dashboard → SQL Editor
-- Jalankan SETELAH 002_survey_system.sql (butuh fungsi is_staff)
-- ============================================================

-- Fungsi helper: apakah user adalah staf internal (admin/super_admin).
-- Diperlukan untuk policy INSERT/UPDATE/DELETE kontak — hanya admin yang
-- boleh mengubah data kontak secara manual.
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

-- Fungsi helper: apakah user adalah staf internal (termasuk agen).
-- Agen, admin, super_admin, dan commissioner semuanya perlu membaca kontak
-- untuk pekerjaan CRM mereka. Viewer dan tamu tidak punya akses.
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

-- Aktifkan RLS. Setelah ini, tanpa policy yang cocok, semua akses ditolak.
alter table public.crm_contacts enable row level security;

-- ============================================================
-- SELECT — seluruh staf internal (agen ke atas) boleh membaca
-- ============================================================
--
-- Kenapa tidak dibatasi "agen hanya lihat kontak di lead miliknya"?
--
-- Karena `crm_leads` sendiri belum memakai RLS: setiap agen tetap melihat
-- seluruh daftar lead. Membatasi kontak per-agen membuat agen bisa membuka
-- lead yang kontaknya tidak terbaca, dan `getLeadById()`
-- (services/crm.service.ts:228-239) melempar "Contact not found for lead <id>"
-- ketika itu terjadi — halaman detail lead langsung rusak, bukan menampilkan
-- pesan akses ditolak.
--
-- Batas yang benar-benar berarti di sini adalah memisahkan orang dalam dari
-- viewer dan tamu; itulah kebocoran yang diperbaiki. Pemisahan antar-agen
-- baru masuk akal setelah `crm_leads` ikut memakai RLS dengan aturan yang
-- sama, dan itu perubahan tersendiri.

drop policy if exists crm_contacts_select on public.crm_contacts;
create policy crm_contacts_select on public.crm_contacts
  for select using (
    public.is_internal_staff()
  );

-- ============================================================
-- INSERT — hanya staff yang boleh membuat kontak manual
-- ============================================================

-- Endpoint publik /api/leads memakai admin client (service role) sehingga
-- melewati policy ini — pengunjung anonim tetap bisa mengajukan lead lewat
-- form inquiry.
--
-- Policy ini hanya berlaku untuk akses lewat anon key: crmService.createContact()
-- dipanggil dari UI oleh user yang login. Hanya staff yang boleh membuat kontak
-- manual di luar alur inquiry publik.

drop policy if exists crm_contacts_insert on public.crm_contacts;
create policy crm_contacts_insert on public.crm_contacts
  for insert with check (
    public.is_staff()
  );

-- ============================================================
-- UPDATE — hanya staff
-- ============================================================

-- Agen tidak boleh mengubah data kontak (nama, telepon, email) — hanya admin
-- yang boleh. Agen bekerja lewat lead dan follow-up, bukan langsung ke kontak.

drop policy if exists crm_contacts_update on public.crm_contacts;
create policy crm_contacts_update on public.crm_contacts
  for update using (
    public.is_staff()
  ) with check (
    public.is_staff()
  );

-- ============================================================
-- DELETE — hanya staff
-- ============================================================

drop policy if exists crm_contacts_delete on public.crm_contacts;
create policy crm_contacts_delete on public.crm_contacts
  for delete using (
    public.is_staff()
  );
