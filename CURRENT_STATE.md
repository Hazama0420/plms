# CURRENT STATE

Last updated:
2026-08-14

Updated by:
OpenCode

Current phase:
PHASE 4B — Follow-Up Completion & Next Action

## Current Task

Phase 4B completion lifecycle finalization and lightweight Next Action prompt.

## Completed

- Fixed Property type `any`
- Fixed pipeline stage order
- Added `commissioner` to `UserRole`
- Fixed stale cities/districts queries
- Removed mock agent fallback
- Fixed AI env non-null assertions
- Removed `@ts-ignore` from NotificationsTab
- Centralized pipeline transition rules
- Updated Our Teams dashboard
- VERIFIED: Kanban uses a server action with basic pipeline transition validation.
- VERIFIED: Follow-Up migration allows persisted `overdue`, but no processor exists.
- VERIFIED: Existing `admin_audit_log` remains append-only through service role.
- VERIFIED LIVE: CRM tables and columns exist: `crm_leads`, `crm_contacts`, `crm_interests`, `crm_followups`, `crm_activities`, `admin_audit_log`.
- VERIFIED LIVE: `crm_leads` includes `created_by`; `crm_followups` includes `created_by` and `completed_at`.
- VERIFIED LIVE: Production Lead statuses are `new`, `contacted`, `lost`, `won`.
- VERIFIED LIVE: Production Follow-Up statuses are `pending`, `completed`.
- VERIFIED LIVE: `admin_audit_log` contains no CRM actions; observed actions are administrative user actions only.
- VERIFIED LIVE: Anonymous CRM SELECT/INSERT/UPDATE/DELETE rights are denied for all five CRM tables.
- COMPLETED: Legacy pipeline service method now delegates to the governed server route.
- COMPLETED: Structured Lost reason validation and additive Deal verification state implemented.
- COMPLETED: Pipeline and governed Deal/Follow-Up mutations use `admin_audit_log`.
- COMPLETED: Follow-Up Lead authorization, Agent assignee restriction, server update/delete, and completion attribution implemented.
- VERIFIED: No TypeScript errors reported for affected Phase 3 files.
- VERIFIED: Targeted ESLint passed for affected action, route, audit, pipeline, and type files.
- VERIFIED: `crm.service.ts.updateLead()` no longer writes pipeline/governance fields directly; status delegates to the governed route.
- COMPLETED: Migration `025_phase3_pipeline_governance.sql` applied live via `supabase db push --linked`.
- VERIFIED LIVE: New Phase 3 fields are readable; existing Lead/Follow-Up statuses remain unchanged.
- VERIFIED LIVE: `deal_state` defaults to `none` for legacy Leads; no historical Lost/Deal data fabricated.
- VERIFIED LIVE: Anonymous access remains denied on affected CRM and audit tables.
- VERIFIED LIVE: Anonymous audit INSERT/UPDATE/DELETE probes denied with `42501`.
- COMPLETED: Follow-Up list mutations now use the authorized server route.
- COMPLETED: Completion reset clears `completed_at` and `completed_by` when returning to pending.
- COMPLETED: Protected overdue processor added at `/api/followups/process-overdue`.
- COMPLETED: Overdue processor updates only pending past-due rows, audits `followup.overdue`, and sends assignee notification.
- VERIFIED: Manual mutation route rejects direct `overdue` status changes.
- VERIFIED: No new migration required; live `overdue` status and `completed_by` already exist.
- VERIFIED RUNTIME: Processor without Authorization header returns HTTP 401.
- VERIFIED RUNTIME: Processor with configured `CRON_SECRET` returns HTTP 200.
- VERIFIED RUNTIME: Controlled pending past-due fixture transitions to `overdue`.
- VERIFIED RUNTIME: Immediate repeat processes zero rows; fixture remains `overdue`.
- VERIFIED RUNTIME: Future pending, completed, cancelled, and already overdue rows are not reprocessed.
- VERIFIED RUNTIME: Exactly one `followup.overdue` audit row created; audit preserved.
- VERIFIED RUNTIME: One in-app `Follow-Up overdue` notification row created for the assigned Agent.
- VERIFIED RUNTIME: Test fixture and test notification cleaned; audit row preserved.
- COMPLETED: Phase 4B completion lifecycle uses the governed server mutation with server-generated `completed_at` and authenticated `completed_by`.
- COMPLETED: Returning to `pending` clears `completed_at` and `completed_by`; cancelling clears completion fields and does not populate them.
- COMPLETED: Completion metadata is transition-aware; repeated `completed` updates do not replace attribution or create duplicate completion audit events.
- COMPLETED: Active Lead completion returns a server-derived Next Action prompt decision; `lost` and `won` Leads do not receive the prompt.
- COMPLETED: Lightweight prompt reuses the existing Follow-Up creation page and authorized/audited creation route; no new task/table was added.
- COMPLETED: Agent edit mutation no longer sends `assigned_to`, avoiding the existing server-side assignment restriction.

## In Progress

- COMPLETED: Targeted current-state audit for Follow-Up governance.
- COMPLETED: Phase 4 implementation plan prepared.
- COMPLETED: Phase 4A source implementation.
- COMPLETED: Controlled runtime processor and idempotency verification.
- COMPLETED: Phase 4B source completion lifecycle and Next Action prompt.
- BLOCKED: Authenticated Phase 4B runtime lifecycle matrix requires test account credentials.

## Blocked

- BLOCKED: Supabase CLI schema dump requires Docker, unavailable in the environment.
- UNVERIFIED: Exact live `pg_policies`, table grants, constraints, indexes, and foreign keys; PostgREST cannot expose catalog metadata.
- BLOCKED: End-to-end authenticated Agent/Admin tests require test credentials, including Phase 4B complete/reset/cancel attribution checks.
- KNOWN PRE-EXISTING ERROR: Full TypeScript/build reports only unrelated errors in `app/(dashboard)/admin/users/page.tsx` (`commissioner` missing from two role maps) and `components/settings/NotificationsTab.tsx` (conflicting OneSignal global declarations). Neither file was changed for Phase 4B or this verification.
- KNOWN PRE-EXISTING LINT DEBT: Follow-Up UI/service files contain existing `any`, effect, unused-variable, and escaped-text findings outside the Phase 4B changed lines. Phase 4B changed lines introduce no new ESLint finding; the changed server route passes targeted ESLint.
- BLOCKED: External production scheduler is not configured. Vercel project `inland/plms` reports no cron jobs; no repository `vercel.json` or GitHub Actions workflow exists. External scheduler providers cannot be verified from available project access.
- BLOCKED: Scheduler-triggered runtime test was not run because no scheduler exists. The endpoint runtime itself was already verified separately with `CRON_SECRET`.

## Last Findings

VERIFIED:
- VERIFIED: Phase 4B source lifecycle sets completion attribution only on a real transition to `completed`, clears it for `pending`/`cancelled`, and derives the Next Action prompt from server-read Lead status.
- VERIFIED: Next Action reuses `/crm/followups/create` with Lead preselection and the existing server-side create/audit flow.
- VERIFIED: `lost`/`won` Lead status suppresses the Next Action prompt.
- VERIFIED: Phase 4B verification adds no TypeScript error: `tsc --noEmit` reports only the documented unrelated errors in `admin/users` and `NotificationsTab`.
- VERIFIED: Phase 4B server route passes targeted ESLint and Phase 4B files pass targeted `git diff --check`.
- VERIFIED: No changes were made to `app/(dashboard)/admin/users/page.tsx` or `components/settings/NotificationsTab.tsx` during Phase 4B verification.
- VERIFIED: Scheduler status checked on 2026-08-14. The linked production Vercel project is reachable and its cron list is empty.
- VERIFIED: No repository scheduler configuration exists (`vercel.json` and `.github/workflows` are absent).
- Source Phase 3 governance is implemented; authenticated E2E remains untested.
- Follow-Up create route validates Lead authorization, defaults Agent assignee to actor, and audits `followup.created`.
- Follow-Up server mutation route supports update, complete, cancel, delete, and audits lifecycle mutations.
- `completed_at` and `completed_by` are persisted by the server completion path.
- Follow-Up status `overdue` is schema-supported after migration 025.
- Existing Follow-Up UI computes overdue from `pending` plus past `followup_date`; it does not persist overdue.
- Existing notification catalog supports `followup.created` only for Follow-Up events.
- Existing scheduler pattern is an external caller with `CRON_SECRET` at `/api/surveys/reminders`.
- Existing Follow-Up list page still performs direct browser update/delete writes, unlike the detail page; this is a Phase 4 lifecycle consistency gap.
- VERIFIED: Follow-Up list direct mutation gap is closed; list now delegates to `crmService` server routes.
- VERIFIED: Overdue processor query is idempotent by restricting updates to `status = pending`.
- VERIFIED: Runtime processor performs expected transition and negative-case filtering.
- VERIFIED: In-app notification persistence is verified for the assigned Agent.

UNVERIFIED:
- Exact policy definitions and database grants; authenticated ownership probes are skipped without test accounts.
- Authenticated cross-Agent ownership and direct PostgREST behavior remain unverified.
- Authenticated Agent/Admin/Super Admin E2E tests unavailable; no test credentials configured.
- Completion/reset/cancel runtime E2E unavailable without authenticated test credentials.
- Runtime verification that the prompt is shown for active Leads and suppressed for `lost`/`won` remains unavailable without authenticated test credentials.
- External OneSignal push delivery remains unverified; only in-app notification persistence is verified.
- Whether an existing live field can represent Next Action; no source reference found.
- Desired overdue/escalation threshold and external scheduler deployment/observability.

Potentially unverified references:
- `activity_logs`
- `account_deletion_requests`
- `users.company`
- `users.phone`
- `users.preferences`
- `notifications` RLS
- `crm_activities.updated_at`

These are NOT confirmed missing.
They require live schema verification.

## Important Decisions

- Do not repeat completed phases without evidence.
- Do not create migrations from grep results alone.
- Verify live schema before schema changes.
- Do not treat TARGET STATE as implementation.
- Keep legacy Lead status values; store Deal workflow in additive `deal_state` fields.
- Keep one `crm_followups` dataset; do not create a parallel task system.
- Reuse the existing `CRON_SECRET` external-scheduler pattern instead of inventing a worker.
- Do not implement Next Action, escalation, Risk Engine, or UI redesign in Phase 4A.

## Files Recently Changed

- `hooks/use-properties.ts`
- `types/crm.types.ts`
- `types/user.types.ts`
- `lib/permissions.ts`
- `services/report.service.ts`
- `services/crm.service.ts`
- `services/ai.service.ts`
- `components/settings/NotificationsTab.tsx`
- `actions/crm-contacts.action.ts`
- `actions/crm-leads.action.ts`
- `lib/crm-pipeline.ts`
- `app/api/leads/[id]/status/route.ts`
- `app/api/followups/[id]/route.ts`
- `services/crm.service.ts`
- `app/(dashboard)/crm/followups/page.tsx`
- `app/(dashboard)/crm/followups/[id]/page.tsx`
- `app/(dashboard)/crm/followups/[id]/edit/page.tsx`
- `app/(dashboard)/crm/followups/create/page.tsx`

## Next Recommended Step

Run authenticated Phase 4B runtime checks for pending/overdue → completed, completed → pending, pending/completed → cancelled, repeated completed, and active versus `lost`/`won` prompt behavior. Keep the documented unrelated TypeScript errors unchanged unless separately requested.
Separately fix the unrelated TypeScript/build blockers only in a dedicated task. Keep scheduler, Risk Engine, Escalation, UI redesign, and AI CRM out of Phase 4B.
