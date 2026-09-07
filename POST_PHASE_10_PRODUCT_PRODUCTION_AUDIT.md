# POST-PHASE 10 — PRODUCT & PRODUCTION AUDIT REPORT
**System**: PLMS (Property Listing & Management System) — Inland Property  
**Audit Date**: September 5, 2026  
**Auditor**: Autonomous Deep Engineering Audit Subsystem  
**Baseline State**: Phase 10A (Pass), Phase 10B (Pass), Phase 10C (Pass)  
**Execution Mode**: **READ-ONLY AUDIT** (Zero code modifications, zero database alterations, zero migrations)  

---

## DAFTAR ISI

1. [Executive Summary & Production Verdict](#1-executive-summary--production-verdict)
2. [Current System State vs Documented State](#2-current-system-state-vs-documented-state)
3. [Production Readiness: Authentication & Authorization](#3-production-readiness-authentication--authorization)
4. [Security Audit (Forensic Code & API Review)](#4-security-audit-forensic-code--api-review)
5. [Property Management & Lifecycle Audit](#5-property-management--lifecycle-audit)
6. [Property Data Quality (Live DB Audit)](#6-property-data-quality-live-db-audit)
7. [CRM Workflow & Pipeline Audit](#7-crm-workflow--pipeline-audit)
8. [Lead Quality & Stage Distribution](#8-lead-quality--stage-distribution)
9. [Sales Workflow Audit (Lead → Deal → Won)](#9-sales-workflow-audit-lead--deal--won)
10. [Deal & Invoice Audit](#10-deal--invoice-audit)
11. [Survey Workflow Audit](#11-survey-workflow-audit)
12. [Follow-up Workflow Audit](#12-follow-up-workflow-audit)
13. [Agent Workspace Ergonomics & Friction](#13-agent-workspace-ergonomics--friction)
14. [Admin Workspace Ergonomics & Friction](#14-admin-workspace-ergonomics--friction)
15. [Marketing Workspace Ergonomics & Access](#15-marketing-workspace-ergonomics--access)
16. [Public Storefront Audit](#16-public-storefront-audit)
17. [SEO Audit & Search Engine Visibility](#17-seo-audit--search-engine-visibility)
18. [Performance & Query Efficiency Audit](#18-performance--query-efficiency-audit)
19. [Mobile Responsiveness Audit (375px Focus)](#19-mobile-responsiveness-audit-375px-focus)
20. [Bilingual System Audit (ID ↔ EN)](#20-bilingual-system-audit-id--en)
21. [Data Consistency Across Modules](#21-data-consistency-across-modules)
22. [Data Health Engine Review](#22-data-health-engine-review)
23. [Notifications & Gateway Audit (Fonnte & OneSignal)](#23-notifications--gateway-audit-fonnte--onesignal)
24. [AI Infrastructure & Governance Audit](#24-ai-infrastructure--governance-audit)
25. [Role & Permission Matrix](#25-role--permission-matrix)
26. [Feature Gap Analysis (P0 - P3)](#26-feature-gap-analysis-p0---p3)
27. [Business Value Prioritization](#27-business-value-prioritization)
28. [Feature Evaluation (Candidate Backlog)](#28-feature-evaluation-candidate-backlog)
29. [Technical Debt Audit](#29-technical-debt-audit)
30. [Automated Test Coverage Gap & Top 10 Regression Tests](#30-automated-test-coverage-gap--top-10-regression-tests)
31. [Production Operations & Reliability](#31-production-operations--reliability)
32. [Final Scorecard](#32-final-scorecard)
33. [Top 10 Critical Risks](#33-top-10-critical-risks)
34. [Top 10 Recommendations](#34-top-10-recommendations)
35. [Proposed Next Phase](#35-proposed-next-phase)
36. [Verification Results](#36-verification-results)

---

## 1. EXECUTIVE SUMMARY & PRODUCTION VERDICT

### Overall Production Readiness: **7.4 / 10**
### Operational Verdict: **READY WITH IMPROVEMENTS**

PLMS telah menyelesaikan Phase 10 (10A, 10B, 10C) dengan pencapaian stabilisasi arsitektur yang sangat signifikan:
- **Build & Compilation**: 100% lulus tanpa error (`npx tsc --noEmit` bersih, `npm run build` sukses mengompilasi 67 rute).
- **Integritas Data Inti**: Sinkronisasi Deal Won → Property Sold/Rented, penghitungan KPI Pipeline Value berbasis nilai properti/deal riil, perbaikan atribusi agen pada laporan penjualan, dan relasi Survey → CRM Lead telah terpasang rapi di level database dan Server Actions.
- **Data Health Engine & Productivity**: Deteksi data orphan, sinkronisasi klaim lead unassigned, dan deep-linking follow-up berjalan dengan baik.

Namun demikian, audit forensik menemukan **dua celah keamanan serius (P0)** serta sejumlah **hambatan operasional (P1)** yang harus diatasi sebelum sistem dapat dipakai dengan aman oleh publik dan agen komersial harian:
1. **[CRITICAL SECURITY P0]** Endpoint API `GET /api/followups` tidak memverifikasi autentikasi (`requireAuth()` absen) dan menggunakan `createAdminClient()` (Service Role Key). Siapa pun di internet tanpa login dapat mengunduh seluruh data nama klien, nomor telepon tanpa masking, catatan negosiasi, dan jadwal follow-up agen.
2. **[AUTOMATION GAP P1]** Cron scheduler otomatis untuk follow-up overdue sweep dan pengingat survei T-1 jam tidak berjalan aktif di Vercel karena batasan cron harian akun Hobby. Jika tidak dihubungkan ke webhook penjadwal eksternal, follow-up yang terlambat tidak akan berstatus `overdue` secara otomatis.
3. **[DATA HYGIENE P1]** Terdapat 7 properti published yang tidak memiliki data alamat lengkap atau foto sampul, 11 properti (hampir 50% inventaris) belum memiliki agen penanggung jawab (`assigned_to IS NULL`), dan 2 dari 3 invoice di database tidak terhubung ke `property_id`.
4. **[ZERO AUTOMATED TESTS P1]** Repositori memiliki 0 file unit test, integration test, atau E2E test otomatis. Seluruh verifikasi saat ini masih mengandalkan build check dan manual scenario checklists.

Sistem **layak digunakan untuk pilot terbatas internal**, tetapi **belum aman untuk peluncuran publik terbuka** sampai celah keamanan P0 ditutup.

---

## 2. CURRENT SYSTEM STATE VS DOCUMENTED STATE

Berdasarkan perbandingan antara `CURRENT_STATE.md`, dokumentasi CRM, dan fakta lapangan (Live Supabase DB + Source Code):

| Aspek | Dokumen Terakhir (Phase 10C) | Fakta Lapangan (Live Audit) | Status / Discrepancy |
| :--- | :--- | :--- | :--- |
| **Pipeline Leads** | 10 Total Leads | 10 Total Leads (4 New, 3 Contacted, 1 Won, 2 Lost) | **VERIFIED** — Sesuai |
| **Stage Tengah Pipeline** | Tercatat ada workflow proposal & negosiasi | 0 Lead di `qualified`, 0 di `proposal`, 0 di `negotiation` | **DISCREPANCY** — Pipeline kosong di tengah |
| **Pipeline Value** | Reconciled di Phase 10B | Nilai aktif: Rp 37.168.102.000 | **VERIFIED** — Nilai konsisten di dashboard & report |
| **Survey Records** | Relasi Survey ke Lead aktif | 0 record di tabel `surveys`, 2 record di `survey_requests` | **VERIFIED** — Belum ada survei berjadwal aktual |
| **Properties** | Listing aktif terbit | 23 Properti: 16 Published, 7 Draft. 11 Unassigned | **OBSERVED** — Banyak properti tanpa assigned agent |
| **Invoices** | Modul invoice aktif | 3 Invoice (1 Paid, 2 Sent), 2 invoice `property_id IS NULL` | **DEFECT** — Jejak properti hilang di 2 invoice |
| **KTP Storage Bucket** | Disebutkan di dokumentasi agent register | Migration 008 mencatat bucket `ktp` belum dibuat di live DB | **RISK** — Dokumen KTP agen rentan terunggah ke bucket publik |

---

## 3. PRODUCTION READINESS: AUTHENTICATION & AUTHORIZATION

### Authentication Flow
- **Login (`/login`)**: Berjalan mulus menggunakan Supabase Auth SSR (`@supabase/ssr`). Cookie session tersimpan aman (`HttpOnly`, `SameSite=Lax`).
- **Google OAuth**: Didukung melalui tombol Single Sign-On. Callbacks diproses di `app/auth/callback/route.ts` dengan penanganan pembuatan record `users` otomatis jika belum ada.
- **Register Agen (`/register/agent`)**: Memerlukan persetujuan admin. Akun baru masuk ke status `pending-approval`.
- **Session Expiry & Refresh**: Ditangani otomatis oleh `proxy.ts` (Next.js middleware). Sesi yang kedaluwarsa melempar pengunjung ke login dengan query parameter redirect URL.

### Authorization & Role Guards
PLMS memiliki 6 role: `viewer`, `agent`, `marketing`, `admin`, `super_admin`, dan `commissioner`.
- **Proxy Middleware Enforcement**: Memproteksi rute `/admin`, `/reports`, `/invoices`, `/projects`, `/surveys`, `/notifications`, `/profile`, `/settings`.
- **Role Guard Discrepancy**:
  - Di `lib/permissions.ts`, role `viewer` diberikan permission `view_own_crm: true`, sehingga fungsi `canAccessRoute("viewer", "/crm")` bernilai `true`.
  - Namun di `app/(dashboard)/crm/page.tsx`, terdapat pengecekan client-side yang langsung me-redirect `viewer` ke `/properties`.
  - *Dampak*: Inkompatibilitas arsitektural antara router middleware dan client page guard.

---

## 4. SECURITY AUDIT (FORENSIC CODE & API REVIEW)

### Temuan Kritis (Critical P0)
#### [VULN-01] Unauthenticated Data Exposure pada API Followups
- **Lokasi**: `app/api/followups/route.ts` (L12-L38)
- **Kode Aktual**:
  ```typescript
  export async function GET(req: Request) {
    const supabase = createAdminClient(); // <-- Menggunakan Service Role Key (RLS Bypassed)
    // Tidak ada requireAuth() atau session context check sama sekali!
    const { data, error } = await supabase
      .from("crm_followups")
      .select("*, lead:crm_leads(name, phone, stage, property_interest), agent:users(full_name)")
      .order("followup_date", { ascending: true });
    return NextResponse.json(data);
  }
  ```
- **Severity**: **CRITICAL (P0)**
- **Impact**: Siapa pun di internet tanpa login dapat mengirim HTTP `GET /api/followups` dan mendapatkan seluruh data follow-up agen, nama klien, nomor handphone klien (tanpa contact masking!), status lead, dan ketertarikan properti. Pelanggaran berat privasi data (UU PDP).

### Temuan Server Actions & RLS (P1 & P2)
1. **Pelepasan RLS melalui `createAdminClient()`**:
   - Di beberapa API route internal (`/api/leads`, `/api/properties/[id]/status`), service role digunakan untuk mempermudah mutasi lintas tabel. Walaupun dilindungi oleh `requireRole(["admin", "super_admin"])`, penggunaan service role menghapus perlindungan RLS di level PostgreSQL.
2. **KTP & Dokumen Sensitif**:
   - Migration `008_storage_bucket_tightening.sql` mendokumentasikan bahwa bucket privat `ktp` belum pernah dibuat di database Supabase live. Form pendaftaran agen menyimpan file identitas ke dalam bucket yang berpotensi dapat diakses publik jika URL storage bocor.
3. **Contact Masking**:
   - Helper `lib/phone-masker.ts` telah diimplementasikan dengan baik di komponen UI CRM, menyamarkan nomor telepon menjadi `0812-****-5678` bagi role `viewer` dan agen non-pemilik. Namun, celah di API `/api/followups` membocorkan data mentah tanpa melewati masker ini.

---

## 5. PROPERTY MANAGEMENT & LIFECYCLE AUDIT

### Lifecycle Analisis
Alur ideal: `Draft → Review → Published → Sold / Rented → Archived`.
- **Create Property Wizard (`/properties/create`)**:
  - Struktur multi-step: Info Dasar → Lokasi/Alamat → Detail Bangunan/Tanah → Spesifikasi → Media Foto → Review & Publish.
  - Validasi Zod diterapkan di `lib/validations.ts`.
- **Publishing Guard**:
  - Sesuai aturan di `lib/property-publish.ts`: properti berstatus `published` wajib memiliki agen penanggung jawab (`assigned_to IS NOT NULL`). Jika agen dilepas penugasannya, status otomatis dikembalikan ke `draft`.
  - Properti yang terjual via Deal Won di Phase 10B otomatis berubah status menjadi `sold` (atau `rented` untuk jenis sewa).
- **Inkonsistensi Lapangan**:
  - Terdapat properti berstatus `published` hasil seed masa lalu yang memiliki data tidak lengkap (tanpa foto, tanpa alamat detail, atau luas tanah/bangunan 0).

---

## 6. PROPERTY DATA QUALITY (LIVE DB AUDIT)

Berdasarkan audit langsung pada tabel `properties` (23 total records):

### Distribusi Status Properti
- **Published**: 16 properti (69.6%)
- **Draft**: 7 properti (30.4%)
- **Review**: 0 properti
- **Sold**: 0 properti
- **Rented**: 0 properti
- **Archived**: 0 properti

### Evaluasi Kualitas Data
- **Missing Address**: 4 properti (17.4%) tidak memiliki relasi di tabel `property_address`.
- **Missing Media Cover**: 5 properti (21.7%) tidak memiliki gambar di tabel `property_media`.
- **Missing Building Area**: 12 properti (52.2%) memiliki luas bangunan 0 atau null (wajar untuk kategori tanah murni/kavling, namun terdapat pada kategori rumah).
- **Missing Land Area**: 7 properti (30.4%) memiliki luas tanah 0 atau null.
- **Missing Price**: 1 properti (4.3%) memiliki harga 0 / null.
- **Missing Assigned Agent**: 11 properti (47.8%) tidak memiliki agen penanggung jawab (`assigned_to IS NULL`).
- **Published With Minimal Data (Defect)**: 7 dari 16 properti published tampil di katalog publik dengan data yang sangat minim (tanpa alamat lengkap atau tanpa foto cover), menurunkan kredibilitas storefront.

---

## 7. CRM WORKFLOW & PIPELINE AUDIT

Alur: `Lead → Contact → Property Interest → Assignment → Activity → Follow-up → Survey → Deal → Verification → Won/Lost`.

### Observasi Alur
1. **Lead Creation & Ingestion**:
   - Lead masuk dari form publik (kontak/survei) otomatis masuk dengan stage `new`.
   - Contact duplikasi dicegah melalui pencarian nomor WhatsApp di `crm_contacts`.
2. **Assignment & Claim Lead**:
   - Fitur "Claim Lead" untuk lead unassigned (Phase 10C) berfungsi: agen dapat mengklaim lead yang belum memiliki owner.
3. **CRM Kanban Board (`/crm`)**:
   - Menggunakan `@dnd-kit/core` untuk drag-and-drop antar 7 stage: `new`, `contacted`, `qualified`, `proposal`, `negotiation`, `won`, `lost`.
   - Perpindahan stage mencatat riwayat di `crm_activities`.
4. **Hambatan Alur (Missing Link)**:
   - Tidak ada batasan atau peringatan saat pengguna memindahkan lead langsung dari `new` ke `won` tanpa melewati kualifikasi, negosiasi, atau pembuatan deal verifikasi formal.
   - Lead won yang digeser via drag-and-drop kanban tanpa melalui form deal verifikasi tidak meminta bukti transfer/dokumen deal, sehingga properti terkait tidak otomatis terupdate menjadi `sold`.

---

## 8. LEAD QUALITY & STAGE DISTRIBUTION

Berdasarkan query live pada 10 record di tabel `crm_leads`:

| Stage | Jumlah Lead | Nilai Properti / Budget | Catatan |
| :--- | :---: | :--- | :--- |
| `new` | 4 | Rp 8.168.102.000 | Lead baru masuk, menunggu respons awal |
| `contacted` | 3 | Rp 29.000.000.000 | Sudah dikontak, dalam diskusi awal |
| `qualified` | 0 | Rp 0 | Kosong |
| `proposal` | 0 | Rp 0 | Kosong |
| `negotiation`| 0 | Rp 0 | Kosong |
| `won` | 1 | Rp 2.500.000.000 | 1 Deal selesai & terverifikasi |
| `lost` | 2 | Rp 0 | Tidak berminat / budget tidak cocok |
| **Total** | **10** | **Rp 37.168.102.000** | Active Pipeline (7 leads) = Rp 37.168M |

### Metrik Kualitas Lead
- **Unassigned Leads**: 0 (Seluruh 10 lead telah memiliki agen penanggung jawab).
- **Leads Tanpa Kontak**: 0 (Semua terhubung ke `contact_id`).
- **Leads Tanpa Properti**: 2 (Lead umum mencari rumah di area tertentu tanpa listing spesifik).
- **Leads Tanpa Aktivitas**: 1 lead (Dibuat tetapi belum pernah dicatat interaksinya).
- **Stale Leads (>30 Hari Tanpa Update)**: 0 lead.

---

## 9. SALES WORKFLOW AUDIT (LEAD → DEAL → WON)

### Aturan & Transisi Bisnis
1. **Pengajuan Deal (`deals`)**:
   - Hanya Agen atau Admin yang dapat mengajukan deal.
   - Form pengajuan meminta: nilai closing aktual, komisi agen, tanggal closing, dan bukti dokumen.
2. **Verifikasi Deal**:
   - Status deal diawali `pending_verification`.
   - **Hanya `admin` atau `super_admin` yang memiliki izin memverifikasi deal** (`role_permissions.verify_deal = true`). Agen dilarang memverifikasi deal mereka sendiri (mencegah fraud komisi).
3. **Trigger Otomatisasi Saat Deal Disetujui (Phase 10B)**:
   - Ketika Admin menekan tombol "Verifikasi & Setujui Deal":
     - `crm_deals.status` berubah menjadi `verified`.
     - `crm_leads.stage` otomatis diupdate menjadi `won`.
     - `properties.status` otomatis diubah menjadi `sold` (atau `rented`).
     - `crm_activities` mencatat entri otomatis "Deal Diverifikasi & Ditutup Won".
4. **Friction / Kebutuhan Otomatisasi Lanjutan**:
   - Pembuatan invoice tidak dibuat secara otomatis saat deal diverifikasi. Admin masih harus membuka menu `/invoices/create` secara manual dan memilih ulang nama klien, properti, dan nilai deal.

---

## 10. DEAL & INVOICE AUDIT

### Data Lapangan Tabel `invoices` (3 records)
- **Total Invoice**: 3 record
  - 1 berstatus `paid` (Rp 1.000.000.000)
  - 2 berstatus `sent` (Rp 201.880.000)
  - Total Nilai Faktur: Rp 1.201.880.000

### Temuan Integritas Relasi
1. **Invoice Tanpa Properti (`property_id IS NULL`)**:
   - **2 dari 3 invoice di database TIDAK memiliki `property_id`**.
   - Kolom `property_id` pada tabel `invoices` bersifat nullable tanpa foreign key constraint `ON DELETE RESTRICT`. Akibatnya, pada invoice fee konsultasi atau invoice yang dibuat manual tanpa memilih properti, laporan keuangan tidak dapat mengaitkan pendapatan ke unit properti tertentu.
2. **Pencetakan & Perlindungan Faktur**:
   - Endpoint `/api/invoices/[id]/print` dan halaman `/invoices/[id]` membatasi akses hanya untuk Admin dan Super Admin.
   - Perhitungan PPN (11%) dan pembulatan numerik tersentralisasi di `lib/invoice-config.ts`.

---

## 11. SURVEY AUDIT

### Alur Kerja Survei
`Lead / Client Request → Jadwal Survei Dibuat → Konfirmasi WhatsApp → Pelaksanaan Survei → Pencatatan Hasil di CRM Timeline`.

### Kondisi Lapangan
- Tabel `surveys`: 0 record aktif terjadwal.
- Tabel `survey_requests`: 2 record permintaan survei masuk dari publik.
- **Relasi ke CRM Lead (Phase 10B)**:
  - Form penjadwalan survei telah memiliki dropdown `lead_id` opsional dan otomatis membuat entri `crm_activities` ("Survei Dijadwalkan") saat survei disimpan.
- **Risiko Notifikasi Pengingat**:
  - Endpoint `/api/surveys/reminders` (pengingat H-1 jam) sudah siap, namun bergantung pada trigger eksternal. Karena tidak ada cron runner yang aktif, reminder WhatsApp belum beroperasi otomatis.

---

## 12. FOLLOW-UP AUDIT

### Kondisi Lapangan Tabel `crm_followups` (2 records)
- **Status Follow-up**:
  - 1 record: `overdue` / pending lewat tanggal.
  - 1 record: `completed`.
  - 0 due today, 0 upcoming.

### Evaluasi Efisiensi Agen ("Apa yang harus saya kerjakan sekarang?")
1. **Widget Dashboard Agen**:
   - Dashboard agen menampilkan widget "Follow-up Prioritas Hari Ini" dan badge jumlah overdue.
   - Dilengkapi filter cepat dan tombol direct action (telepon via WhatsApp dengan pesan pembuka otomatis dari `lib/whatsapp-link.ts`).
2. **Deep-Link CRM (Phase 10C)**:
   - Mengklik item follow-up membuka drawer detail lead terkait secara instan tanpa perlu reload halaman atau mencari manual di papan kanban.
3. **Friction**:
   - Tidak ada notifikasi push atau email ringkasan harian di pagi hari (08:00 WIB) jika agen tidak membuka browser.

---

## 13. AGENT WORKSPACE ERGONOMICS & FRICTION

Simulasi alur kerja harian seorang Agen Properti:

| Skenario Kerja | Ekspektasi UX | Kondisi Aktual di PLMS | Tingkat Friksi |
| :--- | :--- | :--- | :--- |
| **08:00 — Login Pagi** | Tahu persis daftar klien yang harus dikontak hari ini | Dashboard menampilkan counter KPI & follow-up list, namun badge overdue tidak realtime jika cron belum dijalankan | Sedang |
| **09:30 — Menerima Lead** | Notifikasi WA/Push masuk, 1 klik buka detail | Pesan WA gateway Fonnte terkirim ke HP agen dengan ringkasan nama & no HP klien. Link langsung ke CRM | Sangat Rendah (Bagus) |
| **11:00 — Follow-up Klien** | Klik nomor langsung buka WA Web / Chat | Tombol WhatsApp di detail lead otomatis membuka chat dengan draft teks sopan | Sangat Rendah (Bagus) |
| **14:00 — Jadwalkan Survei** | Pilih slot tanggal & properti dari profil lead | Form survei dapat diakses dari Quick Actions, namun data lead belum otomatis terisi (prefilled) jika dibuka dari tab luar | Sedang |
| **16:30 — Update Status / Deal** | Ajukan closing & komisi | Form deal submission jelas, namun agen harus menunggu admin verifikasi sebelum status lead berubah ke Won | Wajar (Anti-Fraud) |
| **18:00 — Review Komisi** | Lihat estimasi pendapatan bulan ini | Halaman laporan dibatasi untuk agen (hanya melihat data sendiri di dashboard), belum ada tab khusus "Buku Komisi Saya" | Tinggi (Agen Butuh) |

---

## 14. ADMIN WORKSPACE ERGONOMICS & FRICTION

Simulasi pekerjaan Administrator:
- **Manajemen Inventaris**: Listing properti mudah dicari, difilter berdasarkan status/agen, dan dilengkapi bulk action assignment agen.
- **Verifikasi Deal**: Admin memiliki antarmuka khusus untuk meninjau bukti transfer deal sebelum menyetujui closing.
- **Data Health Dashboard (Phase 10C)**: Tersedia di `/admin/support` atau menu data health untuk memantau data properti tanpa agen, orphan media, dan relasi gantung.
- **Friksi Terbesar Admin**: Pembuatan invoice dari deal won masih memerlukan input data manual secara terpisah.

---

## 15. MARKETING WORKSPACE ERGONOMICS & ACCESS

- **Kebutuhan Marketing**: Mengetahui properti mana yang paling banyak dilihat, sumber perolehan lead (Instagram, Facebook Ads, Portal Properti, Walk-in), dan efektivitas kampanye.
- **Kondisi Aktual**:
  - Field `source` pada `crm_leads` hanya berupa string bebas (website, referral, walk_in).
  - Belum ada pelacakan parameter UTM (`utm_source`, `utm_campaign`, `utm_medium`) pada public landing page yang diteruskan saat pengunjung mengirim formulir kontak/survei.
  - Role `marketing` diizinkan melihat semua listing dan analitik prospek, tetapi tidak dapat mengakses modul keuangan/invoice (sudah tepat).

---

## 16. PUBLIC STOREFRONT AUDIT

### Komponen Storefront
- **Beranda (`/`)**: Redirect cepat ke `/dashboard` atau storefront catalog `/properties`.
- **Katalog Properti (`/properties`)**:
  - Filter pencarian: Jenis transaksi (Jual/Sewa), Tipe Properti (Rumah, Ruko, Tanah, Apartemen), Range Harga, Lokasi Kota/Kecamatan.
  - Sorting berdasarkan harga termurah, termahal, dan listing terbaru.
- **Detail Properti (`/properties/[id]`)**:
  - Galeri foto Embla Carousel, badge status, spesifikasi lengkap, rincian lokasi Google Maps, dan profil agen penanggung jawab beserta tombol WhatsApp.
- **Kalkulator KPR (`/kpr-calculator`)**:
  - Simulasi perhitungan angsuran bulanan berdasarkan plafon pinjaman, suku bunga tahunan, dan tenor tahun (didukung tabel amortisasi).
- **Public AI Chat**:
  - Floating widget interaktif untuk rekomendasi properti bagi pengunjung storefront.
- **Celah / UX Friction**:
  - Halaman detail properti tidak memiliki fitur "Properti Serupa" (Similar Properties) untuk mencegah bounce rate jika pengunjung tidak cocok dengan unit tersebut.
  - Tombol "Ajukan Survei" di halaman properti membuka modal, tetapi jika pengguna belum login, data nama dan nomor telepon harus diisi berulang kali.

---

## 17. SEO AUDIT & SEARCH ENGINE VISIBILITY

- **Sitemap Dinamis (`/sitemap.xml`)**:
  - Mengindeks rute statis (`/properties`, `/dashboard`, `/kpr-calculator`, `/legal/*`) dan seluruh properti `published` yang memiliki `assigned_to`.
  - Menggunakan ISR (`revalidate = 3600` detik) agar listing baru terindeks berkala.
- **Robots.txt (`/robots.txt`)**:
  - Mengizinkan `/` dan `/properties/`.
  - Melarang perayapan pada modul privat: `/crm/`, `/admin/`, `/reports/`, `/invoices/`, `/surveys/`, `/api/`.
- **OpenGraph & Meta Data**:
  - Halaman detail properti telah menghasilkan tag OpenGraph dinamis (judul properti, deskripsi, harga, dan gambar cover) untuk pratinjau thumbnail saat dibagikan ke WhatsApp dan media sosial.
- **Kelemahan SEO (Gap)**:
  - Struktur URL masih menggunakan UUID mentah (`/properties/d3b07384-...`) alih-alih URL slug yang ramah mesin pencari (contoh: `/properties/rumah-minimalis-modern-bsd-tangerang`). Kolom `slug` tersedia di kode sitemap namun tidak terpopulasi secara konsisten di database.
  - Kurang tag Schema.org Structured Data (`JSON-LD` bertipe `RealEstateListing` atau `SingleFamilyResidence`) yang dibutuhkan Google untuk menampilkan rich snippet harga dan spesifikasi di hasil pencarian.

---

## 18. PERFORMANCE & QUERY EFFICIENCY AUDIT

- **Build Performance**: Kompilasi Next.js (Turbopack) selesai dalam **4.3 detik**; seluruh 67 rute dioptimalkan.
- **Karakteristik Komponen**:
  - Rute data-heavy (`/crm`, `/properties`, `/reports`) menggunakan TanStack React Query (`@tanstack/react-query`) untuk client-side caching dan deduplikasi request.
- **Potensi Masalah Query (N+1 Query Risk)**:
  - Pada halaman katalog properti, pengambilan data properti dan relasi `property_address`, `property_media`, dan `property_specifications` dilakukan melalui Supabase nested select (`select(*, property_media(*), property_address(*))`). Ini efisien di level Postgres, namun jika media foto beresolusi tinggi (4K/8K) tidak di-resize oleh CDN, beban transfer gambar akan memperlambat skor LCP (Largest Contentful Paint) mobile.
- **Optimasi Gambar**:
  - Komponen `Image` dari Next.js digunakan dengan remote pattern Supabase Storage. File `lib/imageCompressor.ts` telah disediakan di sisi upload form.

---

## 19. MOBILE RESPONSIVENESS AUDIT (375PX FOCUS)

Audit tampilan pada viewport sempit (iPhone SE / 375px):
- **Bottom Navigation Bar (`components/layout/BottomNav.tsx`)**:
  - Menempel tetap di bagian bawah (`fixed bottom-0 left-0 right-0 z-50`).
  - Dilengkapi padding aman `pb-[env(safe-area-inset-bottom)]` untuk perangkat tanpa tombol fisik (iPhone notch/bar).
  - Navigasi adaptif sesuai role (Agen melihat CRM & Survei, Tamu melihat KPR & Login).
- **Kanban Board di Mobile**:
  - Di layar 375px, 7 kolom kanban horizontal dapat digeser (horizontal scroll), namun interaksi drag-and-drop sentuh di mobile sering kali canggung dan rawan salah geser.
  - *Rekomendasi*: Menyediakan tampilan alternatif List View (Daftar) yang dapat dialihkan di tampilan mobile.
- **Modal & Form Dialogs**:
  - Form Create Property Wizard telah diadaptasi dengan ukuran tombol full-width di mobile, menghindari tombol tap target yang terlalu kecil (<44px).

---

## 20. BILINGUAL SYSTEM AUDIT (ID ↔ EN)

- **Arsitektur i18n**:
  - File kamus terstruktur di `lib/i18n/id.ts` (~60 KB) dan `lib/i18n/en.ts` (~59 KB).
  - Dikelola melalui Zustand store dengan persistensi `localStorage` (`inland-language-store`).
- **Audit Keselarasan Terjemahan**:
  - Kunci navigasi, form label, pesan error, dan status badge memiliki padanan bahasa yang lengkap.
  - Istilah teknis domain properti yang dipertahankan dalam format universal: `CRM`, `Leads`, `Pipeline`, `AI`, `KPR`.
- **Kelemahan Arsitektural**:
  - Karena bahasa disimpan di `localStorage` klien, server Next.js (SSR) selalu merender bahasa Indonesia terlebih dahulu. Pengguna yang memilih bahasa Inggris akan melihat "kedipan" teks (hydration flash) dari ID ke EN saat aplikasi pertama kali dimuat.
  - Google Crawler tidak dapat mengindeks versi bahasa Inggris karena tidak ada pembedaan URL berbasis sub-path (misal: `/en/properties`).

---

## 21. DATA CONSISTENCY ACROSS MODULES

Pengecekan keselarasan metrik bisnis di seluruh modul sistem:

| Metrik Bisnis | Sumber Database Riil | Tampilan Dashboard KPI | Tampilan Modul CRM | Tampilan Modul Laporan | Status Konsistensi |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Total Leads** | 10 record di `crm_leads` | 10 Leads | 10 Kartu Kanban | 10 Leads di Summary | **100% KONSISTEN** |
| **Active Pipeline Value** | Rp 37.168.102.000 | Rp 37.168.102.000 | Terhitung per stage | Rp 37.168.102.000 | **100% KONSISTEN** |
| **Properti Published** | 16 properti di `properties` | 16 Properti Aktif | — | 16 di Inventory Report | **100% KONSISTEN** |
| **Deal Won** | 1 deal (Rp 2.500.000.000) | 1 Won Deal | 1 di Kolom Won | 1 Closing di Sales Report| **100% KONSISTEN** |
| **Atribusi Agen Sales** | Agen penanggung jawab deal | Sesuai ID Agen | Sesuai ID Agen | Tidak ada double-counting | **100% KONSISTEN** |
| **Invoice vs Property** | 3 Invoice (2 tanpa property_id) | Rp 1.201.880.000 | — | Laporan properti tidak mencatat 2 invoice | **DISCREPANCY** |

*Catatan*: Masalah double-counting dan KPI fiktif yang sebelumnya ada di Phase 9 telah terbukti tuntas diatasi pada Phase 10B.

---

## 22. DATA HEALTH ENGINE REVIEW

Dievaluasi dari modul Data Health (Phase 10C) yang menginspeksi anomali sistem:

### 1. Critical Issues (Mempengaruhi Operasional Nyata)
- **7 Published Properties Tanpa Data Lengkap**: Properti terbit yang tidak memiliki alamat atau gambar cover merusak estetika storefront dan reputasi broker di mata pembeli.
- **2 Invoices Tanpa `property_id`**: Menghambat rekonsiliasi akuntansi properti per unit.

### 2. Warning Issues (Perlu Ditindaklanjuti)
- **11 Properties Tanpa Assigned Agent**: Properti published yang tidak memiliki agen membuat calon pembeli yang menekan tombol WhatsApp tidak diarahkan ke kontak yang tepat (fallback ke admin hotline).
- **1 Lead Tanpa Aktivitas**: Dibuat tetapi belum pernah disentuh oleh agen.

### 3. Info Issues (Acceptable / Wajar)
- **Properti kategori tanah dengan luas bangunan 0**: Merupakan karakteristik wajar untuk kavling tanah. Mesin Data Health harus membedakan kategori properti agar tidak memunculkan *false positive*.

---

## 23. NOTIFICATIONS & GATEWAY AUDIT (FONNTE & ONESIGNAL)

### WhatsApp Gateway (Fonnte)
- Implementasi di `lib/fonnte.ts`:
  - Pesan penugasan lead baru terkirim otomatis ke nomor agen dengan format teks resmi Inland Property.
  - Membaca preferensi agen: jika agen mematikan notifikasi WA di settings, pesan tidak dikirim (menghemat kuota SMS/WA).
  - Sanitasi nomor HP otomatis (mengubah `08...` menjadi `628...`).

### Push Notification (OneSignal)
- Terintegrasi di `lib/onesignal.ts` dan `lib/notification-helper.ts` untuk notifikasi browser/in-app.
- Digunakan untuk alert penugasan lead, verifikasi deal, dan pengingat survei.

### Risiko Operasional Notifikasi
- **Idempotensi Pengiriman**: Jika webhook Fonnte gagal atau timeout, belum ada mekanisme message retry queue (seperti BullMQ atau Upstash QStash).
- **Automated Cron Dependency**: Karena batasan hosting Vercel, pengingat survei otomatis dan ringkasan follow-up harian tidak memiliki cron pemanggil aktif bawaan.

---

## 24. AI INFRASTRUCTURE & GOVERNANCE AUDIT

- **Model & Multi-Provider Cascade**:
  - Menggunakan Google Gemini (`@google/genai`, `@google/generative-ai`) dengan fallback cadangan ke Groq SDK (`groq-sdk`).
- **Tata Kelola & Keamanan AI (`lib/ai/policy.ts`)**:
  - **Master Switch**: Admin dapat mematikan seluruh fitur AI secara instan jika terjadi insiden via `system_settings.ai_master_switch`.
  - **Feature-Level Toggle**: Masing-masing fitur AI (Chat publik, Follow-up generator, Scan invoice) dapat dinyalakan/dimatikan tersendiri.
  - **Token Budgeting & Rate Limiting**: Batas 60.000 token per user/hari dan 1.500.000 token global per hari untuk mencegah pembengkakan tagihan API.
  - **Anti-Prompt Injection**: System prompt dilengkapi guardrail ketat untuk tidak memberikan informasi internal perusahaan, data kontak rahasia, atau kredensial database.

---

## 25. ROLE & PERMISSION MATRIX

Berdasarkan pemeriksaan langsung pada `lib/permissions.ts` dan route guards:

| Fitur / Modul | Viewer | Agent | Marketing | Admin | Super Admin | Commissioner |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Katalog Publik** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Lihat Lead Sendiri** | ❌* | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Lihat Semua Lead** | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Klaim Lead Unassigned** | ❌ | ✅ | ❌ | ✅ | ✅ | ❌ |
| **Tugaskan Lead ke Agen** | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |
| **Papan CRM Kanban** | ❌* | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Buat / Submit Deal** | ❌ | ✅ | ❌ | ✅ | ✅ | ❌ |
| **Verifikasi Deal (Closing)** | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |
| **Jadwalkan Survei** | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Kelola Invoice & Billing**| ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |
| **Laporan & BI (All Data)** | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Data Health Monitor** | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |
| **Pengaturan Sistem** | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| **Manajemen User / Role** | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |

*\*Catatan*: Role `viewer` secara permission memiliki `view_own_crm: true`, namun di level page UI dialihkan keluar dari `/crm`.

---

## 26. FEATURE GAP ANALYSIS (P0 - P3)

### P0 — Production Blocker (Keamanan & Legalitas)
1. **Perbaikan Keamanan `/api/followups`**: Menambahkan autentikasi wajib (`requireAuth()`) dan masking nomor telepon klien untuk mencegah kebocoran data massal.
2. **Setup KTP Bucket & File Protection**: Memastikan dokumen KTP agen tidak tersimpan di public storage.

### P1 — Business Critical (Operasional Harian & Revenue)
1. **External Cron Scheduler Setup**: Mengaktifkan cron runner eksternal (via GitHub Actions atau cron-job.org) untuk memanggil endpoint sweep overdue dan survey reminder setiap 15 menit.
2. **Deal-to-Invoice Auto Draft**: Otomatis membuat draft invoice ketika deal diverifikasi oleh admin.
3. **Data Hygiene Enforcer pada Published Properties**: Menolak status `published` jika properti tidak memiliki minimal 1 foto cover dan informasi alamat lengkap.
4. **Wajibkan `property_id` pada Invoice Komisi**: Menambahkan integritas data agar setiap invoice komisi terhubung ke unit properti.

### P2 — Productivity (Efisiensi Kerja Tim)
1. **Agent Commission Ledger (Buku Komisi Agen)**: Halaman khusus bagi agen untuk melacak komisi yang sudah cair, pending, dan histori penjualan pribadi.
2. **Mobile List View untuk CRM**: Pilihan tampilan list alternatif selain papan kanban untuk memudahkan agen menggeser status di layar HP.
3. **UTM Source & Campaign Tracking**: Menangkap sumber kampanye iklan (FB Ads/Google Ads) ke dalam data lead baru.

### P3 — Nice to Have (Pengembangan Jangka Panjang)
1. **SEO Slugs & JSON-LD Rich Snippet**: URL listing ramah SEO dan schema data real estate.
2. **Similar Properties Recommendation**: Widget rekomendasi properti serupa di bagian bawah detail listing.
3. **Customer Portal**: Halaman status pengajuan bagi pembeli untuk melacak progres KPR atau survei.

---

## 27. BUSINESS VALUE PRIORITIZATION

Evaluasi prioritas pengembangan:

| Kandidat Peningkatan | Business Impact | User Impact | Complexity | Risk | Prioritas |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Tutup Celah Keamanan `/api/followups`** | **High** | **High** | Low | Very Low | **TOP 1** |
| **Deal-to-Invoice Automated Workflow** | **High** | **High** | Medium | Low | **TOP 2** |
| **Aktivasi Cron Scheduler Eksternal** | **High** | **High** | Low | Low | **TOP 3** |
| **Agent Commission Ledger (Buku Komisi)**| **High** | **High** | Medium | Low | **TOP 4** |
| **Published Property Data Hygiene Guard** | Medium | **High** | Low | Low | **TOP 5** |

---

## 28. FEATURE EVALUATION (CANDIDATE BACKLOG)

Rekomendasi terhadap 20 kandidat fitur yang dievaluasi:

1. **Lead Source & Campaign Tracking**: **DIREKOMENDASIKAN (P2)** — Esensial bagi tim marketing untuk mengukur ROI iklan.
2. **Commission Management (Buku Komisi)**: **DIREKOMENDASIKAN (P1)** — Faktor motivasi utama agen properti harian.
3. **Deal Closing Automated Workflow**: **DIREKOMENDASIKAN (P1)** — Menghubungkan deal verified langsung ke invoice.
4. **Automated Follow-up Scheduler**: **DIREKOMENDASIKAN (P1)** — Cukup mengaktifkan cron runner untuk kode yang sudah ada.
5. **WhatsApp Conversation History**: **TIDAK DIREKOMENDASIKAN SEKARANG** — Biaya integrasi WhatsApp Business API official tinggi; link direct WA saat ini sudah sangat efektif.
6. **Property Comparison**: **TIDAK MENDESAK (P3)** — Fitur sekunder untuk storefront.
7. **Saved Search & Customer Portal**: **TIDAK MENDESAK (P3)** — Belum dibutuhkan di tahap operasional awal.
8. **Bulk Property Management**: **DIREKOMENDASIKAN (P2)** — Membantu admin menugaskan agen ke 11 properti yang masih unassigned.

---

## 29. TECHNICAL DEBT AUDIT

1. **Inkonsistensi Routing vs Permission**: Role `viewer` diizinkan di `permissions.ts` tetapi diblokir di client page `/crm`. Harus diselaraskan.
2. **Bypass RLS Menggunakan Service Role**: Sebagian Server Actions internal memakai `createAdminClient()`. Walaupun dicek oleh role helper, praktik terbaik adalah memanfaatkan RLS Supabase native dengan user token.
3. **Dead Code & Scratch Scripts**: Terdapat beberapa file script audit di folder root/scripts yang perlu dirapikan atau dipindahkan ke direktori tooling terisolasi setelah fase audit selesai.
4. **Zustand i18n Store SSR Flash**: Terjemahan bahasa Inggris di sisi klien mengalami delay render satu frame saat hidrasi dari server bahasa Indonesia.

---

## 30. AUTOMATED TEST COVERAGE GAP & TOP 10 REGRESSION TESTS

### Kondisi Testing Saat Ini
- **Automated Tests**: **0%** (Tidak ada runner Vitest, Jest, atau Playwright di `package.json`).
- **Manual Checklists**: Terdokumentasi baik di folder `test-scenarios/`.

### 10 Automated Regression Tests Paling Kritis yang Wajib Dibuat:
1. **Test-01 [Security]**: Verifikasi seluruh API `/api/*` menolak request unauthenticated (HTTP 401) dan role tidak sah (HTTP 403).
2. **Test-02 [Security]**: Verifikasi data nomor telepon klien tersamarkan (masked) untuk agen non-pemilik dan viewer.
3. **Test-03 [Business Logic]**: Verifikasi perubahan Deal menjadi `verified` otomatis mengubah Properti menjadi `sold`/`rented` dan Lead menjadi `won`.
4. **Test-04 [Business Logic]**: Verifikasi agen dilarang memverifikasi deal mereka sendiri (hanya admin/super_admin).
5. **Test-05 [Data Integrity]**: Verifikasi pelepasan agen (`assigned_to = null`) pada properti published otomatis menurunkan status properti ke `draft`.
6. **Test-06 [Data Integrity]**: Verifikasi perhitungan nilai active pipeline tidak mengikutsertakan lead berstatus `won` atau `lost`.
7. **Test-07 [Financial]**: Verifikasi perhitungan total invoice, PPN 11%, dan status pembayaran invoice.
8. **Test-08 [Workflow]**: Verifikasi penjadwalan survei otomatis mencatat entri di `crm_activities` dan terhubung ke lead terkait.
9. **Test-09 [Cron]**: Verifikasi endpoint overdue sweep hanya dapat dipicu dengan header `Authorization: Bearer <CRON_SECRET>` yang valid.
10. **Test-10 [AI Policy]**: Verifikasi pemblokiran request AI saat kuota token harian tercapai atau master switch dinonaktifkan.

---

## 31. PRODUCTION OPERATIONS & RELIABILITY

- **Database Backup & PITR**: Mengandalkan automated backup bawaan Supabase (disarankan memastikan paket Supabase aktif mendukung PITR - Point In Time Recovery minimal 7 hari).
- **Environment Variables Audit**: Variabel sensitif (`SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, `FONNTE_TOKEN`, `GEMINI_API_KEY`) tersimpan rapi di `.env.local` dan tidak terekspos ke klien browser (`NEXT_PUBLIC_*`).
- **Cron Monitoring**: **Kelemahan Utama Operasional**. Tidak adanya monitoring status cron membuat admin tidak tahu jika pembersihan status overdue atau pengingat survei macet.
- **Rollback & Deployment**: Next.js pada platform modern (Vercel) mendukung instant rollback deployment jika build gagal.

---

## 32. FINAL SCORECARD

| Area Evaluasi | Skor / 10 | Status Kesiapan |
| :--- | :---: | :--- |
| **Security & Authorization** | 6.5 / 10 | **Perlu Perbaikan Segera** (Celah API followups & KTP bucket) |
| **Property Management** | 8.5 / 10 | **Sangat Siap** (Lifecycle & publishing rules solid) |
| **CRM & Pipeline** | 8.8 / 10 | **Sangat Siap** (Kanban interaktif, activity logging lengkap) |
| **Sales Workflow (Deal)** | 8.2 / 10 | **Siap** (Aturan verifikasi anti-fraud berjalan baik) |
| **Survey Management** | 8.0 / 10 | **Siap** (Relasi ke lead selesai, butuh cron scheduler) |
| **Invoice & Billing** | 7.2 / 10 | **Cukup** (Kalkulasi akurat, namun relasi property_id belum ketat) |
| **Reports & BI** | 8.5 / 10 | **Sangat Siap** (Atribusi agen akurat, bebas double-counting) |
| **Data Quality & Hygiene** | 7.0 / 10 | **Cukup** (Banyak properti published dengan data minim & unassigned) |
| **Automation & Reminders** | 6.0 / 10 | **Perlu Perbaikan** (Scheduler eksternal belum terpasang) |
| **Public Storefront** | 8.0 / 10 | **Siap** (Desain modern, filter responsif, kalkulator KPR aktif) |
| **Mobile UX (375px)** | 7.8 / 10 | **Siap** (BottomNav rapi, butuh list view untuk kanban mobile) |
| **Bilingual Support** | 7.5 / 10 | **Siap** (Kamus lengkap, perlu optimalisasi SSR) |
| **SEO & Indexing** | 7.0 / 10 | **Cukup** (Sitemap & Robots jalan, URL slugs & schema data belum) |
| **Performance & Build** | 9.0 / 10 | **Unggul** (Build 4.3s, 67 rute teroptimasi, TanStack cache) |
| **Automated Testing** | 4.0 / 10 | **Kritis** (Zero automated test suite) |
| **Production Operations** | 6.5 / 10 | **Cukup** (Deployment stabil, monitoring cron masih manual) |

### Skor Rata-rata: **7.4 / 10**
### Keputusan Akhir: **READY WITH IMPROVEMENTS (LAYAK DENGAN PERBAIKAN PRIORITAS)**

---

## 33. TOP 10 CRITICAL RISKS

1. **[RISK-01] Kebocoran Data Klien Terbuka di API Followups**
   - *Impact*: Nama klien, no telepon, dan isi obrolan follow-up dapat disedot publik tanpa login.
   - *Severity*: **CRITICAL (P0)**
   - *Evidence*: `app/api/followups/route.ts` memakai `createAdminClient()` tanpa validasi session.
   - *Rekomendasi*: Tambahkan `requireAuth()` dan batasi hasil query sesuai role/ownership.

2. **[RISK-02] Otomatisasi Jadwal & Reminder Tidak Berjalan (Dead Cron)**
   - *Impact*: Status follow-up tidak berubah `overdue` secara mandiri; pengingat survei WhatsApp tidak terkirim.
   - *Severity*: **HIGH (P1)**
   - *Evidence*: `vercel.json` crons dihapus karena limit plan Vercel Hobby.
   - *Rekomendasi*: Pasang pemanggil cron gratis via GitHub Actions workflow atau cron-job.org.

3. **[RISK-03] Potensi Dokumen KTP Tersimpan di Public Storage**
   - *Impact*: Foto KTP calon agen dapat diakses jika path bucket terbaca.
   - *Severity*: **HIGH (P1)**
   - *Evidence*: Catatan migration 008 bahwa bucket privat `ktp` belum dibuat.
   - *Rekomendasi*: Pastikan bucket privat Supabase dengan Signed URL terisolasi untuk KTP.

4. **[RISK-04] Listing Published Berkualitas Rendah di Storefront**
   - *Impact*: Menurunkan kepercayaan calon pembeli saat melihat properti tanpa foto dan alamat.
   - *Severity*: **MEDIUM (P1)**
   - *Evidence*: 7 properti published tidak memiliki alamat lengkap atau gambar cover.
   - *Rekomendasi*: Tambahkan validation guard: tolak status published jika media cover kosong.

5. **[RISK-05] Separuh Inventaris Properti Tanpa Agen Penanggung Jawab**
   - *Impact*: Lead calon pembeli yang tertarik dengan properti ini tidak memiliki agen penerima.
   - *Severity*: **MEDIUM (P1)**
   - *Evidence*: 11 dari 23 properti memiliki `assigned_to IS NULL`.
   - *Rekomendasi*: Jalankan penugasan agen massal oleh Admin.

6. **[RISK-06] Invoice Terputus dari Unit Properti**
   - *Impact*: Laporan keuangan per unit properti tidak akurat.
   - *Severity*: **MEDIUM (P1)**
   - *Evidence*: 2 dari 3 invoice di live DB memiliki `property_id: null`.
   - *Rekomendasi*: Wajibkan pemilihan properti saat membuat invoice komisi.

7. **[RISK-07] Ketiadaan Automated Regression Tests**
   - *Impact*: Perubahan fitur di masa depan rentan merusak kalkulasi KPI atau celah keamanan.
   - *Severity*: **HIGH (P1)**
   - *Evidence*: 0 test suite di `package.json`.
   - *Rekomendasi*: Pasang Vitest untuk unit test logic bisnis kritis dan Playwright untuk auth/flow test.

8. **[RISK-08] Inkompatibilitas Role Guard Viewer pada Modul CRM**
   - *Impact*: Role viewer diizinkan oleh permission layer namun di-redirect paksa oleh UI page.
   - *Severity*: **LOW (P2)**
   - *Evidence*: Perbedaan antara `lib/permissions.ts` (`view_own_crm: true`) dan `app/(dashboard)/crm/page.tsx`.
   - *Rekomendasi*: Samakan kebijakan di kedua layer.

9. **[RISK-09] Ketergantungan Komunikasi WhatsApp Hanya pada Pesan Manual**
   - *Impact*: Histori percakapan nego dengan klien tidak terdokumentasi rapi di CRM.
   - *Severity*: **LOW (P2)**
   - *Evidence*: CRM mengandalkan link generator WhatsApp tanpa log riwayat chat.
   - *Rekomendasi*: Tambahkan fitur quick activity logger setelah agen menekan tombol WhatsApp.

10. **[RISK-10] Fluktuasi Kualitas SEO Akibat UUID URLs**
    - *Impact*: Peringkat listing di Google Search kalah bersaing dengan marketplace properti kompetitor.
    - *Severity*: **LOW (P3)**
    - *Evidence*: Detail properti diakses via UUID, bukan slug berbasis judul lokasi.
    - *Rekomendasi*: Aktifkan URL routing berbasis slug kanonikal.

---

## 34. TOP 10 RECOMMENDATIONS

| No | Rekomendasi | Masalah yang Diselesaikan | Manfaat Bisnis & Teknis | Urgensi | Kompleksitas | Target Fase |
| :-: | :--- | :--- | :--- | :---: | :---: | :---: |
| **1** | **Amankan API `/api/followups`** | Kebocoran data klien & kontak unmasked | Kepatuhan privasi & keamanan sistem | **P0 (Mendesak)** | Rendah | Fase Berikutnya |
| **2** | **Pasang External Cron Scheduler** | Overdue status & reminder WA macet | Follow-up otomatis & disiplin agen terjaga | **P1 (Tinggi)** | Rendah | Fase Berikutnya |
| **3** | **Deal-to-Invoice Auto Creation** | Input invoice manual berulang | Efisiensi administrasi & bebas salah input | **P1 (Tinggi)** | Sedang | Fase Berikutnya |
| **4** | **Agent Commission Ledger** | Agen tidak punya rekap komisi pribadi | Peningkatan retensi & motivasi agen | **P1 (Tinggi)** | Sedang | Fase Berikutnya |
| **5** | **Publishing Data Hygiene Guard** | Listing kosong tampil di katalog publik | Peningkatan citra profesional broker | **P1 (Tinggi)** | Rendah | Fase Berikutnya |
| **6** | **Bulk Property Assignment Admin** | 11 properti menganggur tanpa agen | Respon lead lebih cepat & inventaris aktif | **P2 (Sedang)** | Rendah | Fase Berikutnya |
| **7** | **Inisialisasi Vitest & 10 Critical Tests** | Tidak adanya automated test pengaman | Mencegah regresi bug finansial/keamanan | **P1 (Tinggi)** | Sedang | Fase Berikutnya |
| **8** | **Sinkronisasi Permission Guard Viewer** | Kontradiksi router vs UI page | Konsistensi arsitektur kode | **P2 (Sedang)** | Rendah | Fase Berikutnya |
| **9** | **Mobile List View untuk CRM** | Sulit geser kanban di HP 375px | Produktivitas agen mobile di lapangan | **P2 (Sedang)** | Sedang | Fase Berikutnya |
| **10**| **UTM Campaign Ingestion** | Marketing tidak tahu efektivitas iklan | Optimalisasi alokasi budget promosi | **P2 (Sedang)** | Rendah | Fase Berikutnya |

---

## 35. PROPOSED NEXT PHASE

Berdasarkan hasil audit komprehensif, kebutuhan terbesar PLMS saat ini **bukan menambah modul baru yang rumit**, melainkan **mengamankan celah kritis yang ditemukan, menyempurnakan siklus penutupan transaksi hingga pencairan komisi (Sales & Revenue Operations), dan mengaktifkan otomatisasi penjadwalan harian**.

Arah pengembangan tunggal yang diusulkan untuk tahap berikutnya adalah:

### 👉 **PHASE 11 — SALES & REVENUE OPERATIONS (SECURE CLOSING, COMMISSIONS & AUTOMATION)**

#### Fokus Utama Phase 11:
1. **Security & Data Privacy Hardening**:
   - Penutupan celah keamanan unauthenticated pada endpoint `/api/followups`.
   - Penyelarasan role permission guard `viewer` pada seluruh layer.
   - Pengamanan bucket penyimpanan dokumen identitas agen (KTP).
2. **End-to-End Revenue Flow (Deal → Invoice → Commission)**:
   - Otomatisasi penerbitan draft invoice saat Deal Closing disetujui/diverifikasi Admin.
   - Pembuatan **Agent Commission Ledger (Buku Komisi Agen)** untuk transparansi hak bagi hasil agen.
   - Pengetatan relasi wajib `property_id` pada seluruh faktur komisi penjualan.
3. **Operational Automation & Reliability**:
   - Pemasangan external webhook scheduler (GitHub Actions / cron service) untuk menjalankan otomatisasi overdue follow-up dan pengingat survei WhatsApp.
   - Pemasangan data hygiene guard sebelum properti dapat dipublikasikan ke katalog publik.
4. **Automated Regression Test Suite**:
   - Pemasangan Vitest dan implementasi 10 automated tests kritis untuk mencegah regresi logika bisnis dan keamanan.

*(Peringatan Aturan: Phase 11 HANYA direkomendasikan pada dokumen audit ini dan TIDAK diimplementasikan sekarang).*

---

## 36. VERIFICATION RESULTS

Pemeriksaan integritas kode dan proses build produksi (Read-Only Verification):

### 1. TypeScript Compilation Check
```bash
$ npx tsc --noEmit
Exit Code: 0
Stdout: (Clean - No type errors)
Stderr: (None)
```
**Status: PASS** — Seluruh codebase PLMS bebas dari type error dan sesuai dengan standar TypeScript 5.

### 2. Next.js Production Build Check
```bash
$ npm run build
Exit Code: 0
Framework: Next.js 16.2.10 (Turbopack)
Compiled: 67 Routes successfully generated (Static & Dynamic)
Build Duration: 4.3s compilation + 6.2s typecheck
Static Prerender: 67/67 pages in 391ms
```
**Status: PASS** — Seluruh halaman publik, dashboard internal, dan API endpoints berhasil dibangun ke dalam bundle produksi tanpa kegagalan impor ataupun syntax failure.

---
*Laporan audit ini disusun secara independen, berbasis bukti forensik kode sumber dan data riil PostgreSQL Supabase tanpa modifikasi data.*
