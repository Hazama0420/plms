-- ============================================================
-- 006_projects_construction.sql
-- ============================================================
--
-- Modul Proyek Konstruksi: melengkapi tabel `projects` dan menambah tahapan
-- pekerjaan.
--
-- LATAR BELAKANG
-- Halaman /projects dan /projects/create ditulis untuk tabel yang tidak pernah
-- ada bentuknya. Kode memakai kolom `name`, `location`, `progress`,
-- `start_date`, `end_date`, `budget`, `spent`, `project_manager`, dan
-- `team_count`; yang benar-benar ada di basis data hanya tujuh kolom:
-- id, title, description, status, created_by, created_at, updated_at.
--
-- Akibatnya modul ini tidak pernah berfungsi sama sekali: setiap INSERT ditolak
-- karena menyebut kolom hantu, dan daftar proyek selalu kosong. Tabel
-- `project_materials` yang dirujuk kedua halaman juga tidak pernah dibuat,
-- sehingga tombol +/- stok mengubah angka di layar tanpa pernah menyimpannya —
-- kegagalannya ditelan oleh `catch` kosong.
--
-- Ini pengulangan persis masalah yang diperbaiki 002_survey_system.sql. Obatnya
-- pun sama: bentuk datanya dicatat di repositori, dan privasinya ditegakkan di
-- basis data lewat RLS, bukan hanya disembunyikan di UI.
--
-- KENAPA `title`, BUKAN MENAMBAH `name`
-- Kolom `title` sudah ada dan sudah NOT NULL, seragam dengan `properties.title`.
-- Menambah `name` hanya melahirkan dua kolom kembar yang isinya harus dijaga
-- tetap sama. Yang disesuaikan adalah kodenya, bukan basis datanya.
--
-- KENAPA `manager_id`, BUKAN `project_manager` TEKS
-- Nama yang diketik manual tidak bisa dipakai untuk apa pun: tidak bisa jadi
-- dasar RLS, tidak bisa menampilkan avatar, dan "Budi" hari ini bisa jadi
-- "budi s." besok. Referensi ke auth.users membuat manajer proyek benar-benar
-- terhubung ke akunnya.
--
-- LOGISTIK MATERIAL SENGAJA TIDAK DIBUAT
-- Fitur itu dicabut dari UI atas keputusan pemilik produk. Lebih baik tidak ada
-- sama sekali daripada ada tapi berbohong.
--
-- AMAN DIJALANKAN BERULANG
-- Seluruh pernyataan memakai `if not exists` / `or replace` / `drop ... if
-- exists`. Constraint dipasang lewat blok DO karena Postgres tidak punya
-- `add constraint if not exists`.
--
-- JALANKAN DI: Supabase Dashboard -> SQL Editor
-- ============================================================

-- ------------------------------------------------------------
-- 1. KOLOM YANG HILANG
-- ------------------------------------------------------------

alter table public.projects
  -- Kode proyek yang bisa diucapkan di lapangan ("PRJ-2026-001"). UUID tidak
  -- bisa disebutkan lewat telepon. Diisi otomatis oleh trigger di bagian 3.
  add column if not exists code         text,

  add column if not exists location     text,

  -- Progres FISIK, bukan progres anggaran. Keduanya sengaja dipisah supaya
  -- kondisi "uang habis 80%, bangunan baru 40%" terlihat, bukan tersamar
  -- di balik satu angka.
  add column if not exists progress     integer not null default 0,

  add column if not exists start_date   date,
  add column if not exists end_date     date,

  -- numeric, bukan float: anggaran konstruksi dihitung sampai rupiah dan
  -- pembulatan biner akan menggeser totalnya.
  add column if not exists budget       numeric(15,2),
  add column if not exists spent        numeric(15,2) not null default 0,

  -- Menunjuk public.users, BUKAN auth.users. Ini bukan selera: PostgREST hanya
  -- bisa meng-embed relasi yang foreign key-nya menuju tabel di schema yang
  -- terekspos. Dengan auth.users, `manager:users!manager_id(...)` gagal dan
  -- nama manajer harus diambil lewat kueri kedua. properties.assigned_to sudah
  -- memakai pola yang sama.
  --
  -- on delete set null: manajer keluar dari perusahaan tidak boleh ikut
  -- menghapus proyeknya.
  add column if not exists manager_id   uuid references public.users (id) on delete set null,

  add column if not exists team_count   integer not null default 0;

-- created_by sudah ada sejak tabelnya dibuat, tapi tanpa foreign key sama
-- sekali — jadi pembuat proyek tidak bisa ikut diambil dalam satu kueri.
-- Ditambahkan di sini dengan alasan yang sama seperti manager_id di atas.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'projects_created_by_fkey'
  ) then
    alter table public.projects
      add constraint projects_created_by_fkey
      foreign key (created_by) references public.users (id) on delete set null;
  end if;
end $$;

-- Unik hanya bila terisi. Baris lama (kalau kelak ada) yang code-nya null tidak
-- saling bertabrakan karena null tidak pernah sama dengan null.
create unique index if not exists idx_projects_code
  on public.projects using btree (code);

-- ------------------------------------------------------------
-- 2. BATASAN NILAI
-- ------------------------------------------------------------
--
-- Dipasang lewat blok DO agar migrasi tetap bisa diulang. Constraint status
-- lama (bila pernah dibuat manual lewat dashboard dengan daftar nilai berbeda)
-- dibuang dulu supaya tidak bentrok dengan yang dipakai aplikasi.

do $$
begin
  alter table public.projects drop constraint if exists projects_status_check;
  alter table public.projects
    add constraint projects_status_check
    check (status in ('planning','active','paused','completed','cancelled'));

  alter table public.projects drop constraint if exists projects_progress_check;
  alter table public.projects
    add constraint projects_progress_check
    check (progress between 0 and 100);

  alter table public.projects drop constraint if exists projects_budget_check;
  alter table public.projects
    add constraint projects_budget_check
    check (budget is null or budget >= 0);

  alter table public.projects drop constraint if exists projects_spent_check;
  alter table public.projects
    add constraint projects_spent_check
    check (spent >= 0);

  alter table public.projects drop constraint if exists projects_team_count_check;
  alter table public.projects
    add constraint projects_team_count_check
    check (team_count >= 0);

  -- Tenggat sebelum tanggal mulai hampir selalu salah ketik. Ditolak di sini
  -- supaya tidak menghasilkan "sisa -1200 hari" di kartu proyek.
  alter table public.projects drop constraint if exists projects_date_order_check;
  alter table public.projects
    add constraint projects_date_order_check
    check (start_date is null or end_date is null or end_date >= start_date);
end $$;

-- Nilai default status. Tanpa ini setiap INSERT wajib menyebut status padahal
-- proyek baru selalu berawal dari perencanaan.
alter table public.projects alter column status set default 'planning';

-- ------------------------------------------------------------
-- 3. KODE PROYEK OTOMATIS
-- ------------------------------------------------------------
--
-- Sequence, bukan `count(*) + 1`. Dua orang yang menekan Simpan bersamaan akan
-- membaca hitungan yang sama dan menghasilkan kode kembar; sequence tidak
-- pernah memberi angka yang sama dua kali sekalipun transaksinya dibatalkan.

create sequence if not exists public.project_code_seq;

create or replace function public.set_project_code()
returns trigger language plpgsql as $$
begin
  if new.code is null or new.code = '' then
    new.code := 'PRJ-'
             || to_char(now(), 'YYYY')
             || '-'
             || lpad(nextval('public.project_code_seq')::text, 3, '0');
  end if;
  return new;
end $$;

drop trigger if exists trg_projects_code on public.projects;
create trigger trg_projects_code
  before insert on public.projects
  for each row execute function public.set_project_code();

-- ------------------------------------------------------------
-- 4. TABEL TAHAPAN PEKERJAAN
-- ------------------------------------------------------------
--
-- Menggantikan bagian "Logistik Material" di halaman create. Tahapan adalah
-- inti papan proyek konstruksi: yang ingin diketahui pengawas bukan "ada berapa
-- sak semen", melainkan "pondasi sudah selesai atau belum".

create table if not exists public.project_milestones (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects (id) on delete cascade,

  title       text not null,

  status      text not null default 'pending'
              check (status in ('pending','in_progress','done','blocked')),

  due_date    date,

  -- Urutan tampil ditentukan manusia, bukan abjad atau tanggal: "Pondasi"
  -- selalu sebelum "Atap" walaupun tanggalnya belum diisi.
  sort_order  integer not null default 0,

  -- Diisi trigger saat status berubah jadi 'done', dikosongkan lagi bila
  -- dibatalkan. Dipisah dari updated_at supaya "kapan selesai" tidak ikut
  -- bergeser tiap kali judulnya disunting.
  completed_at timestamptz,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 5. INDEKS
-- ------------------------------------------------------------

-- Urutan baku papan proyek: tersaring status, terbaru di atas.
create index if not exists idx_projects_status_created
  on public.projects using btree (status, created_at desc);

create index if not exists idx_projects_manager
  on public.projects using btree (manager_id);

create index if not exists idx_projects_created_by
  on public.projects using btree (created_by);

-- Indeks parsial untuk KPI "proyek telat": hanya proyek yang masih berjalan
-- yang bisa terlambat, jadi yang selesai dan batal tidak perlu ikut diindeks.
create index if not exists idx_projects_overdue
  on public.projects using btree (end_date)
  where status in ('planning','active','paused');

create index if not exists idx_milestones_project_order
  on public.project_milestones using btree (project_id, sort_order);

-- ------------------------------------------------------------
-- 6. updated_at & completed_at OTOMATIS
-- ------------------------------------------------------------
--
-- public.touch_updated_at() sudah dibuat di 002_survey_system.sql — dipakai
-- ulang, tidak didefinisikan lagi.

drop trigger if exists trg_projects_touch on public.projects;
create trigger trg_projects_touch
  before update on public.projects
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_milestones_touch on public.project_milestones;
create trigger trg_milestones_touch
  before update on public.project_milestones
  for each row execute function public.touch_updated_at();

create or replace function public.touch_milestone_completed()
returns trigger language plpgsql as $$
begin
  if new.status = 'done' and coalesce(old.status, '') <> 'done' then
    new.completed_at := now();
  elsif new.status <> 'done' then
    new.completed_at := null;
  end if;
  return new;
end $$;

drop trigger if exists trg_milestones_completed on public.project_milestones;
create trigger trg_milestones_completed
  before insert or update on public.project_milestones
  for each row execute function public.touch_milestone_completed();

-- ------------------------------------------------------------
-- 7. ROW LEVEL SECURITY
-- ------------------------------------------------------------

alter table public.projects           enable row level security;
alter table public.project_milestones enable row level security;

-- Peran internal perusahaan. `viewer` sengaja TIDAK termasuk: viewer adalah
-- klien, dan menu Proyek Konstruksi pun tidak ditampilkan untuk mereka
-- (components/dashboard/app-sidebar.tsx). Tanpa penjagaan ini, klien masih bisa
-- membaca anggaran dan realisasi biaya seluruh proyek dengan memanggil
-- PostgREST langsung dari konsol peramban.
--
-- security definer: policy perlu membaca public.users, sementara RLS di tabel
-- itu bisa menghalangi pembacaan baris orang lain. set search_path mencegah
-- pembajakan nama tabel lewat schema lain.
create or replace function public.has_internal_role()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid()
      and role in ('admin','super_admin','agent','marketing')
  );
$$;

-- ---- projects ----

-- Proyek adalah data operasional perusahaan, bukan data pribadi seperti jadwal
-- survei. Seluruh staf internal boleh melihatnya; yang dibatasi adalah siapa
-- yang boleh mengubah.
drop policy if exists projects_select on public.projects;
create policy projects_select on public.projects
  for select using (public.has_internal_role());

-- created_by diikat ke pemanggil: proyek tidak bisa dibuat atas nama orang lain.
drop policy if exists projects_insert on public.projects;
create policy projects_insert on public.projects
  for insert with check (
    created_by = auth.uid() and public.has_internal_role()
  );

-- Menyunting terbatas pada pembuat, manajernya, atau admin. Agen lain boleh
-- melihat papan tapi tidak boleh menggeser progres proyek orang.
drop policy if exists projects_update on public.projects;
create policy projects_update on public.projects
  for update using (
    created_by = auth.uid() or manager_id = auth.uid() or public.is_staff()
  ) with check (
    created_by = auth.uid() or manager_id = auth.uid() or public.is_staff()
  );

drop policy if exists projects_delete on public.projects;
create policy projects_delete on public.projects
  for delete using (
    created_by = auth.uid() or public.is_staff()
  );

-- ---- project_milestones ----
--
-- Tahapan tidak punya aturan sendiri: haknya mengikuti proyek induk. Ditulis
-- sebagai `exists` terhadap public.projects sehingga RLS proyek ikut berlaku —
-- satu tempat untuk diubah bila aturannya kelak bergeser.

drop policy if exists milestones_select on public.project_milestones;
create policy milestones_select on public.project_milestones
  for select using (
    exists (select 1 from public.projects p where p.id = project_id)
  );

drop policy if exists milestones_write on public.project_milestones;
create policy milestones_write on public.project_milestones
  for all using (
    exists (
      select 1 from public.projects p
      where p.id = project_id
        and (p.created_by = auth.uid() or p.manager_id = auth.uid() or public.is_staff())
    )
  ) with check (
    exists (
      select 1 from public.projects p
      where p.id = project_id
        and (p.created_by = auth.uid() or p.manager_id = auth.uid() or public.is_staff())
    )
  );
