-- ============================================================
-- 007_rls_properties_users_billing.sql
-- ============================================================
--
-- Menutup akses anonim ke properti, pengguna, penagihan, dan lead.
--
-- MASALAH YANG DIPERBAIKI
-- =======================
-- Diukur langsung terhadap basis data ini memakai kunci anon — kunci yang
-- memang terbuka di bundel JavaScript dan bisa dibaca siapa pun lewat DevTools.
-- Hitungan barisnya dibandingkan dengan service-role untuk memisahkan "RLS
-- bekerja" dari "tabelnya memang kosong":
--
--   tabel                    anon    service-role
--   property_owners             9    9
--   users                       8    8
--   invoices                    3    3
--   crm_leads                   8    8
--   properties                 23    23   <- termasuk 7 berstatus 'draft'
--   property_address           21    21
--   property_media             74    74
--   (property_price, _land, _building, _specifications: sama-sama terbuka)
--
-- Yang bocor bukan sekadar metadata. `property_owners` memuat `identity_number`
-- — NIK pemilik properti. `users` memuat `email`, `phone`, `address`, `role`,
-- dan `ktp_url`. `invoices` memuat nama, surel, telepon, serta nilai tagihan
-- klien.
--
-- LEBIH BURUK DARI SEKADAR TERBACA
-- ================================
-- Percobaan tulis dengan kunci anon (dibuat tidak merusak: filter UUID yang
-- tidak cocok dengan baris mana pun, dan insert yang sengaja melanggar NOT
-- NULL) menunjukkan UPDATE dan DELETE DITERIMA di kelima tabel yang diuji, dan
-- INSERT diterima di empat di antaranya — yang gagal pun hanya gagal di
-- constraint, bukan ditolak izin.
--
-- Artinya siapa pun di internet bisa menghapus seluruh listing, atau menaikkan
-- `role` dirinya sendiri menjadi 'super_admin'. Ini pengambilalihan, bukan
-- kebocoran.
--
-- KENAPA LOLOS SELAMA INI
-- =======================
-- Penyaringan untuk tamu dikerjakan di TypeScript sisi browser —
-- app/(dashboard)/properties/page.tsx:416:
--
--     const status = isGuestOrViewer ? "published" : "all";
--
-- Itu hanya berlaku bila permintaan lewat aplikasi. Memanggil PostgREST
-- langsung melewatinya sepenuhnya.
--
-- Pola perbaikannya sudah ada di repositori ini: 002, 003, dan 004 sudah
-- mengunci crm_contacts, crm_activities, survey_requests, dan support_tickets
-- dengan cara yang sama. Berkas ini menerapkannya ke tabel yang tersisa.
-- Komentar di 003_crm_contacts_rls.sql:73 bahkan sudah mencatat "crm_leads
-- sendiri belum memakai RLS" — itu yang diselesaikan di sini.
--
-- JALANKAN DI: Supabase Dashboard -> SQL Editor
-- Jalankan SETELAH 002 dan 003 (butuh is_staff & is_internal_staff).
-- Idempoten: aman dijalankan berulang kali.
-- ============================================================


-- ============================================================
-- 1. HELPER
-- ============================================================
--
-- is_staff() dan is_internal_staff() aslinya lahir di 002 dan 003. Berkas ini
-- mendefinisikannya ulang dengan `create or replace` supaya bisa dijalankan
-- pada basis data yang belum sempat memakai kedua migrasi itu — tanpa ini,
-- seluruh berkas gagal di baris pertama yang menyebutnya.
--
-- Definisinya disalin persis dari 003_crm_contacts_rls.sql, bukan dari 002:
-- 003 adalah versi terakhir yang berlaku (ia sendiri sudah menimpa milik 002)
-- dan mengenali ejaan 'superadmin' tanpa garis bawah. Menjalankan 002 atau 003
-- setelah berkas ini karena itu tidak mengubah apa pun.
--
-- Keduanya `security definer` supaya isinya berjalan tanpa RLS — kalau tidak,
-- fungsi yang menanyakan public.users akan memicu policy users, yang di
-- berkas ini justru memanggil fungsi ini kembali.

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

-- Dua helper di bawah ini baru, khusus untuk berkas ini.
--
-- Alasan `security definer`-nya sama: policy pada property_address yang
-- menanyakan properties akan memicu evaluasi policy properties untuk setiap
-- baris — mahal, dan berpotensi melingkar.

-- Apakah properti ini boleh DILIHAT oleh pemanggil?
-- Tamu hanya boleh melihat yang sudah tayang.
create or replace function public.can_see_property(p_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.properties p
    where p.id = p_id
      and (
        p.status = 'published'
        or public.is_internal_staff()
        or p.assigned_to = auth.uid()
        or p.created_by = auth.uid()
      )
  );
$$;

-- Apakah properti ini boleh DIUBAH oleh pemanggil?
-- Sengaja lebih sempit: tayang saja tidak memberi hak tulis kepada siapa pun.
create or replace function public.can_edit_property(p_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.properties p
    where p.id = p_id
      and (
        public.is_staff()
        or p.assigned_to = auth.uid()
        or p.created_by = auth.uid()
      )
  );
$$;

-- Apakah pengguna ini adalah agen yang dipasang pada listing yang tayang?
-- Dipakai policy users: kartu agen di halaman listing publik harus tetap
-- tampil, tanpa membuka seluruh direktori pengguna.
create or replace function public.is_public_facing_agent(u_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.properties p
    where p.assigned_to = u_id
      and p.status = 'published'
  );
$$;


-- ============================================================
-- 2. PROPERTIES
-- ============================================================

alter table public.properties enable row level security;

-- SELECT: tayang untuk semua; sisanya hanya orang dalam dan pemiliknya.
-- Inilah yang memindahkan penyaringan `status = 'published'` dari JavaScript
-- peramban ke basis data, tempat ia tidak bisa dilewati.
drop policy if exists properties_select on public.properties;
create policy properties_select on public.properties
  for select using (
    status = 'published'
    or public.is_internal_staff()
    or assigned_to = auth.uid()
    or created_by = auth.uid()
  );

-- INSERT: hanya orang dalam, dan wajib mengakui dirinya sebagai pembuat.
-- `created_by = auth.uid()` mencegah baris ditulis atas nama orang lain.
drop policy if exists properties_insert on public.properties;
create policy properties_insert on public.properties
  for insert with check (
    public.is_internal_staff()
    and created_by = auth.uid()
  );

drop policy if exists properties_update on public.properties;
create policy properties_update on public.properties
  for update using (
    public.is_staff()
    or assigned_to = auth.uid()
    or created_by = auth.uid()
  );

drop policy if exists properties_delete on public.properties;
create policy properties_delete on public.properties
  for delete using (
    public.is_staff()
    or created_by = auth.uid()
  );


-- ============================================================
-- 3. TABEL TURUNAN PROPERTI
-- ============================================================
--
-- Enam tabel ini mewarisi hak dari properti induknya. Tanpa ini, menutup
-- `properties` tidak ada gunanya: alamat lengkap dan harga listing draf tetap
-- terbaca lewat property_address dan property_price.
--
-- Pola `exists (...)` lewat helper ini sama dengan yang dipakai
-- project_milestones di 006.

do $$
declare
  t text;
begin
  foreach t in array array[
    'property_address',
    'property_price',
    'property_specifications',
    'property_land',
    'property_building',
    'property_media'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);

    execute format('drop policy if exists %I on public.%I', t || '_select', t);
    execute format(
      'create policy %I on public.%I for select using (public.can_see_property(property_id))',
      t || '_select', t
    );

    execute format('drop policy if exists %I on public.%I', t || '_insert', t);
    execute format(
      'create policy %I on public.%I for insert with check (public.can_edit_property(property_id))',
      t || '_insert', t
    );

    execute format('drop policy if exists %I on public.%I', t || '_update', t);
    execute format(
      'create policy %I on public.%I for update using (public.can_edit_property(property_id))',
      t || '_update', t
    );

    execute format('drop policy if exists %I on public.%I', t || '_delete', t);
    execute format(
      'create policy %I on public.%I for delete using (public.can_edit_property(property_id))',
      t || '_delete', t
    );
  end loop;
end $$;


-- ============================================================
-- 4. PROPERTY_OWNERS — tabel yang memuat NIK
-- ============================================================
--
-- TIDAK PERNAH publik, dengan atau tanpa listing yang tayang. Pembeli tidak
-- perlu tahu nomor identitas penjual.
--
-- Aturan akses:
--   - Admin & super_admin: lihat semua data owner (untuk database internal)
--   - Agent: hanya lihat data owner dari properti yang DIA BUAT sendiri
--   - Viewer & tamu: tidak bisa lihat sama sekali
--
-- Akibat yang disengaja: embed `owner:property_owners(*)` di
-- services/property.service.ts:180,352 akan mengembalikan null untuk tamu
-- DAN untuk agen yang membaca properti milik agen lain.
-- Itu keadaan yang benar, bukan galat.

alter table public.property_owners enable row level security;

drop policy if exists property_owners_select on public.property_owners;
create policy property_owners_select on public.property_owners
  for select using (
    public.is_staff()
    or exists (
      select 1
      from public.properties p
      where p.owner_id = property_owners.id
        and p.created_by = auth.uid()
    )
  );

-- Agen perlu mendaftarkan pemilik saat membuat listing, jadi insert dibuka
-- untuk seluruh orang dalam — bukan hanya admin.
drop policy if exists property_owners_insert on public.property_owners;
create policy property_owners_insert on public.property_owners
  for insert with check (
    public.is_internal_staff()
  );

drop policy if exists property_owners_update on public.property_owners;
create policy property_owners_update on public.property_owners
  for update using (
    public.is_staff()
    or created_by = auth.uid()
  );

drop policy if exists property_owners_delete on public.property_owners;
create policy property_owners_delete on public.property_owners
  for delete using (
    public.is_staff()
    or created_by = auth.uid()
  );


-- ============================================================
-- 5. INVOICES
-- ============================================================

alter table public.invoices enable row level security;

drop policy if exists invoices_select on public.invoices;
create policy invoices_select on public.invoices
  for select using (
    created_by = auth.uid()
    or public.is_staff()
  );

drop policy if exists invoices_insert on public.invoices;
create policy invoices_insert on public.invoices
  for insert with check (
    public.is_internal_staff()
    and created_by = auth.uid()
  );

drop policy if exists invoices_update on public.invoices;
create policy invoices_update on public.invoices
  for update using (
    created_by = auth.uid()
    or public.is_staff()
  );

drop policy if exists invoices_delete on public.invoices;
create policy invoices_delete on public.invoices
  for delete using (
    created_by = auth.uid()
    or public.is_staff()
  );


-- ============================================================
-- 6. CRM_LEADS
-- ============================================================
--
-- Mengikuti keputusan yang sudah diambil 003 untuk crm_contacts: yang dipisah
-- adalah orang dalam dari viewer dan tamu, bukan agen dari agen. Membatasi
-- per-agen di sini akan membuat lead terbaca sementara kontaknya tidak, dan
-- getLeadById() melempar galat ketika itu terjadi (lihat 003 baris 71-83).
--
-- Form inquiry publik tetap jalan: /api/leads memakai admin client
-- (service role) yang melewati RLS.

alter table public.crm_leads enable row level security;

drop policy if exists crm_leads_select on public.crm_leads;
create policy crm_leads_select on public.crm_leads
  for select using (
    public.is_internal_staff()
  );

drop policy if exists crm_leads_insert on public.crm_leads;
create policy crm_leads_insert on public.crm_leads
  for insert with check (
    public.is_internal_staff()
  );

drop policy if exists crm_leads_update on public.crm_leads;
create policy crm_leads_update on public.crm_leads
  for update using (
    public.is_staff()
    or assigned_to = auth.uid()
    or created_by = auth.uid()
  );

drop policy if exists crm_leads_delete on public.crm_leads;
create policy crm_leads_delete on public.crm_leads
  for delete using (
    public.is_staff()
    or created_by = auth.uid()
  );


-- ============================================================
-- 7. USERS — dua lapis, karena yang perlu dibatasi adalah KOLOM
-- ============================================================
--
-- RLS bekerja per-baris. Tapi masalah di tabel ini bukan baris mana yang
-- terlihat, melainkan kolom mana: kartu agen di halaman listing publik memang
-- perlu menampilkan nama dan foto, sementara `email`, `phone`, `address`,
-- `role`, dan `ktp_url` tidak boleh ikut terkirim.
--
-- Karena itu policy baris DITAMBAH hak kolom.

alter table public.users enable row level security;

-- Lapis 1 — baris: diri sendiri, orang dalam, atau agen dari listing yang tayang.
drop policy if exists users_select on public.users;
create policy users_select on public.users
  for select using (
    id = auth.uid()
    or public.is_internal_staff()
    or public.is_public_facing_agent(id)
  );

-- Lapis 2 — kolom: tamu hanya boleh tiga kolom yang memang tampil di kartu agen.
-- PostgREST menolak SELURUH kueri dengan 403 bila satu kolom saja tidak
-- berhak, jadi services/property.service.ts:359 harus berhenti meminta
-- `email` pada embed users!assigned_to.
revoke select on public.users from anon;
grant select (id, full_name, avatar_url) on public.users to anon;

-- INSERT: hanya baris untuk diri sendiri.
--
-- Policy ini WAJIB ada. Versi pertama berkas ini sengaja menghilangkannya
-- dengan alasan "pendaftaran berjalan lewat trigger handle_new_user pada
-- auth.users" — dan itu keliru: trigger tersebut tidak ada di migrasi mana pun
-- (grep hanya menemukan komentar itu sendiri). Pendaftaran menulis lewat
-- PostgREST di tiga tempat:
--
--   app/register/page.tsx:102          upsert, role 'viewer'
--   app/register/agent/page.tsx:157    upsert, role 'agent'
--   app/(dashboard)/profile/page.tsx:299  insert susulan bila baris belum ada
--
-- Selama ini yang menopangnya adalah policy manual bernama "Users can insert
-- own data" dan dua kerabatnya. Ketiganya dibuang oleh 009 karena tidak
-- berpola `users_`, jadi tanpa policy di bawah ini pendaftaran agen berhenti
-- di 42501.
--
-- `id = auth.uid()` mengunci akun yang baru dibuat pada dirinya sendiri.
-- Syaratnya signUp() mengembalikan sesi, dan itu hanya terjadi bila konfirmasi
-- surel DIMATIKAN di Supabase Auth. Bila kelak dinyalakan, authData.user tetap
-- terisi tetapi sesinya null, sehingga upsert berjalan sebagai anon: auth.uid()
-- null dan bagian 8 sudah mencabut INSERT dari anon. Profil gagal tersimpan
-- tanpa suara, sebab kedua halaman register hanya console.warn saat dbError.
-- Bila itu terjadi, pindahkan penulisan profil ke Route Handler service role.
--
-- Batas nilai role dijaga trigger di bawah, bukan oleh WITH CHECK ini: pada
-- upsert yang menabrak baris lama, PostgreSQL melewati WITH CHECK milik policy
-- INSERT dan hanya menguji policy UPDATE. Trigger berlaku pada kedua jalur.
drop policy if exists users_insert on public.users;
create policy users_insert on public.users
  for insert with check (
    id = auth.uid()
  );

-- Mengubah profil sendiri boleh; menaikkan pangkat sendiri tidak.
drop policy if exists users_update on public.users;
create policy users_update on public.users
  for update using (
    id = auth.uid()
    or public.is_staff()
  );

-- Policy di atas tidak cukup: tanpa penjaga ini, pengguna yang sah mengubah
-- profilnya sendiri bisa menyertakan role = 'super_admin' dalam permintaan
-- yang sama. RLS tidak bisa membatasi kolom pada UPDATE, jadi dijaga trigger.
--
-- Penjaga yang sama dipasang pada INSERT. Sebabnya users_insert di atas hanya
-- memeriksa `id = auth.uid()`: tanpa penjaga ini, pendaftar bisa menaruh
-- role = 'super_admin' pada baris pertamanya sendiri — persis lubang yang
-- ditutup pada UPDATE, hanya lewat pintu yang berbeda.
create or replace function public.guard_users_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- auth.uid() kosong berarti pemanggilnya service role (jalur admin di
  -- server, mis. /api/admin/users) atau proses internal — keduanya sudah
  -- melewati pemeriksaan otorisasinya sendiri di lapisan Route Handler.
  if auth.uid() is null then
    return new;
  end if;

  if public.is_staff() then
    return new;
  end if;

  -- INSERT — pendaftaran.
  --
  -- Perbandingan `is distinct from old.*` di bawah TIDAK bisa dipakai di sini:
  -- pada INSERT seluruh kolom `old` bernilai null, sehingga role apa pun yang
  -- tidak null akan terbaca sebagai "berubah" dan setiap pendaftaran ditolak.
  --
  -- Yang diperiksa hanya `role`, sebab hanya itu yang memberi hak: is_staff()
  -- dan is_internal_staff() sama-sama membaca kolom ini saja. `is_approved`
  -- dan `status` sengaja dibiarkan — ketiga jalur pendaftaran tidak pernah
  -- mengirimnya (nilainya datang dari default kolom), jadi menjaganya di sini
  -- hanya berisiko memblokir pendaftaran tanpa menutup lubang apa pun.
  --
  -- null diizinkan supaya default kolom apa pun tetap lolos. Daftarnya harus
  -- ikut diperbarui bila kelak ada peran baru yang boleh mendaftar sendiri.
  if tg_op = 'INSERT' then
    if new.role is not null and new.role not in ('viewer', 'agent') then
      raise exception
        'Pendaftaran hanya boleh memakai role viewer atau agent.'
        using errcode = '42501';
    end if;

    return new;
  end if;

  -- UPDATE — termasuk cabang ON CONFLICT DO UPDATE milik upsert().
  if (
    new.role is distinct from old.role
    or new.is_approved is distinct from old.is_approved
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

-- Tidak ada policy DELETE: penghapusan akun hanya lewat
-- /api/admin/users/delete yang memakai service role dan sudah memeriksa role
-- pemanggilnya.


-- ============================================================
-- 8. CABUT HAK TULIS ANON — lapis kedua
-- ============================================================
--
-- Dengan RLS aktif dan tanpa policy yang cocok, tulisan anon sudah tertolak.
-- Pencabutan ini lapis kedua: bila kelak ada policy baru yang tanpa sengaja
-- ditulis terlalu longgar, hak tabelnya tetap menutup jalan.
--
-- Aman karena tidak satu pun jalur publik menulis dengan kunci anon: form
-- inquiry lewat /api/leads dan seluruh notifikasi memakai service role.

do $$
declare
  t text;
begin
  foreach t in array array[
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
    'users'
  ]
  loop
    execute format('revoke insert, update, delete on public.%I from anon', t);
  end loop;
end $$;


-- ============================================================
-- 9. SYSTEM_SETTINGS
-- ============================================================
--
-- SELECT-nya sudah tertutup untuk anon (terverifikasi: service role melihat 1
-- baris, anon menerima array kosong). Yang belum dipastikan hanya hak tulisnya,
-- jadi ditegaskan di sini. Tabel ini memakai `key` sebagai kunci primer, bukan
-- `id`.

alter table public.system_settings enable row level security;

drop policy if exists system_settings_select on public.system_settings;
create policy system_settings_select on public.system_settings
  for select using (
    public.is_internal_staff()
  );

drop policy if exists system_settings_write on public.system_settings;
create policy system_settings_write on public.system_settings
  for all using (
    public.is_staff()
  ) with check (
    public.is_staff()
  );

revoke insert, update, delete on public.system_settings from anon;
