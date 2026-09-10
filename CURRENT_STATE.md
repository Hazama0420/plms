# CURRENT STATE — INLAND PROPERTY / PLMS

## Last Updated
2026-09-10 — Phase 12 Step 1F final security review passed. The Step 1G immutable release artifact is prepared and validated locally but not pushed; Migration 034, the application release, and technical write freeze are not deployed or active.

## Project Identity

**Name**: PLMS (Property & Lead Management System)
**Framework**: Next.js 16.2.10 + React 19.2.4 + TypeScript 5
**Database**: Supabase (PostgreSQL with RLS)
**Deployment**: Vercel (configured)
**Build System**: Production-ready (builds successfully)

### Core Technologies
- Frontend: React 19.2.4, Tailwind CSS 4, Framer Motion, shadcn/ui
- Backend: Next.js App Router, Supabase client
- AI: Multiple providers (Groq, Gemini, Agnes AI), Groq SDK, Google GenAI
- State Management: Zustand, TanStack Query
- Forms: React Hook Form, Zod validation
- Notifications: OneSignal SDK v3.5.6

## Current Architecture

### High-Level Structure
- **UI Layer**: React components with App Router routing
- **Server Actions**: Mutations handled through `actions/` directory
- **API Layer**: RESTful Route Handlers in `app/api/`
- **Service Layer**: Business logic consolidated in `services/`
- **Database Layer**: Supabase with migrations and RLS
- **AI Layer**: Centralized AI registry with policy enforcement

### Server Actions Architecture
**Status**: IMPLEMENTED; Phase 12 authorization hardening verified locally against the exact production schema clone
- **Directory**: `actions/` exists with 4 CRM action files
- **Security**: `'use server'` directives, authoritative active-profile roles, fail-closed status checks, audit logging
- **Files**: 
  - `crm-contacts.action.ts`
  - `crm-followups.action.ts`
  - `crm-interests.action.ts`
  - `crm-leads.action.ts` (491 lines complete)
- **Shared guard**: `lib/crm-auth.ts`

### Central AI Architecture
**Status**: ✅ IMPLEMENTED dan FUNCTIONAL
- **Registry**: `lib/ai/registry.ts` (AI_FEATURE_REGISTRY)
- **Policy**: `lib/ai/policy.ts` (authorizeAI function)
- **Settings API**: `app/api/admin/ai/settings/route.ts`
- **AI Features**: 7+ registered features (property.parse, crm.followup, etc.)
- **Access Control**: super_admin only untuk management

## Completed / Stable Systems

### CRM System
- ✅ **Server Actions Layer**: Complete CRM mutation via actions/
- ✅ **Security Hardening**: RLS policies verified (29 passed)
- ✅ **Audit Logging**: Comprehensive audit trail
- ✅ **Follow-up Automation**: Due/Overdue detection + WhatsApp digest
- ✅ **Multi-agent Support**: [UNVERIFIED] - staging needed

### Property Management
- ✅ **Property Wizard**: 7-step CreatePropertyWizard dengan mobile UX
- ✅ **AI Auto-Fill**: Indonesian property terminology parsing
- ✅ **Region Intelligence**: Supabase regions lookup integration
- ✅ **Draft System**: localStorage dengan create/edit separation
- ✅ **Property Listing**: Mobile-first responsive design

### AI Management
- ✅ **Central Registry**: AI_FEATURE_REGISTRY implementation
- ✅ **Policy Enforcement**: authorizeAI 8-step authorization
- ✅ **Quota Management**: Agent (5/day), Admin (unlimited)
- ✅ **AI Control Center**: Super Admin interface (frozen)
- ✅ **Fail-Closed Policy**: Infrastructure error safety

### Dashboard & Navigation
- ✅ **Dashboard Views**: Modularized dashboard components
- ✅ **Header System**: PageHeader dengan branded design
- ✅ **Mobile Navigation**: Professional 3-button layout
- ✅ **Pagination**: URL-based pagination dengan persistence

## Current Major Work

### Active Areas
1. **Phase 12 Immutable Release**: Step 1F passed; Step 1G creates and verifies the reviewed 41-file release commit
2. **Controlled Rollout**: Not started; Migration 034 must precede the matching application deployment
3. **Data Reconciliation**: Review historical won state, Admin-assigned leads, and ownerless contacts without guessing ownership

### Recent Updates (2026-09-05)
- **Phase 10: Full System Audit**:
  - Comprehensive inspection of all 22 database tables, queries, Server Actions, permissions, and UI components.
  - Delivered `PHASE_10_FULL_SYSTEM_AUDIT.md`.
- **Phase 10A: Critical Stabilization (COMPLETED & VERIFIED)**:
  - **BUG-01**: Invoices access restricted strictly to Admin & Super Admin in `lib/permissions.ts`, route print API, and page client guards.
  - **BUG-02**: Fixed CRM contact card 404 by querying Supabase client directly.
  - **BUG-03**: Fixed follow-up API query by selecting `full_name` instead of non-existent `name`.
  - **BUG-04**: Authorized assigned agents (`assigned_to === user.id`) to view client phone and use WhatsApp.
  - **BUG-05**: Enforced `client_id` integrity with `crm_leads(id)` foreign key constraint, preventing corrupted contact ID insertions.
  - **BUG-08**: Authorized assigned agents to edit properties in `EditPropertyPage` and fixed edit URL typo in `properties/page.tsx`.
  - **BUG-11**: Aligned Mobile `BottomNav` with Desktop `ERPSidebar` so invoices tab only shows to Admin & Super Admin.
  - **Verification**: `npx tsc --noEmit` PASS (0 errors), `npm run build` PASS (67/67 routes). Dashboard property catalog confirmed 12/12 intact.
  - Delivered `PHASE_10A_CRITICAL_STABILIZATION.md`.

- **Phase 10B: Workflow Integration & Data Reconciliation (COMPLETED & VERIFIED)**:
  - **BUG-06**: Dashboard Leads KPI now derives from real scoped lead queries (`totalLeads`, `activeLeads`, `todayLeads`, `newLeadsCount`, `dealsWonCount`).
  - **BUG-07**: Fictional `850_000_000` formula completely eliminated. `pipelineValue` reflects real active lead budget sum (`Rp 37.168.102.000`), matching CRM Kanban 1:1.
  - **BUG-09**: Verified Won deals automatically transition linked property status to `'rented'` (for sewa) or `'sold'` (for jual) idempotently with audit log entries.
  - **BUG-10**: Added non-destructive migration `030_phase10b_survey_lead_relation.sql` linking `surveys.lead_id` to `crm_leads(id)`, integrated survey scheduling/updates with `crm_activities` (`site_visit`), and added a dedicated Survei tab in Lead Detail.
  - **BUG-14**: Eliminated double-counting in `reportService.getAgentPerformance` by applying canonical PLMS single sales attribution (`assigned_to || created_by`).
  - **Verification**: `npx tsc --noEmit` PASS (0 errors), `npm run build` PASS (67/67 routes), all 8 runtime tests PASS. Dashboard property catalog regression confirmed 12/12 intact with 0 m² fallback.
  - Delivered `PHASE_10B_WORKFLOW_DATA_RECONCILIATION.md`.

- **Phase 10C: BI, Automation & CRM Productivity (COMPLETED & VERIFIED)**:
  - **BUG-12**: Follow-up cards in Dashboard, CRM Follow-ups, and CRM Leads agenda now deep-link directly to `/crm/leads/[id]?tab=followups` with full customer & property context, plus deterministic priority badges (`Terlambat`, `Hari Ini`, `Terjadwal`).
  - **BUG-13**: Implemented server-side atomic unassigned lead claim (`claimCRMLeadAction`) with race-condition concurrency protection (`WHERE id = :id AND assigned_to IS NULL`). Added "Ambil Lead" CTAs across Kanban, Leads Table, and Lead Detail.
  - **Data Health System**: Built `services/data-health.service.ts` and `components/admin/AdminDataHealth.tsx` to detect incomplete and orphan data across Properties, CRM, Surveys, and Invoices with severity levels (`critical`, `warning`, `info`) and direct remediation deep-links.
  - **CRM Productivity**: Added quick actions bar on Lead Detail (`WA Klien`, `+ Follow-up`, `+ Survei`, `Properti`, `Simulasi`), unlocked contact actions on claim, and unified follow-up agenda navigation.
  - **Automation Governance**: Audited existing cron schedulers (`process-overdue` and `surveys/reminders`). Confirmed idempotent and safe; no duplicate or spam notifications introduced.
  - **Verification**: `npx tsc --noEmit` PASS (0 errors), `npm run build` PASS (67/67 routes), all Phase 10C runtime verification scenarios PASS.
  - Delivered `PHASE_10C_BI_AUTOMATION_PRODUCTIVITY.md`.

## Known Limitations & Remaining Findings
- **Data Health Remediation**: Data Health is detection-only per business rules; automated remediation is left to explicit administrator actions.
- **VERIFIED live, read-only**: 1 historical `won` lead lacks `deal_state='verified'`; Migration 034 preserves it for explicit reconciliation.
- **VERIFIED live, read-only**: 11 orphan CRM contacts have no authoritative owner provenance. They become full-reader-only after Migration 034 until handled explicitly.
- **VERIFIED live, read-only**: 8 of 10 leads are assigned to Admin/Super Admin profiles rather than Agents; the closing RPC rejects them as commission recipients.
- **ROLLOUT**: Migration 034 uses `EXCLUSIVE` locks for financial reconciliation safety. Apply during a controlled write freeze after checking for long-running transactions.
- **ROLLOUT**: Technical write-freeze support is implemented but not deployed or active. It blocks mutation ingress, affected Supabase REST/RPC resources, property media upload, and both mutating schedulers while preserving reads.
- **RESIDUAL**: Suspending an Agent does not proactively downgrade existing published properties; publication and relevant property mutations revalidate active-Agent eligibility.
- **RESIDUAL**: The trusted closing path still depends on the postgres-owned RPC. Any future postgres-owned `SECURITY DEFINER` lead mutation requires security review.
- **QUALITY BASELINE**: 11 suites / 171 tests, TypeScript, production build (67 routes), and `git diff --check` pass. Repository-wide ESLint remains red with pre-existing unrelated legacy/generated debt.
- **COMPLETED — Step 1C.1 ordering**: The blocked 032 draft is preserved unchanged under `supabase/migration-drafts/`; migration tooling now sees local 033 directly after production 031. The corrected broad migration must later receive a version after 033.
- **COMPLETED — Step 1C.2 production containment**: Migration 033 is applied in production. `PUBLIC`, `anon`, and `authenticated` no longer have effective EXECUTE on the deal-closing RPC; `service_role` retains EXECUTE.

### Implementation Status
- **Phase 10C Deliverables**: ✅ COMPLETED (`PHASE_10C_BI_AUTOMATION_PRODUCTIVITY.md`)
- **Phase 12 Step 1F**: COMPLETED; READY FOR IMMUTABLE RELEASE.
- **Database Schema**: Migration 034 is forward-only and unapplied to production.

## Security Constraints

### Frozen Systems (100% Protected)
- RLS policies on `surveys`, `crm_leads`, `crm_activities`, and `properties` remain intact.
- Invoices access control preserved from Phase 10A (Admin/Super Admin only).
- Core V2 design system remains intact.

## Next Task

**Current Task**: Phase 12 Step 1G — Immutable Security Release Commit

### Phase 12 Step 1 State
- **COMPLETED locally**: Read-only live catalog inspection verified migration 031, exact CRM policies/grants, RPC owner/ACL/definition, role spellings, and aggregate integrity state without exposing PII.
- **COMPLETED locally**: Preserved the blocked broad 032 draft under `supabase/migration-drafts/`; its Git object hash remains `e8dc4c70a86d3e47f6dbc64e50da3e235dbd9d75`.
- **COMPLETED locally**: All four CRM action files use authoritative active `public.users` profiles; none trusts `user_metadata.role`.
- **COMPLETED locally**: Viewer has no CRM access; Agent has owned rows plus a sanitized atomic claim queue; Marketing is own/created; Commissioner is full read-only; Admin/Super Admin manage all.
- **VERIFIED live**: Direct create, single, and bulk action transitions to `won` are rejected; ACL-only migration 033 restricts the exact closing RPC signature to `service_role`.
- **COMPLETED locally**: Lead detail now exposes explicit submit/reject/verify actions; generic `won` remains disabled and rejected server-side/database-side.
- **COMPLETED locally**: Migration 034 enforces canonical pipeline/deal state, active-Agent closing attribution, available property, positive financial value, immutable closing identities, reconciliation, audit, and lifecycle-safe idempotency.
- **COMPLETED locally**: Unassigned lead PII is hidden from base tables. Active Agents receive sanitized claim metadata and claim through `claim_crm_lead_atomic()`; submitted/verified leads cannot be claimed.
- **COMPLETED locally**: Property creator/assignment changes are guarded; generic PATCH strips both fields; only Super Admin assignment flow remains; publishing revalidates an active Agent.
- **COMPLETED locally**: Public `/api/leads` returns invariant success content and the company WhatsApp channel, never internal assignment or CRM row state.
- **VERIFIED locally**: Disposable PostgreSQL 17 suite passes RLS, workflow, closing, rollback, property, preflight rejection, and synchronized one-winner claim assertions.
- **VERIFIED locally**: Migration 034 applies and its SQL suite passes against a schema-only clone of the exact production `public` catalog in local Supabase PostgreSQL 17.6.
- **VERIFIED locally**: Real PostgREST requests with an authenticated JWT confirm owned-only base rows, sanitized claim output, atomic claim, and post-claim contact visibility.
- **VERIFIED linked dry-run**: Only `034_phase12_crm_security_hardening.sql` would be pushed. No production apply occurred.
- **APPLIED live**: Migration 033 completed through the normal linked Supabase migration mechanism after a dry-run listed only 033.
- **VERIFIED live, read-only**: Exactly one `public.process_deal_closing_atomic(uuid,uuid,numeric)` overload exists; owner `postgres`, `SECURITY DEFINER=true`, `search_path=public`.
- **VERIFIED live, read-only**: Effective EXECUTE is `PUBLIC=false`, `anon=false`, `authenticated=false`, `service_role=true`.
- **VERIFIED live, read-only**: Migration history contains 031 and 033; migration 032 is absent. No business RPC, cron, application deployment, or business-data mutation occurred.
- **COMPLETED locally — Step 1E.1**: Authorization now uses a strict normalized `status='active'` allowlist across Proxy, Route Handler guards, CRM Server Actions, Agent eligibility, OAuth callback, RLS helpers, invoice policies, and the closing RPC. Missing, NULL, empty, whitespace, pending, suspended, malformed, and unknown statuses fail closed.
- **COMPLETED locally — Step 1E.1**: Invoice RLS is aligned with the application boundary: active Admin/Super Admin only. Migration 034 removes unknown invoice policies before installing the exact four-policy set.
- **COMPLETED locally — Step 1E.1**: Migration 034 sets transaction-local `lock_timeout='10s'` and `statement_timeout='5min'` before acquiring table locks.
- **COMPLETED locally — Step 1E.1**: Technical write freeze is centralized in `lib/write-freeze.ts`, enforced at Proxy ingress and all mutable Supabase client factories, and covers CRM, properties/children/media, invoices/items, commissions, surveys/requests, closing/claim RPCs, and mutating schedulers.
- **VERIFIED locally — Step 1E.1**: True pre-031 bootstrap sequence applies 031→033→034 with 032 absent; adversarial invoice policy containment, 16 non-active/missing-profile identities, closing role matrix, reconciliation rollback, 10.1-second lock timeout, and synchronized one-winner claim concurrency all pass on PostgreSQL 17.
- **VERIFIED locally — Step 1E.1**: Corrected Migration 034 and SQL assertions pass against the exact schema-only production `public` clone on local Supabase PostgreSQL 17.6.
- **VERIFIED locally — Step 1E.1**: Authenticated PostgREST JWT requests pass non-active/missing-profile RLS, invoice role boundary, closing RPC ACL denial, active-Agent atomic claim, and post-claim contact visibility.
- **VERIFIED locally — Step 1E.1**: 11 suites / 171 tests, `npx tsc --noEmit`, `git diff --check`, and the production build pass (67 routes).
- **VERIFIED live, read-only — 2026-09-10**: Migration history remains 031/033 only; exact closing RPC remains postgres-owned `SECURITY DEFINER`, `search_path=public`, with effective EXECUTE `PUBLIC=false`, `anon=false`, `authenticated=false`, `service_role=true`.
- **VERIFIED live, read-only — 2026-09-10**: Profiles are 7 active / 1 suspended; there are no transactions older than five minutes. Data aggregates remain: won-without-verified=1, verified-without-won/invoice/commission=0, assigned-without-active-Agent=8, published-without-assignee=5, published-without-active-Agent=13.
- **COMPLETED — Step 1F**: Final security review returned READY FOR IMMUTABLE RELEASE with an exact 41-file allowlist; `services/crm.service.ts` is excluded as line-ending-only.
- **VERIFIED — Step 1G pre-commit**: 11 suites / 171 tests, TypeScript, production build (67 routes), staged diff integrity, and linked migration history pass. Only Migration 034 is pending.

### Phase 12 Decisions
- Normalize legacy `superadmin` to canonical `super_admin`; include `commissioner` in the database role constraint.
- Keep unassigned lead rows/PII out of base-table access; expose only sanitized claim metadata and an atomic active-Agent claim RPC.
- Do not assign existing orphan contacts speculatively; persist `created_by` for new CRM contacts.
- Preserve and report historical `won` data instead of silently rewriting it.
- Protect closing state and invoice identity with database triggers; keep closing in one PostgreSQL transaction.
- Deploy migration-first because the matching application uses the new claim RPC; follow immediately with the application release.
- Treat only normalized `active` as authorized; never maintain a deny-list of known inactive status values.
- Preserve reads during the controlled write freeze and reject affected writes with explicit no-store HTTP 503 responses.

### Phase 12 Changed Files
- `supabase/migration-drafts/032_phase12_p0_crm_security_containment.sql`
- `supabase/migrations/033_phase12_rpc_acl_containment.sql`
- `supabase/migrations/034_phase12_crm_security_hardening.sql`
- `lib/crm-auth.ts`
- `lib/permissions.ts`, `lib/api-auth.ts`, `lib/write-freeze.ts`, `proxy.ts`
- `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/admin.ts`
- `app/auth/callback/page.tsx`
- `actions/crm-leads.action.ts`, `actions/crm-contacts.action.ts`
- `actions/crm-followups.action.ts`, `actions/crm-interests.action.ts`
- `services/crm.service.ts`, `services/revenue-operations.service.ts`, `app/api/leads/route.ts`
- `app/api/properties/route.ts`, `app/api/properties/[id]/route.ts`, `app/api/properties/[id]/assign/route.ts`
- `app/(dashboard)/crm/leads/[id]/page.tsx`, `components/crm/CrmKanbanBoard.tsx`
- `scripts/verify-phase12-security.sql`
- `scripts/verify-phase12-rpc-acl-containment.sql`
- `scripts/test-phase12-disposable.ps1`
- `supabase/tests/phase12_bootstrap.sql`, `supabase/tests/phase12_preflight_fixture.sql`, `supabase/tests/phase12_security_test.sql`
- `tests/api-auth.test.ts`, `tests/crm-auth.test.ts`, `tests/crm-security-contract.test.ts`, `tests/write-freeze.test.ts`
- `tests/deal-verification.test.ts`, `tests/permissions.test.ts`, `tests/revenue-operations.test.ts`, `tests/commissions-action.test.ts`

### Next Recommended Step
Proceed to Phase 12 Step 1H controlled production rollout only after the immutable Step 1G commit is explicitly approved for push. Do not deploy or apply Migration 034 as part of release preparation.

### Completed Work (Phase 11)

### Completed Work (Phase 11)
- ✅ **Step 1 — Secure /api/followups**: `requireRole` guard, role-scoped queries (agents see only their follow-ups), phone number masking.
- ✅ **Step 2 — Migration 031**: Applied to live Supabase DB (verified PASS).
  - `invoices.deal_id` + `invoice_type` columns added.
  - `commission_ledger` table created with RLS policies.
  - `process_deal_closing_atomic()` PostgreSQL RPC deployed and verified.
  - Partial unique index `uq_invoices_closing_deal(deal_id)` active.
  - Unique constraint `uq_commission_ledger_lead(lead_id)` active.
- ✅ **Step 3 — Revenue Operations Service**: `services/revenue-operations.service.ts` created.
  - RPC is the ONLY mutation path (no non-atomic fallback, Guardrail 2 enforced).
  - `processDealClosing()`, `getCommissionLedgers()`, `updateCommissionStatus()` implemented.
- ✅ **Step 4 — verifyCRMDealAction Integration**: Atomic closing RPC now owns the entire closing (deal_state → verified, status → won, property update, invoice, commission) in a single DB transaction (Guardrail 3 enforced).
  - `syncPropertyStatusOnDealWon` call removed from verification path (handled by RPC).
  - Audit recorded AFTER successful atomic close only.
- ✅ **Step 5 — Commission Ledger UI**: `components/invoices/CommissionLedgerTable.tsx` and `actions/commissions.action.ts` created; integrated into `app/(dashboard)/invoices/page.tsx` via Tabs (Faktur & Tagihan vs Buku Komisi); ID & EN translations added; verified build & typecheck PASS (0 errors).
- ✅ **Pre-Step 5 LIVE DB Verification Audit**: 10/10 checks PASSED on live Supabase database:
  - Invoices schema, partial unique index, commission ledger table, uniqueness constraint, RLS policies, atomic RPC signature & security definer, transaction boundary, remote migration history, data integrity (0 duplicates / 0 orphans).
- ✅ **Step 6 — External Scheduler / Cron Integration**: Created `.github/workflows/cron-schedulers.yml` to trigger `/api/followups/process-overdue` (POST) and `/api/surveys/reminders` (GET) every 15 minutes (`*/15 * * * *`) via GitHub Actions.
  - Fail-fast curl with bearer authentication: `Authorization: Bearer ${{ secrets.CRON_SECRET }}` (no logging of credentials).
  - Dual-layer authentication support: optional `x-vercel-protection-bypass: ${{ secrets.VERCEL_AUTOMATION_BYPASS_SECRET }}` for testing against protected Vercel Preview deployments without disabling Deployment Protection.
  - Configurable production base URL via `${{ secrets.APP_BASE_URL || vars.APP_BASE_URL }}` (concept: `https://domain-production-app`).
  - Minimum GitHub Actions runner permissions: `contents: read`.
  - Concurrency group `cron-schedulers` with `cancel-in-progress: false` to prevent duplicate or overlapping executions.
  - Failure isolation: separate steps for overdue follow-up sweep & survey reminder dispatch.
- ✅ **Step 7 — Automated Regression Test Suite (Vitest)**: Added test runner and unit test suite covering critical Phase 11 safety nets without changing production business logic.
  - Setup: Vitest 3.2.7 with v8 coverage provider (`vitest.config.ts`, `npm run test:run`, `npm run test:coverage`).
  - Permissions & Role Guards: `tests/permissions.test.ts` (11 tests — viewer CRM rejection, agent CRM scope, commissioner read-only, admin invoices/CRM, role hierarchy).
  - Phone Masking: `tests/phone-masker.test.ts` (9 tests — short numbers, standard ID format, whitespace, role-based phone visibility for admin/owner vs unauthorized).
  - Revenue Operations & Deal Closing: `tests/revenue-operations.test.ts` (8 tests — atomic RPC call, duplicate closing protection, error propagation, missing migration 031 detection, admin-only status updates).
  - Cron Authentication & Timing-Safe Security: `tests/cron-auth.test.ts` (6 tests — missing secret 503, invalid token 401, timing-safe buffer comparison, Vercel bypass distinction).
  - Follow-up & Survey Idempotency: `tests/idempotency.test.ts` (2 tests — daily digest audit log locking, survey mark-before-send prevention of double dispatch).
  - Commission Server Actions: `tests/commissions-action.test.ts` (7 tests — unauthenticated rejection, agent query scoping, admin mutation actor forwarding, commissioner mutation rejection).
  - Test Results: 43/43 tests PASS, 81% overall statements coverage on target core modules, 0 TypeScript errors, build PASS.
- ✅ **TypeScript**: 0 errors.

### Work Still In Progress (Phase 11)
- None (Phase 11 Steps 1–7 fully completed and verified).

### Important Decisions (Phase 11)
- Authoritative deal representation: `crm_leads` table (`deal_state`, `deal_verified_at`)
- Invoice idempotency: partial unique index on `invoices(deal_id) WHERE deal_id IS NOT NULL`
- Commission uniqueness: `UNIQUE(lead_id)` on `commission_ledger`
- Atomic closing function owns state transition: `pending_verification → verified`
- No application-level fallback for closing mutations (RPC-only enforced)
- Commission Ledger UI accessible via Invoices module Tabs (Admin & Super Admin full manage, Commissioner read-only)
- External cron runner configured via GitHub Actions (`cron-schedulers.yml`) replacing Vercel Hobby-restricted cron schedule.
- Dual-layer authentication architecture for cron runner: Vercel Edge protection bypass (`x-vercel-protection-bypass`) decoupled from application timing-safe Bearer authentication (`CRON_SECRET`).
- Automated Regression Testing framework: Vitest selected for native TypeScript resolution without impacting production bundling or Next.js Turbopack build.
- Required GitHub Repository Secrets/Variables:
  - `CRON_SECRET` (Secret, Mandatory): Shared secret matched against production server `CRON_SECRET` for timing-safe bearer authentication.
  - `APP_BASE_URL` (Secret/Variable, Mandatory): Canonical target origin (concept: `https://domain-production-app` or Preview URL, without trailing slash).
  - `VERCEL_AUTOMATION_BYPASS_SECRET` (Secret, Optional): Token from Vercel Project Settings > Deployment Protection > Protection Bypass for Automation, used only when testing/automating against protected Vercel Preview deployments. Production does not require this secret.

### Recently Changed Files (Phase 11)
- `app/api/followups/route.ts` (secured)
- `lib/audit-log.ts` (new audit actions)
- `supabase/migrations/031_phase11_sales_revenue_operations.sql` (applied LIVE)
- `services/revenue-operations.service.ts` (new service, RPC-only path)
- `actions/crm-leads.action.ts` (verifyCRMDealAction integrated with revenue service)
- `actions/commissions.action.ts` (new server actions for commission ledger)
- `components/invoices/CommissionLedgerTable.tsx` (new commission management view)
- `app/(dashboard)/invoices/page.tsx` (tabs integration)
- `lib/i18n/id.ts` & `lib/i18n/en.ts` (commission translations)
- `.github/workflows/cron-schedulers.yml` (external cron scheduler workflow)
- `vitest.config.ts` (Vitest test runner configuration)
- `tests/permissions.test.ts` (permission and route access tests)
- `tests/phone-masker.test.ts` (phone masking utility tests)
- `tests/revenue-operations.test.ts` (revenue operations & RPC closing tests)
- `tests/cron-auth.test.ts` (timing-safe cron authentication tests)
- `lib/permissions.ts` (`canReviewDeal` authoritative helper with `normalizeRole`)
- `actions/crm-leads.action.ts` (normalized deal review role authorization, won transition boolean operator fix and deal closing trigger)
- `services/revenue-operations.service.ts` (normalized commission status update role authorization)
- `app/(dashboard)/dashboard/page.tsx` (fixed crm_leads query to embed contact:crm_contacts for name and phone)
- `tests/deal-verification.test.ts` (23 regression tests for deal verification, role normalization, and leads schema contract)
- `CURRENT_STATE.md` (updated project handover document)

## Phase Status

### Current Phase
**PHASE 12 STEP 1G: IMMUTABLE SECURITY RELEASE PREPARATION; NOT PUSHED OR DEPLOYED**

### Completed Phases
- ✅ **Phase 1 - 9.2**: Core CRM, Properties, V2 UI, Mobile Polish, Full-Page Bilingual
- ✅ **Phase 10**: Full System Audit & Forensic Analysis (COMPLETED)
- ✅ **Phase 10A**: Critical Stabilization (COMPLETED)
- ✅ **Phase 10B**: Workflow Integration & Data Reconciliation (COMPLETED)
- ✅ **Phase 10C**: BI, Automation & CRM Productivity (COMPLETED)
- ✅ **Phase 11**: Sales & Revenue Operations (COMPLETED & VERIFIED — Steps 1-7 done)
- **Phase 12 Step 1A-1C.2**: Production RPC ACL containment complete; blocked Migration 032 quarantined
- **Phase 12 Step 1D**: Corrective Migration 034 and matching application changes completed and verified locally; independent security review is next
- **Phase 12 Step 1E.1**: Fail-closed status, finite lock timeouts, invoice RLS containment, technical write freeze, and expanded runtime/database evidence completed locally

---

**Source-of-Truth**: Repository source code adalah implementasi kebenaran. 
**Documentation**: Navigation di `PROJECT_MAP.md`, Technical Context di `INLAND_PROJECT_CONTEXT.md`, Design System di `INLAND_DESIGN_SYSTEM.md`, V2 Contract di `INLAND_DESIGN_SYSTEM_V2.md`, Matrix di `PHASE_6_MIGRATION_MATRIX.md`, Status di `PHASE_6_MIGRATION_STATUS.md`.
