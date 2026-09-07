# CURRENT STATE — INLAND PROPERTY / PLMS

## Last Updated
2026-09-07 — Debug Runtime Menyeluruh: Deal Won authorization boolean fix (`actions/crm-leads.action.ts`), Dashboard leads schema query fix (`contact:crm_contacts(full_name, phone)`), live Supabase audit (0 drift, 66/66 tests passing, build pass).

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
**Status**: ✅ IMPLEMENTED dan FROZEN
- **Directory**: `actions/` exists with 4 CRM action files
- **Security**: `'use server'` directives, session verification, audit logging
- **Files**: 
  - `crm-contacts.action.ts`
  - `crm-followups.action.ts`
  - `crm-interests.action.ts`
  - `crm-leads.action.ts` (491 lines complete)
- **Status**: FROZEN untuk security compliance

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
1. **System Audit & Stability (Phase 10)**: Full forensic audit across database, CRM pipeline, properties, invoices, permissions, and i18n
2. **CRM Automation & Integration**: Lead-to-Survey and Deal-to-Invoice workflows
3. **Data Consistency**: Child table normalization and KPI reconciliation

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

### Implementation Status
- **Phase 10C Deliverables**: ✅ COMPLETED (`PHASE_10C_BI_AUTOMATION_PRODUCTIVITY.md`)
- **Code Modifications**: Completed for Phase 10C (BUG-12, BUG-13, Data Health, CRM Productivity).
- **Database Schema**: Zero destructive changes.

## Security Constraints

### Frozen Systems (100% Protected)
- RLS policies on `surveys`, `crm_leads`, `crm_activities`, and `properties` remain intact.
- Invoices access control preserved from Phase 10A (Admin/Super Admin only).
- Core V2 design system remains intact.

## Next Task

**Current Task**: Phase 11 — Sales & Revenue Operations (IN PROGRESS)

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
**PHASE 11: SALES & REVENUE OPERATIONS (COMPLETED & VERIFIED)**
- Steps 1–7: COMPLETED & VERIFIED

### Completed Phases
- ✅ **Phase 1 - 9.2**: Core CRM, Properties, V2 UI, Mobile Polish, Full-Page Bilingual
- ✅ **Phase 10**: Full System Audit & Forensic Analysis (COMPLETED)
- ✅ **Phase 10A**: Critical Stabilization (COMPLETED)
- ✅ **Phase 10B**: Workflow Integration & Data Reconciliation (COMPLETED)
- ✅ **Phase 10C**: BI, Automation & CRM Productivity (COMPLETED)
- ✅ **Phase 11**: Sales & Revenue Operations (COMPLETED & VERIFIED — Steps 1-7 done)

---

**Source-of-Truth**: Repository source code adalah implementasi kebenaran. 
**Documentation**: Navigation di `PROJECT_MAP.md`, Technical Context di `INLAND_PROJECT_CONTEXT.md`, Design System di `INLAND_DESIGN_SYSTEM.md`, V2 Contract di `INLAND_DESIGN_SYSTEM_V2.md`, Matrix di `PHASE_6_MIGRATION_MATRIX.md`, Status di `PHASE_6_MIGRATION_STATUS.md`.