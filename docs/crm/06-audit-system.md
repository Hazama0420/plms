# PLM CRM --- Audit and System Logs

> **Document status:** revised in PHASE 0.5 --- Documentation Reconciliation,
> 2026-08-08.
>
> **CURRENT STATE** = verified by the PHASE 0 audit.
> **TARGET STATE** = intended design, not implemented unless stated.
>
> A TARGET STATE rule is never evidence that a control exists.

## 0. CURRENT STATE --- There Are Two Systems, and the Visible One Is Not an Audit Log

The previous revision of this document stated that PLM already logs Lead
creation, pipeline movement and Follow-Up scheduling, and that this
infrastructure is authoritative. The audit found that claim to be
misleading in a way that matters: what the admin UI presents as "System
Logs" is a mutable business-activity table, and the one genuinely
immutable log contains no CRM events at all.

| | `admin_audit_log` | `crm_activities` |
| --- | --- | --- |
| Defined in | migration `011_admin_audit_log.sql` | not in the repository |
| Written by | `lib/audit-log.ts`, service-role client only | the browser, via `crm.service.ts` |
| Actions | 5 fixed values, **none CRM** | free-form `activity_type` (varchar 50) |
| Readable by | `super_admin` only (`is_super_admin()`) | any internal role (`is_internal_staff()`) |
| Updatable by user | **no** --- no UPDATE policy exists | **yes** --- `user_id = auth.uid() or is_staff()` |
| Deletable by user | **no** --- no DELETE policy exists | **yes** --- `super_admin`, via `app/api/admin/logs/route.ts`, max 500 ids |
| Shown as "Admin → System Logs" | no | **yes** |

`AuditAction` in `lib/audit-log.ts` is exactly:

    user.role_change | user.status_change | user.delete | logs.delete | settings.ai_toggle

`lib/audit-log.ts` never throws --- a failed audit write does not break
the calling operation. That is a deliberate availability trade-off; keep
it in mind when relying on the log for completeness.

**`admin_audit_log` immutability is correct and deliberate.** Migration
`011` creates a SELECT policy only. INSERT, UPDATE and DELETE policies are
intentionally absent, so nobody --- not even a Super Admin --- can alter
the log through PostgREST. It then does
`revoke all from anon, authenticated` followed by
`grant select to authenticated`. This already satisfies §6 below.
Preserve it exactly.

**Decision recorded in PHASE 0.5:** `admin_audit_log` is the target store
for CRM security audit events. `crm_activities` stays as business
activity. Rationale:

1.  `crm_activities` is updatable by its own author, so an Agent can edit
    their own `status_change` rows. An audit log that its subject can
    edit is not an audit log.
2.  `crm_activities` is intentionally deletable through the admin
    Logs API.
3.  `crm_activities.lead_id` is NOT NULL (recorded in the header comment
    of `app/api/admin/logs/route.ts`), so lead-less events such as
    `UNAUTHORIZED_ACCESS_ATTEMPT` against a bogus ID, or
    `EXPORT_CREATED`, cannot be written there at all.

Delivery is PHASE 2.

## 1. Existing PLM System

**CURRENT STATE --- corrected.**

PLM has an `Admin → System Logs` screen. That screen reads
`crm_activities`, which records client-generated business activity such
as `status_change` notes and Follow-Up creation.

It is **not** an audit log:

-   rows are written from the browser
-   rows are updatable by the account that created them
-   rows are deletable by `super_admin`
-   no actor role, previous value, or new value is captured

`admin_audit_log` is a separate, properly immutable table containing five
non-CRM administrative actions.

Neither system currently records any CRM audit event.

## 2. Do Not Create Duplicate Audit Systems

**TARGET STATE.**

Do not create a second independent audit database merely because the CRM
UI needs a Timeline.

CRM Timeline should read from the authoritative activity/audit source or
from a clearly related event model.

**CURRENT STATE clarification.** Two stores already exist, and this rule
does not mean collapsing them. It means: do not add a third. The correct
arrangement is the separation described in §3 --- `crm_activities` for
business activity that the Agent sees, `admin_audit_log` for security
audit that only authorized roles see.

## 3. Business Activity vs Audit

**TARGET STATE --- the separation to build in PHASE 2.**

Business activity → `crm_activities`:

-   customer contacted
-   Follow-Up completed
-   viewing scheduled
-   note added

Audit → `admin_audit_log`:

-   Lead assigned
-   Lead reassigned
-   pipeline changed
-   Lost
-   Deal submitted
-   Deal verified
-   administrative override
-   unauthorized access attempt
-   export
-   permission-sensitive action

**PHASE 3 IMPLEMENTATION.** Pipeline, Lost, Deal verification, and governed
Follow-Up mutations use `admin_audit_log`. `crm_activities` remains business
activity and is not authoritative security audit.

**HISTORICAL AUDIT FINDING.** No separation existed. Everything CRM-related that was
recorded at all goes into `crm_activities`, written by the client.

**Open question for PHASE 2.** `crm_activities` UPDATE currently allows
`user_id = auth.uid()`. Even after the separation, that permits an Agent
to rewrite their own business-activity history, which weakens Risk Engine
signals built on activity volume (`docs/crm/07-risk-engine.md` §4). Decide
in PHASE 2 whether that branch should be narrowed.

## 4. Important Audit Fields

**TARGET STATE.** Where supported:

-   log ID
-   actor ID
-   actor name
-   role
-   action
-   entity type
-   entity ID
-   Lead ID
-   previous value
-   new value
-   reason
-   timestamp
-   request ID where useful

Optional security metadata may include IP/user agent where legally and
operationally appropriate.

Do not collect unnecessary personal data.

**CURRENT STATE.** `crm_activities` captures none of `role`,
`previous value`, `new value` or `reason`. The exact column set of
`admin_audit_log` is defined in migration `011` and must be checked
before extending it.

**Constraint.** `crm_activities.lead_id` is NOT NULL. Any event that is
not tied to a specific Lead cannot live there. This is a primary reason
the target store is `admin_audit_log`.

**Privacy note.** IP and user agent are optional here. Adding them
changes what the project collects about visitors, so treat it as a
privacy decision and not merely a technical one.

## 5. Required Events

**PHASE 3 IMPLEMENTATION --- applicable events added.**

Support, where applicable:

-   LEAD_CREATED
-   LEAD_ASSIGNED
-   LEAD_REASSIGNED
-   PIPELINE_CHANGED
-   LEAD_MARKED_LOST
-   LOST_REASON_ADDED
-   FOLLOWUP_CREATED
-   FOLLOWUP_UPDATED
-   FOLLOWUP_COMPLETED
-   FOLLOWUP_CANCELLED
-   FOLLOWUP_OVERDUE
-   LEAD_ESCALATED
-   DEAL_SUBMITTED
-   DEAL_VERIFIED
-   DEAL_REJECTED
-   RISK_FLAG_CREATED
-   RISK_FLAG_REVIEWED
-   UNAUTHORIZED_ACCESS_ATTEMPT
-   ADMIN_OVERRIDE
-   EXPORT_CREATED

`AuditAction` now includes pipeline, Lost, Deal, and governed Follow-Up
events, including `followup.overdue` from the Phase 4A processor. Other events
remain deferred to their owning phases.
Implementing this list takes it from 5 to roughly 25 values.

**Naming convention.** The existing constants are lowercase and
dot-separated (`user.role_change`, `settings.ai_toggle`). §5's names are
uppercase and underscore-separated. Follow the **existing** convention
per §5's own closing instruction --- for example `lead.assigned`,
`lead.pipeline_changed`, `followup.completed`,
`security.unauthorized_access`. Fix the naming in PHASE 2 and update this
list to the chosen form once decided.

**Sequencing.** Several events cannot be emitted until their feature
exists: `LOST_REASON_ADDED` needs PHASE 3, the `FOLLOWUP_OVERDUE` and
`LEAD_ESCALATED` events need PHASE 4, the `RISK_FLAG_*` events need
PHASE 6. Emit what is possible in PHASE 2 and add the rest with their
features.

## 6. Immutability

**CURRENT STATE --- already satisfied by `admin_audit_log`, and violated
by `crm_activities`.**

Normal users must not edit or delete audit history.

Corrections should create new events rather than rewriting the past.

`admin_audit_log` enforces this at the policy level and must not be
loosened when it is extended in PHASE 2. Adding a CRM event means adding
an `AuditAction` value and a `recordAudit()` call --- it must **not** mean
adding an INSERT policy for `authenticated`, since writes go through the
service-role client by design.

## 7. Before/After

**TARGET STATE --- not implemented.**

Important changes should preserve previous and new values.

Example:

`Qualified → Proposal`

Actor:

`Agent A`

Timestamp:

`...`

**CURRENT STATE.** `crm.service.ts` `updateStatus` writes only the note
`Status berubah menjadi ${status}`. The previous stage is discarded
before the write, so it is not merely unrecorded --- it is unavailable at
the point where the record is made. A server-side pipeline path
(PHASE 3) is required for before/after to be capturable at all.

## 8. Security Events

**TARGET STATE --- not implemented.**

An Agent attempting to access an unauthorized Lead may produce:

`UNAUTHORIZED_ACCESS_ATTEMPT`

The Agent must not be shown internal investigation details.

**CURRENT STATE.** No such event can occur yet, for two reasons: there is
no server-side authorization to detect the attempt, and RLS currently
permits an Agent to read any Lead, so the attempt is not unauthorized at
the database level. This becomes meaningful only after PHASE 1B.

## 9. System Logs UI

**TARGET STATE.** Admin/Super Admin may filter by:

-   date
-   actor
-   role
-   action
-   entity
-   Lead
-   severity

**CURRENT STATE.** The existing screen reads `crm_activities` and offers
DELETE (`super_admin`, max 500 ids, which itself records a
`logs.delete` audit entry plus a bell notification). Once PHASE 2 lands,
this screen needs to distinguish the two sources, and the audit source
must remain read-only in the UI.

## 10. CRM Timeline

**TARGET STATE.**

Lead Detail may display business-relevant history.

Sensitive audit/security information is role-restricted.

Agent Timeline must not become a way to expose internal investigation
information.

**CURRENT STATE.** No restriction exists. `crm_activities` SELECT is
`is_internal_staff()`, so every internal role --- including
`commissioner`, which the application layer does not model --- reads
every activity row.

# END
