-- ============================================================
-- 009_drop_legacy_permissive_policies.sql
-- ============================================================
--
-- Membuang policy lama yang membatalkan seluruh isi 007.
--
-- MASALAH YANG DIPERBAIKI
-- =======================
-- 007 dijalankan dan berhasil: `pg_policies` menunjukkan properties_select,
-- property_owners_select, users_select, dan seluruh saudaranya terpasang dengan
-- ekspresi yang benar. RLS pun aktif di semua tabel. Tetapi probe anon-vs-admin
-- SETELAH itu masih menunjukkan angka yang identik:
--
--   properties        anon 23  admin 23   <- termasuk 7 draft
--   property_owners   anon  9  admin  9
--   invoices          anon  3  admin  3
--   crm_leads         anon  8  admin  8
--
-- Sebabnya bukan 007. Sebabnya policy PERMISSIVE yang sudah ada lebih dulu:
--
--   properties       "Allow all for development"              ALL    using (true)
--   properties       "Public & Users can view properties"     SELECT using (true)  -- untuk anon
--   property_owners  "Allow public read access to ..."        SELECT using (true)
--   users            "Semua orang dapat membaca profil user"  SELECT using (true)
--   invoices         "Enable all access for authenticated..." ALL    using (true)
--   crm_leads        "Enable all access for authenticated..." ALL    using (true)
--
-- PostgreSQL menggabungkan policy PERMISSIVE dengan OR, bukan AND. Jadi
-- properties_select yang ketat berdiri di samping "Allow all for development",
-- dan hasil akhirnya:
--
--   (status = 'published' or is_internal_staff() or ...) OR true  =  true
--
-- Satu policy `true` sudah cukup membuka seluruh tabel, sebanyak apa pun policy
-- ketat di sebelahnya. Menambah policy tidak pernah bisa mempersempit akses —
-- yang lama harus DIBUANG.
--
-- Nama-nama itu ("Allow all for development", "Cegah Viewer INSERT properties",
-- "Izinkan publik insert c_leads" — lengkap dengan salah ketiknya) berasal dari
-- sesi SQL Editor manual yang tidak pernah masuk ke berkas migrasi, sehingga
-- tidak terlihat sama sekali dari dalam repositori ini.
--
-- CARA KERJA BERKAS INI
-- =====================
-- Tidak menghapus per nama satu per satu. Seluruh policy 007 mengikuti pola
-- `<nama_tabel>_<perintah>` — properties_select, users_update, dan seterusnya.
-- Jadi yang dibuang adalah setiap policy pada tabel-tabel ini yang namanya
-- TIDAK berawalan `<nama_tabel>_`.
--
-- Ini sengaja: policy lama pada enam tabel turunan properti belum pernah
-- terlihat namanya, dan menuliskan daftar nama hanya akan meninggalkan yang
-- tidak sempat terdaftar.
--
-- JALANKAN DI: Supabase Dashboard -> SQL Editor
-- Jalankan SETELAH 007. Idempoten: jalan kedua tidak menemukan apa pun lagi.
-- ============================================================

do $$
declare
  r record;
  jumlah int := 0;
begin
  for r in
    select p.tablename, p.policyname
    from pg_policies p
    where p.schemaname = 'public'
      and p.tablename in (
        'properties',
        'property_address',
        'property_price',
        'property_specifications',
        'property_land',
        'property_building',
        'property_media',
        'property_owners',
        'invoices',
        'crm_leads',
        'users',
        'system_settings'
      )
      -- Regex, bukan LIKE: pada LIKE, `_` adalah wildcard satu karakter, jadi
      -- 'properties\_%' menuntut escape yang mudah terlewat. Di regex `_`
      -- adalah karakter biasa.
      and p.policyname !~ ('^' || p.tablename || '_')
  loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
    raise notice 'dibuang: "%" pada %', r.policyname, r.tablename;
    jumlah := jumlah + 1;
  end loop;

  raise notice '--- total policy lama yang dibuang: % ---', jumlah;
end $$;


-- ============================================================
-- VERIFIKASI — policy yang tersisa
-- ============================================================
--
-- Yang diharapkan: hanya nama berpola <tabel>_<perintah>, dan tidak satu pun
-- kolom `qual` yang berisi `true` polos pada SELECT.

select
  tablename,
  policyname,
  cmd,
  qual
from pg_policies
where schemaname = 'public'
  and tablename in (
    'properties',
    'property_address',
    'property_price',
    'property_specifications',
    'property_land',
    'property_building',
    'property_media',
    'property_owners',
    'invoices',
    'crm_leads',
    'users',
    'system_settings'
  )
order by tablename, policyname;
