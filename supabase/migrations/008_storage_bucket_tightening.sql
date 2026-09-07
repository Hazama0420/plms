-- ============================================================
-- 008_storage_bucket_tightening.sql
-- ============================================================
--
-- Mengetatkan konfigurasi bucket Storage Supabase.
--
-- MASALAH YANG DIPERBAIKI
-- =======================
-- Ketiga bucket (`property-media`, `avatars`, `ktp`) tidak memiliki
-- `file_size_limit` maupun `allowed_mime_types`. Akun apa pun yang berhasil
-- login dapat menaruh berkas sembarang — termasuk `.exe`, `.wasm`, atau konten
-- berbahaya lainnya — dengan ukuran bebas ke domain plms.
--
-- Untuk `avatars`, yang diunggah adalah avatar agen dan foto profil.
-- Untuk `property-media`, yang diunggah adalah foto properti dan brosur.
-- Untuk `ktp`, yang diunggah adalah dokumen KTP — dan bucket ini seharusnya
-- PRIVAT (hanya bisa diakses lewat signed URL dari server), bukan publik.
--
-- JALANKAN DI: Supabase Dashboard -> SQL Editor
-- Idempoten: aman dijalankan berulang kali.
-- ============================================================

-- ============================================================
-- 1. property-media — foto & brosur properti
-- ============================================================
update storage.buckets
set file_size_limit     = 10485760,   -- 10 MB
    allowed_mime_types  = array['image/jpeg', 'image/png', 'image/webp'],
    updated_at          = now()
where id = 'property-media'
  and (file_size_limit is null or allowed_mime_types is null);

-- ============================================================
-- 2. avatars — foto profil agen
-- ============================================================
update storage.buckets
set file_size_limit     = 5242880,    -- 5 MB
    allowed_mime_types  = array['image/jpeg', 'image/png', 'image/webp'],
    updated_at          = now()
where id = 'avatars'
  and (file_size_limit is null or allowed_mime_types is null);

-- ============================================================
-- 3. ktp — dokumen identitas (UNTUK NANTI)
-- ============================================================
-- Bucket ini BELUM DIBUAT dan kolom ktp_url di tabel users masih null untuk
-- semua user yang ada. Kode upload KTP di app/register/agent/page.tsx:111
-- masih salah menaruh berkas ke bucket publik `property-media`.
--
-- Bila fitur ini diaktifkan nanti:
--   1. Buat bucket `ktp` dengan public = false (signed URL saja)
--   2. Ubah kode upload agar menaruh ke bucket `ktp`, bukan `property-media`
--   3. Jalankan blok SQL di bawah untuk memasang batas ukuran & MIME
--
-- update storage.buckets
-- set file_size_limit     = 5242880,    -- 5 MB
--     allowed_mime_types  = array['image/jpeg', 'image/png', 'application/pdf'],
--     public              = false,      -- JANGAN publik: NIK & KTP tidak boleh terbuka
--     updated_at          = now()
-- where id = 'ktp';

-- ============================================================
-- VERIFIKASI
-- ============================================================
select
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
from storage.buckets
where id in ('property-media', 'avatars');
