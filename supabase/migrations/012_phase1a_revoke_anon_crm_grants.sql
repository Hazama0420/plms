-- ============================================================
-- 012 — PHASE 1A: cabut hak tulis anon pada tabel CRM
-- ============================================================
--
-- MASALAH
--
-- Migrasi 007 bagian 8 mencabut insert/update/delete dari anon untuk 11 tabel.
-- Daftar itu memuat crm_leads, tetapi empat tabel CRM lainnya tidak pernah
-- masuk: crm_contacts, crm_interests, crm_followups, crm_activities. Ketiga
-- tabel terakhir dibuat manual di SQL Editor, di luar berkas migrasi, jadi
-- tidak ada berkas yang pernah menyebutnya.
--
-- Audit PHASE 0.75 (W-2) memastikan akibatnya: keempat tabel itu masih
-- memberikan delete, insert, update kepada anon. Diperiksa ulang lewat
-- PostgREST dengan filter yang tidak mungkin cocok (id = uuid nol), sehingga
-- tidak ada baris yang bisa tersentuh:
--
--   tabel             UPDATE     DELETE
--   crm_leads         401 42501  401 42501   <- benar, hak sudah dicabut 007
--   crm_contacts      204        204         <- pernyataan DITERIMA
--   crm_interests     204        204         <- pernyataan DITERIMA
--   crm_followups     204        204         <- pernyataan DITERIMA
--   crm_activities    204        204         <- pernyataan DITERIMA
--
-- 204 berarti hak tabelnya lolos dan pernyataan benar-benar dijalankan; nol
-- baris berubah hanya karena tidak ada yang cocok dengan filternya. 42501
-- adalah keadaan yang diinginkan: ditolak sebelum RLS ikut dipertimbangkan.
--
--
-- MENGAPA INI BUKAN LUBANG TERBUKA, DAN TETAP HARUS DITUTUP
--
-- RLS aktif pada kelima tabel dan seluruh policy-nya terikat pada role
-- authenticated (W-1), jadi anon tidak lolos di lapisan baris hari ini. Yang
-- hilang adalah lapis kedua yang dimaksud 007 baris 555-557: "bila kelak ada
-- policy baru yang tanpa sengaja ditulis terlalu longgar, hak tabelnya tetap
-- menutup jalan."
--
-- PHASE 1B akan menulis policy kepemilikan baru pada tepat keempat tabel ini.
-- Itulah keadaan yang komentar tersebut antisipasi, karena itu hak tabelnya
-- dirapikan lebih dulu — sebelum ada policy baru, bukan sesudah.
--
-- Perhatikan satu perilaku yang membuat urutan ini penting: untuk UPDATE dan
-- DELETE, policy yang tidak cocok bekerja sebagai penyaring baris, bukan
-- penolakan. Selama hak tabelnya ada, anon menerima 204 dan nol baris berubah.
-- Tanpa hak tabel, permintaan yang sama ditolak 42501. Perbedaannya menentukan
-- ketika sebuah policy keliru mengikutsertakan anon: yang pertama menghapus
-- baris, yang kedua tidak pernah sampai ke sana.
--
--
-- MENGAPA AMAN
--
-- Tidak ada jalur publik yang menulis ke tabel CRM dengan kunci anon. Seluruh
-- intake inquiry publik memakai service role: app/api/leads/route.ts baris 68
-- membuat kliennya lewat createAdminClient(), dan seluruh insert-nya —
-- crm_contacts, crm_leads, crm_interests, crm_activities — memakai klien itu.
-- service_role memang mengabaikan RLS dan tidak tersentuh pencabutan ini.
--
--
-- YANG TIDAK DIUBAH
--
-- Hak authenticated: tidak disentuh. Hak service_role: tidak disentuh. Policy
-- RLS: tidak satu pun dibuat, diubah, atau dihapus. Foreign key, index,
-- constraint, trigger dan fungsi: di luar lingkup PHASE 1A.
--
-- TRUNCATE juga dicabut, termasuk pada crm_leads yang masih memilikinya.
-- TRUNCATE melewati RLS sepenuhnya, jadi hak tabel adalah satu-satunya yang
-- membatasinya. PostgREST tidak punya endpoint TRUNCATE sehingga tidak dapat
-- dipanggil dari sana, tetapi tidak ada alasan mempertahankannya.
--
--
-- IDEMPOTENSI
--
-- revoke pada hak yang sudah tidak dipegang bukan error di PostgreSQL — ia
-- selesai tanpa efek. Migrasi ini aman dijalankan berulang kali. Baris
-- crm_leads di bawah karena itu tetap disertakan meski 007 sudah mencabut
-- ketiga hak tulisnya: menyatakannya kembali membuat keadaan akhir kelima
-- tabel terbaca di satu tempat, dan tidak menimbulkan efek apa pun.
--
-- BERGANTUNG PADA: 007_rls_properties_users_billing.sql (pola bagian 8)


-- ============================================================
-- 1. CABUT HAK TULIS ANON — kelima tabel CRM
-- ============================================================

do $$
declare
  t text;
begin
  foreach t in array array[
    'crm_leads',
    'crm_contacts',
    'crm_interests',
    'crm_followups',
    'crm_activities'
  ]
  loop
    execute format(
      'revoke insert, update, delete, truncate on public.%I from anon', t
    );
  end loop;
end $$;


-- ============================================================
-- 2. VERIFIKASI
-- ============================================================
--
-- Setelah migrasi ini dijalankan:
--
--   node scripts/verify-rls.mjs
--
-- Bagian "Hak tulis anon pada tabel CRM" harus melaporkan ditolak: true untuk
-- kelima tabel, pada UPDATE maupun DELETE. Hitungan baris anon harus tetap 0
-- seperti sebelumnya — pencabutan hak tidak mengubah apa yang sudah tertutup
-- RLS, dan angka yang berubah di sana justru menandakan sesuatu yang tidak
-- terduga.
--
-- SELECT sengaja tidak dicabut. Menutupnya adalah keputusan tersendiri dengan
-- akibat pada intake publik yang harus diperiksa lebih dulu, dan itu di luar
-- lingkup PHASE 1A. Dicatat di docs/crm/00-schema-baseline.md sebagai M-12.
