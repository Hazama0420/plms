# PHASE 10B — WORKFLOW INTEGRATION & DATA RECONCILIATION REPORT

**Status**: ✅ COMPLETED & VERIFIED  
**Date**: 2026-09-05  
**Core Principle**: *"Satu data bisnis harus menghasilkan angka dan status yang sama di seluruh modul PLMS."*  
**Scope**: BUG-06, BUG-07, BUG-09, BUG-10, BUG-14  

---

## 1. Pre-Implementation Schema Audit

Prior to making any code modifications, a comprehensive inspection of the live PostgreSQL database and source code was executed:

| Entity / Table | Schema & Relational Structure | Audit Finding |
| :--- | :--- | :--- |
| `crm_leads` | `id`, `contact_id`, `assigned_to`, `created_by`, `status`, `interest_type`, `budget`, `notes`, `property_id`, `deal_state`, `deal_submitted_at`, `deal_verified_at` | 10 total leads: 4 `new`, 3 `contacted`, 1 `won`, 2 `lost`. Active pipeline leads = 7. Sum of active budgets = Rp 37.168.102.000. |
| `properties` | `id`, `listing_code`, `title`, `listing_type` (`'jual' \| 'sewa'`), `status` (`'draft' \| 'review' \| 'published' \| 'sold' \| 'rented' \| 'archived'`), `assigned_to`, `created_by` | 23 total properties (16 `published`, 7 `draft`). Neither `verifyCRMDealAction` nor `updateCRMLeadStatusAction` was updating property status when a deal was won. |
| `surveys` | `id`, `property_id`, `request_id`, `client_id`, `client_name`, `client_phone`, `agent_id`, `scheduled_at`, `duration_min`, `type`, `status`, `created_by` | 0 rows in DB. Disconnected from CRM Leads due to complete absence of `lead_id` column. |
| `survey_requests` | `id`, `property_id`, `requester_id`, `requester_name`, `requester_phone`, `status`, `agent_id`, `handled_by`, `survey_id` | 2 rows in DB (`contacted`, `pending`). Both are storefront orphan requests with no provable link to existing leads. |
| `crm_activities` | `id`, `lead_id`, `user_id`, `activity_type`, `notes`, `created_at` | 24 rows in DB. Governed by check constraint `crm_activities_type_check` which allows `'site_visit'`, `'meeting'`, `'note'`, etc. |
| `invoices` | `id`, `invoice_number`, `client_id` (FK `crm_leads(id)`), `property_id`, `total_amount`, `status` | 3 rows in DB. |

---

## 2. Actual Data-Flow Maps

### Flow A: Lead $\rightarrow$ Deal $\rightarrow$ Verification $\rightarrow$ Won $\rightarrow$ Property Status $\rightarrow$ Invoice $\rightarrow$ Reports
```text
[CRM Lead Created]
       │  (status: 'new', 'contacted', 'qualified', 'proposal', 'negotiation')
       ▼
[CRM Pipeline Active]
       │  (Pipeline Value = sum(active_leads.budget))
       ▼
[Deal Submitted]
       │  (lead.status = 'negotiation', lead.deal_state = 'pending_verification')
       ▼
[Verification by Admin/Super Admin]  <── Authoritative Gate (verifyCRMDealAction)
       │  (lead.deal_state = 'verified', lead.status = 'won')
       ▼
[Property Status Update]             <── IMPLEMENTED (BUG-09)
       │  (prop.listing_type === 'sewa' ? 'rented' : 'sold')
       ▼
[Invoice Generation]
       │  (client_id = lead.id, property_id = lead.property_id)
       ▼
[Reports & KPI Attribution]          <── IMPLEMENTED (BUG-14)
          (Primary: assigned_to; Fallback: created_by — single attribution)
```

### Flow B: Lead / Visitor $\rightarrow$ Survey Request $\rightarrow$ Survey $\rightarrow$ CRM Activity $\rightarrow$ Lead Timeline
```text
[CRM Lead / Storefront Visitor]
       │
       ├─► Storefront Inbound ──► [survey_requests] (status: 'pending')
       │                                │
       │                                ▼
       └─► CRM Direct Scheduling ─► [surveys]
                                        │  (surveys.lead_id = lead.id) <── IMPLEMENTED (BUG-10)
                                        │  (surveys.property_id = property.id)
                                        ▼
                                  [crm_activities]
                                        │  (activity_type: 'site_visit', notes: survey description)
                                        ▼
                                  [CRM Lead Timeline & Survei Tab]
```

---

## 3. BUG-06 Fix (Dashboard Leads KPI Wrong Source)

- **Root Cause**: `services/dashboard.service.ts` and `app/(dashboard)/dashboard/page.tsx` only computed `todayLeads` (`gte("created_at", today)`), and mapped `totalLeads` and `activeLeads` to `todayLeads || 0`. If no leads arrived today, Dashboard displayed 0 total leads despite 10 leads existing in the database.
- **Fix Applied**:
  - In `services/dashboard.service.ts`, `getStats(role?, userId?)` calculates:
    - `totalLeads`: count of all leads in user scope (Admin = all, Agent = `assigned_to`).
    - `activeLeads`: count of leads with `status IN ('new', 'contacted', 'qualified', 'proposal', 'negotiation')`.
    - `todayLeads`: preserved as a distinct metric for leads arriving today (`created_at >= today`).
    - `dealsWonCount`: count of leads with `status = 'won'`.
    - `newLeadsCount`: count of leads with `status = 'new'`.
    - `scheduledFollowupsCount`: pending follow-ups with `followup_date >= now`.
    - `overdueFollowupsCount`: pending follow-ups with `followup_date < now`.
  - In `app/(dashboard)/dashboard/page.tsx`, passed `(role, userId)` to `dashboardService.getStats` and bound real metrics to state.

---

## 4. BUG-07 Fix (Pipeline Value Fictional Formula Elimination)

- **Root Cause**: `app/(dashboard)/dashboard/page.tsx` hardcoded `pipelineValue: (statsData?.totalSold || 1) * 850_000_000`, causing the dashboard to always display Rp 850 Jt (or multiples) regardless of actual leads.
- **Fix Applied**:
  - Eliminated the formula `(totalSold || 1) * 850_000_000`.
  - Defined `pipelineValue = SUM(active_leads.budget)` where status is in `('new', 'contacted', 'qualified', 'proposal', 'negotiation')`.
  - Live value: **Rp 37.168.102.000**, which matches CRM Kanban board total active budget 1:1.

---

## 5. BUG-09 Fix (Deal Won $\rightarrow$ Property Status Automation)

- **Authoritative Flow**: `verifyCRMDealAction(leadId, verified, reason)` and `updateCRMLeadStatusAction(leadId, newStatus)`.
- **Implementation**:
  - Created reusable helper `syncPropertyStatusOnDealWon(supabase, actor, leadId, leadPropertyId)`.
  - Fallback logic: resolves property from `lead.property_id` or primary `crm_interests`.
  - Target status rule:
    - If `property.listing_type === 'sewa'`, status becomes `'rented'`.
    - Otherwise, status becomes `'sold'`.
  - **Idempotency**: Checked `prop.status !== targetStatus`. Skips redundant updates and prevents duplicate audit logs.
  - **Safety**:
    - Only triggered when `verified === true` or `newStatus === 'won'`.
    - When verification is rejected (`verified === false`), property status is untouched.
    - No automatic status reversals are performed without explicit business rules.
  - **Audit Trail**: Records audit entry with `action: 'property.status_changed'` and `trigger: 'deal.verified'`.

---

## 6. BUG-10 Design & Migration (Lead $\leftrightarrow$ Survey Integration)

- **Design Decision**: Single authoritative foreign key placed on `public.surveys`:
  ```sql
  ALTER TABLE public.surveys
    ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES public.crm_leads (id) ON DELETE SET NULL;
  CREATE INDEX IF NOT EXISTS idx_surveys_lead_id ON public.surveys (lead_id);
  ```
- **Migration Details**: File `supabase/migrations/030_phase10b_survey_lead_relation.sql` applied successfully via linked Supabase Management API.
- **API & Validations**:
  - `surveyCreateSchema` in `lib/validations.ts` accepts `lead_id`.
  - `POST /api/surveys` saves `surveys.lead_id` and automatically logs a `site_visit` activity in `crm_activities`.
  - `PATCH /api/surveys/[id]` logs rescheduling, completion, or cancellation activities in `crm_activities`.
- **UI Integration**:
  - Updated `app/(dashboard)/crm/leads/[id]/page.tsx` with a dedicated **Survei** tab (`surveys.length`).
  - Added survey filter and calendar icons to the Activity Timeline.

---

## 7. BUG-14 Fix (Report Attribution & Double-Counting Elimination)

- **Root Cause**: `services/report.service.ts` in `getAgentPerformance()` added both `p.created_by` and `p.assigned_to` into an `agentIds` set, and credited 100% of property sales volume and revenue to BOTH agents.
- **Fix Applied**:
  - Enforced PLMS canonical single attribution hierarchy:
    ```ts
    const agentId = p.assigned_to || p.created_by;
    ```
  - The assigned agent (`assigned_to`) receives primary credit. If unassigned, credit falls back to `created_by`.
  - Eliminates duplicate property count and duplicate revenue across agents.

---

## 8. Dashboard vs Reports Reconciliation Matrix

Based on live database ground truth:

| Metric | Dashboard (Admin) | CRM Kanban | Reports | Database Ground Truth | Status |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Total Leads** | 10 | 10 | N/A | 10 | ✅ RECONCILED |
| **Active Leads** | 7 | 7 | N/A | 7 | ✅ RECONCILED |
| **Won Deals** | 1 | 1 | N/A | 1 | ✅ RECONCILED |
| **Pipeline Value** | Rp 37.168.102.000 | Rp 37.168.102.000 | N/A | Rp 37.168.102.000 | ✅ RECONCILED |
| **Total Properties** | 23 | N/A | 23 | 23 (16 pub, 7 draft) | ✅ RECONCILED |
| **Published Properties** | 16 | N/A | 16 | 16 | ✅ RECONCILED |
| **Overdue Follow-ups** | 1 | 1 | N/A | 1 | ✅ RECONCILED |
| **Scheduled Follow-ups**| 0 | 0 | N/A | 0 | ✅ RECONCILED |
| **Surveys** | 0 | 0 | N/A | 0 | ✅ RECONCILED |

---

## 9. Existing Orphan Data Safety

- **`survey_requests`**: 2 existing records remain 100% intact with `survey_id = null` and `lead_id = null`. No artificial links or data distortions were introduced.
- **`properties`**: 23 records intact. Empty specifications continue to normalize cleanly (`0 m²`, 0 KT, 0 KM).
- **`invoices`**: 3 records intact with validated foreign keys.

---

## 10. Verification & Test Suite Results

### Automated Test Suite (`scratch/verify_phase10b_runtime.js`):
1. **TEST 1 (Dashboard KPI Reconciliation)**: PASS (10 leads, 7 active, 1 won, Rp 37,17 M pipeline).
2. **TEST 2 (Deal Won Jual $\rightarrow$ Sold)**: PASS (Status updated to `'sold'`).
3. **TEST 3 (Deal Won Sewa $\rightarrow$ Rented)**: PASS (Status updated to `'rented'`).
4. **TEST 4 (Idempotency)**: PASS (Repeated execution skips redundant updates).
5. **TEST 5 (Survey Lead Relation)**: PASS (`surveys.lead_id` successfully stored and queried).
6. **TEST 6 (CRM Timeline Integration)**: PASS (`crm_activities` logged with `activity_type: 'site_visit'`).
7. **TEST 7 (Report Single Attribution)**: PASS (Single credit given to `assigned_to || created_by`).
8. **TEST 8 (Orphan Safety)**: PASS (Counts for survey requests, properties, and invoices preserved).

### Build & Type Verification:
- `npx tsc --noEmit`: **0 errors** (PASS).
- `npm run build`: **Exit 0** (PASS, 67/67 routes compiled successfully).
- **Dashboard Property Catalog Regression**: PASS (12/12 published properties rendered, 0 m² fallback intact, agent profiles resolved).

---

## 11. Security & Permissions Verification

- **RLS**: Policies on `surveys`, `crm_leads`, `crm_activities`, and `properties` remain active and uncompromised.
- **Authorization**: Deal verification remains strictly guarded by Admin/Super Admin check (`canReviewDeal`).
- **Invoices**: Remained restricted to Admin/Super Admin (Phase 10A baseline preserved).

---

## 12. Known Limitations & Recommendations for Future Phases

1. **Reverse Deal Workflow**: If an Admin cancels or un-verifies a deal after it has been won, the property status remains `'sold'` or `'rented'` by design. Automatic reversion to `'published'` is not implemented without explicit business rules regarding deposit refunds or listing re-evaluations.
2. **Phase 10C Preparation**: Ready for follow-up UX improvements (e.g. BUG-12 follow-up priority counts and BUG-13 kanban unassigned lead claiming) in accordance with the project roadmap.
