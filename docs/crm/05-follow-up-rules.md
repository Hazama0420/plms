# PLM CRM --- Follow-Up Governance

> **Document status:** revised in PHASE 0.5 --- Documentation Reconciliation,
> 2026-08-08.
>
> **CURRENT STATE** = verified by the PHASE 0 audit.
> **TARGET STATE** = intended design, not implemented unless stated.
>
> A TARGET STATE rule is never evidence that a control exists.

## 0. CURRENT STATE --- `crm_followups` Has No RLS

**This is the highest-severity finding of the PHASE 0 audit.**

`grep -rn "crm_followups" supabase/migrations/` returns **zero matches**.
The table is never mentioned in any migration: no
`enable row level security`, no policy, no `revoke`.

With Supabase's default grants on the `public` schema to `anon` and
`authenticated`, `crm_followups` is readable, writable and deletable by
anyone holding the anon key. That key is shipped to every browser, so the
exposure includes visitors who are not logged in.

`crm_interests` is in the same position --- see `docs/crm/04-pipeline-rules.md`
§4.

`scripts/verify-rls.mjs` cannot detect this. It probes exactly one CRM
table (`{ name: 'crm_leads', expectAnonZero: true }`) and will report
success while both tables are open.

**Three different write paths exist for one table:**

| Operation | Path | Server authorization | RLS |
| --- | --- | --- | --- |
| Create | `crm.service.ts` → `POST /api/leads/[id]/follow-up` | `requireRole(["super_admin","admin","agent"])`, **no Lead-ownership check** | none |
| Read | `crm.service.ts` `getFollowups`, browser → PostgREST | none | none |
| Update | `crm.service.ts` `updateFollowup`, browser → PostgREST | **none** | none |
| Delete | `crm.service.ts` `deleteFollowup`, browser → PostgREST | **none** | none |

**PHASE 1A constraint.** Update and delete depend on the absence of RLS.
Enabling RLS alone will break Follow-Up editing in the UI. The policy and
the server-side write path must ship together.

**Status values.** `types/crm.types.ts` defines
`pending | completed | cancelled`. `OVERDUE` and `ESCALATED` do not
exist. There is no cron job, scheduled function or background worker
anywhere in the repository.

## 1. Current PLM Structure

**CURRENT STATE --- verified.**

PLM has:

-   Follow-Up information inside Lead-related views
-   a dedicated `/crm/followups` area
    (`page`, `create`, `[id]`, `[id]/edit`)
-   Follow-Up creation/editing

The goal is to keep one underlying Follow-Up dataset while simplifying
presentation.

## 2. Follow-Up Purpose

A Follow-Up is a planned action against a Lead.

It should answer:

-   who is responsible?
-   what should happen?
-   when should it happen?
-   what is the result?

## 3. Conceptual Fields

**TARGET STATE.** Use existing fields where possible.

Conceptually:

-   Follow-Up ID
-   Lead ID
-   responsible Agent
-   created by
-   scheduled date/time
-   note/plan
-   status
-   completed time
-   completed by

**CURRENT STATE.** The `crm_followups` DDL is not in the repository, so
the actual column set is unverified --- see `docs/project-rules.md` §15.
From code usage, `lead_id`, `assigned_to`, `status`, scheduling and note
fields are in use. `completed_by` and `completed_at` are not referenced
by any code path found in the audit, so completion is not being
attributed. Confirm in PHASE 0.75.

## 4. Status

**TARGET STATE.**

-   PENDING
-   COMPLETED
-   OVERDUE
-   CANCELLED

If the existing schema uses different values, map to it rather than
unnecessarily replacing it.

**CURRENT STATE.** The type union is
`pending | completed | cancelled`. `OVERDUE` is not a naming difference
to be mapped --- it does not exist and must be introduced, together with
whatever produces it (§8). Delivery is PHASE 4.

## 5. Agent Creation

**TARGET STATE.**

Agent can create a Follow-Up only for an authorized Lead.

The responsible Agent should default to the current Agent.

Agent cannot change the responsible Agent.

**PHASE 3 IMPLEMENTATION.**

`app/api/leads/[id]/follow-up/route.ts` does apply the default:

    assigned_to: assigned_to || userId
    status: "pending"

But:

-   the route does **not** verify that `[id]` is a Lead the caller is
    authorized to work. It checks role only, so an Agent can create a
    Follow-Up against any Lead ID.
-   the route **accepts `assigned_to` from the request body**, so an
    Agent can set another Agent as responsible.

`notifyEvent({event:"followup.created"})` is skipped when the assignee
equals the actor.

The route now verifies Lead authorization and forces Agent assignments to the
authenticated Agent. Admin/Super Admin may select the responsible Agent.
Note that a past bug in this route ---
raw role matching that omitted the legacy `superadmin` spelling, causing
403s --- is recorded in its comments; preserve that handling. A second
past bug stored `assigned_to: null`, which made Follow-Ups appear on
nobody's list.

## 6. Admin Creation

**TARGET STATE.** Admin can create a Follow-Up for an authorized Lead and
select the responsible Agent.

**CURRENT STATE.** Works, but "authorized Lead" is not checked for anyone
--- see §5.

## 7. Super Admin

**TARGET STATE.** Super Admin has full authorized Follow-Up management.

**CURRENT STATE.** Works. No audit trail accompanies it.

## 8. Overdue

**TARGET STATE --- not implemented.**

When the scheduled time passes and the Follow-Up is not completed:

`PENDING → OVERDUE`

Prefer server/background processing where available.

Do not rely solely on the browser being open.

**PHASE 4A IMPLEMENTATION.** `OVERDUE` is persisted by a protected,
idempotent scheduled endpoint. It changes only pending rows whose scheduled
time has passed. Manual Follow-Up mutation routes reject attempts to set
`overdue` directly. The endpoint follows the existing external scheduler and
`CRON_SECRET` pattern used by survey reminders.

**HISTORICAL AUDIT FINDING.** There was no `OVERDUE` status and no scheduled
processing of any kind --- no cron, no scheduled function, no worker. Any
"overdue" indication currently visible in the UI is computed at render
time from the scheduled date; it is not persisted, so nothing downstream
can depend on it.

This matters for the Risk Engine: "repeated overdue Follow-Ups"
(`docs/crm/07-risk-engine.md` §4) needs a persisted state, not a
render-time comparison. Delivery is PHASE 4.

## 9. Completion

**TARGET STATE.** Completion should record:

-   completion timestamp
-   actor
-   result/note where supported

**PHASE 3 IMPLEMENTATION.** Completion uses an authorized server route,
persists `completed_at` and `completed_by`, and records an audit event. The
`completed_by` column is included in the additive Phase 3 migration.

**HISTORICAL AUDIT FINDING.** Completion was a status write from the browser through
`updateFollowup`, with no server authorization and no RLS. Actor
attribution (`completed_by`) is not being recorded. Delivery is PHASE 4,
audited under PHASE 2 (`FOLLOWUP_COMPLETED`).

## 10. Next Action

**TARGET STATE --- not implemented.** When an active Lead's Follow-Up is
completed, the CRM should encourage the responsible Agent to define the
next action when appropriate.

## 11. Escalation

**TARGET STATE --- not implemented.** A configurable escalation mechanism
may be introduced:

`OVERDUE → ESCALATED`

Admin can then:

-   review
-   contact Agent
-   create/modify Follow-Up
-   reassign Lead if justified

**CURRENT STATE.** Neither `OVERDUE` nor `ESCALATED` exists. Escalation
depends on §8. Delivery is PHASE 4, audited as `LEAD_ESCALATED`.

## 12. Visibility

**TARGET STATE.**

Agent: only Follow-Ups for authorized Leads.

Admin: all operational Follow-Ups.

Super Admin: all operational Follow-Ups.

**CURRENT STATE --- there is no visibility control at all.** The table has
no RLS, so every row is readable by any holder of the anon key. The UI
applies `.eq("assigned_to", userId)` on the Follow-Ups query, which is a
convenience filter and not a boundary; removing it in DevTools, or
querying PostgREST directly, returns everything.

Delivery is PHASE 1A (policy) and PHASE 1B (scoped server reads).

## 13. Audit

**TARGET STATE --- not implemented.** Record:

-   created
-   updated
-   completed
-   cancelled
-   overdue
-   escalated
-   reassigned

Use the existing System Logs.

**CURRENT STATE.** None of these is audited. `crm.service.ts` writes a
`crm_activities` row after creating a Follow-Up, but that is
client-generated business activity in a table its own author can update
--- it is not an audit record.

"Use the existing System Logs" resolves to `admin_audit_log`, not
`crm_activities`. See `docs/crm/06-audit-system.md`. Delivery is PHASE 2.

# END
