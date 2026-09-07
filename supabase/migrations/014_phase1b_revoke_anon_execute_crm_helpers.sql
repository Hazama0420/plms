-- ============================================================
-- 014 — PHASE 1B: cabut EXECUTE anon pada tiga helper CRM (M-19)
-- ============================================================
--
-- MASALAH
--
-- Migrasi 013 bagian 1 membuat tiga fungsi pembantu dan bermaksud menutupnya
-- dari anon. Baris yang dipakai adalah:
--
--   revoke execute on function public.is_crm_reader() from public;
--
-- Verifikasi pasca-apply PHASE 1B (2026-08-08, lewat endpoint RPC PostgREST)
-- menunjukkan pencabutan itu tidak berpengaruh. Ketiganya masih bisa dipanggil
-- dengan kunci anon tanpa JWT:
--
--   fungsi                        anon
--   is_crm_reader()               BERHASIL, mengembalikan false
--   crm_lead_visible(uuid)        BERHASIL, mengembalikan false
--   crm_contact_visible(uuid)     BERHASIL, mengembalikan false
--
--
-- PENYEBAB
--
-- Komentar di 013 baris 217-220 menyatakan hak EXECUTE datang lewat PUBLIC,
-- karena itu mencabut dari PUBLIC "adalah satu-satunya cara menutupnya".
-- Pernyataan itu benar untuk PostgreSQL polos, tetapi tidak untuk instance ini.
--
-- Supabase memasang default privileges pada skema public, seperti:
--
--   alter default privileges in schema public
--     grant all on functions to anon, authenticated, service_role;
--
-- Akibatnya setiap fungsi baru di public lahir dengan `anon` SUDAH memegang
-- EXECUTE secara LANGSUNG. Hak langsung tidak tersentuh oleh pencabutan atas
-- PUBLIC — keduanya adalah pemberian yang terpisah — jadi baris di 013 mencabut
-- sesuatu yang memang tidak pernah dipakai anon, dan meninggalkan yang dipakai.
--
-- Bukti bahwa ini perilaku instance dan bukan cacat khusus 013: is_staff() dan
-- is_internal_staff() dari migrasi 003/004 tidak pernah menerima satu pun
-- pernyataan grant di berkas mana pun, dan anon tetap bisa memanggil keduanya.
-- Kalau EXECUTE hanya datang lewat PUBLIC, keduanya akan berperilaku sama —
-- dan memang begitu; yang membedakan hanya bahwa 013 mengira sudah menutupnya.
--
--
-- MENGAPA INI BUKAN LUBANG TERBUKA, DAN TETAP HARUS DITUTUP
--
-- Tidak ada data yang bocor lewat ketiganya. Masing-masing dibuka dengan
-- penjaga `auth.uid() is not null` (013 baris 160-210), dan is_crm_reader()
-- mencocokkan auth.uid() ke public.users. Untuk pemanggil tanpa sesi auth.uid()
-- bernilai NULL, sehingga ketiganya mengembalikan false untuk masukan apa pun —
-- persis yang terukur di atas. Penjaganya juga menutup sebelum id lead maupun
-- kontak sempat dilihat, jadi fungsi-fungsi ini bahkan bukan alat penebak
-- keberadaan baris.
--
-- Yang hilang adalah lapis kedua, bukan lapis pertama. Alasannya sama persis
-- dengan yang ditulis 012 baris 30-40: bila kelak salah satu penjaga itu
-- dilonggarkan atau badan fungsinya ditulis ulang, hak EXECUTE-nya masih harus
-- ikut menutup jalan. Hari ini penjaga adalah satu-satunya yang menahan.
--
--
-- YANG TIDAK DIUBAH
--
-- Badan ketiga fungsi: tidak disentuh. Tidak ada create or replace di berkas
-- ini, jadi tidak ada pula default privileges baru yang ikut terpasang.
--
-- Hak authenticated dan service_role: tidak disentuh. Keduanya menerima grant
-- eksplisit di 013 baris 231-233 dan grant itu dibiarkan apa adanya. Ini bukan
-- kelalaian melainkan syarat: hak memanggil fungsi tetap diperiksa meski
-- pemanggilnya berada di dalam policy, sehingga tanpa EXECUTE untuk
-- authenticated seluruh 20 policy CRM gagal saat dievaluasi. `anon`,
-- `authenticated` dan `service_role` adalah role yang berdiri sendiri tanpa
-- pewarisan, jadi mencabut dari yang satu tidak menyentuh yang lain.
--
-- Policy RLS: tidak satu pun dibuat, diubah, atau dihapus. Schema, foreign key,
-- index, constraint, trigger: tidak disentuh. is_staff() dan is_internal_staff()
-- memikul celah default-privileges yang sama, tetapi itu temuan tersendiri dan
-- tidak dikerjakan di sini.
--
--
-- IDEMPOTENSI
--
-- revoke atas hak yang sudah tidak dipegang selesai tanpa efek dan bukan error.
-- Blok di bawah juga melewati fungsi yang tidak ada alih-alih gagal, sehingga
-- berkas ini aman dijalankan berulang kali dan aman pula bila 013 belum pernah
-- dijalankan.
--
-- BERGANTUNG PADA: 013_phase1b_crm_ownership_rls.sql (bagian 1)


-- ============================================================
-- 1. CABUT EXECUTE DARI ANON — tiga helper CRM
-- ============================================================
--
-- to_regprocedure() mengembalikan NULL bila fungsinya tidak ada, jadi berkas ini
-- tidak melempar ketika dijalankan di database yang belum menerima 013. Tanda
-- tangan ditulis lengkap karena nama saja tidak cukup untuk mengenali fungsi
-- ber-argumen.

do $$
declare
  fn text;
begin
  foreach fn in array array[
    'public.is_crm_reader()',
    'public.crm_lead_visible(uuid)',
    'public.crm_contact_visible(uuid)'
  ]
  loop
    if to_regprocedure(fn) is null then
      raise notice 'M-19: % tidak ada — dilewati', fn;
    else
      execute format('revoke execute on function %s from anon', fn);
      raise notice 'M-19: EXECUTE dicabut dari anon pada %', fn;
    end if;
  end loop;
end $$;


-- ============================================================
-- 2. VERIFIKASI
-- ============================================================
--
-- A. Hak EXECUTE per role — jalankan di SQL Editor.
--
--    Harapan: anon false pada ketiganya, authenticated dan service_role true.
--    Bila authenticated ikut false, JANGAN biarkan: seluruh policy CRM akan
--    gagal dievaluasi. Pulihkan dengan grant di 013 baris 231-233.
--
--      select
--        p.oid::regprocedure                                as fungsi,
--        has_function_privilege('anon',         p.oid, 'EXECUTE') as anon,
--        has_function_privilege('authenticated',p.oid, 'EXECUTE') as authenticated,
--        has_function_privilege('service_role', p.oid, 'EXECUTE') as service_role
--      from pg_proc p
--      join pg_namespace n on n.oid = p.pronamespace
--      where n.nspname = 'public'
--        and p.proname in ('is_crm_reader', 'crm_lead_visible', 'crm_contact_visible')
--      order by 1;
--
--
-- B. Daftar pemegang hak, bila A menunjukkan sesuatu yang tidak terduga.
--    proacl memperlihatkan pemberian langsung; entri untuk anon harus hilang
--    seluruhnya, bukan sekadar berubah.
--
--      select p.oid::regprocedure as fungsi, p.proacl
--      from pg_proc p
--      join pg_namespace n on n.oid = p.pronamespace
--      where n.nspname = 'public'
--        and p.proname in ('is_crm_reader', 'crm_lead_visible', 'crm_contact_visible')
--      order by 1;
--
--
-- C. Dari luar database, tanpa SQL Editor:
--
--      node scripts/verify-rls.mjs
--
--    Blok "EXECUTE helper CRM" harus melaporkan anon ditolak pada ketiganya,
--    dan service_role tetap berhasil.
--
--    Sebelum berkas ini di-apply : 26 lulus, 3 gagal, 3 dilewati
--    Sesudah                     : 29 lulus, 0 gagal, 3 dilewati
--
--    Ketiga kegagalan itu justru blok M-19 tersebut, jadi yang bergerak hanya
--    ketiganya. Pencabutan ini tidak menyentuh satu pun policy — angka lain
--    yang ikut bergeser menandakan sesuatu yang tidak diharapkan.
--
--    Kode penolakan anon sengaja tidak dipatok. Sesudah EXECUTE dicabut,
--    PostgREST boleh menjawab 42501, boleh pula menjatuhkan fungsinya dari
--    cache skema role itu dan menjawab PGRST202; keduanya sama-sama berarti
--    tidak bisa dipanggil. Skrip menguji ada-tidaknya error, bukan kodenya,
--    dan memasangkannya dengan panggilan service_role yang harus tetap
--    berhasil — anon-ditolak sendirian tidak membuktikan apa pun, sebab nama
--    fungsi yang salah ketik pun ditolak.
