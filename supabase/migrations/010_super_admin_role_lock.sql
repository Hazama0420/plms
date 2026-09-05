-- ============================================================
-- 010_super_admin_role_lock.sql
-- ============================================================
--
-- Mengunci kolom `role` agar hanya super_admin yang boleh mengubahnya, dan
-- melindungi baris super_admin dari sentuhan admin.
--
-- MASALAH YANG DIPERBAIKI
-- =======================
-- 007 memasang guard_users_privileged_columns() untuk mencegah pengguna biasa
-- menaikkan pangkatnya sendiri. Penjaga itu punya jalan pintas — lihat
-- 007_rls_properties_users_billing.sql baris 497:
--
--     if public.is_staff() then
--       return new;
--     end if;
--
-- is_staff() bernilai true untuk 'admin' DAN 'super_admin'. Akibatnya seorang
-- admin lolos tanpa pemeriksaan lanjutan, sehingga bisa:
--
--   1. menaikkan dirinya sendiri menjadi super_admin;
--   2. menurunkan pangkat super_admin yang ada menjadi viewer;
--   3. menonaktifkan akun super_admin.
--
-- Ketiganya bisa dilakukan dari peramban. services/user.service.ts
-- updateUserRole() menulis langsung ke PostgREST, jadi pemeriksaan "hanya
-- super_admin yang dapat mengubah role" di app/api/admin/users/route.ts tidak
-- pernah dijalankan untuk jalur itu — satu-satunya penjaga yang berlaku adalah
-- trigger ini, dan trigger inilah yang bocor.
--
-- policy users_update juga terlalu longgar. `id = auth.uid() or is_staff()`
-- memberi admin hak tulis atas SETIAP baris, termasuk baris super_admin.
--
-- ATURAN YANG DITEGAKKAN BERKAS INI
-- =================================
--   - `role` hanya boleh diubah oleh super_admin. Tidak ada pengecualian.
--   - Baris super_admin tidak bisa disentuh admin sama sekali: tidak rolenya,
--     tidak statusnya, tidak persetujuannya.
--   - Admin tetap boleh menyetujui, menonaktifkan, dan mengaktifkan akun
--     non-super_admin. Itu memang wewenangnya.
--   - Pendaftaran sendiri tetap hanya boleh 'viewer' atau 'agent' (dari 007).
--
-- Perbaikan sisi aplikasi menyertai berkas ini: updateUserRole() dialihkan
-- lewat Route Handler, dan kontrol "Edit Role" disembunyikan dari admin.
-- Lapisan basis data di sini yang menjadi penentu akhir — ia berlaku walaupun
-- permintaannya datang dari luar aplikasi.
--
-- JALANKAN DI: Supabase Dashboard -> SQL Editor
-- Jalankan SETELAH 007_rls_properties_users_billing.sql.
-- Idempoten: aman dijalankan berulang kali.
-- ============================================================


-- ============================================================
-- 1. HELPER
-- ============================================================
--
-- Mengenali kedua ejaan, sama seperti is_staff() di 007: baris lama memakai
-- 'superadmin' tanpa garis bawah, dan app/api/admin/users/delete/route.ts:51
-- sudah memeriksa keduanya. Penjaga yang hanya mengenal satu ejaan akan
-- meninggalkan celah pada baris yang memakai ejaan lainnya.
--
-- `security definer` supaya isinya berjalan tanpa RLS — tanpa itu, fungsi yang
-- menanyakan public.users akan memicu policy users, yang justru memanggil
-- fungsi ini kembali.

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid()
      and role in ('super_admin', 'superadmin')
  );
$$;

-- ============================================================
-- 2. TRIGGER — kolom istimewa pada public.users
-- ============================================================
--
-- Menimpa versi 007. Perbedaannya hanya pada urutan pemeriksaan, tetapi di
-- situlah lubangnya: 007 meloloskan is_staff() lebih dulu, sehingga admin tidak
-- pernah sampai ke pemeriksaan `role`. Di sini `role` diperiksa SEBELUM admin
-- diloloskan, dan hak istimewa penuh disempitkan dari is_staff() menjadi
-- is_super_admin().

create or replace function public.guard_users_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- auth.uid() kosong berarti pemanggilnya service role (jalur admin di server,
  -- mis. /api/admin/users) atau proses internal — keduanya sudah melewati
  -- pemeriksaan otorisasinya sendiri di lapisan Route Handler.
  if auth.uid() is null then
    return new;
  end if;

  -- Super admin adalah peran tertinggi: tidak dibatasi berkas ini.
  if public.is_super_admin() then
    return new;
  end if;

  -- INSERT — pendaftaran. Tidak berubah dari 007.
  --
  -- Perbandingan `is distinct from old.*` tidak bisa dipakai di sini: pada
  -- INSERT seluruh kolom `old` bernilai null, sehingga role apa pun yang tidak
  -- null akan terbaca sebagai "berubah" dan setiap pendaftaran ditolak.
  if tg_op = 'INSERT' then
    if new.role is not null and new.role not in ('viewer', 'agent') then
      raise exception
        'Pendaftaran hanya boleh memakai role viewer atau agent.'
        using errcode = '42501';
    end if;

    return new;
  end if;

  -- UPDATE — termasuk cabang ON CONFLICT DO UPDATE milik upsert().
  --
  -- Pemeriksaan 1: role terkunci untuk semua orang kecuali super_admin, yang
  -- sudah keluar di atas. Ini yang menutup admin menaikkan pangkat dirinya
  -- sendiri maupun menurunkan pangkat orang lain.
  if new.role is distinct from old.role then
    raise exception
      'Hanya Super Admin yang dapat mengubah role pengguna.'
      using errcode = '42501';
  end if;

  -- Pemeriksaan 2: baris super_admin sama sekali tidak bisa disentuh dari luar
  -- lingkaran super_admin — bukan hanya rolenya, tetapi juga status dan
  -- persetujuannya. Tanpa ini, admin masih bisa menonaktifkan super_admin dan
  -- praktis mengunci pemegang wewenang tertinggi di luar sistemnya sendiri.
  if old.role in ('super_admin', 'superadmin') then
    raise exception
      'Akun Super Admin hanya dapat diubah oleh Super Admin.'
      using errcode = '42501';
  end if;

  -- Sampai di sini targetnya bukan super_admin dan rolenya tidak berubah.
  -- Admin memang berwenang menyetujui, menonaktifkan, dan mengaktifkan akun.
  if public.is_staff() then
    return new;
  end if;

  -- Sisanya pengguna biasa yang mengubah profilnya sendiri: nama, telepon,
  -- avatar boleh; status dan persetujuan tidak.
  if (
    new.is_approved is distinct from old.is_approved
    or new.status is distinct from old.status
  ) then
    raise exception
      'Kolom role/is_approved/status hanya boleh diubah oleh admin.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_users_privileged_columns on public.users;
create trigger guard_users_privileged_columns
  before insert or update on public.users
  for each row
  execute function public.guard_users_privileged_columns();

-- ============================================================
-- 3. POLICY users_update — mempersempit baris yang boleh disentuh admin
-- ============================================================
--
-- Versi 007 berbunyi `id = auth.uid() or public.is_staff()`, yang memberi admin
-- hak tulis atas setiap baris termasuk baris super_admin. Trigger di atas sudah
-- menolak perubahannya, tetapi policy ini menutup pintunya satu lapis lebih
-- awal — dan pesan galatnya menjadi "baris tidak ditemukan", bukan pengecualian
-- dari trigger.
--
-- Rujukan `role` tanpa kualifikasi dinilai atas baris LAMA di klausa `using`
-- dan baris BARU di `with check`. Keduanya dipakai dengan sengaja:
--   using      -> admin tidak bisa memilih baris super_admin sebagai target;
--   with check -> admin tidak bisa meninggalkan baris dalam keadaan super_admin,
--                 sehingga promosi ke super_admin tertutup juga di sini.
--
-- coalesce() diperlukan karena baris lama bisa punya role NULL: tanpa itu
-- perbandingannya menghasilkan NULL, dan admin kehilangan hak atas baris yang
-- sebenarnya tidak dilindungi.

drop policy if exists users_update on public.users;
create policy users_update on public.users
  for update using (
    id = auth.uid()
    or public.is_super_admin()
    or (
      public.is_staff()
      and coalesce(role, '') not in ('super_admin', 'superadmin')
    )
  ) with check (
    id = auth.uid()
    or public.is_super_admin()
    or (
      public.is_staff()
      and coalesce(role, '') not in ('super_admin', 'superadmin')
    )
  );


-- ============================================================
-- 4. CATATAN — apa yang TIDAK diubah berkas ini
-- ============================================================
--
-- users_select tetap seperti 007: admin memang perlu melihat seluruh direktori,
-- termasuk baris super_admin, supaya halaman /admin/users bisa menampilkannya.
-- Yang dilarang adalah menulisnya, bukan membacanya.
--
-- Tetap tidak ada policy DELETE pada public.users. Penghapusan akun hanya lewat
-- /api/admin/users/delete dan DELETE /api/admin/users, keduanya memakai service
-- role dan memeriksa role pemanggil serta melindungi target super_admin.

