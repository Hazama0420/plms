-- ============================================================
-- 005_ai_usage_quota.sql
-- ============================================================
--
-- Kuota pemakaian fitur AI: per hari, per pengguna, per fitur.
--
-- LATAR BELAKANG
-- Tabel `ai_usage` sudah dipakai app/api/chat/route.ts sejak lama, tetapi tidak
-- pernah punya migrasi — tabelnya dibuat manual lewat dashboard Supabase.
-- Akibatnya bentuknya tidak tercatat di repositori dan tidak bisa direproduksi.
-- Migrasi ini menormalkannya sekaligus menambah dua hal yang belum ada:
--
--   1. Kolom `feature` — sebelumnya satu baris per (user, tanggal) saja,
--      sehingga semua fitur AI berbagi satu penghitung. Agen yang menghabiskan
--      jatah "generate deskripsi" ikut kehilangan akses "scan invoice".
--   2. Kolom `token_count` — batas jumlah permintaan saja tidak cukup. Satu
--      parse-listing berisi teks 20.000 karakter jauh lebih mahal daripada satu
--      permintaan judul singkat, padahal keduanya dihitung "1".
--
-- RACE CONDITION YANG DIPERBAIKI
-- Versi lama membaca (`select`) lalu menulis (`update`) sebagai dua operasi
-- terpisah. Sepuluh permintaan paralel membaca `message_count` yang sama, lalu
-- semuanya lolos — batas 15/hari bisa dilewati dengan mudah. Fungsi
-- `consume_ai_quota()` di bawah menggabungkan cek dan tambah menjadi satu
-- pernyataan INSERT ... ON CONFLICT yang atomik.
--
-- AMAN DIJALANKAN BERULANG
-- Seluruh pernyataan memakai `if not exists` / `or replace` / `add column if
-- not exists` karena tabelnya sudah berisi data produksi.
--
-- JALANKAN DI: Supabase Dashboard -> SQL Editor
-- ============================================================

-- ------------------------------------------------------------
-- 1. TABEL
-- ------------------------------------------------------------

create table if not exists public.ai_usage (
  id              uuid primary key default gen_random_uuid(),
  user_identifier text not null,
  usage_date      date not null default current_date,
  message_count   integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Baris yang sudah ada semuanya berasal dari chatbot, jadi default 'chat' tepat
-- secara historis — bukan sekadar nilai penambal.
alter table public.ai_usage
  add column if not exists feature text not null default 'chat';

alter table public.ai_usage
  add column if not exists token_count bigint not null default 0;

-- `create table if not exists` di atas tidak berbuat apa-apa bila tabelnya
-- sudah ada, jadi kolom-kolom ini belum tentu terbentuk. Keduanya dipakai di
-- bawah (`order by created_at`, `set updated_at`), jadi keberadaannya dijamin
-- di sini alih-alih diasumsikan dari bentuk tabel yang dibuat manual.
alter table public.ai_usage
  add column if not exists created_at timestamptz not null default now();

alter table public.ai_usage
  add column if not exists updated_at timestamptz not null default now();

-- ------------------------------------------------------------
-- 2. INDEKS
-- ------------------------------------------------------------

-- Tabel lama kemungkinan besar punya kunci unik pada (user_identifier,
-- usage_date) saja — bentuk yang benar ketika hanya ada satu fitur. Kunci itu
-- harus dilepas lebih dulu: dengan kolom `feature`, satu pengguna sah memiliki
-- beberapa baris pada tanggal yang sama, dan kunci lama akan menolaknya.
--
-- Dicari lewat pg_index, bukan pg_constraint saja, karena kunci itu bisa dibuat
-- sebagai constraint (lewat UI Supabase) maupun sebagai index lepas (lewat
-- `create unique index`). Constraint dilepas dengan ALTER TABLE, index lepas
-- dengan DROP INDEX — DROP INDEX menolak index milik constraint.
do $$
declare
  rec record;
begin
  for rec in
    select
      i.indexrelid::regclass::text as index_name,
      c.conname
    from pg_index i
    join pg_class t on t.oid = i.indrelid
    join pg_namespace n on n.oid = t.relnamespace
    left join pg_constraint c
      on c.conindid = i.indexrelid and c.contype in ('u', 'p')
    where n.nspname = 'public'
      and t.relname = 'ai_usage'
      and i.indisunique
      and (
        -- attname bertipe `name`, bukan `text`. Tanpa cast, array_agg
        -- menghasilkan name[] dan Postgres menolak membandingkannya dengan
        -- literal text[] di sebelah kanan.
        select array_agg(a.attname::text order by a.attname::text)
        from unnest(i.indkey) as k(attnum)
        join pg_attribute a
          on a.attrelid = i.indrelid and a.attnum = k.attnum
      ) = array['usage_date', 'user_identifier']::text[]
  loop
    if rec.conname is not null then
      execute format('alter table public.ai_usage drop constraint %I', rec.conname);
    else
      execute format('drop index %s', rec.index_name);
    end if;
  end loop;
end $$;

-- Bila tabel lama ternyata tidak punya kunci unik sama sekali, baris ganda
-- untuk (user_identifier, usage_date, feature) yang sama mungkin sudah ada dan
-- akan menggagalkan pembuatan indeks di bawah. Duplikatnya digabung, bukan
-- dibuang: nilainya dijumlahkan ke baris tertua supaya meteran pemakaian tidak
-- berkurang. Tanpa duplikat, blok ini tidak melakukan apa-apa.
with ranked as (
  select
    id,
    first_value(id) over w as keep_id,
    row_number()    over w as rn
  from public.ai_usage
  window w as (
    partition by user_identifier, usage_date, feature
    order by created_at, id
  )
),
merged as (
  select
    r.keep_id,
    sum(u.message_count) as total_requests,
    sum(u.token_count)   as total_tokens
  from ranked r
  join public.ai_usage u on u.id = r.id
  where r.keep_id in (select keep_id from ranked where rn > 1)
  group by r.keep_id
),
updated as (
  update public.ai_usage u
  set message_count = m.total_requests,
      token_count   = m.total_tokens,
      updated_at    = now()
  from merged m
  where u.id = m.keep_id
  returning u.id
)
delete from public.ai_usage
where id in (select id from ranked where rn > 1);

-- Kunci upsert atomik yang dipakai consume_ai_quota().
create unique index if not exists uq_ai_usage_identity
  on public.ai_usage (user_identifier, usage_date, feature);

-- Untuk pembersihan baris lama dan laporan pemakaian harian.
create index if not exists idx_ai_usage_date
  on public.ai_usage (usage_date);

-- ------------------------------------------------------------
-- 3. RLS
-- ------------------------------------------------------------
-- Sengaja tanpa policy. Kuota hanya boleh dihitung oleh service role
-- (createAdminClient) dari sisi server; klien browser tidak boleh membaca
-- apalagi menulis meteran pemakaiannya sendiri.

alter table public.ai_usage enable row level security;

-- ------------------------------------------------------------
-- 4. consume_ai_quota() — cek + tambah dalam satu operasi atomik
-- ------------------------------------------------------------
--
-- Penambahan dilakukan lebih dulu, keputusan dikembalikan sesudahnya. Ini
-- disengaja: percobaan yang ditolak tetap tercatat, sehingga membanjiri
-- endpoint setelah kuota habis tidak gratis bagi penyerang.

create or replace function public.consume_ai_quota(
  p_identifier   text,
  p_feature      text,
  p_max_requests integer,
  p_max_tokens   bigint,
  p_tokens       bigint default 0
)
returns table (allowed boolean, requests_used integer, tokens_used bigint)
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_requests integer;
  v_tokens   bigint;
begin
  insert into public.ai_usage (
    user_identifier, usage_date, feature, message_count, token_count
  )
  values (p_identifier, current_date, p_feature, 1, greatest(p_tokens, 0))
  on conflict (user_identifier, usage_date, feature) do update
    set message_count = ai_usage.message_count + 1,
        token_count   = ai_usage.token_count + greatest(p_tokens, 0),
        updated_at    = now()
  returning ai_usage.message_count, ai_usage.token_count
  into v_requests, v_tokens;

  allowed       := (v_requests <= p_max_requests) and (v_tokens <= p_max_tokens);
  requests_used := v_requests;
  tokens_used   := v_tokens;
  return next;
end
$fn$;

-- ------------------------------------------------------------
-- 5. add_ai_tokens() — koreksi token setelah AI menjawab
-- ------------------------------------------------------------
--
-- consume_ai_quota() dipanggil SEBELUM AI dijalankan, jadi hanya bisa memakai
-- estimasi prompt. Setelah jawabannya diterima, selisihnya ditambahkan di sini
-- tanpa menaikkan message_count (permintaannya sudah dihitung sekali).

create or replace function public.add_ai_tokens(
  p_identifier text,
  p_feature    text,
  p_tokens     bigint
)
returns bigint
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_tokens bigint;
begin
  if coalesce(p_tokens, 0) <= 0 then
    select ai_usage.token_count into v_tokens
    from public.ai_usage
    where user_identifier = p_identifier
      and usage_date = current_date
      and feature = p_feature;
    return coalesce(v_tokens, 0);
  end if;

  insert into public.ai_usage (
    user_identifier, usage_date, feature, message_count, token_count
  )
  values (p_identifier, current_date, p_feature, 0, p_tokens)
  on conflict (user_identifier, usage_date, feature) do update
    set token_count = ai_usage.token_count + p_tokens,
        updated_at  = now()
  returning ai_usage.token_count into v_tokens;

  return v_tokens;
end
$fn$;

-- ------------------------------------------------------------
-- 6. HAK AKSES
-- ------------------------------------------------------------
--
-- Kedua fungsi ini `security definer`, jadi siapa pun yang boleh
-- memanggilnya bisa menulis ke ai_usage — termasuk memalsukan meteran orang
-- lain. Karena itu EXECUTE dicabut dari anon & authenticated dan hanya
-- diberikan ke service_role yang dipakai createAdminClient() di server.

revoke all on function public.consume_ai_quota(text, text, integer, bigint, bigint) from public, anon, authenticated;
revoke all on function public.add_ai_tokens(text, text, bigint) from public, anon, authenticated;

grant execute on function public.consume_ai_quota(text, text, integer, bigint, bigint) to service_role;
grant execute on function public.add_ai_tokens(text, text, bigint) to service_role;

-- ------------------------------------------------------------
-- 7. PEMBERSIHAN (opsional, jalankan berkala)
-- ------------------------------------------------------------
-- Meteran tidak berguna setelah lewat beberapa bulan; indeks idx_ai_usage_date
-- membuat penghapusan ini murah.
--
--   delete from public.ai_usage where usage_date < current_date - interval '90 days';
