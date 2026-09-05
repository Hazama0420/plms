-- ============================================================
-- 015 — PHASE 2: crm_leads.created_by → ON DELETE SET NULL (H-3)
-- ============================================================
--
-- MASALAH
--
-- crm_leads.created_by menunjuk auth.users (id) tanpa klausa ON DELETE, jadi
-- PostgreSQL memakai NO ACTION. Akibatnya auth.admin.deleteUser() pasti gagal
-- untuk setiap akun yang pernah membuat lead — bukan sesekali, melainkan selalu,
-- karena baris lead yang menunjuknya masih ada dan tidak boleh menggantung.
--
-- Audit PHASE 2 (2026-08-08, read-only lewat service role) mengukur keadaannya:
--
--   crm_leads total                 10
--   created_by terisi                7, dari 3 user berbeda
--   created_by NULL                  3
--
-- Tiga akun hari ini karena itu mustahil dihapus lewat alur yang ada.
--
--
-- MENGAPA INI BUKAN SEKADAR PESAN GALAT
--
-- app/api/admin/users/delete/route.ts menghapus public.users LEBIH DULU
-- (:84-95), baru auth.users (:98). Langkah pertama berhasil dan CASCADE-nya
-- membuang baris crm_activities milik user itu; langkah kedua yang gagal.
-- Yang tersisa: profil publik hilang, aktivitas hilang, akun auth yatim, dan
-- recordAudit di :115 tidak pernah tercapai. Tidak bisa dibatalkan dan tidak
-- terlihat. Itu H-1, diperbaiki tersendiri di sisi kode — tetapi urutan baru
-- di sana (auth.users lebih dulu) hanya bisa berhasil setelah berkas ini
-- dijalankan. Karena itu 015 lebih dulu, kodenya menyusul.
--
--
-- MENGAPA SET NULL, BUKAN CASCADE
--
-- created_by mencatat SIAPA YANG MENGETIK, bukan siapa yang punya. Lead adalah
-- data pelanggan: menghapus akun staf tidak boleh menghapus jejak pelanggan
-- beserta interest, followup dan activity yang menggantung padanya lewat
-- CASCADE dua tingkat (W-4). SET NULL membuang penunjuknya saja dan menyisakan
-- barisnya utuh.
--
-- Kolomnya sudah nullable dan 3 dari 10 baris memang NULL hari ini, jadi tidak
-- ada baris yang melanggar dan tidak ada yang perlu ditulis ulang lebih dulu.
--
--
-- EFEK PADA POLICY PHASE 1B — DINYATAKAN, BUKAN DIASUMSIKAN
--
-- Lima tempat memakai created_by = auth.uid(): crm_leads_select (013:307),
-- crm_leads_insert (013:321), crm_leads_update (013:347,352), serta helper
-- crm_lead_visible (013:173) dan crm_contact_visible (013:201).
--
-- Untuk baris yang di-NULL-kan, cabang itu berhenti cocok. Baris tetap terlihat
-- lewat salah satu cabang lain yang sudah ada:
--
--   assigned_to = auth.uid()   → tetap terlihat oleh agen pemiliknya
--   assigned_to is null        → masuk kolam klaim (013:54), terlihat semua agen
--   is_crm_reader()/is_staff() → admin selalu melihat
--
-- Kedua kemungkinan itu habis: assigned_to entah terisi entah NULL. Jadi tidak
-- ada lead yang jatuh keluar dari visibilitas siapa pun. Bagian 3 di bawah
-- memuat kueri untuk membuktikannya setelah apply, bukan mempercayainya.
--
--
-- YANG TIDAK DIUBAH
--
-- Policy RLS: tidak satu pun dibuat, diubah, atau dihapus — kedua puluh policy
-- CRM tetap persis seperti PHASE 1B. Badan fungsi helper: tidak disentuh. Hak
-- tabel dan hak EXECUTE: tidak disentuh. Kolom, index, trigger: tidak disentuh.
-- Tidak ada DML: tidak satu baris pun ditulis, diubah, atau dihapus berkas ini.
--
-- FK created_by pada tabel survei (002:98, on delete cascade) di luar lingkup
-- CRM dan dibiarkan. Bagian 2 hanya MELAPORKAN FK serupa pada tabel crm_*;
-- tidak satu pun diubah otomatis.
--
--
-- IDEMPOTENSI
--
-- Nama constraint dibaca dari pg_constraint, tidak ditebak. Bila FK-nya sudah
-- ON DELETE SET NULL, blok melewatinya tanpa menyentuh apa pun; bila FK-nya
-- tidak ada, blok berhenti dengan notice alih-alih gagal. Aman dijalankan
-- berulang kali.
--
-- BERGANTUNG PADA: —  (tidak bergantung pada 012/013/014; hanya butuh
-- crm_leads ada. Dijalankan sebelum perbaikan H-1 di sisi kode.)


-- ============================================================
-- 1. crm_leads.created_by → ON DELETE SET NULL
-- ============================================================
--
-- confdeltype: 'a' = NO ACTION, 'r' = RESTRICT, 'c' = CASCADE, 'n' = SET NULL,
-- 'd' = SET DEFAULT. Yang diinginkan 'n'.
--
-- DROP lalu ADD adalah satu-satunya jalan: PostgreSQL tidak punya ALTER
-- CONSTRAINT untuk mengubah aksi referensial. Keduanya berada dalam satu
-- pernyataan DO, jadi satu transaksi — tidak ada jendela tanpa FK.
--
-- Nama constraint, tabel tujuan, dan kolom tujuan semuanya DIBACA dari
-- pg_constraint, tidak satu pun ditebak. FK dipasang kembali menunjuk ke
-- tempat yang sama persis; yang berubah hanya aksi hapusnya. Baseline
-- menyebut tujuannya auth.users, tetapi berkas ini tidak bergantung pada itu:
-- bila kenyataannya berbeda, ia tetap benar dan tetap melaporkan apa yang
-- ditemukannya.

do $$
declare
  c_name    text;
  c_deltype "char";
  c_target  text;
  c_refcol  text;
begin
  select
    con.conname,
    con.confdeltype,
    con.confrelid::regclass::text,
    ref.attname
    into c_name, c_deltype, c_target, c_refcol
  from pg_constraint con
  join pg_attribute att
    on att.attrelid = con.conrelid
   and att.attnum   = con.conkey[1]
  join pg_attribute ref
    on ref.attrelid = con.confrelid
   and ref.attnum   = con.confkey[1]
  where con.conrelid = 'public.crm_leads'::regclass
    and con.contype  = 'f'
    and array_length(con.conkey, 1) = 1
    and att.attname  = 'created_by';

  if c_name is null then
    raise notice 'H-3: tidak ada FK satu-kolom pada crm_leads.created_by. Tidak ada yang diubah.';
    return;
  end if;

  if c_deltype = 'n' then
    raise notice 'H-3: % (-> %.%) sudah ON DELETE SET NULL — dilewati.',
      c_name, c_target, c_refcol;
    return;
  end if;

  raise notice 'H-3: % menunjuk %.% dengan confdeltype=%; dipasang ulang sebagai SET NULL.',
    c_name, c_target, c_refcol, c_deltype;

  execute format('alter table public.crm_leads drop constraint %I', c_name);
  execute format(
    'alter table public.crm_leads add constraint %I '
    'foreign key (created_by) references %s (%I) on delete set null',
    c_name, c_target, c_refcol
  );

  raise notice 'H-3: % selesai — ON DELETE SET NULL.', c_name;
end $$;


-- ============================================================
-- 2. SAPUAN — FK LAIN KE auth.users PADA TABEL crm_*  (laporan saja)
-- ============================================================
--
-- crm_leads bukan satu-satunya tabel yang menunjuk auth.users. Blok ini
-- memperlihatkan seluruh FK tersebut beserta aksi hapusnya supaya keadaan
-- terbaca di satu tempat, dan supaya yang bermasalah tidak ditemukan lagi
-- lewat kegagalan produksi.
--
-- Tidak satu pun diubah di sini. Mengubahnya berarti memutuskan CASCADE atau
-- SET NULL per kolom, dan keputusan itu berbeda-beda: assigned_to yang di-NULL
-- membuat lead kembali ke kolam klaim (aman), sedangkan crm_activities.user_id
-- yang di-NULL menghasilkan baris riwayat tanpa pelaku. Keduanya bukan lingkup
-- H-3 dan tidak diputuskan diam-diam oleh berkas ini.

do $$
declare
  r record;
  n int := 0;
begin
  for r in
    select
      con.conrelid::regclass::text as tabel,
      con.conname                  as constraint_name,
      att.attname                  as kolom,
      case con.confdeltype
        when 'a' then 'NO ACTION'
        when 'r' then 'RESTRICT'
        when 'c' then 'CASCADE'
        when 'n' then 'SET NULL'
        when 'd' then 'SET DEFAULT'
        else con.confdeltype::text
      end                          as on_delete
    from pg_constraint con
    join pg_class     cls on cls.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = cls.relnamespace
    join pg_attribute att
      on att.attrelid = con.conrelid
     and att.attnum   = con.conkey[1]
    where nsp.nspname   = 'public'
      and cls.relname like 'crm\_%'
      and con.contype   = 'f'
      and con.confrelid = 'auth.users'::regclass
      and array_length(con.conkey, 1) = 1
    order by 1, 3
  loop
    n := n + 1;
    if r.on_delete = 'NO ACTION' or r.on_delete = 'RESTRICT' then
      raise notice 'H-3 sapuan: %.% (%) = % <- MENGHALANGI hapus akun',
        r.tabel, r.kolom, r.constraint_name, r.on_delete;
    else
      raise notice 'H-3 sapuan: %.% (%) = %',
        r.tabel, r.kolom, r.constraint_name, r.on_delete;
    end if;
  end loop;

  raise notice 'H-3 sapuan: % FK crm_* -> auth.users diperiksa, 0 diubah.', n;
end $$;


-- ============================================================
-- 3. VERIFIKASI
-- ============================================================
--
-- A. Aksi hapus pada crm_leads. Baris created_by harus confdeltype = 'n'.
--    Baris lain dicatat apa adanya sebagai keadaan awal PHASE 2.
--
--      select
--        con.conname,
--        att.attname as kolom,
--        con.confdeltype,
--        con.confrelid::regclass as menunjuk
--      from pg_constraint con
--      join pg_attribute att
--        on att.attrelid = con.conrelid and att.attnum = con.conkey[1]
--      where con.conrelid = 'public.crm_leads'::regclass
--        and con.contype  = 'f'
--      order by 2;
--
--
-- B. Tidak ada baris yang hilang. Migrasi ini tidak menyentuh data sama sekali,
--    jadi angkanya harus persis sama dengan sebelum apply:
--
--      select count(*) from public.crm_leads;              -- 10
--      select count(*) from public.crm_leads
--       where created_by is not null;                      -- 7
--      select count(*) from public.crm_leads
--       where assigned_to is null;                         -- 3
--
--
-- C. Policy tidak bergeser. DROP/ADD constraint tidak menyentuh policy, dan
--    angka ini harus membuktikannya, bukan mengandaikannya:
--
--      select count(*) from pg_policies
--      where schemaname = 'public' and tablename like 'crm\_%';   -- 20
--
--
-- D. Tidak ada lead yang jatuh keluar dari visibilitas — klaim di header, diuji.
--    Sebuah lead tak terlihat siapa pun hanya bila ketiga cabang gagal
--    bersamaan; assigned_to entah terisi entah NULL, jadi hasilnya harus 0
--    sekarang maupun setelah created_by mana pun di-NULL-kan kelak:
--
--      select count(*) from public.crm_leads
--      where assigned_to is not null
--        and assigned_to not in (select id from public.users);
--
--    Dibandingkan ke public.users — tabel profil yang dipakai UI menyelesaikan
--    agen — bukan ke auth.users, supaya keadaan separuh jadi milik H-1 ikut
--    terlihat. Nol berarti setiap lead bertuan menunjuk profil yang ada; yang
--    tak bertuan ditampung cabang `assigned_to is null` (013:308). Angka
--    bukan-nol berarti ada lead yang menggantung pada akun yang profilnya sudah
--    hilang, dan itu harus ditangani sebelum perbaikan H-1 dijalankan.
--
--
-- E. Uji fungsional H-3 menunggu perbaikan H-1 di sisi kode. Jangan menghapus
--    akun nyata untuk mengujinya. Ketika saatnya tiba, pakai akun uji yang
--    dibuat khusus, dan setelahnya lead-nya harus MASIH ADA dengan created_by
--    bernilai NULL — bukan hilang.
