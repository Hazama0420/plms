-- ============================================================
-- 018_storage_bucket_ktp.sql
-- ============================================================
--
-- Membuat bucket penyimpanan khusus untuk foto KTP pendaftaran agen.
-- Berbeda dari property-media yang bersifat publik, bucket ini:
--   - Hanya bisa di-upload oleh siapa pun (anon) pada saat pendaftaran
--     (INSERT diperbolehkan karena belum ada sesi)
--   - Hanya bisa dilihat oleh pengguna terautentikasi (SELECT untuk
--     authenticated), sehingga admin bisa memverifikasi KTP lewat dashboard.
--   - Batas ukuran & tipe file mengikuti kebijakan di migrasi 008.
--
-- JALANKAN DI: Supabase Dashboard -> SQL Editor (atau via migrasi CLI)
-- ============================================================

-- 1. Buat bucket bila belum ada
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ktp',
  'ktp',
  false, -- tidak publik: hanya terautentikasi yang bisa SELECT
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- 2. Policy INSERT: siapapun boleh upload saat pendaftaran (anon)
drop policy if exists "KTP upload oleh publik" on storage.objects;
create policy "KTP upload oleh publik"
  on storage.objects
  for insert
  with check (
    bucket_id = 'ktp'
    -- Tidak ada batasan auth.role() — anon boleh
  );

-- 3. Policy SELECT: hanya pengguna terautentikasi yang bisa melihat KTP
drop policy if exists "KTP select oleh authenticated" on storage.objects;
create policy "KTP select oleh authenticated"
  on storage.objects
  for select
  using (
    bucket_id = 'ktp'
    and auth.role() = 'authenticated'
  );