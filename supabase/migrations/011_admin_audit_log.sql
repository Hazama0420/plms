-- ============================================================
-- 011 — Jejak audit aksi administratif
-- ============================================================
--
-- MASALAH
--
-- Tidak ada catatan siapa mengubah role siapa. Halaman /admin/logs berjudul
-- "Audit Trail" tetapi membaca crm_activities — aktivitas operasional CRM
-- (klik WhatsApp, agenda follow-up, perubahan status lead), bukan penggunaan
-- kewenangan. Setelah 010 mengunci perubahan role hanya untuk Super Admin,
-- pertanyaan yang tersisa justru "kapan wewenang itu dipakai, dan terhadap
-- siapa" — dan itu tidak terjawab di mana pun.
--
-- Menumpang di crm_activities bukan pilihan: kolom lead_id di tabel itu NOT
-- NULL, sedangkan aksi administratif tidak punya lead. Menyisipkan lead dummy
-- hanya untuk memenuhi constraint akan mencemari data CRM.
--
--
-- YANG DIBUAT
--
-- Satu tabel append-only, public.admin_audit_log. Ditulis HANYA lewat service
-- role dari Route Handler (lib/audit-log.ts), dan dibaca hanya oleh Super
-- Admin.
--
--
-- BATAS YANG PERLU DIKETAHUI
--
-- Pencatatan dilakukan di lapisan aplikasi, bukan lewat trigger database.
-- Trigger memang akan menangkap juga perubahan yang dilakukan langsung lewat
-- SQL Editor, tetapi tidak bisa mengetahui identitas pelakunya pada jalur yang
-- justru paling penting: seluruh route admin memakai service role, dan di sana
-- auth.uid() bernilai null. Trigger hanya akan mencatat "seseorang" untuk
-- setiap aksi yang lewat aplikasi — persis yang ingin dihindari.
--
-- Konsekuensinya: perubahan yang dilakukan langsung di SQL Editor tidak
-- tercatat. Itu diterima — pemegang akses SQL Editor adalah pemilik proyek
-- Supabase, di atas seluruh model peran aplikasi ini.
--
--
-- BERGANTUNG PADA: 010_super_admin_role_lock.sql (fungsi public.is_super_admin)
--
-- JALANKAN DI: Supabase Dashboard -> SQL Editor
-- Idempoten: aman dijalankan berulang kali.
-- ============================================================


-- ============================================================
-- 1. TABEL
-- ============================================================
--
-- Kolom actor_email/actor_role/target_email/target_role sengaja menyalin nilai
-- alih-alih hanya menyimpan foreign key: catatan audit harus bertahan lebih
-- lama daripada akun yang diceritakannya. Untuk aksi 'user.delete' barisnya
-- memang sudah tidak ada saat catatan dibaca, dan tanpa salinan ini keterangan
-- "akun X dihapus" merosot menjadi "sebuah uuid dihapus".
--
-- target_id tidak diberi foreign key dengan alasan yang sama: referensi ke
-- baris yang memang sengaja dihapus tidak boleh menghalangi penghapusannya.

create table if not exists public.admin_audit_log (
  id           uuid primary key default gen_random_uuid(),
  actor_id     uuid references public.users(id) on delete set null,
  actor_email  text,
  actor_role   text,
  action       text not null,
  target_id    uuid,
  target_email text,
  target_role  text,
  detail       jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);

comment on table public.admin_audit_log is
  'Catatan aksi administratif. Append-only: ditulis hanya lewat service role, tidak punya policy INSERT/UPDATE/DELETE.';

comment on column public.admin_audit_log.action is
  'user.role_change | user.status_change | user.delete | logs.delete | settings.ai_toggle';

comment on column public.admin_audit_log.actor_email is
  'Salinan email pelaku saat aksi terjadi — catatan harus tetap terbaca setelah akunnya dihapus.';

comment on column public.admin_audit_log.target_email is
  'Salinan email sasaran saat aksi terjadi. Untuk user.delete, barisnya sudah tidak ada.';

comment on column public.admin_audit_log.detail is
  'Konteks tambahan per aksi, mis. {"from":"viewer","to":"agent"} atau {"count":12}.';


-- ============================================================
-- 2. INDEKS
-- ============================================================

-- Urutan tampilan di /admin/logs: terbaru lebih dulu.
create index if not exists admin_audit_log_created_at_idx
  on public.admin_audit_log (created_at desc);

-- Menelusuri seluruh aksi satu orang.
create index if not exists admin_audit_log_actor_idx
  on public.admin_audit_log (actor_id);

-- Menelusuri seluruh aksi yang menimpa satu akun.
create index if not exists admin_audit_log_target_idx
  on public.admin_audit_log (target_id);


-- ============================================================
-- 3. RLS — baca untuk Super Admin, tulis untuk tak seorang pun
-- ============================================================
--
-- Hanya ada policy SELECT. Tidak adanya policy INSERT, UPDATE, dan DELETE
-- bukan kelalaian melainkan justru intinya:
--
--   - INSERT hanya mungkin lewat service role, yaitu dari Route Handler yang
--     sudah lolos requireRole(). Tidak ada jalan menyisipkan catatan palsu
--     dari peramban.
--   - UPDATE dan DELETE tidak mungkin sama sekali lewat PostgREST — termasuk
--     oleh Super Admin. Log yang bisa disunting oleh pihak yang diawasinya
--     bukan log.
--
-- SELECT dibatasi ke Super Admin: isinya memuat aksi terhadap akun Super Admin
-- juga, dan sesuai aturan peran di sistem ini hanya Super Admin yang berhak
-- melihatnya.

alter table public.admin_audit_log enable row level security;

drop policy if exists admin_audit_log_select on public.admin_audit_log;
create policy admin_audit_log_select on public.admin_audit_log
  for select using (
    public.is_super_admin()
  );

-- Membersihkan sisa percobaan sebelumnya bila ada — memastikan tabel ini
-- benar-benar hanya punya satu policy.
drop policy if exists admin_audit_log_insert on public.admin_audit_log;
drop policy if exists admin_audit_log_update on public.admin_audit_log;
drop policy if exists admin_audit_log_delete on public.admin_audit_log;


-- ============================================================
-- 4. HAK AKSES
-- ============================================================
--
-- anon tidak diberi apa pun: tabel ini tidak punya sisi publik.
-- authenticated hanya diberi select; policy di atas yang menentukan barisnya.

revoke all on public.admin_audit_log from anon;
revoke all on public.admin_audit_log from authenticated;
grant select on public.admin_audit_log to authenticated;
