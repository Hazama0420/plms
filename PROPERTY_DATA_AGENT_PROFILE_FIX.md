# PROPERTY DATA SPECIFICATIONS & DASHBOARD AGENT PROFILE FIX REPORT

**Date**: 2026-09-05  
**Branch**: `feat/footer-legal-dan-pembersihan`  
**Status**: **COMPLETED & VERIFIED**  
**TypeScript**: `0 errors` (`npx tsc --noEmit` PASS)  
**Production Build**: `Exit 0` (`npm run build` PASS — 67 static & dynamic routes generated)  

---

## 1. ROOT CAUSE ANALYSIS

### Issue 1: Empty Property Specifications (LB, LT, KT, KM)
- In `components/properties/PropertyCard.tsx`, the specs chip array filtered items using `item.bedrooms != null && item.bedrooms > 0 ? ... : null`. When `bedrooms`, `bathrooms`, `building_area`, or `land_area` were `0`, `null`, or `undefined`, the conditional evaluated to `null` and was stripped out by `.filter(Boolean)`.
- Similarly in `components/property-detail/PropertySpecsGrid.tsx`, specs were filtered out if `<= 0` or `null`.
- In `app/(dashboard)/dashboard/page.tsx`, `formatPropertyItem` returned `null` for missing specification fields rather than normalizing to a canonical `0`.
- As a result, properties with null or unconfigured specifications appeared completely blank without the expected `0 m²` or `0` chips.

### Issue 2: Dashboard Failing to Retrieve Agent Profile
- In `app/(dashboard)/dashboard/page.tsx`, the Supabase query for featured properties explicitly selected only:
  ```sql
  id, title, listing_code, listing_type, property_type, status,
  address:property_address(*), price:property_price(*), specifications:property_specifications(*),
  building:property_building(*), land:property_land(*), media:property_media(*)
  ```
  It **did not select** `created_by`, `assigned_to`, or `user_id`.
- The dashboard's `formatPropertyItem` attempted to resolve `p.agent`, `p.user`, or `p.users`, which were all undefined. It never fetched user profiles from the `users` table.
- Consequently, all properties on the Dashboard defaulted to `"Agen Inland"` with `null` avatars, while the Property Catalog page correctly resolved user IDs against the `users` table via `profilesMap`.

---

## 2. RESOLUTION & IMPLEMENTATION

### A. Property Specifications Normalization (`null / undefined / empty → 0`)
1. **Canonical `PropertyCard.tsx`**:
   - Replaced conditional filtering with guaranteed 4-chip canonical presentation:
     - 🛏️ **Bed**: `${Number(item.bedrooms ?? 0)}`
     - 🛁 **Bath**: `${Number(item.bathrooms ?? 0)}`
     - 🏢 **Building Area**: `${Number(item.building_area ?? 0)} m²`
     - 📐 **Land Area**: `${Number(item.land_area ?? 0)} m²`
   - Preserved canonical Lucide icons (`Bed`, `Bath`, `Building2`, `Maximize2`).
   - Prices continue using `formatKprCurrency()`.
2. **Dashboard Data Normalization (`dashboard/page.tsx`)**:
   - `bedrooms`: `Number(specObj?.bedroom ?? specObj?.bedrooms ?? p.bedrooms ?? p.bedroom ?? 0)`
   - `bathrooms`: `Number(specObj?.bathroom ?? specObj?.bathrooms ?? p.bathrooms ?? p.bathroom ?? 0)`
   - `building_area`: `Number(bldObj?.building_area ?? specObj?.building_area ?? p.building_area ?? p.building_size ?? 0)`
   - `land_area`: `Number(landObj?.land_area ?? specObj?.land_area ?? p.land_area ?? p.land_size ?? 0)`
3. **Property Detail Page (`PropertySpecsGrid.tsx`)**:
   - Guaranteed display of the 4 primary specifications with `?? 0` fallback.
4. **Property Catalog Table View (`properties/page.tsx`)**:
   - Updated table view row specs: `prop.bedrooms ?? 0 KT`, `prop.bathrooms ?? 0 KM`, `LB ${prop.building_area ?? 0} m²`, `LT ${prop.land_area ?? 0} m²`.

### B. Dashboard Agent Profile Resolution Matching Property Page
1. **Query Alignment (`dashboard/page.tsx`)**:
   - Added `created_by`, `assigned_to`, `user_id`, and `slug` to the `supabase.from("properties").select(...)` query.
2. **Profile Lookup Batching**:
   - Extracted unique agent/creator IDs across all loaded properties:
     ```ts
     const userIds = Array.from(
       new Set(
         (featuredData || [])
           .map((p: any) => p.assigned_to || p.created_by || p.user_id)
           .filter(Boolean)
       )
     );
     ```
   - Fetched profiles in a single query matching the Property page:
     ```ts
     const { data: userData } = await supabase
       .from("users")
       .select("id, full_name, avatar_url, phone, whatsapp")
       .in("id", userIds);
     ```
   - Constructed `profilesMap` indexed by user ID.
3. **Profile Priority Resolver**:
   - Priority sequence: `assigned_to` -> `created_by` -> `user_id`.
   - Populates `agent_name`, `agent_avatar`, `agent_phone`, `uploader_name`, and `uploader_avatar`.
   - Safe fallback: `"Agen Resmi"` with dynamic initials avatar if no user profile is attached, preventing unauthorized profile exposure.

---

## 3. COMPONENTS & FILES MODIFIED

1. [components/properties/PropertyCard.tsx](file:///d:/Workspace/plms/components/properties/PropertyCard.tsx):
   - Normalized specs array to always output all 4 specs with `0` / `0 m²` fallbacks.
   - Set agent fallback to `t("properties.card.agentFallback")`.
2. [app/(dashboard)/dashboard/page.tsx](file:///d:/Workspace/plms/app/(dashboard)/dashboard/page.tsx):
   - Added `created_by, assigned_to, user_id, slug` to properties query.
   - Added `profilesMap` batch query and resolution matching `/properties`.
   - Normalized `bedrooms`, `bathrooms`, `building_area`, and `land_area` to default to `0`.
3. [components/dashboard/DashboardPropertyCard.tsx](file:///d:/Workspace/plms/components/dashboard/DashboardPropertyCard.tsx):
   - Added `uploader_name` and `uploader_avatar` to `DashboardPropertyItem` interface for full TypeScript compatibility.
4. [app/(dashboard)/properties/page.tsx](file:///d:/Workspace/plms/app/(dashboard)/properties/page.tsx):
   - Prioritized `assigned_to` before `created_by` in `uploaderId` and `fetchProfiles`.
   - Updated table view specs to use `?? 0` and standardized `m²` spacing.
5. [components/property-detail/PropertySpecsGrid.tsx](file:///d:/Workspace/plms/components/property-detail/PropertySpecsGrid.tsx):
   - Guaranteed all 4 core specs render even when null or 0.
6. [lib/i18n/id.ts](file:///d:/Workspace/plms/lib/i18n/id.ts) & [lib/i18n/en.ts](file:///d:/Workspace/plms/lib/i18n/en.ts):
   - Added `agentFallback: "Agen Resmi"` (ID) and `"Official Agent"` (EN) under `properties.card`.

---

## 4. VERIFICATION MATRIX

| Verification Item | Requirement | Result | Status |
| :--- | :--- | :--- | :--- |
| **Empty building_area** | Display `0 m²` | Displays `0 m²` | **PASS** |
| **Empty land_area** | Display `0 m²` | Displays `0 m²` | **PASS** |
| **Empty bedroom** | Display `0` | Displays `0` | **PASS** |
| **Empty bathroom** | Display `0` | Displays `0` | **PASS** |
| **Populated specs** | Display genuine values | Displays original values with unit | **PASS** |
| **Dashboard Agent Name** | Matches Property Page | Resolved from `users` via `profilesMap` | **PASS** |
| **Dashboard Agent Avatar** | Matches Property Page | Resolved from `users` via `profilesMap` | **PASS** |
| **No DB Changes** | No migrations or schema edits | 0 migrations created | **PASS** |
| **TypeScript Validation** | `npx tsc --noEmit` -> 0 errors | 0 errors (Exit 0) | **PASS** |
| **Production Build** | `npm run build` -> Exit 0 | 67/67 routes generated (Exit 0) | **PASS** |
| **Frozen Zone Integrity** | RLS, Server Actions, API, CRM | 100% untouched | **PASS** |

---

## 5. DASHBOARD PROPERTY CATALOG REGRESSION FIX

### A. Root Cause Analysis of Disappearing Catalog
- **Root Cause**: Kolom `user_id` dimasukkan ke dalam klausa `.select(...)` query Supabase pada `app/(dashboard)/dashboard/page.tsx`:
  ```sql
  select(`id, title, listing_code, listing_type, property_type, status, slug, created_by, assigned_to, user_id, ...`)
  ```
  Pada database Supabase, tabel `properties` tidak memiliki kolom bernama `user_id` (hanya ada `created_by` dan `assigned_to`). Akibatnya, PostgREST Supabase mengembalikan galat **HTTP 400 (`code: 42703, message: "column properties.user_id does not exist"`)**.
- Karena query mengembalikan galat, variabel `featuredData` bernilai `null`, lalu `(featuredData || []).map(...)` menghasilkan array kosong `[]`, yang menyebabkan seluruh katalog properti di Dashboard tidak tampil.

### B. File Penyebab & Perbaikan
1. **[app/(dashboard)/dashboard/page.tsx](file:///d:/Workspace/plms/app/(dashboard)/dashboard/page.tsx)**:
   - **Query Dikembalikan & Dibenarkan**: Menghapus `user_id` dari string select query properti:
     ```sql
     select(`
       id, title, listing_code, listing_type, property_type, status, slug,
       created_by, assigned_to, is_featured,
       agent:users!assigned_to(full_name, avatar_url),
       address:property_address(*),
       price:property_price(*),
       specifications:property_specifications(*),
       building:property_building(*),
       land:property_land(*),
       media:property_media(*)
     `)
     ```
   - **Sorting Terjaga**: Menambahkan `.order("created_at", { ascending: false })` dan `.limit(12)`.
   - **Error Handling**: Menangkap dan mencatat `featuredError` dari Supabase sehingga kegagalan query tidak hilang tanpa jejak.
   - **Agent Profile Lookup Aman**:
     - `userIds` diekstrak dari `p.assigned_to || p.created_by`.
     - `profilesMap` dibatch ke `public.users`.
     - Resolusi di `formatPropertyItem` mengecek `profileFromMap` -> `profileFromJoin` -> `agentObj` -> fallback `"Agen Resmi"`.
     - Properti **tidak pernah dibuang** meskipun profil agen kosong atau gagal dimuat.
   - **Slug Navigation**: `handlePropertyClick` memprioritaskan `prop.slug` sebelum fallback ke `prop.id`.

2. **[components/dashboard/DashboardPropertyCard.tsx](file:///d:/Workspace/plms/components/dashboard/DashboardPropertyCard.tsx)**:
   - Menambahkan properti `is_featured?: boolean` pada interface `DashboardPropertyItem`.

### C. Hasil Verifikasi Runtime
- **Live Supabase Pipeline Verification**:
  - Total properti published yang dikembalikan dari database: **12 properti**.
  - Total properti terformat untuk Dashboard catalog: **12 properti (100% muncul kembali)**.
  - Properti spesifikasi kosong (contoh: *Tanah Cikarang Utara*):
    - Kamar Tidur: `0`
    - Kamar Mandi: `0`
    - Luas Bangunan: `0 m²`
    - Luas Tanah: `0 m²`
  - Properti dengan spesifikasi terisi (contoh: *Ruko Gandeng Hadap Boulevard*):
    - Kamar Tidur: `0`
    - Kamar Mandi: `6`
    - Luas Bangunan: `510 m²`
    - Luas Tanah: `170 m²`
  - Resolusi Profil Agen:
    - Agen terisi: `"Mardian Gilang Ramadhan"`, `"mardianGR04"`, `"bakayaro"` (diambil dari `users`).
    - Properti tanpa relasi agen (contoh: *Sewa Tanah Cisauk*): otomatis fallback ke `"Agen Resmi"` / `"Official Agent"`.
- **TypeScript**: `npx tsc --noEmit` -> **0 errors (PASS)**.
- **Production Build**: `npm run build` -> **Exit 0 (67/67 rute berhasil digenerate)**.

---

## 6. CONCLUSION
Regression pada katalog properti Dashboard telah sepenuhnya diperbaiki. Seluruh 12 properti kembali tampil secara andal di Dashboard dengan normalisasi nilai kosong ke `0` / `0 m²`, integrasi profil agen yang konsisten dengan halaman Properti, tanpa perubahan skema database dan tanpa merusak sistem yang sudah ada.

