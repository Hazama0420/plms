-- ============================================================
-- 002_survey_system.sql
-- ============================================================
--
-- Sistem pengajuan & penjadwalan survei properti.
--
-- LATAR BELAKANG
-- Halaman /surveys memanggil `supabase.from("surveys")` padahal tabelnya belum
-- pernah dibuat. Setiap query gagal, lalu halaman diam-diam menampilkan data
-- contoh yang ditulis di kode — sehingga tampak berfungsi padahal tidak pernah
-- menyimpan apa pun. Selain itu query-nya tidak punya filter kepemilikan, jadi
-- begitu tabelnya ada, semua orang (termasuk viewer) akan melihat nama, nomor
-- telepon, dan catatan pribadi milik agen lain.
--
-- Migrasi ini membuat kedua tabel sekaligus memasang RLS sebagai penjaga
-- utamanya: privasi ditegakkan di basis data, bukan hanya di UI.
--
-- MENGAPA DUA TABEL
-- `survey_requests` = pengajuan dari client (belum tentu jadi).
-- `surveys`         = janji temu yang sudah disepakati lewat WhatsApp.
-- Dipisah supaya pengajuan yang ditolak tidak mengotori daftar jadwal, dan
-- supaya aturan visibilitas keduanya bisa berbeda (agen perlu melihat
-- pengajuan yang masuk, tapi jadwal hanya milik pihak yang terlibat).
--
-- JALANKAN DI: Supabase Dashboard → SQL Editor
-- ============================================================

-- ------------------------------------------------------------
-- 1. TABEL
-- ------------------------------------------------------------

create table if not exists public.survey_requests (
  id              uuid primary key default gen_random_uuid(),
  property_id     uuid not null references public.properties (id) on delete cascade,

  -- Pengaju wajib login (role viewer ke atas). Tidak ada pengajuan anonim:
  -- notifikasi konfirmasi harus punya tujuan yang pasti.
  requester_id    uuid not null references auth.users (id) on delete cascade,
  requester_name  text not null,
  requester_phone text not null,

  -- Preferensi, bukan janji. Waktu final disepakati lewat WhatsApp.
  preferred_date  date,
  preferred_time  time,
  message         text,

  status          text not null default 'pending'
                  check (status in ('pending','contacted','scheduled','rejected','cancelled')),

  -- Diisi server dari pemilik properti; tidak pernah dari body request.
  agent_id        uuid references auth.users (id) on delete set null,
  handled_by      uuid references auth.users (id) on delete set null,
  handled_at      timestamptz,
  reject_reason   text,

  -- Terisi saat agen membuat jadwal dari pengajuan ini (FK ditambah di bawah,
  -- setelah tabel surveys ada).
  survey_id       uuid,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists public.surveys (
  id             uuid primary key default gen_random_uuid(),
  property_id    uuid not null references public.properties (id) on delete cascade,

  -- null bila agen menjadwalkan manual tanpa pengajuan (mis. client menelepon).
  request_id     uuid references public.survey_requests (id) on delete set null,

  -- null bila client bukan pengguna terdaftar. Nama & telepon tetap disalin
  -- supaya jadwal tetap terbaca walau akunnya kelak dihapus.
  client_id      uuid references auth.users (id) on delete set null,
  client_name    text not null,
  client_phone   text,

  agent_id       uuid not null references auth.users (id) on delete cascade,

  -- Satu kolom timestamptz, bukan date + time terpisah. Pemindaian pengingat
  -- jadi satu rentang terindeks; dengan dua kolom, query-nya harus merangkai
  -- string per baris dan salah setiap kali melewati tengah malam.
  scheduled_at   timestamptz not null,
  duration_min   integer not null default 60 check (duration_min between 15 and 480),

  type           text not null default 'lapangan' check (type in ('lapangan','virtual')),
  status         text not null default 'scheduled'
                 check (status in ('scheduled','completed','cancelled','no_show')),

  location_note  text,
  meeting_url    text,
  notes          text,

  -- Cron berjalan tiap 15 menit sementara jendela pengingat selebar 30 menit,
  -- jadi satu jadwal pasti tersapu lebih dari sekali. Kolom ini yang membuat
  -- pengingat terkirim tepat satu kali.
  reminder_sent_at timestamptz,

  created_by     uuid not null references auth.users (id) on delete cascade,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- FK melingkar: baru bisa dipasang setelah kedua tabel ada.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'survey_requests_survey_fk'
  ) then
    alter table public.survey_requests
      add constraint survey_requests_survey_fk
      foreign key (survey_id) references public.surveys (id) on delete set null;
  end if;
end $$;

-- ------------------------------------------------------------
-- 2. INDEKS
-- ------------------------------------------------------------

create index if not exists idx_surveys_agent_time
  on public.surveys using btree (agent_id, scheduled_at);

create index if not exists idx_surveys_client_time
  on public.surveys using btree (client_id, scheduled_at);

create index if not exists idx_surveys_property
  on public.surveys using btree (property_id);

-- Partial index khusus pemindaian cron: hanya baris yang masih perlu dikirimi
-- pengingat yang ikut, jadi ukurannya tetap kecil walau tabelnya tumbuh.
create index if not exists idx_surveys_reminder_due
  on public.surveys using btree (scheduled_at)
  where reminder_sent_at is null and status = 'scheduled';

create index if not exists idx_sr_agent_status
  on public.survey_requests using btree (agent_id, status);

create index if not exists idx_sr_requester
  on public.survey_requests using btree (requester_id, created_at desc);

create index if not exists idx_sr_property
  on public.survey_requests using btree (property_id);

-- ------------------------------------------------------------
-- 3. updated_at OTOMATIS
-- ------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_surveys_touch on public.surveys;
create trigger trg_surveys_touch
  before update on public.surveys
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_sr_touch on public.survey_requests;
create trigger trg_sr_touch
  before update on public.survey_requests
  for each row execute function public.touch_updated_at();

-- ------------------------------------------------------------
-- 4. ROW LEVEL SECURITY — inti dari perbaikan ini
-- ------------------------------------------------------------

alter table public.surveys enable row level security;
alter table public.survey_requests enable row level security;

-- security definer: policy perlu membaca public.users, sementara RLS di tabel
-- itu sendiri bisa menghalangi pembacaan baris orang lain. set search_path
-- mencegah pembajakan nama tabel lewat schema lain.
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and role in ('admin','super_admin')
  );
$$;

-- ---- surveys ----

-- Jadwal hanya terlihat oleh kliennya, agennya, pembuatnya, atau admin.
-- Inilah yang menutup kebocoran: viewer lain tidak akan melihat baris ini
-- sekalipun mereka memanggil PostgREST langsung dari konsol peramban.
drop policy if exists surveys_select on public.surveys;
create policy surveys_select on public.surveys
  for select using (
    client_id = auth.uid()
    or agent_id = auth.uid()
    or created_by = auth.uid()
    or public.is_staff()
  );

-- Client sengaja tidak diberi hak tulis: pembatalan pun lewat agen, supaya
-- tidak ada jadwal yang hilang tanpa sepengetahuan pihak lain.
drop policy if exists surveys_insert on public.surveys;
create policy surveys_insert on public.surveys
  for insert with check (
    created_by = auth.uid() and (agent_id = auth.uid() or public.is_staff())
  );

drop policy if exists surveys_update on public.surveys;
create policy surveys_update on public.surveys
  for update using (
    agent_id = auth.uid() or created_by = auth.uid() or public.is_staff()
  ) with check (
    agent_id = auth.uid() or created_by = auth.uid() or public.is_staff()
  );

drop policy if exists surveys_delete on public.surveys;
create policy surveys_delete on public.surveys
  for delete using (
    agent_id = auth.uid() or created_by = auth.uid() or public.is_staff()
  );

-- ---- survey_requests ----

drop policy if exists sr_select on public.survey_requests;
create policy sr_select on public.survey_requests
  for select using (
    requester_id = auth.uid() or agent_id = auth.uid() or public.is_staff()
  );

-- with check mengikat requester_id ke pemanggil: siapa pun boleh mengajukan,
-- tapi tidak atas nama orang lain.
drop policy if exists sr_insert on public.survey_requests;
create policy sr_insert on public.survey_requests
  for insert with check (requester_id = auth.uid());

-- Client boleh membatalkan pengajuannya sendiri; selebihnya milik agen.
drop policy if exists sr_update on public.survey_requests;
create policy sr_update on public.survey_requests
  for update using (
    agent_id = auth.uid() or requester_id = auth.uid() or public.is_staff()
  ) with check (
    agent_id = auth.uid() or requester_id = auth.uid() or public.is_staff()
  );
