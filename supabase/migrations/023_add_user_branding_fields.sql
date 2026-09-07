-- ============================================================
-- 023_add_user_branding_fields.sql
-- ============================================================
--
-- Menambah kolom branding publik ke tabel `users`:
--   bio               — deskripsi singkat profil agen/admin
--   specialization    — area fokus / spesialisasi
--   arebi_number      — nomor KTA AREBI / sertifikasi
--   instagram_url     — profil Instagram
--   tiktok_url        — profil TikTok
--   facebook_url      — profil Facebook
--   linkedin_url      — profil LinkedIn
--
-- Kolom-kolom ini sudah digunakan di BrandingTab (settings/page.tsx)
-- namun belum pernah didefinisikan lewat migration. Migration ini
-- memastikan kolom ada secara idempoten (IF NOT EXISTS).
-- ============================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS bio               TEXT,
  ADD COLUMN IF NOT EXISTS specialization    TEXT,
  ADD COLUMN IF NOT EXISTS arebi_number      TEXT,
  ADD COLUMN IF NOT EXISTS instagram_url     TEXT,
  ADD COLUMN IF NOT EXISTS tiktok_url        TEXT,
  ADD COLUMN IF NOT EXISTS facebook_url      TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_url      TEXT;

-- Izinkan user yang login membaca kolom publik milik user lain
-- (dibutuhkan oleh /api/agents/public yang memakai service-role,
--  dan oleh halaman profil publik).
-- RLS tabel users sudah aktif dari migration 007; kolom baru ikut
-- kebijakan SELECT yang sudah ada — tidak perlu policy tambahan.

COMMENT ON COLUMN public.users.bio            IS 'Deskripsi singkat profil, ditampilkan di carousel Our Team';
COMMENT ON COLUMN public.users.specialization IS 'Area fokus / spesialisasi agen';
COMMENT ON COLUMN public.users.arebi_number   IS 'Nomor KTA AREBI atau sertifikasi properti';
COMMENT ON COLUMN public.users.instagram_url  IS 'URL profil Instagram';
COMMENT ON COLUMN public.users.tiktok_url     IS 'URL profil TikTok';
COMMENT ON COLUMN public.users.facebook_url   IS 'URL profil Facebook';
COMMENT ON COLUMN public.users.linkedin_url   IS 'URL profil LinkedIn';
