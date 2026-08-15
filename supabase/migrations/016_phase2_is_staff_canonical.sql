-- ============================================================
-- 016 — PHASE 2: satu definisi otoritatif untuk is_staff() (H-4)
-- ============================================================
--
-- MASALAH
--
-- Produksi hari ini menjalankan is_staff() dengan `role in ('admin',
-- 'super_admin')` (W-1, PHASE 0.75). Repo ini tidak mereproduksinya. Tiga
-- berkas mendefinisikannya dengan 'superadmin' IKUT SERTA:
--
--   berkas                                    baris   'superadmin'
--   002_survey_system.sql                     174     TIDAK  <- sudah benar
--   003_crm_contacts_rls.sql                   33     ikut
--   004_crm_activities_rls.sql                 30     ikut
--   007_rls_properties_users_billing.sql       81     ikut
--
-- KOREKSI TERHADAP BASELINE (K-2). docs/crm/00-schema-baseline.md §9
-- mendaftar EMPAT berkas dan memasukkan 002 ke dalamnya. Diperiksa langsung:
-- 002 baris 183 berbunyi `role in ('admin','super_admin')` — tanpa
-- 'superadmin'. Yang menyimpang tiga, bukan empat. Baseline dibetulkan pada
-- langkah dokumentasi PHASE 2. (Baris 114 pada §5 baseline juga masih
-- mencantumkan 'superadmin' sebagai anggota is_staff(); itu bertentangan
-- dengan §8 baris 596 pada berkas yang sama dan ikut dibetulkan di sana.)
--
-- Koreksi itu membuat masalahnya LEBIH BESAR, bukan lebih kecil. Baseline §9
-- menyimpulkan "jangan jalankan ulang 002/003/004/007". Kesimpulan itu kurang:
-- karena 007 berjalan SETELAH 002 dalam urutan numerik, database yang dibangun
-- ulang dari repo ini dari nol — tanpa menjalankan ulang apa pun — tetap
-- berakhir dengan definisi yang memuat 'superadmin'. Cacatnya ada pada urutan
-- migrasi itu sendiri, bukan pada kebiasaan menjalankan ulang.
--
--
-- MENGAPA INI PENTING WALAU NOL PENGGUNA
--
-- is_staff() menjaga DELETE pada kelima tabel CRM (013), pada surveys dan
-- survey_requests (002), pada projects dan project_milestones (006), serta
-- pada properties, property_owners, invoices, users dan system_settings (007)
-- — sembilan tabel di luar CRM. Ia juga dipakai enforce_super_admin_lock()
-- (010:148). Menggesernya adalah perubahan hak istimewa yang menyamar sebagai
-- penyegaran skema.
--
-- 'superadmin' punya NOL pengguna hari ini (baseline §8), jadi menyatakan
-- definisi produksi tidak mencabut akses siapa pun. Justru sebaliknya: ejaan
-- itu PERNAH ada di produksi dan menimbulkan 403 — app/api/leads/[id]/
-- follow-up/route.ts:12-17 mencatatnya. Bila kelak sebuah akun lahir dengan
-- ejaan itu, definisi repo yang longgar akan diam-diam memberinya hak DELETE
-- penuh di seluruh tabel yang dijaga is_staff(), sedangkan definisi produksi
-- tidak.
--
--
-- YANG DILAKUKAN BERKAS INI
--
-- Menyatakan ulang is_staff() PERSIS seperti produksi. Karena badannya sama
-- dengan yang sudah berjalan, meng-apply berkas ini TIDAK MENGUBAH PERILAKU
-- APA PUN pada database yang hidup. Nilainya ada pada urutan: 016 berdiri
-- paling akhir, jadi rebuild dari repo kini berakhir pada definisi yang benar.
--
-- Berkas historis 003, 004 dan 007 SENGAJA TIDAK DISUNTING — keputusan yang
-- berlaku sejak PHASE 1A: migrasi yang sudah dijalankan adalah catatan sejarah,
-- perbaikannya ditulis sebagai migrasi baru. Berkas ini dengan sadar menimpa
-- ketiganya. Aturan 2 pada baseline §9 ("migrasi yang menyentuh is_staff()
-- harus menyatakan definisi mana yang dimaksud dan mengapa") dipenuhi di sini.
--
--
-- YANG TIDAK DIUBAH
--
-- is_internal_staff(): TIDAK DISENTUH. Ia masih memuat 'superadmin' dan
-- 'commissioner' di 003:50-62, 004:44-56 dan 007:95-107. Membiarkannya
-- disengaja — keanggotaannya lebih luas dan konsekuensinya berbeda, dan
-- sesudah PHASE 1B ia tidak lagi dipakai satu pun policy CRM. Itu temuan
-- tersendiri.
--
-- normalizeRole() di lib/permissions.ts masih memetakan 'superadmin' ke
-- 'super_admin' di sisi aplikasi, sehingga aplikasi tetap lebih longgar
-- daripada database untuk ejaan itu. Itu M-4 dan TIDAK diperbaiki di sini —
-- ini berkas SQL; menyentuh TypeScript dari sini akan menyembunyikan
-- perubahannya di tempat yang tidak dicari orang.
--
-- Policy RLS: tidak satu pun dibuat, diubah, atau dihapus. Tabel, kolom,
-- foreign key, index, trigger: tidak disentuh. Tidak ada DML.
--
--
-- HAK EXECUTE — SENGAJA TIDAK IKUT BERUBAH
--
-- create or replace MEMPERTAHANKAN pemilik dan seluruh ACL fungsi yang sudah
-- ada. Dua akibat, keduanya disengaja:
--
--   1. Celah yang dicatat 014 baris 74-77 — anon masih memegang EXECUTE pada
--      is_staff() lewat default privileges Supabase — TIDAK tertutup oleh
--      berkas ini. Menutupnya adalah keputusan tersendiri: is_staff() dipakai
--      policy jauh di luar CRM, jadi dampaknya harus diaudit lebih dulu.
--      Di luar lingkup H-4.
--   2. Sebaliknya, berkas ini juga TIDAK MENAMBAH hak baru. ALTER DEFAULT
--      PRIVILEGES hanya berlaku untuk objek yang BARU dibuat; mengganti badan
--      fungsi yang sudah ada tidak memicunya.
--
-- Hak EXECUTE karena itu identik sebelum dan sesudah. Bagian 3.C
-- membuktikannya alih-alih mempercayainya.
--
--
-- IDEMPOTENSI
--
-- create or replace dengan badan yang sama selesai tanpa efek. Aman dijalankan
-- berulang kali. Bagian 1 menolak melanjutkan bila ada pengguna ber-role
-- 'superadmin' — dalam keadaan itu berkas ini BUKAN lagi perubahan tanpa
-- akibat, dan diamnya justru yang berbahaya.
--
-- BERGANTUNG PADA: 002/003/004/007 (fungsi harus sudah ada dan dimiliki role
-- yang sama; create or replace tidak bisa mengambil alih fungsi milik orang
-- lain).


-- ============================================================
-- 1. PENJAGA — apakah menyatakan definisi produksi mencabut akses seseorang?
-- ============================================================
--
-- Seluruh alasan berkas ini aman bertumpu pada satu fakta yang diukur, bukan
-- diandaikan: nol pengguna ber-role 'superadmin'. Bila fakta itu sudah tidak
-- berlaku, apply harus berhenti supaya keputusannya kembali ke tangan manusia,
-- bukan menghilangkan hak DELETE seseorang tanpa suara.
--
-- raise exception membatalkan pernyataan ini dan, bila berkas dijalankan
-- sebagai satu batch di SQL Editor, seluruh batch ikut dibatalkan — tidak ada
-- yang separuh jadi. Jalankan berkas ini utuh, jangan blok demi blok.

do $$
declare
  n_superadmin int;
begin
  select count(*) into n_superadmin
  from public.users
  where role = 'superadmin';

  if n_superadmin > 0 then
    raise exception
      'H-4 DIBATALKAN: % pengguna ber-role ''superadmin''. Menyatakan definisi '
      'produksi akan mencabut hak DELETE mereka di seluruh tabel yang dijaga '
      'is_staff(). Putuskan lebih dulu: normalkan role mereka ke ''super_admin'', '
      'atau ubah definisi di bawah dengan sadar. Tidak ada yang diubah.',
      n_superadmin;
  end if;

  raise notice 'H-4: 0 pengguna ''superadmin'' — menyatakan definisi produksi tidak mencabut akses siapa pun.';
end $$;


-- ============================================================
-- 2. DEFINISI OTORITATIF
-- ============================================================
--
-- Sama persis dengan 002:174-185, dan sama persis dengan produksi hari ini.
-- MENIMPA 003:33-45, 004:30-42 dan 007:81-93 — disengaja, lihat header.
--
-- security definer dipertahankan: policy perlu membaca public.users sementara
-- RLS di tabel itu bisa menghalangi pembacaan baris orang lain, dan policy
-- users di 007/010 memanggil fungsi ini kembali (007 baris 77-79).
-- set search_path = public dipertahankan: tanpa itu, nama tabel bisa dibajak
-- lewat schema lain oleh pemanggil yang mengatur search_path-nya sendiri.
-- stable dipertahankan: hasilnya tetap dalam satu pernyataan, sehingga
-- perencana boleh memanggilnya sekali alih-alih per baris.

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
      and role in ('admin', 'super_admin')
  );
$$;


-- ============================================================
-- 3. VERIFIKASI
-- ============================================================
--
-- A. Definisi yang berlaku. Harus TIDAK memuat 'superadmin':
--
--      select pg_get_functiondef('public.is_staff()'::regprocedure);
--
--    Pemeriksaan otomatis di bawah menjalankannya sendiri dan gagal keras bila
--    hasilnya tidak seperti yang dimaksud — sebuah berkas yang mengklaim
--    menyatakan definisi harus membuktikan definisinya berlaku.

do $$
begin
  if pg_get_functiondef('public.is_staff()'::regprocedure) like '%''superadmin''%' then
    raise exception 'H-4 GAGAL: is_staff() masih memuat ''superadmin'' setelah replace.';
  end if;
  raise notice 'H-4: is_staff() kini admin + super_admin saja.';
end $$;

--
-- B. is_internal_staff() SENGAJA masih memuat 'superadmin'. Kueri ini bukan
--    kegagalan bila menampilkannya — ia mencatat bahwa yang dibiarkan memang
--    dibiarkan dengan sadar:
--
--      select pg_get_functiondef('public.is_internal_staff()'::regprocedure);
--
--
-- C. Hak EXECUTE harus IDENTIK dengan sebelum apply — tidak tertutup, dan
--    tidak pula terbuka lebih lebar. Harapan: sama persis dengan hasil kueri
--    yang sama sebelum berkas ini dijalankan (anon true; itulah celah 014
--    yang memang belum ditutup):
--
--      select
--        p.oid::regprocedure                                     as fungsi,
--        has_function_privilege('anon',          p.oid, 'EXECUTE') as anon,
--        has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated,
--        has_function_privilege('service_role',  p.oid, 'EXECUTE') as service_role,
--        p.proacl
--      from pg_proc p
--      join pg_namespace n on n.oid = p.pronamespace
--      where n.nspname = 'public' and p.proname = 'is_staff';
--
--    Bila authenticated berubah menjadi false, JANGAN biarkan: seluruh policy
--    yang memanggil is_staff() akan gagal dievaluasi — kelima tabel CRM dan
--    sembilan tabel lain di luarnya.
--
--
-- D. Tidak ada policy yang bergeser. Mengganti badan fungsi tidak menyentuh
--    policy, dan angka ini harus membuktikannya:
--
--      select count(*) from pg_policies
--      where schemaname = 'public' and tablename like 'crm\_%';   -- 20
--
--
-- E. Dari luar database:
--
--      node scripts/verify-rls.mjs
--
--    Harus tetap 29 lulus / 0 gagal / 3 dilewati, persis seperti sesudah 014.
--    Berkas ini tidak menyentuh satu pun yang diuji skrip itu; angka yang
--    bergeser menandakan sesuatu yang tidak diharapkan, bukan kemajuan.
--
--
-- F. Uji peran, bila ingin memastikan lewat perilaku dan bukan definisi: masuk
--    sebagai admin, buka satu halaman CRM, dan pastikan daftar lead tetap utuh.
--    Tidak ada penghapusan yang perlu dicoba untuk membuktikan ini — A sudah
--    memperlihatkan definisinya, dan DELETE nyata pada data nyata bukan alat
--    uji.
