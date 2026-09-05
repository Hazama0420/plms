# Inland Property Project Rules

> **Document status:** revised in PHASE 0.5 --- Documentation Reconciliation,
> 2026-08-08.
>
> Text marked **CURRENT STATE** describes what the PHASE 0 audit actually
> verified in this repository and in the live database.
>
> Text marked **TARGET STATE** describes intended design. It is **not**
> implemented unless a CURRENT STATE note says so.
>
> Never read a TARGET STATE rule as evidence that a control exists.
>
> File/line references are accurate as of the audit date and may drift.

## 0. Audit Baseline

PHASE 0 audit completed 2026-08-08 on branch
`feat/footer-legal-dan-pembersihan`.

Findings that change how the rest of this document must be read:

-   `crm_followups` and `crm_interests` have **no RLS at all**
-   the CRM has **no complete server-side authorization layer**; the main CRM
    data layer runs in the browser against PostgREST
-   phone masking is **client-side only**
-   every Agent can currently read **every** Lead
-   pipeline transitions are **not validated server-side**
-   the `crm_*` schema **does not exist in this repository**

Details are recorded in the per-topic documents under `docs/crm/`.

## 1. Scope

This document records project-specific engineering conventions
discovered during the PLM CRM audit.

It complements the Next.js agent rules in `AGENTS.md`. It does not
replace them.

## 2. Stack

**CURRENT STATE.** Verified:

-   Next.js 16.2.10
-   Supabase (Postgres + PostgREST + RLS)
-   Next.js App Router
-   `proxy.ts`
-   `lib/api-auth.ts`
-   `lib/permissions.ts`

Do not assume these are the only technologies. Inspect the repository
before making architectural changes.

## 3. Next.js 16

The project is on Next.js 16.2.10.

Before changing Next.js-specific behavior, consult the version-matched
documentation under:

`node_modules/next/dist/docs/`

Follow the existing Next.js agent instruction in `AGENTS.md`.

Do not reintroduce deprecated `middleware.ts` patterns when the project
uses `proxy.ts`.

## 4. Route Groups

**CURRENT STATE.** Verified correct.

The CRM is under:

`app/(dashboard)/crm/`

The `(dashboard)` segment is a route group and does not appear in the
public URL.

Therefore:

`app/(dashboard)/crm/page.tsx`

maps to:

`/crm`

not:

`/dashboard/crm`

`matchesSection` in `lib/permissions.ts` accepts both `/crm` and the
legacy `/dashboard/crm` form.

Any route protection in `proxy.ts` must use the actual URL path.

Every new protected CRM route must be checked against `proxy.ts`.

## 5. Authentication and Authorization

The project defines three protection layers:

1.  `proxy.ts` --- optimistic/request routing protection
2.  `lib/api-auth.ts` and `lib/permissions.ts` --- authoritative
    application authorization
3.  Supabase RLS --- database-level defense in depth

**CURRENT STATE --- layer 2 is largely absent for the CRM.**

`services/crm.service.ts` (930 lines) imports the **browser** Supabase
client on line 2:

    import { supabase } from "@/lib/supabase/client";

That is `createBrowserClient` with the anon key. Roughly 30 CRM
functions --- reads *and* writes --- therefore go browser → PostgREST
directly. There are no CRM server actions.

Only four API routes apply real server-side authorization today:

| Route | Guard |
| --- | --- |
| `app/api/leads/route.ts` (POST) | intentionally public + rate limited |
| `app/api/leads/[id]/follow-up/route.ts` | `requireRole([...])`, **no Lead-ownership check** |
| `app/api/ai/followup/route.ts` | `requireRole([...])` |
| `app/api/admin/logs/route.ts` (DELETE) | `super_admin` |

`proxy.ts` gates by role and path only. It cannot express row-level
ownership.

**TARGET STATE.** Never treat `proxy.ts` as the sole security boundary.
Never rely on frontend hiding. Every CRM API/server action that returns
or mutates protected data must enforce authorization.

Building that missing layer is PHASE 1B.

## 6. Supabase RLS

**CURRENT STATE --- corrected.** The previous revision of this document
listed `003`, `004`, `009` and `010` as the migrations protecting CRM
tables. That listing was incomplete and misleading. Verified matrix:

| Table | SELECT | INSERT | UPDATE | DELETE | Defined in |
| --- | --- | --- | --- | --- | --- |
| `crm_contacts` | `is_internal_staff()` | `is_staff()` | `is_staff()` | `is_staff()` | `003` |
| `crm_activities` | `is_internal_staff()` | `is_staff()` OR lead owner | `user_id = auth.uid() or is_staff()` | `is_staff()` | `004` |
| `crm_leads` | `is_internal_staff()` | `is_internal_staff()` | `is_staff() or assigned_to = auth.uid() or created_by = auth.uid()` | `is_staff() or created_by = auth.uid()` | **`007`** |
| `crm_followups` | **none** | **none** | **none** | **none** | --- |
| `crm_interests` | **none** | **none** | **none** | **none** | --- |
| `admin_audit_log` | `is_super_admin()` | none (by design) | none (by design) | none (by design) | `011` |

`grep -rn "crm_followups\|crm_interests" supabase/migrations/` returns
**zero matches**. Neither table is ever mentioned: no
`enable row level security`, no policy, no `revoke`. With Supabase's
default grants on the `public` schema to `anon` and `authenticated`,
both tables are readable and writable by anyone holding the anon key ---
including logged-out visitors, since that key ships to every browser.

Helper functions live in `003_crm_contacts_rls.sql` and are
`security definer set search_path = public`:

    is_staff()          → role in ('admin','super_admin','superadmin')
    is_internal_staff() → role in ('agent','admin','super_admin','superadmin','commissioner')

`commissioner` appears in RLS but not in the `UserRole` union in
`types/user.types.ts`. See `docs/crm/02-roles-permissions.md` §0.

The only dynamic `enable row level security` loop is in
`007_rls_properties_users_billing.sql` and covers six property child
tables only. It does not touch any CRM table.

**CURRENT STATE --- `scripts/verify-rls.mjs` cannot detect this.** The
script probes exactly one CRM table:

    { name: 'crm_leads', expectAnonZero: true }

`crm_followups`, `crm_interests`, `crm_contacts` and `crm_activities` are
not probed. The tool will report success while two tables are exposed.
Extending it is part of PHASE 1A, and it must be extended **before** it
is used as a verification gate again.

**TARGET STATE.** Any new CRM table containing protected data must have
an intentional RLS policy before it is used in production. Do not create
a table and leave RLS as an afterthought.

## 7. Database Changes

**CURRENT STATE --- steps 1--5 below cannot be completed from this
repository alone.** See §15.

Before changing the database:

1.  Inspect current migrations.
2.  Inspect current table definitions.
3.  Inspect existing RLS policies.
4.  Check foreign keys and indexes.
5.  Check existing data compatibility.
6.  Create a migration.
7.  Test the migration.
8.  Verify RLS.

Do not modify production schema manually when a migration is
appropriate.

Do not delete or rename existing CRM columns merely to match a new
design unless migration impact is understood.

## 8. Existing CRM Routes

**CURRENT STATE.** Verified accurate.

`app/(dashboard)/crm/`

with:

-   main CRM page
-   `leads/`
-   `leads/create`
-   `leads/[id]`
-   `leads/[id]/edit`
-   `followups/`
-   `followups/create`
-   `followups/[id]`
-   `followups/[id]/edit`

Prefer extending these routes over unnecessary route replacement.

## 9. Existing System Logs

**CURRENT STATE --- there are two systems, and the one the admin UI shows
is not an audit log.**

| | `admin_audit_log` | `crm_activities` |
| --- | --- | --- |
| Written by | `lib/audit-log.ts`, service role only | browser, via `crm.service.ts` |
| Actions | 5 values, **none CRM** | free-form business activity |
| Mutable by user | no (no INSERT/UPDATE/DELETE policy) | **yes** --- `user_id = auth.uid()` |
| Deletable | no | yes, `super_admin` via `app/api/admin/logs/route.ts` |
| Shown as "Admin → System Logs" | no | **yes** |

`AuditAction` in `lib/audit-log.ts` is exactly:

    user.role_change | user.status_change | user.delete | logs.delete | settings.ai_toggle

Zero CRM events exist today.

**TARGET STATE.** Do not create a second independent audit system.
Extend `admin_audit_log` for security audit events; keep
`crm_activities` as business activity. Rationale and constraints:
`docs/crm/06-audit-system.md`.

## 10. Existing AI

**CURRENT STATE.** Verified reusable. `services/ai.service.ts`
(`aiService.generateWithFallback`, provider chain Agnes → Groq → Gemini)
and `lib/ai-quota.ts` (`enforceAiQuota`, atomic quota via the
`consume_ai_quota()` RPC from migration `005`) are well-factored.

Adding a CRM AI feature means adding a value to the `AiFeature` union and
an entry to `DEFAULT_LIMITS`. Do not build a second AI architecture.

**TARGET STATE.** AI CRM is PHASE 7 and must not start before
authorization, ownership, RLS, audit and risk foundations are complete.
See `docs/crm/08-ai-crm.md`.

## 11. Language Convention

Existing code comments and project documentation are predominantly
written in Bahasa Indonesia.

The `docs/crm/` set and this file are written in English; keep each
document in the language it already uses rather than mixing.

Follow the existing repository convention for comments and internal
documentation unless a technical term is clearer in English.

## 12. Safe Change Policy

Before changing an existing CRM behavior:

-   inspect it
-   identify dependencies
-   identify data impact
-   identify security impact
-   implement incrementally
-   test

Do not silently replace working functionality.

**CURRENT STATE note.** This rule has a hard consequence for PHASE 1A.
`services/crm.service.ts` updates and deletes Follow-Ups directly from
the browser and depends on `crm_followups` having no RLS. Enabling RLS
without simultaneously providing a server-side write path will break
Follow-Up editing. The two changes must ship together.

## 13. Security Principle

**TARGET STATE.**

`UI restriction < API authorization < RLS`

All three should agree.

If they disagree, the stronger layer must prevent unauthorized access.

**CURRENT STATE.** For the CRM the three do **not** agree, and the middle
layer is mostly missing:

-   phone masking exists only in the UI; the real number is in the
    payload
-   `crm_leads` SELECT allows every Agent to read every Lead
-   `crm_followups` and `crm_interests` have no RLS to fall back on

What actually applies today is `UI restriction < RLS`, with gaps in the
RLS layer itself.

## 14. Testing

CRM changes should test at minimum:

-   Super Admin
-   Admin
-   Agent
-   Viewer/Guest
-   authorized Lead
-   unauthorized Lead
-   authorized Follow-Up
-   unauthorized Follow-Up
-   direct API access
-   direct PostgREST access with the anon key
-   RLS behavior
-   pipeline transitions
-   audit events

Direct PostgREST testing is not optional for this project: it is the
transport the CRM itself uses.

## 15. CRM Schema Baseline

**CURRENT STATE --- the `crm_*` schema is external to this repository.**

`grep -rn "create table.*crm_" supabase/migrations/` returns **zero
matches**. The only `CREATE TABLE` statements in the eleven migrations
are `admin_audit_log`, `ai_usage`, `project_milestones`,
`survey_requests` and `surveys`.

Every `crm_*` table was created manually in the Supabase SQL Editor. The
repository carries their RLS (partially) but never their definition.
Columns, types, NOT NULL constraints, CHECK constraints, defaults,
foreign keys and indexes cannot be verified from the repository --- only
inferred from how the code uses them.

Treat the CRM schema as **live/external** until a verified baseline
migration exists.

Consequences:

-   do not write a CRM migration from an assumed structure
-   do not assume `status` has a CHECK constraint or an enum type
-   do not assume a column is nullable or non-nullable
-   inspect the live database first, then record what is actually there

The `users` table is in the same situation. That is why
`BLOCKED_STATUSES` in `lib/permissions.ts` is a deny-list
(`["pending","suspended"]`) rather than an allow-list: the default value
of `users.status` is not knowable from the repository.

Capturing this baseline is PHASE 0.75 and it precedes every CRM
migration.

# END
