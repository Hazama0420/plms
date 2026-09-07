# PHASE 10A: CRITICAL STABILIZATION REPORT

**Execution Date**: 2026-09-05  
**Framework**: Next.js 16.2.10 (Turbopack) | React 19.2.4 | TypeScript 5 | Supabase  
**Status**: **COMPLETED & FULLY VERIFIED (PASS)**  
**Frozen Zone Compliance**: 100% (No database migration, no RLS changes, zero schema modification).

---

## 1. EXECUTIVE SUMMARY

Phase 10A implements targeted fixes for the 7 most critical bugs (P0/P1) discovered during the Phase 10 Full System Audit. The phase establishes strict security access controls, fixes broken API endpoints, eliminates phantom column errors, restores assigned agent communication capabilities, locks down financial relational mappings, grants assigned agents edit access to their listings, and unifies desktop and mobile navigation.

All changes have passed static type analysis (`npx tsc --noEmit` PASS with 0 errors) and full production build (`npm run build` PASS with 67/67 routes generated). Zero regressions were observed on the dashboard property catalog or other core modules.

---

## 2. ISSUES FIXED & ROOT CAUSE ANALYSIS

### Issue 1: BUG-01 — Invoice Route Access Control (P0)
* **Root Cause**: In [lib/permissions.ts](file:///d:/Workspace/plms/lib/permissions.ts), `matchesSection(route, "invoices")` shared permission logic with projects and allowed `view_all_properties`. Roles like Viewer, Agent, and Marketing were granted access to financial invoice routes.
* **Fix**:
  - Decoupled `invoices` from `projects` in `canAccessRoute`.
  - Enforced that `/invoices` and `/invoices/*` strictly require `userRole === 'admin' || userRole === 'super_admin'`.
  - Added role verification in [app/api/invoices/[id]/print/route.ts](file:///d:/Workspace/plms/app/api/invoices/[id]/print/route.ts) via `requireRole(["super_admin", "admin"])`.
  - Added client-side redirect guards in [app/(dashboard)/invoices/page.tsx](file:///d:/Workspace/plms/app/(dashboard)/invoices/page.tsx) and [app/(dashboard)/invoices/create/page.tsx](file:///d:/Workspace/plms/app/(dashboard)/invoices/create/page.tsx).

### Issue 2: BUG-02 — CRM Contact Card 404 (P0)
* **Root Cause**: [components/crm/lead-contact-card.tsx](file:///d:/Workspace/plms/components/crm/lead-contact-card.tsx) executed `fetch('/api/crm/contacts/${contactId}')`. Directory `app/api/crm/` does not exist in the repository, resulting in HTTP 404 and rendering "Kontak tidak ditemukan".
* **Fix**:
  - Replaced the non-existent HTTP fetch with the project's standard Supabase client pattern:
    `supabase.from('crm_contacts').select('*').eq('id', contactId).maybeSingle()`.
  - Safely handled loading, error, and missing contact states without network 404s.

### Issue 3: BUG-03 — Follow-up Contact Phantom Column (P0)
* **Root Cause**: [app/api/followups/route.ts](file:///d:/Workspace/plms/app/api/followups/route.ts) queried `crm_contacts.select("id, name, phone, email")`. The database table `crm_contacts` defines column `full_name`, not `name`. PostgREST returned HTTP 400 (`column crm_contacts.name does not exist`), which was caught and caused all follow-ups to fallback to `name: "Unknown"`.
* **Fix**:
  - Updated query to `crm_contacts.select("id, full_name, phone, email")`.
  - Updated mapping to `name: contact?.full_name || "Unknown"`.
  - Updated error handling to return HTTP 500 with error details if the contact query fails, preventing silent failures.

### Issue 4: BUG-04 — Assigned Agent Contact Access (P0)
* **Root Cause**: In [app/(dashboard)/crm/leads/[id]/page.tsx](file:///d:/Workspace/plms/app/(dashboard)/crm/leads/[id]/page.tsx), `formatPhoneForUser` and `handleOpenWhatsApp` checked only `isAdminOrSuperAdmin`. Even when an agent was assigned to the lead (`lead.assigned_to === user.id`), the client phone was masked as `08xx-xxxx-xxxx` and the WhatsApp button was disabled with an "Akses Kontak Terkunci" toast.
* **Fix**:
  - Implemented `isAssignedAgent = currentUserRole === "agent" && lead.assigned_to === currentUserId`.
  - Implemented `canAccessContact = Boolean(isAdminOrSuperAdmin || isAssignedAgent)`.
  - Authorized assigned agents to view the real telephone number, activate the WhatsApp action button (green "WA Klien"), and open direct WhatsApp chat.
  - Retained strict masking (`08xx-xxxx-xxxx`) and lock state for unauthorized agents, viewers, and guests.
  - Dynamically attributed activity log notes to `"Admin"` or `"Agen"` based on actor role.

### Issue 5: BUG-05 — Invoice Client Relational Constraint (P0)
* **Root Cause**: In [app/(dashboard)/invoices/create/page.tsx](file:///d:/Workspace/plms/app/(dashboard)/invoices/create/page.tsx), the primary dropdown mapped `lead.id` to `client_id`, while the fallback branch mapped `c.id` (`crm_contacts.id`) to `client_id`. Forensic database inspection confirmed PostgreSQL defines a Foreign Key constraint: `invoices.client_id REFERENCES crm_leads(id)`. Saving a contact ID into `client_id` caused foreign key violations or relational corruption.
* **Fix & Relational Decision**:
  - Documented relational constraint: `invoices.client_id` represents the lead reference (`crm_leads.id`).
  - Ensured that `fetchClients` always sets `id = lead.id` from `crm_leads`.
  - Updated the fallback branch so that if `crm_leads` is unavailable and only raw `crm_contacts` is fetched, `id` is kept empty (`""`), ensuring `invoices.client_id` is set to `null` while safely retaining denormalized `client_name`, `client_email`, and `client_phone`.
  - Prevented any foreign key violation or corrupted ID from ever entering the `invoices` table.

### Issue 6: BUG-08 — Assigned Agent Property Edit (P1)
* **Root Cause**: In [app/(dashboard)/properties/[id]/edit/page.tsx](file:///d:/Workspace/plms/app/(dashboard)/properties/[id]/edit/page.tsx), edit permission checked only `data.created_by === user.id`. When an admin assigned a property to Agent X (`assigned_to = Agent X`), Agent X was locked out of editing the listing. Additionally, [app/(dashboard)/properties/page.tsx](file:///d:/Workspace/plms/app/(dashboard)/properties/page.tsx) contained a route typo navigating to `/properties/edit/${id}` instead of `/properties/${id}/edit`.
* **Fix**:
  - Updated authorization in `EditPropertyPage` to:
    `const isOwnerOrAssigned = userRole === "agent" && (data.created_by === user.id || data.assigned_to === user.id);`
    `if (userRole === "viewer" || userRole === "reviewer" || (!isAdmin && !isOwnerOrAssigned)) { ... }`
  - Fixed navigation typos in `properties/page.tsx` (card view and table dropdown) to correctly push `/properties/${id}/edit`.
  - Confirmed database RLS `properties_update` already natively allows `assigned_to = auth.uid()`.

### Issue 7: BUG-11 — Desktop vs Mobile Invoice Navigation (P1)
* **Root Cause**: Desktop `ERPSidebar` restricted `/invoices` to `["super_admin", "admin"]`. However, mobile [components/layout/BottomNav.tsx](file:///d:/Workspace/plms/components/layout/BottomNav.tsx) checked `isAgentOrAdmin` (including agents and marketing), showing the Invoices tab to agents on mobile while hiding it on desktop.
* **Fix**:
  - In `BottomNav.tsx`, separated `isAdminOrSuperAdmin` from `isAgentOrAdmin`.
  - Restricted the Invoice navigation tab strictly to `isAdminOrSuperAdmin`.
  - Assigned the Surveys tab (`/surveys`) to `agent`, `marketing`, `viewer`, and `guest` roles.
  - Achieved 100% parity between Desktop ERPSidebar, Mobile BottomNav, and route guard permissions.

---

## 3. FILES CHANGED

| File | Changes Made |
| :--- | :--- |
| [lib/permissions.ts](file:///d:/Workspace/plms/lib/permissions.ts) | Decoupled invoices from projects; restricted invoices to admin/super_admin. |
| [app/api/invoices/[id]/print/route.ts](file:///d:/Workspace/plms/app/api/invoices/[id]/print/route.ts) | Added `requireRole(["super_admin", "admin"])` guard. |
| [app/(dashboard)/invoices/page.tsx](file:///d:/Workspace/plms/app/(dashboard)/invoices/page.tsx) | Added `usePermissions` and redirect guard for non-admins. |
| [app/(dashboard)/invoices/create/page.tsx](file:///d:/Workspace/plms/app/(dashboard)/invoices/create/page.tsx) | Added role guard and enforced FK integrity on `client_id`. |
| [components/crm/lead-contact-card.tsx](file:///d:/Workspace/plms/components/crm/lead-contact-card.tsx) | Replaced 404 HTTP fetch with Supabase client query. |
| [app/api/followups/route.ts](file:///d:/Workspace/plms/app/api/followups/route.ts) | Fixed query to select `full_name` instead of `name`. |
| [app/(dashboard)/crm/leads/[id]/page.tsx](file:///d:/Workspace/plms/app/(dashboard)/crm/leads/[id]/page.tsx) | Allowed assigned agents to view phone and click WhatsApp. |
| [app/(dashboard)/properties/[id]/edit/page.tsx](file:///d:/Workspace/plms/app/(dashboard)/properties/[id]/edit/page.tsx) | Allowed assigned agents (`assigned_to === user.id`) to edit property. |
| [app/(dashboard)/properties/page.tsx](file:///d:/Workspace/plms/app/(dashboard)/properties/page.tsx) | Fixed edit route typo to `/properties/${id}/edit`. |
| [components/layout/BottomNav.tsx](file:///d:/Workspace/plms/components/layout/BottomNav.tsx) | Aligned mobile invoice tab to admin/super_admin only. |
| [CURRENT_STATE.md](file:///d:/Workspace/plms/CURRENT_STATE.md) | Updated project handover state. |

---

## 4. VERIFICATION RESULTS

### 4.1. Static & Build Verification
* **TypeScript Compilation**:
  `npx tsc --noEmit` $\rightarrow$ **0 errors (PASS)**
* **Production Build**:
  `npm run build` $\rightarrow$ **Exit code 0 (PASS)**
  All 67 routes successfully pre-rendered or dynamically bundled via Turbopack.

### 4.2. Runtime Diagnostic Verification
* **BUG-01 (Route Access Control)**:
  - Role `viewer`: `/invoices` $\rightarrow$ `false` (DENIED)
  - Role `agent`: `/invoices` $\rightarrow$ `false` (DENIED)
  - Role `marketing`: `/invoices` $\rightarrow$ `false` (DENIED)
  - Role `commissioner`: `/invoices` $\rightarrow$ `false` (DENIED)
  - Role `admin`: `/invoices` $\rightarrow$ `true` (ALLOWED)
  - Role `super_admin`: `/invoices` $\rightarrow$ `true` (ALLOWED)
* **BUG-02 (CRM Contact Card)**:
  - Supabase client query on `crm_contacts` $\rightarrow$ **HTTP 200 OK (PASS)**.
  - Zero 404 network errors.
* **BUG-03 (Follow-up Contact Resolution)**:
  - Query with `full_name` returned live contact: `Aji Santoso` (Phone: `07373476464`).
  - Follow-up contact name resolved correctly from database $\rightarrow$ **PASS**.
* **BUG-04 (Assigned Agent Contact Access)**:
  - Super Admin: `canAccess = true`, Phone unmasked $\rightarrow$ **PASS**
  - Admin: `canAccess = true`, Phone unmasked $\rightarrow$ **PASS**
  - Assigned Agent: `canAccess = true`, Phone unmasked $\rightarrow$ **PASS**
  - Unassigned / Unrelated Agent: `canAccess = false`, Phone masked `08xx-xxxx-xxxx` $\rightarrow$ **PASS**
  - Viewer: `canAccess = false`, Phone masked `08xx-xxxx-xxxx` $\rightarrow$ **PASS**
* **BUG-08 (Property Edit Permission)**:
  - Admin: `canEdit = true` $\rightarrow$ **PASS**
  - Agent Creator: `canEdit = true` $\rightarrow$ **PASS**
  - Assigned Agent (`assigned_to`): `canEdit = true` $\rightarrow$ **PASS**
  - Unrelated Agent: `canEdit = false` $\rightarrow$ **PASS**
  - Viewer: `canEdit = false` $\rightarrow$ **PASS**
* **Regression Check (Dashboard Property Catalog)**:
  - Live query loaded **12 out of 12 published properties**.
  - Empty specifications render properly as `0` and `0 m²`.
  - Agent profile batch resolver functional without errors.

---

## 5. SUCCESS CRITERIA CHECKLIST

| Criteria | Target | Status |
| :--- | :--- | :---: |
| 1. `/invoices` unauthorized roles denied | Viewer, Agent, Marketing blocked from `/invoices` | **PASS** |
| 2. CRM Contact Card no 404 | Loads contact via Supabase client without 404 | **PASS** |
| 3. Follow-up displays contact name | Query selects `full_name`, resolves real name | **PASS** |
| 4. Assigned agent can contact lead | Phone unmasked, WhatsApp button enabled for assigned agent | **PASS** |
| 5. Invoice `client_id` relation | Respects `crm_leads(id)` FK, stops corrupted insertions | **PASS** |
| 6. Assigned agent can edit property | `assigned_to === user.id` permitted in edit page | **PASS** |
| 7. Mobile/desktop navigation consistent | BottomNav and ERPSidebar show invoices only to admin | **PASS** |
| 8. Dashboard property catalog regression | All 12 properties remain visible with 0 fallback specs | **PASS** |
| 9. Database safety | Zero database migrations executed | **PASS** |
| 10. TypeScript check | `npx tsc --noEmit` returns 0 errors | **PASS** |
| 11. Production build | `npm run build` exits with code 0 | **PASS** |
| 12. Frozen zone protected | CRM actions, RLS, V2 design system untouched | **PASS** |

---

## 6. RECOMMENDATIONS FOR PHASE 10B

With Phase 10A completed, the foundation is secured. The recommended next phase is **Phase 10B — Workflow Integration & Data Reconciliation**:
1. **Reconcile Dashboard KPIs**: Fix `totalLeads` mapping and pipeline value calculation (BUG-06, BUG-07).
2. **Automate Won Deal $\rightarrow$ Property Sold Status Transition**: Automatically mark property as `sold` or `rented` upon deal verification (BUG-09).
3. **Connect Surveys to CRM Leads**: Add `lead_id` to survey appointment workflows (BUG-10).
4. **Fix Agent Performance Double-Counting in Reports**: Correct duplicate counting of creator and assigned agent in `report.service.ts` (BUG-14).
