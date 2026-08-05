-- ============================================================
-- 001_property_address_regions.sql
-- ============================================================
--
-- Menyelaraskan `property_address` dengan tabel `regions`.
--
-- LATAR BELAKANG
-- Kolom wilayah di `property_address` bertipe uuid dan mengacu ke tabel
-- provinces/cities/districts/villages yang sudah tidak dipakai. Sementara
-- pencarian wilayah di halaman create membaca `regions`, yang memberi NAMA
-- (province_name, city_name, area_name) dan `area_id` bertipe bigint.
--
-- Akibatnya setiap penyimpanan alamat dari hasil pencarian ditolak Postgres
-- (22P02: invalid input syntax for type uuid) — dan karena errornya tidak
-- pernah diperiksa di sisi aplikasi, publikasi tetap dilaporkan berhasil
-- sementara alamatnya tidak pernah tersimpan.
--
-- Kolom nama disimpan langsung (denormalisasi) — bukan hanya `region_id` —
-- karena halaman katalog, dashboard, dan FeaturedProperties sudah membaca
-- `city_name`/`district_name`/`province_name` dari objek alamat. Ini juga
-- membuat filter kota/provinsi cukup memakai ilike biasa, tanpa join !inner
-- bertingkat yang selama ini menyembunyikan properti tanpa baris alamat.
--
-- JALANKAN DI: Supabase Dashboard → SQL Editor
-- ============================================================

alter table public.property_address
  add column if not exists region_id integer references public.regions (id),
  add column if not exists province_name text,
  add column if not exists city_name text,
  add column if not exists district_name text,
  add column if not exists village_name text;

create index if not exists idx_pa_region
  on public.property_address using btree (region_id);

create index if not exists idx_pa_city_name
  on public.property_address using btree (city_name);

create index if not exists idx_pa_province_name
  on public.property_address using btree (province_name);

-- Nama jalan kini opsional: yang wajib adalah wilayah hasil pencarian.
alter table public.property_address
  alter column address drop not null;

alter table public.property_address
  alter column address set default '';
