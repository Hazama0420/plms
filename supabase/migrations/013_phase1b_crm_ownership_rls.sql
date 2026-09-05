-- ============================================================
-- 013 — PHASE 1B: scoping kepemilikan RLS pada tabel CRM
-- ============================================================
--
-- MASALAH
--
-- Kelima tabel CRM memakai `is_internal_staff()` pada policy SELECT-nya.
-- Fungsi itu memuat `agent` (003 baris 50-62), jadi setiap agent membaca
-- SELURUH lead, kontak, minat, follow-up dan aktivitas di sistem — termasuk
-- nomor telepon, WhatsApp dan email pelanggan yang dipegang agent lain.
--
-- Cabang kepemilikan yang berdiri di sebelahnya tidak membatasi apa pun.
-- Policy PERMISSIVE digabung dengan OR, sehingga:
--
--   (is_internal_staff() or assigned_to = auth.uid() or created_by = auth.uid())
--    ^^^^^^^^^^^^^^^^^^ sudah true untuk agent, sisanya tidak pernah menentukan
--
-- Migrasi 009 sudah menuliskan pembuktian pola ini untuk kasus lain. Audit
-- PHASE 0.75 (W-1) memastikan bentuk 20 policy yang berlaku hari ini:
--
--   tabel             SELECT              UPDATE
--   crm_leads         is_internal_staff() is_internal_staff() or assigned_to or created_by
--   crm_contacts      is_internal_staff() is_internal_staff()
--   crm_interests     is_internal_staff() is_internal_staff()
--   crm_followups     is_internal_staff() is_internal_staff() or assigned_to
--   crm_activities    is_internal_staff() is_internal_staff() or user_id
--
-- Pembatasan yang terlihat di UI hari ini seluruhnya filter client-side —
-- components/crm/CrmKanbanBoard.tsx baris 147, app/(dashboard)/crm/leads/page.tsx
-- baris 196, app/(dashboard)/crm/followups/page.tsx baris 139 — dan bisa
-- dilewati dengan memanggil PostgREST langsung dari konsol peramban.
--
-- Dua role juga salah tempat: `marketing` tidak ada di `is_internal_staff()`
-- sehingga melihat NOL baris CRM, padahal ROLE_PERMISSIONS memberinya
-- manage_own_crm. `commissioner` ada di dalamnya dan karena itu memegang hak
-- TULIS penuh yang tidak pernah dimaksudkan.
--
--
-- YANG DILAKUKAN MIGRASI INI
--
-- 1. Tiga fungsi helper BARU. `is_staff()` dan `is_internal_staff()` tidak
--    disentuh sama sekali, jadi policy properties, property_owners, invoices,
--    system_settings dan users di migrasi 007 tidak terpengaruh.
-- 2. Sapuan defensif: menghapus policy apa pun pada kelima tabel yang namanya
--    di luar 20 nama final.
-- 3. Menulis ulang 20 policy dengan kepemilikan yang benar-benar mengikat.
-- 4. Mencabut hak SELECT anon pada kelima tabel (M-12).
--
--
-- DEFINISI KEPEMILIKAN
--
--   lead milik saya := assigned_to = auth.uid()
--                   or created_by  = auth.uid()
--                   or assigned_to is null        -- kolam klaim
--
-- Cabang ketiga bukan kelonggaran baru: itu persis filter yang sudah dipakai
-- CrmKanbanBoard.tsx baris 147 hari ini, supaya lead intake yang belum
-- ditugaskan tetap bisa diklaim agent. Bedanya sekarang ia menjadi batas
-- nyata, bukan filter yang bisa dilewati.
--
-- Kontak mengikuti lead-nya: kontak terlihat bila terpaut ke lead milik saya,
-- ATAU bila belum punya lead sama sekali. Cabang kedua penting karena kontak
-- yang baru dibuat selalu yatim — tanpa itu, dialog Quick Contact di
-- crm/leads/create/page.tsx baris 308 membuat kontak yang langsung tidak
-- terlihat oleh pembuatnya sendiri.
--
-- Konsistensi lead-kontak ini yang membuat services/crm.service.ts baris
-- 228-239 tetap aman: getLeadById() melempar "Contact not found for lead"
-- ketika embed kontaknya null. Embed PostgREST adalah LEFT JOIN, jadi kontak
-- yang tidak terlihat muncul sebagai null, bukan sebagai error. Menutup lead
-- dan kontaknya dengan aturan yang sama membuat pasangan itu tidak pernah
-- terpisah. Ini persis alasan yang ditulis 003 baris 71-83 untuk menunda
-- pemisahan antar-agen sampai crm_leads ikut memakai RLS — dan itulah yang
-- terjadi sekarang.
--
--
-- YANG TIDAK DIUBAH
--
-- Tidak ada CREATE TABLE, ALTER TABLE, foreign key, index, constraint, atau
-- trigger. handle_new_lead_notification() tidak disentuh. is_staff() dan
-- is_internal_staff() tidak disentuh. Tidak ada migrasi historis yang disunting.
-- Hak authenticated dan service_role: tidak disentuh. Tidak ada perubahan
-- TypeScript atau otorisasi aplikasi.
--
-- Dua penyimpangan yang diketahui dan SENGAJA dibiarkan, tercatat di
-- docs/crm/00-schema-baseline.md:
--   M-4  commissioner mendapat baca penuh CRM di database, tetapi
--        normalizeRole() di lib/permissions.ts memetakannya ke `viewer`
--        sehingga canAccessRoute menutup /crm untuknya. Hasil bersihnya: ia
--        tetap tidak bisa membuka UI CRM. Memperbaikinya adalah perubahan
--        TypeScript, di luar lingkup fase ini.
--   M-2  crm_followups tidak punya kolom created_by walau empat tempat di
--        kode membacanya. Policy di bawah karena itu hanya memakai
--        assigned_to dan lead_id pada tabel tersebut.
--
--
-- IDEMPOTENSI
--
-- `create or replace function`, `drop policy if exists` + `create policy`, dan
-- `revoke` atas hak yang sudah tidak dipegang semuanya aman diulang. Berkas ini
-- boleh dijalankan berkali-kali tanpa efek berbeda. Jalankan SELURUH berkas
-- sekaligus — fungsi harus ada sebelum policy yang memakainya.
--
--
-- PEMULIHAN
--
-- Tidak ada down migration. Untuk kembali ke keadaan sebelum migrasi ini:
-- jalankan ulang bagian CRM dari 003, 004 dan 007 (bagian 6), lalu
--   grant select on public.crm_leads, public.crm_contacts, public.crm_interests,
--     public.crm_followups, public.crm_activities to anon;
--
-- BERGANTUNG PADA: 003 (pola fungsi helper), 004 (pola INSERT berbasis lead),
--                  007 (policy crm_leads), 009 (pola sapuan), 012 (pola revoke)


-- ============================================================
-- 1. FUNGSI HELPER BARU
-- ============================================================
--
-- Ketiganya security definer dengan alasan yang sama seperti 003: policy
-- membaca public.users, dan tanpa definer pembacaan itu ikut tunduk pada RLS
-- tabel users. Untuk dua fungsi terakhir ada alasan tambahan — subquery di
-- dalam policy juga tunduk pada RLS tabel yang dirujuk, jadi tanpa definer
-- policy crm_contacts yang membaca crm_leads akan memicu evaluasi berputar.
--
-- Penjaga `auth.uid() is not null` wajib ada pada dua fungsi terakhir. Tanpa
-- itu, cabang `assigned_to is null` dan `not exists(...)` bernilai TRUE untuk
-- pemanggil tanpa sesi.

-- Role yang boleh membaca SELURUH CRM tanpa batas kepemilikan.
--
-- Sengaja BUKAN is_internal_staff(): fungsi itu memuat `agent`, dan agent
-- justru yang harus dibatasi kepemilikan. Sengaja bukan is_staff() juga:
-- fungsi itu tidak memuat marketing maupun commissioner.
--
-- marketing dan commissioner ada di sini sebagai pembaca saja — tidak satu pun
-- policy INSERT/UPDATE/DELETE di bawah memanggil fungsi ini.
create or replace function public.is_crm_reader()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid()
      and role in (
        'admin', 'super_admin', 'superadmin',
        'marketing', 'commissioner'
      )
  );
$$;

-- Apakah lead ini masuk lingkup kepemilikan pemanggil.
--
-- Dipakai ulang oleh crm_interests, crm_followups dan crm_activities supaya
-- definisi kepemilikan hanya ditulis di satu tempat. Bentuknya mengikuti
-- 004 baris 93-97 yang sudah memakai pola exists-lewat-lead.
create or replace function public.crm_lead_visible(p_lead_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null
    and exists (
      select 1 from public.crm_leads l
      where l.id = p_lead_id
        and (
          l.assigned_to = auth.uid()
          or l.created_by = auth.uid()
          or l.assigned_to is null
        )
    );
$$;

-- Apakah kontak ini masuk lingkup kepemilikan pemanggil.
--
-- Cabang kedua (kontak yatim) menjaga tiga alur yang sudah ada tetap jalan:
-- dialog Quick Contact di crm/leads/create/page.tsx baris 308 dan
-- crm/leads/[id]/edit/page.tsx baris 326, serta dropdown pemilih kontak di
-- kedua halaman yang sama. Kontak baru selalu yatim, jadi pembuatnya langsung
-- melihatnya. Yang hilang dari pandangan agent hanyalah kontak yang seluruh
-- lead-nya dipegang agent lain.
create or replace function public.crm_contact_visible(p_contact_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null
    and (
      exists (
        select 1 from public.crm_leads l
        where l.contact_id = p_contact_id
          and (
            l.assigned_to = auth.uid()
            or l.created_by = auth.uid()
            or l.assigned_to is null
          )
      )
      or not exists (
        select 1 from public.crm_leads l
        where l.contact_id = p_contact_id
      )
    );
$$;

-- PostgREST mengekspos setiap fungsi skema public sebagai endpoint RPC.
-- Ketiganya sudah mengembalikan false untuk pemanggil tanpa sesi, jadi ini
-- bukan penutup lubang melainkan pengurangan permukaan: tidak ada alasan anon
-- bisa memanggilnya sama sekali.
--
-- Dicabut dari PUBLIC, bukan dari anon. PostgreSQL memberikan EXECUTE kepada
-- PUBLIC secara bawaan pada setiap fungsi baru, dan `revoke ... from anon`
-- tidak menghapus hak yang datang lewat PUBLIC — anon tetap bisa memanggilnya.
-- Mencabut dari PUBLIC adalah satu-satunya cara menutupnya.
--
-- Karena itu `authenticated` harus diberi EXECUTE secara eksplisit: hak
-- memanggil fungsi tetap diperiksa walau pemanggilnya berada di dalam policy,
-- dan tanpa grant ini seluruh policy di bawah akan gagal. service_role
-- sebenarnya tidak pernah mengevaluasi policy (ia melewati RLS), tetapi
-- diikutkan supaya tidak ada jalur yang bergantung pada kebetulan.
revoke execute on function public.is_crm_reader() from public;
revoke execute on function public.crm_lead_visible(uuid) from public;
revoke execute on function public.crm_contact_visible(uuid) from public;

grant execute on function public.is_crm_reader() to authenticated, service_role;
grant execute on function public.crm_lead_visible(uuid) to authenticated, service_role;
grant execute on function public.crm_contact_visible(uuid) to authenticated, service_role;


-- ============================================================
-- 2. SAPUAN DEFENSIF — policy tak dikenal pada kelima tabel
-- ============================================================
--
-- Migrasi 009 menghapus policy longgar pada 12 tabel, tetapi dari grup CRM
-- daftarnya hanya memuat crm_leads. crm_contacts, crm_interests, crm_followups
-- dan crm_activities tidak pernah tersapu satu berkas pun — crm_interests dan
-- crm_followups bahkan tidak pernah disebut di berkas migrasi mana pun karena
-- dibuat manual di SQL Editor.
--
-- Ini penting justru sekarang: policy PERMISSIVE digabung dengan OR, jadi satu
-- policy longgar yang tertinggal akan membatalkan seluruh pembatasan di bawah.
-- Menambah policy tidak pernah bisa mempersempit akses; yang longgar harus
-- dihapus.
--
-- Kriterianya bukan pola nama seperti 009, melainkan daftar putih 20 nama
-- final. Apa pun di luar itu dihapus. Menurut W-1 hari ini seharusnya nol
-- penghapusan — blok ini adalah pengaman, bukan perbaikan. Setiap penghapusan
-- dilaporkan lewat NOTICE supaya tidak ada yang hilang diam-diam.

do $$
declare
  r record;
  dropped int := 0;
begin
  for r in
    select p.tablename, p.policyname
    from pg_policies p
    where p.schemaname = 'public'
      and p.tablename in (
        'crm_leads', 'crm_contacts', 'crm_interests',
        'crm_followups', 'crm_activities'
      )
      and p.policyname not in (
        'crm_leads_select',      'crm_leads_insert',      'crm_leads_update',      'crm_leads_delete',
        'crm_contacts_select',   'crm_contacts_insert',   'crm_contacts_update',   'crm_contacts_delete',
        'crm_interests_select',  'crm_interests_insert',  'crm_interests_update',  'crm_interests_delete',
        'crm_followups_select',  'crm_followups_insert',  'crm_followups_update',  'crm_followups_delete',
        'crm_activities_select', 'crm_activities_insert', 'crm_activities_update', 'crm_activities_delete'
      )
  loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
    raise notice 'PHASE 1B: policy tak dikenal dihapus: % pada %', r.policyname, r.tablename;
    dropped := dropped + 1;
  end loop;

  if dropped = 0 then
    raise notice 'PHASE 1B: tidak ada policy tak dikenal — sesuai harapan W-1.';
  end if;
end $$;


-- ============================================================
-- 3. CRM_LEADS
-- ============================================================
--
-- Sumber kebenaran kepemilikan untuk seluruh grup CRM. Empat tabel lain
-- menurunkan lingkupnya dari sini.

alter table public.crm_leads enable row level security;

-- SELECT — pembaca penuh, atau lead miliknya sendiri.
--
-- Predikat kepemilikan ditulis langsung di sini, bukan lewat
-- crm_lead_visible(), supaya perencana kueri bisa memakai index
-- crm_leads(assigned_to) alih-alih memanggil fungsi per baris.
drop policy if exists crm_leads_select on public.crm_leads;
create policy crm_leads_select on public.crm_leads
  for select to authenticated using (
    public.is_crm_reader()
    or assigned_to = auth.uid()
    or created_by = auth.uid()
    or assigned_to is null
  );

-- INSERT — agent hanya boleh membuat lead untuk dirinya sendiri.
--
-- crm/leads/create/page.tsx baris 345 sudah memaksa assigned_to ke id agent
-- yang login bila ia bukan admin, jadi policy ini mengunci perilaku yang sudah
-- ada. Cabang created_by menampung kasus lead dibuat lalu langsung ditugaskan.
drop policy if exists crm_leads_insert on public.crm_leads;
create policy crm_leads_insert on public.crm_leads
  for insert to authenticated with check (
    public.is_staff()
    or assigned_to = auth.uid()
    or created_by = auth.uid()
  );

-- UPDATE — USING dan WITH CHECK sengaja identik.
--
-- Cabang is_internal_staff() dibuang: itulah yang membuat dua cabang
-- kepemilikan di sebelahnya tidak pernah menentukan apa pun.
--
-- WITH CHECK ditulis eksplisit. Postgres menyalin USING ke WITH CHECK ketika
-- tidak ditulis (perilaku 007 baris 388-394), tapi mengandalkan penyalinan
-- diam-diam pada policy yang justru harus mengikat bukan kebiasaan yang baik.
--
-- Akibat bentuk ini:
--   - agent boleh mengklaim lead tak bertuan (hasilnya jadi miliknya)
--   - agent boleh melepasnya kembali ke kolam (assigned_to → null)
--   - agent TIDAK bisa melempar lead ke agent lain kecuali ia yang membuatnya
--   - agent TIDAK bisa menyentuh lead agent lain sama sekali
--
-- Pelepasan ke null memicu on_lead_created_notify (AFTER UPDATE OF
-- assigned_to) yang berhenti di guard `target_agent is not null` — tidak ada
-- notifikasi dan tidak ada error (W-6).
drop policy if exists crm_leads_update on public.crm_leads;
create policy crm_leads_update on public.crm_leads
  for update to authenticated using (
    public.is_staff()
    or assigned_to = auth.uid()
    or created_by = auth.uid()
    or assigned_to is null
  ) with check (
    public.is_staff()
    or assigned_to = auth.uid()
    or created_by = auth.uid()
    or assigned_to is null
  );

-- DELETE — hanya admin. DIPERKETAT dari keadaan sebelumnya.
--
-- Sebelumnya `is_staff() or created_by = auth.uid()`, jadi agent bisa
-- menghapus lead yang ia buat. crm_leads adalah induk CASCADE dari
-- crm_interests, crm_followups dan crm_activities (W-4), sehingga satu
-- penghapusan menghilangkan seluruh riwayat lead itu sekaligus.
--
-- app/(dashboard)/crm/leads/page.tsx baris 242 memanggil delete ini. Untuk
-- agent panggilan itu sekarang mengembalikan nol baris.
drop policy if exists crm_leads_delete on public.crm_leads;
create policy crm_leads_delete on public.crm_leads
  for delete to authenticated using (
    public.is_staff()
  );


-- ============================================================
-- 4. CRM_CONTACTS
-- ============================================================

alter table public.crm_contacts enable row level security;

-- SELECT — pembaca penuh, atau kontak yang terpaut lead miliknya, atau kontak
-- yatim. Lihat catatan pada crm_contact_visible() di bagian 1.
drop policy if exists crm_contacts_select on public.crm_contacts;
create policy crm_contacts_select on public.crm_contacts
  for select to authenticated using (
    public.is_crm_reader()
    or public.crm_contact_visible(crm_contacts.id)
  );

-- INSERT — is_internal_staff() DIPERTAHANKAN, dengan alasan.
--
-- Aturan "jangan pakai is_internal_staff()" berlaku ketika fungsi itu membuat
-- cabang kepemilikan di sebelahnya tidak efektif. Di sini tidak ada cabang
-- lain, dan pada pembuatan kontak baru belum ada kepemilikan apa pun yang bisa
-- dilemahkan — barisnya belum eksis.
--
-- Yang dijaga: dialog Quick Contact yang dipakai agent hari ini di
-- crm/leads/create/page.tsx baris 308-317 dan crm/leads/[id]/edit/page.tsx
-- baris 326-335. Kontak yang baru dibuat selalu yatim, jadi pembuatnya
-- langsung melihatnya lewat cabang kedua crm_contact_visible().
--
-- Intake publik /api/leads tidak lewat sini: app/api/leads/route.ts baris 68
-- memakai createAdminClient() yang melewati RLS.
drop policy if exists crm_contacts_insert on public.crm_contacts;
create policy crm_contacts_insert on public.crm_contacts
  for insert to authenticated with check (
    public.is_internal_staff()
  );

-- UPDATE — hanya kontak yang memang terlihat olehnya.
--
-- Sebelumnya is_internal_staff(), yang berarti agent mana pun bisa mengubah
-- nama, telepon dan email kontak siapa pun.
drop policy if exists crm_contacts_update on public.crm_contacts;
create policy crm_contacts_update on public.crm_contacts
  for update to authenticated using (
    public.is_staff()
    or public.crm_contact_visible(crm_contacts.id)
  ) with check (
    public.is_staff()
    or public.crm_contact_visible(crm_contacts.id)
  );

-- DELETE — hanya admin. Tidak berubah dari 003 baris 129-132; ditulis ulang
-- agar keadaan akhir kelima tabel terbaca di satu berkas.
drop policy if exists crm_contacts_delete on public.crm_contacts;
create policy crm_contacts_delete on public.crm_contacts
  for delete to authenticated using (
    public.is_staff()
  );


-- ============================================================
-- 5. CRM_INTERESTS
-- ============================================================

alter table public.crm_interests enable row level security;

drop policy if exists crm_interests_select on public.crm_interests;
create policy crm_interests_select on public.crm_interests
  for select to authenticated using (
    public.is_crm_reader()
    or public.crm_lead_visible(crm_interests.lead_id)
  );

drop policy if exists crm_interests_insert on public.crm_interests;
create policy crm_interests_insert on public.crm_interests
  for insert to authenticated with check (
    public.is_staff()
    or public.crm_lead_visible(crm_interests.lead_id)
  );

drop policy if exists crm_interests_update on public.crm_interests;
create policy crm_interests_update on public.crm_interests
  for update to authenticated using (
    public.is_staff()
    or public.crm_lead_visible(crm_interests.lead_id)
  ) with check (
    public.is_staff()
    or public.crm_lead_visible(crm_interests.lead_id)
  );

-- DELETE — DILONGGARKAN dari is_staff() menjadi terikat kepemilikan lead.
--
-- Ini satu-satunya pelonggaran dalam migrasi ini, dan alasannya sebuah bug
-- yang sudah berjalan: crm/leads/[id]/edit/page.tsx baris 376-380 menghapus
-- seluruh baris minat sebuah lead lalu menyisipkannya kembali sebagai cara
-- menyimpan perubahan. Dengan DELETE terbatas admin, untuk agent penghapusan
-- itu mengenai nol baris — dan errornya tidak diperiksa — sementara INSERT-nya
-- lolos lewat is_internal_staff(). Hasilnya minat properti menumpuk ganda
-- setiap kali seorang agent menyunting lead-nya.
--
-- Membatasi DELETE pada lead yang memang miliknya memperbaiki itu tanpa
-- membuka apa pun: agent tetap tidak bisa menyentuh minat pada lead agent lain.
drop policy if exists crm_interests_delete on public.crm_interests;
create policy crm_interests_delete on public.crm_interests
  for delete to authenticated using (
    public.is_staff()
    or public.crm_lead_visible(crm_interests.lead_id)
  );


-- ============================================================
-- 6. CRM_FOLLOWUPS
-- ============================================================
--
-- Tabel ini TIDAK punya kolom created_by (baseline §1, diverifikasi lewat
-- PostgREST OpenAPI). Empat tempat di kode membacanya dan selalu mendapat
-- undefined — crm/followups/create/page.tsx baris 255,
-- crm/followups/page.tsx baris 73/139/233, crm/followups/[id]/edit/page.tsx
-- baris 180, crm/followups/[id]/page.tsx baris 99. Itu M-2 dan di luar lingkup
-- fase ini. Policy di bawah karena itu hanya memakai assigned_to dan lead_id.

alter table public.crm_followups enable row level security;

-- Dua cabang kepemilikan karena keduanya nyata: follow-up bisa ditugaskan ke
-- agent yang berbeda dari pemegang lead-nya (bulkAssign, penjadwalan oleh
-- admin), dan agent pemegang lead tetap perlu melihat agenda di lead-nya.
drop policy if exists crm_followups_select on public.crm_followups;
create policy crm_followups_select on public.crm_followups
  for select to authenticated using (
    public.is_crm_reader()
    or assigned_to = auth.uid()
    or public.crm_lead_visible(crm_followups.lead_id)
  );

-- Jalur utama pembuatan follow-up adalah POST /api/leads/[id]/follow-up
-- (services/crm.service.ts baris 656-684) yang memakai service role dan
-- melewati RLS sepenuhnya. Policy ini menutup jalur langsung lewat anon key.
drop policy if exists crm_followups_insert on public.crm_followups;
create policy crm_followups_insert on public.crm_followups
  for insert to authenticated with check (
    public.is_staff()
    or public.crm_lead_visible(crm_followups.lead_id)
  );

drop policy if exists crm_followups_update on public.crm_followups;
create policy crm_followups_update on public.crm_followups
  for update to authenticated using (
    public.is_staff()
    or assigned_to = auth.uid()
    or public.crm_lead_visible(crm_followups.lead_id)
  ) with check (
    public.is_staff()
    or assigned_to = auth.uid()
    or public.crm_lead_visible(crm_followups.lead_id)
  );

drop policy if exists crm_followups_delete on public.crm_followups;
create policy crm_followups_delete on public.crm_followups
  for delete to authenticated using (
    public.is_staff()
  );


-- ============================================================
-- 7. CRM_ACTIVITIES
-- ============================================================
--
-- Kolom pelakunya adalah user_id, bukan assigned_to (baseline §1).
-- app/api/admin/users/delete/route.ts baris 78 menulis crm_activities.assigned_to
-- yang tidak pernah ada; itu H-1 dan di luar lingkup fase ini.

alter table public.crm_activities enable row level security;

-- Cabang user_id dipertahankan apa adanya dari 004 baris 69-72: client dengan
-- role viewer melihat aktivitas yang tercatat atas namanya sendiri, misalnya
-- klik WhatsApp yang dicatat /api/leads. Ia tidak melihat aktivitas orang lain.
drop policy if exists crm_activities_select on public.crm_activities;
create policy crm_activities_select on public.crm_activities
  for select to authenticated using (
    public.is_crm_reader()
    or user_id = auth.uid()
    or public.crm_lead_visible(crm_activities.lead_id)
  );

-- Bentuk 004 baris 86-99 dipertahankan; hanya cabang lead-nya yang diganti
-- pemanggilan fungsi supaya definisi kepemilikan tetap satu tempat.
--
-- Pengikatan user_id = auth.uid() cocok dengan perilaku aplikasi:
-- services/crm.service.ts baris 404-422 mengambil id dari
-- supabase.auth.getUser() sebelum menyisipkan.
drop policy if exists crm_activities_insert on public.crm_activities;
create policy crm_activities_insert on public.crm_activities
  for insert to authenticated with check (
    user_id = auth.uid()
    and (
      public.is_staff()
      or public.crm_lead_visible(crm_activities.lead_id)
    )
  );

-- Cabang is_internal_staff() dibuang; sisanya sama dengan 004 baris 108-114.
drop policy if exists crm_activities_update on public.crm_activities;
create policy crm_activities_update on public.crm_activities
  for update to authenticated using (
    public.is_staff()
    or user_id = auth.uid()
  ) with check (
    public.is_staff()
    or user_id = auth.uid()
  );

-- Tetap admin saja: jejak aktivitas harus lengkap (004 baris 120-121).
drop policy if exists crm_activities_delete on public.crm_activities;
create policy crm_activities_delete on public.crm_activities
  for delete to authenticated using (
    public.is_staff()
  );


-- ============================================================
-- 8. CABUT HAK SELECT ANON — kelima tabel CRM
-- ============================================================
--
-- Migrasi 012 mencabut insert/update/delete/truncate tetapi sengaja
-- meninggalkan SELECT, dengan catatan bahwa menutupnya adalah keputusan
-- tersendiri yang harus diperiksa lebih dulu (012 baris 119-121). Pemeriksaan
-- itu sudah dilakukan.
--
-- Hari ini anon memegang SELECT pada seluruh 55 kolom kelima tabel, termasuk
-- crm_contacts.phone, whatsapp dan email. Yang menahannya hanya RLS: seluruh
-- policy terikat authenticated, jadi anon melihat 0 baris. Itu benar, tapi
-- hanya satu lapis.
--
-- MENGAPA AMAN
--
-- Tidak ada jalur publik yang membaca tabel CRM dengan kunci anon. Seluruh
-- pembacaan crm_* ada di app/(dashboard)/, services/, components/crm/, atau
-- route API yang memakai service role. Intake publik /api/leads memakai
-- createAdminClient().
--
-- Satu pengecualian yang terlihat seperti pengecualian tapi bukan:
-- app/api/dashboard/summary/route.ts memanggil dashboardService.getStats(),
-- dan services/dashboard.service.ts mengimpor klien peramban — di server klien
-- itu tidak punya sesi dan bertindak sebagai anon. Hitungan crm_leads di sana
-- karena itu sudah 0 hari ini, errornya tidak diperiksa dan jatuh ke `?? 0`.
-- Setelah pencabutan ini hasilnya tetap 0, lewat jalur yang berbeda.
--
-- Menutup M-12.

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
    execute format('revoke select on public.%I from anon', t);
  end loop;
end $$;


-- ============================================================
-- 9. VERIFIKASI
-- ============================================================
--
-- A. Bentuk policy — jalankan di SQL Editor. PostgREST tidak bisa membaca
--    pg_policies (404 PGRST205), jadi bagian ini tidak bisa diklaim oleh
--    scripts/verify-rls.mjs dan harus diperiksa di sini.
--
--    select tablename, policyname, cmd, permissive, roles,
--           qual, with_check
--    from pg_policies
--    where schemaname = 'public'
--      and tablename in ('crm_leads','crm_contacts','crm_interests',
--                        'crm_followups','crm_activities')
--    order by tablename, cmd, policyname;
--
--    Yang harus terlihat:
--      - tepat 20 baris
--      - permissive = PERMISSIVE pada semuanya
--      - roles = {authenticated} pada semuanya
--      - qual TIDAK memuat is_internal_staff() pada satu baris pun
--      - with_check memuat is_internal_staff() HANYA pada crm_contacts_insert
--      - setiap baris cmd = UPDATE punya with_check yang terisi
--
-- B. Hak anon:
--
--    select table_name, privilege_type
--    from information_schema.role_table_grants
--    where grantee = 'anon' and table_schema = 'public'
--      and table_name like 'crm\_%'
--    order by 1, 2;
--
--    Yang tersisa boleh hanya REFERENCES dan TRIGGER. Tidak boleh ada SELECT,
--    INSERT, UPDATE, DELETE, atau TRUNCATE.
--
-- C. Hak EXECUTE fungsi helper baru:
--
--    select p.proname, r.rolname, has_function_privilege(r.rolname, p.oid, 'execute')
--    from pg_proc p
--    cross join (values ('anon'), ('authenticated'), ('service_role')) as r(rolname)
--    where p.pronamespace = 'public'::regnamespace
--      and p.proname in ('is_crm_reader', 'crm_lead_visible', 'crm_contact_visible')
--    order by 1, 2;
--
--    anon harus false pada ketiganya; authenticated dan service_role harus true.
--    Kalau authenticated false, seluruh policy di atas akan gagal saat dievaluasi.
--
-- D. Perilaku:
--
--    node scripts/verify-rls.mjs
--
--    Bagian "SELECT anon pada tabel CRM" harus melaporkan ditolak untuk kelima
--    tabel. Bagian per-role memerlukan kredensial akun uji di .env.local; tanpa
--    itu ia melaporkan SKIP dan tidak dihitung gagal.
