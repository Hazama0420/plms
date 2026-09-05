# CURRENT STATE — INLAND PROPERTY / PLMS

## Last Updated
2026-09-05 — Phase 11 Step 1 & 2 completed.

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
- ✅ **Pre-Step 5 LIVE DB Verification Audit**: 10/10 checks PASSED on live Supabase database:
  - Invoices schema, partial unique index, commission ledger table, uniqueness constraint, RLS policies, atomic RPC signature & security definer, transaction boundary, remote migration history, data integrity (0 duplicates / 0 orphans).
- ✅ **TypeScript**: 0 errors.

### Work Still In Progress (Phase 11)
- [ ] Step 5 — Commission Ledger UI (admin commission management view)
- [ ] Step 6 — Scheduler / cron integration (CRON_SECRET-protected endpoints)
- [ ] Step 7 — Regression test suite (Vitest)

### Important Decisions (Phase 11)
- Authoritative deal representation: `crm_leads` table (`deal_state`, `deal_verified_at`)
- Invoice idempotency: partial unique index on `invoices(deal_id) WHERE deal_id IS NOT NULL`
- Commission uniqueness: `UNIQUE(lead_id)` on `commission_ledger`
- Atomic closing function owns state transition: `pending_verification → verified`
- No application-level fallback for closing mutations (RPC-only enforced)

### Recently Changed Files (Phase 11)
- `app/api/followups/route.ts` (secured)
- `lib/audit-log.ts` (new audit actions)
- `supabase/migrations/031_phase11_sales_revenue_operations.sql` (applied LIVE)
- `services/revenue-operations.service.ts` (new service, RPC-only path)
- `actions/crm-leads.action.ts` (verifyCRMDealAction integrated with revenue service)

## Phase Status

### Current Phase
**PHASE 11: SALES & REVENUE OPERATIONS (IN PROGRESS)**
- Steps 1–4: COMPLETED & VERIFIED
- Steps 5–7: Pending

### Completed Phases
- ✅ **Phase 1 - 9.2**: Core CRM, Properties, V2 UI, Mobile Polish, Full-Page Bilingual
- ✅ **Phase 10**: Full System Audit & Forensic Analysis (COMPLETED)
- ✅ **Phase 10A**: Critical Stabilization (COMPLETED)
- ✅ **Phase 10B**: Workflow Integration & Data Reconciliation (COMPLETED)
- ✅ **Phase 10C**: BI, Automation & CRM Productivity (COMPLETED)
- 🔄 **Phase 11**: Sales & Revenue Operations (IN PROGRESS — Steps 1-4 done)

---

**Source-of-Truth**: Repository source code adalah implementasi kebenaran. 
**Documentation**: Navigation di `PROJECT_MAP.md`, Technical Context di `INLAND_PROJECT_CONTEXT.md`, Design System di `INLAND_DESIGN_SYSTEM.md`, V2 Contract di `INLAND_DESIGN_SYSTEM_V2.md`, Matrix di `PHASE_6_MIGRATION_MATRIX.md`, Status di `PHASE_6_MIGRATION_STATUS.md`.