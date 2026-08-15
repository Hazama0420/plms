-- ============================================================
-- 017 — PHASE 2: pensiunkan trigger notifikasi lead (M-17)
-- ============================================================
--
-- MASALAH
--
-- Notifikasi lead ditulis DUA produsen. Trigger on_lead_created_notify menulis
-- langsung ke public.notifications; lapisan aplikasi menulis lewat notifyEvent()
-- di lib/notification-helper.ts. Pada jalur intake keduanya menyala untuk
-- kejadian yang sama, dan agen menerima dua baris.
--
-- Duplikasinya bukan bagian terburuknya. Kedua produsen TIDAK SETARA:
--
--   sifat                          trigger              notifyEvent()
--   ----------------------------------------------------------------------
--   sakelar preferences.lead_alerts  DIABAIKAN            dihormati (:161-163)
--   push OneSignal                   TIDAK PERNAH         dikirim (:207)
--   sender_id saat lead dialihkan    pembuat lead         pelaku sesungguhnya
--   type                             selalu 'lead'        'lead' / 'assignment'
--   link + action_url                /crm/leads/<id>      identik
--
-- Baris trigger tidak pernah mendorong push apa pun: tidak ada jalur dari SQL ke
-- OneSignal sama sekali. Jadi seorang agen yang mematikan "lead_alerts" di
-- halaman Pengaturan hari ini TETAP menerima baris trigger — sakelarnya
-- berbohong kepadanya.
--
--
-- YANG DILAKUKAN BERKAS INI
--
-- Melepas SATU trigger, on_lead_created_notify pada public.crm_leads, sehingga
-- aplikasi menjadi satu-satunya produsen notifikasi lead.
--
-- public.handle_new_lead_notification() TIDAK DI-DROP. Fungsinya dipertahankan
-- dengan sadar; bagian 3 menandainya lewat COMMENT ON FUNCTION supaya tidak ada
-- yang memasangnya kembali tanpa sengaja. Alasannya di bawah.
--
--
-- URUTAN — KODE LEBIH DULU, DAN INI SUDAH TERJADI
--
-- Menjalankan berkas ini SEBELUM penggantinya tayang akan membuat jalur CRM UI
-- SENYAP TOTAL: trigger lepas, dan tidak ada yang menggantikannya. Karena itu
-- kode mendahului migrasi, bukan sebaliknya.
--
-- Penggantinya sudah tayang pada commit 923cd88:
--
--   app/api/leads/[id]/assign/route.ts   PATCH; menulis assigned_to dengan
--                                        klien sesi (RLS utuh), lalu menaikkan
--                                        hak hanya untuk notifikasinya
--   services/crm.service.ts              memanggilnya dari createLead dan
--                                        updateLead
--   lib/validations.ts                   leadAssignSchema
--
-- Dan sudah diuji di produksi, sebelum berkas ini ditulis:
--
--   buat lead dengan agen lain      -> 2 baris   (trigger + rute)
--   ganti agen di halaman Edit Lead -> 2 baris   (trigger + rute)
--
-- DUA adalah hasil yang benar untuk uji itu. Ia membuktikan rute barunya
-- bekerja SEMENTARA trigger masih terpasang. Satu baris akan berarti rutenya
-- tidak terpanggil — dan melepas trigger sesudah itu menghasilkan NOL. Berkas
-- ini mengubah dua menjadi satu dengan membuang produsen yang lebih buruk.
--
--
-- MENGAPA FUNGSINYA DIPERTAHANKAN
--
-- Keputusan pemilik proyek. Men-DROP fungsinya akan menutup M-15 dan L-13 —
-- keduanya temuan terbuka atas fungsi ini (security definer tanpa
-- SET search_path, terlihat pada salinan di bagian 4) — dan menutup temuan
-- lewat penghapusan berarti menutupnya tanpa pernah diputuskan. Keduanya tetap
-- terbuka, kini tanpa jalur pemicu.
--
-- Fungsinya menjadi menganggur: ada, tetapi tidak ada yang memanggilnya.
-- Bagian 1 membuktikan itu benar-benar terjadi dengan menghitung trigger yang
-- tersisa, bukan mengandaikannya.
--
--
-- SNAPSHOT SEBELUM APPLY — GERBANG, DAN HASILNYA
--
-- Dijalankan read-only di SQL Editor pada 2026-08-10 sebelum berkas ini ditulis.
-- Fungsi ini TIDAK ADA di berkas mana pun dalam repo (baseline §7.1), jadi tanpa
-- salinan itu ia tidak bisa dipulihkan. Salinannya ada di bagian 4.
--
--   (a) definisi fungsi          utuh, tersalin ke bagian 4
--   (b) trigger memakai fungsi   TEPAT SATU: on_lead_created_notify @ crm_leads
--   (c) trigger di crm_leads     hanya yang itu — tidak ada yang ikut terdampak
--   (d) default kolom            created_by DEFAULT auth.uid(); assigned_to none
--   (e) korelasi notifikasi      7 lead: 2 -> 2 baris, 4 -> 1 baris, 1 -> 0
--
-- (b) adalah gerbang yang sesungguhnya: ia membuktikan melepas satu trigger
-- benar-benar membuat fungsinya menganggur. Bila hasilnya lebih dari satu,
-- berkas ini tidak boleh ditulis dalam bentuk ini.
--
-- (e) dibaca apa adanya: duplikasinya NYATA namun kecil pada sampel ini, 2 dari
-- 7. Kueri itu mengaitkan waktu, bukan sebab — jendelanya +/-5 detik terhadap
-- crm_leads.created_at dan pemiliknya dibaca SAAT INI, jadi lead yang agennya
-- diganti belakangan otomatis bernilai 0. Ia mengukur pembuatan, tidak pernah
-- pengalihan. Angka ini menggantikan klaim "10 Lead / 10 notifikasi = 1:1" pada
-- baseline §7.6 yang keliru menyimpulkan tidak ada duplikasi.
--
--
-- YANG BERUBAH BAGI PENGGUNA — DINYATAKAN, BUKAN DISEMBUNYIKAN
--
--   1. Agen yang mematikan "lead_alerts" benar-benar berhenti menerima
--      notifikasi lead. Hari ini ia masih menerima baris trigger.
--   2. Penugasan lewat CRM UI mulai MENGIRIM PUSH OneSignal yang sebelumnya
--      tidak ada. Lalu lintas keluar baru, tunduk pada sakelar
--      push_notifications tiap penerima.
--   3. Menyimpan formulir Edit Lead TANPA mengganti agen berhenti menghasilkan
--      notifikasi. PostgreSQL menyalakan UPDATE OF assigned_to bila kolom itu
--      DISEBUT di klausa SET, bukan bila nilainya berubah — dan halaman Edit
--      Lead selalu menyebutnya. Penggantinya memakai penjaga nilai-berubah yang
--      sudah ada di crm.service.ts.
--   4. Kolom notifications.category berhenti bertambah untuk baris lead;
--      notifyEvent() tidak pernah menulisnya. Diperiksa: tidak ada UI yang
--      membacanya. Baris lama tidak disentuh.
--   5. Lead yang dialihkan kini mencatat sender_id = pelaku pengalihan, bukan
--      pembuat lead. Trigger memakai COALESCE(NEW.created_by, target_agent) dan
--      created_by tidak berubah saat UPDATE.
--
--
-- YANG TIDAK DIUBAH
--
-- public.handle_new_lead_notification(): TIDAK di-DROP, badannya TIDAK disunting
-- — hanya diberi COMMENT. Trigger lain mana pun: tidak disentuh; (c) sudah
-- membuktikan crm_leads tidak punya trigger lain, dan bagian 1 membaca nama dari
-- katalog alih-alih menyapu tabelnya. Policy RLS, hak tabel, hak EXECUTE, kolom,
-- index, foreign key: tidak disentuh. TIDAK ADA DML — tidak satu baris
-- public.notifications pun ditulis, diubah, atau dihapus; yang sudah terkirim
-- tetap ada di lonceng penerimanya.
--
-- Jalur M-18 (intake tanpa agen -> lead.unassigned ke seluruh admin) tidak
-- terpengaruh sama sekali: penjaga IF target_agent IS NOT NULL di dalam fungsi
-- membuat trigger tidak pernah menyala di sana. Terbaca pada salinan di
-- bagian 4.
--
--
-- IDEMPOTENSI
--
-- Bagian 1 membaca pg_trigger lebih dulu dan melewati DROP bila triggernya sudah
-- tidak ada. Bagian 3 memakai COMMENT ON FUNCTION yang selalu boleh diulang, dan
-- dilewati bila fungsinya tidak ada. Aman dijalankan berulang kali.
--
-- Berkas ini TIDAK memasang penjaga raise exception seperti 016. Alasannya:
-- keadaan yang perlu dijaga — apakah penggantinya sudah tayang — hidup di
-- Vercel, bukan di dalam database, jadi tidak ada yang bisa ditanyakan SQL untuk
-- membuktikannya. Uji dua-baris di atas adalah gerbangnya, dan ia dijalankan
-- manusia sebelum berkas ini dijalankan.
--
-- BERGANTUNG PADA: commit 923cd88 TAYANG DI PRODUKSI. Bukan pada migrasi mana
-- pun; berkas ini hanya butuh crm_leads ada.


-- ============================================================
-- 1. LEPAS on_lead_created_notify
-- ============================================================
--
-- Nama trigger, tabel, dan definisinya DIBACA dari katalog, tidak ditebak —
-- pola yang sama dengan 015. Yang dicari adalah trigger yang terikat ke
-- handle_new_lead_notification() pada crm_leads, bukan nama yang dihafal:
-- bila seseorang pernah memasangnya kembali dengan nama lain, berkas ini tetap
-- menemukannya.
--
-- tgisinternal disaring supaya trigger sistem (constraint FK) tidak pernah ikut
-- terbaca.
--
-- Definisi lamanya dicetak lewat raise notice sebelum dilepas, sehingga log
-- apply memuat catatan persis apa yang dibuang.

do $$
declare
  r          record;
  n_dropped  int := 0;
begin
  if to_regprocedure('public.handle_new_lead_notification()') is null then
    raise notice 'M-17: fungsi handle_new_lead_notification() tidak ada. Tidak ada trigger yang dicari.';
    return;
  end if;

  for r in
    select tg.tgname,
           tg.tgrelid::regclass::text as tabel,
           pg_get_triggerdef(tg.oid)  as definisi
    from pg_trigger tg
    where not tg.tgisinternal
      and tg.tgfoid = 'public.handle_new_lead_notification()'::regprocedure
    order by 1
  loop
    raise notice 'M-17: melepas % pada % — definisi lama: %',
      r.tgname, r.tabel, r.definisi;

    execute format('drop trigger %I on %s', r.tgname, r.tabel);
    n_dropped := n_dropped + 1;
  end loop;

  if n_dropped = 0 then
    raise notice 'M-17: tidak ada trigger terikat ke handle_new_lead_notification() — sudah lepas sebelumnya.';
  else
    raise notice 'M-17: % trigger dilepas. Aplikasi kini satu-satunya produsen notifikasi lead.', n_dropped;
  end if;
end $$;


-- ============================================================
-- 2. BUKTI — fungsinya benar-benar menganggur, dan crm_leads bersih
-- ============================================================
--
-- Header mengklaim dua hal. Blok ini membuktikan keduanya di dalam apply yang
-- sama, alih-alih menyerahkannya pada seseorang yang mungkin menjalankan kueri
-- verifikasi di bagian 5 atau mungkin tidak. Gagal keras bila klaimnya salah.

do $$
declare
  n_pakai_fungsi int;
  n_di_crm_leads int;
begin
  select count(*) into n_pakai_fungsi
  from pg_trigger
  where not tgisinternal
    and tgfoid = to_regprocedure('public.handle_new_lead_notification()');

  if n_pakai_fungsi > 0 then
    raise exception
      'M-17 GAGAL: % trigger masih terikat ke handle_new_lead_notification() '
      'setelah bagian 1. Notifikasi lead akan tetap terduplikasi.', n_pakai_fungsi;
  end if;

  select count(*) into n_di_crm_leads
  from pg_trigger
  where tgrelid = 'public.crm_leads'::regclass
    and not tgisinternal;

  if n_di_crm_leads > 0 then
    raise notice
      'M-17: crm_leads masih memiliki % trigger non-internal lain. Bukan '
      'kegagalan — tetapi snapshot (c) menemukan nol, jadi periksa asalnya.',
      n_di_crm_leads;
  else
    raise notice 'M-17: crm_leads kini nol trigger; kelima tabel CRM bersih.';
  end if;
end $$;


-- ============================================================
-- 3. TANDAI FUNGSINYA — supaya tidak dipasang kembali tanpa sengaja
-- ============================================================
--
-- Fungsi yang menganggur tanpa penjelasan mengundang orang berikutnya
-- memasangnya kembali dan memulihkan duplikasinya. COMMENT membuat alasannya
-- ikut terbaca oleh siapa pun yang memeriksanya lewat \df+ atau katalog.
--
-- Hanya COMMENT: badan fungsi, pemilik, dan ACL-nya tidak disentuh.

do $$
begin
  if to_regprocedure('public.handle_new_lead_notification()') is null then
    raise notice 'M-17: fungsi tidak ada — COMMENT dilewati.';
    return;
  end if;

  comment on function public.handle_new_lead_notification() is
    'MENGANGGUR sejak migrasi 017 (M-17, 2026-08-10). Tidak terhubung ke trigger '
    'mana pun dan sengaja dibiarkan demikian. Notifikasi lead kini diproduksi '
    'aplikasi lewat app/api/leads/[id]/assign/route.ts + notifyEvent(), yang '
    'menghormati preferences.lead_alerts dan mengirim push OneSignal — keduanya '
    'tidak pernah dilakukan fungsi ini. JANGAN pasang kembali sebagai trigger '
    'pada crm_leads: notifikasi akan terduplikasi dan salinan triggernya '
    'mengabaikan sakelar preferensi pengguna. Dipertahankan (tidak di-DROP) '
    'karena M-15 dan L-13 adalah temuan terbuka atas fungsi ini; menghapusnya '
    'akan menutup keduanya tanpa keputusan.';

  raise notice 'M-17: COMMENT dipasang pada handle_new_lead_notification().';
end $$;


-- ============================================================
-- 4. SALINAN UTUH — satu-satunya jalan pulang
-- ============================================================
--
-- Diambil lewat pg_get_functiondef() pada 2026-08-10, sebelum berkas ini
-- dijalankan (snapshot (a)). Fungsi ini tidak pernah ada di berkas mana pun
-- dalam repo, jadi INI satu-satunya salinannya yang tersimpan dalam kendali
-- versi.
--
-- Akhiran baris CRLF pada keluaran asli dinormalkan menjadi LF; isinya identik.
--
-- Untuk memulihkan keadaan sebelum 017: jalankan CREATE OR REPLACE di bawah
-- (fungsinya seharusnya masih ada — 017 tidak men-DROP-nya), lalu CREATE
-- TRIGGER di bawahnya. Perhatikan pg_get_triggerdef merendernya TANPA kualifikasi
-- skema; salinan di sini menambahkan `public.` supaya tidak bergantung pada
-- search_path pemanggil.
--
-- Memulihkannya berarti mengembalikan duplikasi DAN mengembalikan baris yang
-- mengabaikan preferensi pengguna. Bacalah bagian "YANG BERUBAH BAGI PENGGUNA"
-- di header lebih dulu.
--
--   CREATE OR REPLACE FUNCTION public.handle_new_lead_notification()
--    RETURNS trigger
--    LANGUAGE plpgsql
--    SECURITY DEFINER
--   AS $function$
--   DECLARE
--       target_agent UUID;
--       client_name TEXT;
--   BEGIN
--       target_agent := NEW.assigned_to;
--
--       -- Hanya buat notifikasi jika ada agen yang ditugaskan (assigned_to)
--       IF target_agent IS NOT NULL THEN
--           -- Ambil nama kontak jika contact_id ada
--           IF NEW.contact_id IS NOT NULL THEN
--               SELECT full_name INTO client_name
--               FROM public.crm_contacts
--               WHERE id = NEW.contact_id;
--           END IF;
--
--           -- Insert data notifikasi ke tabel notifications
--           INSERT INTO public.notifications (
--               user_id,
--               sender_id,
--               type,
--               title,
--               message,
--               link,
--               category,
--               action_url
--           ) VALUES (
--               target_agent,
--               COALESCE(NEW.created_by, target_agent),
--               'lead',
--               'Prospek (Lead) Ditugaskan! 🎯',
--               'Anda mendapat prospek baru' || COALESCE(' atas nama ' || client_name, '') || '. Segera lakukan follow-up.',
--               '/crm/leads/' || NEW.id,
--               'crm',
--               '/crm/leads/' || NEW.id
--           );
--       END IF;
--
--       RETURN NEW;
--   END;
--   $function$
--
--   CREATE TRIGGER on_lead_created_notify
--   AFTER INSERT OR UPDATE OF assigned_to ON public.crm_leads
--   FOR EACH ROW EXECUTE FUNCTION public.handle_new_lead_notification();
--
-- Catatan untuk M-15/L-13: salinan di atas memperlihatkan SECURITY DEFINER
-- TANPA `SET search_path` — itulah temuannya, dan ia tetap terbuka. Bila fungsi
-- ini kelak dipulihkan, jangan pulihkan cacat itu bersamanya.


-- ============================================================
-- 5. VERIFIKASI
-- ============================================================
--
-- A. Trigger di crm_leads harus nol. Bagian 2 sudah memeriksanya saat apply;
--    kueri ini untuk memeriksanya kembali kapan saja sesudahnya:
--
--      select count(*) from pg_trigger
--      where tgrelid = 'public.crm_leads'::regclass and not tgisinternal;   -- 0
--
--
-- B. Fungsinya HARUS MASIH ADA — dipertahankan dengan sadar, bukan terlewat:
--
--      select count(*) from pg_proc p
--      join pg_namespace n on n.oid = p.pronamespace
--      where n.nspname = 'public'
--        and p.proname = 'handle_new_lead_notification';                    -- 1
--
--    Dan COMMENT-nya terpasang:
--
--      select obj_description(
--        'public.handle_new_lead_notification()'::regprocedure, 'pg_proc');
--
--
-- C. Policy tidak bergeser. Berkas ini tidak menyentuh satu pun policy, dan
--    angka ini harus membuktikannya alih-alih mengandaikannya:
--
--      select count(*) from pg_policies
--      where schemaname = 'public' and tablename like 'crm\_%';             -- 20
--
--
-- D. Tidak ada baris notifikasi yang hilang. Berkas ini nol DML; angkanya harus
--    persis sama dengan sebelum apply:
--
--      select count(*) from public.notifications where type = 'lead';
--
--
-- E. Ulangi snapshot (e). Lead yang dibuat SESUDAH apply harus menghasilkan
--    TEPAT SATU baris; lead lama tidak berubah angkanya:
--
--      select l.id, count(n.id) as baris_notifikasi
--      from public.crm_leads l
--      left join public.notifications n
--        on n.user_id = l.assigned_to and n.type = 'lead'
--       and n.created_at between l.created_at - interval '5 seconds'
--                            and l.created_at + interval '5 seconds'
--      where l.assigned_to is not null
--      group by l.id order by 2 desc;
--
--    Ingat batas kueri ini (lihat header): ia mengaitkan waktu, bukan sebab, dan
--    tidak pernah mengukur pengalihan.
--
--
-- F. Uji perilaku di produksi — inilah bukti yang sesungguhnya. Uji dua-baris
--    sebelum apply harus kini menjadi SATU baris:
--
--      admin buat lead + tugaskan ke agen lain   -> 1 baris, type='lead',
--                                                   ikon 🎯, link terisi
--      admin ganti agen di Edit Lead             -> 1 baris, type='assignment',
--                                                   ikon 👤
--      simpan Edit Lead TANPA ganti agen         -> 0 baris  (sebelumnya 1)
--      agen buat lead untuk DIRINYA SENDIRI      -> 0 baris  (penjaga
--                                                   pelaku=penerima)
--      POST /api/leads dengan properti ber-agen  -> 1 baris  (sebelumnya 2)
--      POST /api/leads TANPA agen — regresi M-18 -> lead.unassigned ke seluruh
--                                                   admin + baris aktivitas
--                                                   "Lead Tanpa Agen", PERSIS
--                                                   seperti sebelumnya
--      agen dengan lead_alerts = false           -> 0 baris DAN 0 push
--                                                   (sebelumnya: 1 baris)
--      pindahkan kartu di Kanban (ubah status)   -> 0 baris, tidak berubah
--
--    Baris M-18 adalah regresi yang paling penting diperiksa: ia satu-satunya
--    yang membuktikan berkas ini tidak menyentuh jalur tetangganya.
--
--
-- G. Uji push HANYA di lingkungan tayang. OneSignal tidak pernah init di
--    localhost (onesignal-provider.tsx keluar lebih awal untuk localhost), jadi
--    uji push dari mesin dev akan selalu "lolos" tanpa satu pun push terkirim.
--    Yang dibaca `recipients` pada respons, BUKAN `success`: nol perangkat
--    dilaporkan sebagai sukses.
--
--
-- H. Dari luar database:
--
--      node scripts/verify-rls.mjs
--
--    Harus tetap 29 lulus / 0 gagal / 3 dilewati, persis seperti sesudah 016.
--    Berkas ini tidak menyentuh satu pun yang diuji skrip itu. Catatan: komentar
--    pada skrip itu (:691-695) masih menyebut membuat lead ber-assigned_to akan
--    memicu on_lead_created_notify — pernyataan itu tidak lagi benar sesudah
--    berkas ini, dan dibetulkan pada langkah dokumentasi, bukan di sini.
