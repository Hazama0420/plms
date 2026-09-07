# PLM CRM --- UI and Information Architecture

> **Document status:** revised in PHASE 0.5 --- Documentation Reconciliation,
> 2026-08-08.
>
> **CURRENT STATE** = verified by the PHASE 0 audit.
> **TARGET STATE** = intended design, not implemented unless stated.
>
> A TARGET STATE rule is never evidence that a control exists.

## 0. CURRENT STATE --- UI Restrictions Are Not Security

Everything this document describes about what a role "sees" is currently
a rendering decision, not an access boundary. The audit found that the
CRM data layer runs in the browser (`services/crm.service.ts` imports the
browser Supabase client), so any filter, mask, or hidden section in these
pages can be bypassed by reading the network payload or calling PostgREST
directly.

Three consequences for PHASE 5, which is a **presentation** refactor and
must not be mistaken for a security fix:

-   **Phone masking** is client-side cosmetics. The real number is in the
    payload. Eight components implement the same literal
    `"08xx-xxxx-xxxx"` replacement. See
    `docs/crm/02-roles-permissions.md` §6.
-   **Lead scoping** does not exist. `getLeads` is called with no
    ownership filter, and `crm_leads_select` is `is_internal_staff()`, so
    an Agent's Leads page fetches every Lead in the system. `search` is
    applied client-side after the fetch. See
    `docs/crm/03-lead-governance.md` §4.
-   **Follow-Up scoping** is a convenience filter. `crm_followups` has no
    RLS at all; the `.eq("assigned_to", userId)` in the UI is not a
    boundary. See `docs/crm/05-follow-up-rules.md` §0.

**Do not close a duplicate view in PHASE 5 and record it as a fix for the
underlying exposure.** Removing a screen that displays data does not stop
the data being fetched. The exposures are closed by PHASES 1A and 1B.

**Components actually present** (for orientation; the names used in §2
below are conceptual, not component names):

-   `components/crm/CrmKanbanBoard.tsx` --- pipeline board, drag to
    change stage, writes `.update({ status, updated_at })` directly
-   `components/crm/AgentActivityMonitor.tsx` --- Agent monitoring view

## 1. Current PLM Routes

**CURRENT STATE --- verified.**

Current CRM is under:

`app/(dashboard)/crm/`

with Leads and Follow-Ups routes:

-   `crm/`
-   `crm/leads/`, `crm/leads/create`, `crm/leads/[id]`,
    `crm/leads/[id]/edit`
-   `crm/followups/`, `crm/followups/create`, `crm/followups/[id]`,
    `crm/followups/[id]/edit`

Do not replace the route architecture merely to simplify the UI.

The URL `/crm` is produced by the `(dashboard)` route group --- the group
segment does not appear in the URL. Any new protected route must be
checked against `proxy.ts`. See `docs/project-rules.md` §4.

## 2. Current UI Overlap

**CURRENT STATE.** The same underlying Follow-Up concept is presented in
several places: within Lead views, within Lead Detail, and in the
dedicated `/crm/followups` area. Lead information is likewise presented
in the directory listing, in the Kanban board, and in Lead Detail.

This is genuine duplication of presentation and is the target of PHASE 5.
It is not, by itself, a security problem --- see §0.

## 3. Target Information Architecture

**TARGET STATE.**

`/crm` --- Overview

`/crm/leads` --- Lead database

`/crm/leads/[id]` --- single Lead workspace

`/crm/followups` --- Follow-Up task management

Admin/Super Admin --- Monitoring

Keep existing routes where possible and refactor presentation/data
fetching rather than unnecessarily changing URLs.

**CURRENT STATE.** The first four already exist. A dedicated Monitoring
area does not; `AgentActivityMonitor` is the closest existing surface.

## 4. Agent View

**TARGET STATE.**

Agent should primarily see:

-   Overview
-   My Leads
-   My Follow-Ups

Optional shared Leads only if explicitly supported.

**CURRENT STATE.** "My Leads" is not implemented --- the Leads page is
effectively "All Leads" for every Agent. "My Follow-Ups" is filtered in
the client only. Explicit Lead sharing does not exist.

## 5. Admin/Super Admin View

**TARGET STATE.**

Admin/Super Admin may see:

-   Overview
-   Leads
-   Follow-Ups
-   Monitoring

System Logs remains an administrative audit area.

**CURRENT STATE.** The System Logs screen reads `crm_activities`, which is
business activity rather than audit, and offers deletion. See
`docs/crm/06-audit-system.md` §0.

## 6. Leads Page

**TARGET STATE.**

Focus on Lead management.

Useful filters:

-   My Leads
-   Unassigned
-   Active
-   Overdue
-   Won
-   Lost
-   High Risk, if authorized

Do not duplicate the entire Follow-Up database on the Leads page. A
compact next-action indicator is enough.

**CURRENT STATE.** Filters that cannot be built yet: **Overdue** has no
persisted state (`docs/crm/05-follow-up-rules.md` §8) and **High Risk**
has no Risk Engine (PHASE 6). **My Leads** requires the ownership scoping
delivered in PHASE 1B, and it must be a server-side filter, not a client
predicate.

## 7. Follow-Ups Page

**TARGET STATE.**

This is the central task view.

Display:

-   Lead
-   responsible Agent
-   date
-   time
-   status
-   plan/note
-   overdue state

Agent sees authorized records only.

**CURRENT STATE.** Overdue state is computed at render time and not
persisted. "Agent sees authorized records only" is false today: the table
has no RLS and the scoping is a client-side filter.

## 8. Lead Detail

**TARGET STATE.**

Lead Detail should become the central operational workspace.

Recommended sections:

1.  Lead Header
2.  Customer information
3.  Property Interest
4.  Pipeline
5.  Next Action
6.  Follow-Ups
7.  Business Activity
8.  AI Assistant
9.  Administrative/Audit information according to role

**CURRENT STATE.** Sections 1--4, 6 and 7 exist in some form. Section 5 has
no persisted next-action concept. Section 8 does not exist and is PHASE 7.
Section 9 has no role-restricted audit source yet and is PHASE 2.

Section 3 note: Property Interest reads `crm_interests`, a table with no
RLS.

## 9. Lead Header

**TARGET STATE.**

Display:

-   Lead ID
-   customer name
-   source
-   pipeline
-   responsible Agent
-   created date
-   Lead health/priority where permitted

Phone number must follow role masking rules.

**CURRENT STATE.** Masking is applied at render only, over a payload
containing the real number. "Follow role masking rules" is satisfiable
only after PHASE 1B introduces a server-side phone representation. Lead
health/priority does not exist.

## 10. Pipeline

**TARGET STATE.** Clearly display:

New Lead → Contacted → Qualified → Proposal → Negotiation → Won

with:

Lost

as a terminal path.

Unauthorized transitions must not be offered.

**CURRENT STATE --- and a conflict to resolve.**
`components/crm/CrmKanbanBoard.tsx` `STATUS_STAGES` uses this order and
therefore matches this document. The `LeadStatus` union in
`types/crm.types.ts` orders `negotiation` before `proposal` and does not.
One must be made authoritative before any transition validator is written
--- see `docs/crm/04-pipeline-rules.md` §0.

"Unauthorized transitions must not be offered" is currently the only
restriction of any kind on transitions, and it is a UI restriction:
`canDragAndMove` excludes viewer/tamu/guest and nothing else. Any role
that passes it can drag a Lead to `won` or `lost`. Server-side validation
is PHASE 3.

## 11. Next Action

**TARGET STATE.** Prominently show:

-   next Follow-Up
-   date
-   time
-   action

If overdue, clearly indicate it.

**CURRENT STATE.** Overdue indication is derived at render time. It is
adequate for display, but nothing else may depend on it until PHASE 4
persists the state.

## 12. Activity

**TARGET STATE.**

Display relevant business activity.

Sensitive audit/security events are role restricted.

Do not expose the complete administrative System Logs to Agents.

**CURRENT STATE.** There is nothing to restrict yet, and the restriction
that exists is not effective: `crm_activities` SELECT is
`is_internal_staff()`, so an Agent can read every activity row directly
regardless of what the UI shows. The last sentence of this section
becomes achievable when PHASE 2 separates the two stores.

## 13. AI Panel

**TARGET STATE --- PHASE 7.**

For authorized users:

-   Summarize Lead
-   What should I do next?
-   Recommend Follow-Up
-   Draft WhatsApp
-   Analyze Lead

AI output must be clearly presented as a recommendation.

**CURRENT STATE.** Not implemented. "For authorized users" requires the
per-Lead authorization check that does not exist yet --- see
`docs/crm/08-ai-crm.md` §11. Do not add this panel before PHASE 7.

## 14. Monitoring

**TARGET STATE.** Admin/Super Admin monitoring may include:

-   total Leads
-   unassigned Leads
-   overdue Follow-Ups
-   escalations
-   pipeline distribution
-   Agent workload
-   risk flags
-   potential Lead leakage

Avoid using monitoring metrics as automatic proof of misconduct.

**CURRENT STATE.** `AgentActivityMonitor` exists. Overdue counts,
escalations, risk flags and leakage signals all depend on PHASES 4 and 6.

**PHASE 1B note --- applied 2026-08-08, migration `013`.**
`crm_leads_select` no longer calls `is_internal_staff()`, so an Agent now
reads only their own Leads plus unassigned ones. Six functions written
against full visibility will report smaller numbers. **This is correct by
policy, not a regression** --- but it will look like one:

| Function | `services/crm.service.ts` | Effect for an Agent |
| --- | --- | --- |
| `getCRMStats` | 745 | Six unfiltered `count` calls, now scoped. **Throws on error** |
| `searchLeads` | 804 | Takes 30 rows then filters in JS --- 30 rows from the Agent's scope, not the system |
| `bulkUpdateStatus` | 833 | `.in("id", ...)`; ids outside scope are silently skipped, affected-row count unchecked |
| `bulkAssign` | 855 | Same pattern, and calls `getLeadById` per id at 869 |
| `getLeadsReport` | 887 | Scoped |
| `getFollowupReport` | 902 | Scoped |

`getLeadById` (208) is the one to watch: its embed at 213 is a PostgREST
LEFT JOIN, so an invisible contact arrives as `null` rather than an error,
and the fallback at 228-236 then throws `"Contact not found for lead
<id>"`. `crm_contact_visible()` is what keeps lead and contact visibility
in step and prevents that --- decision no.6. **This specific embed has
not been checked**: the manual Agent pass confirmed which Leads are
visible, not that `contact` is non-`null` on each of them.

Two UI surfaces shrink for the same reason: the client dropdowns in
`(dashboard)/invoices/create/page.tsx:174,197`, and the contact pickers at
`crm/leads/create/page.tsx:215` and `crm/leads/[id]/edit/page.tsx:210`
--- the orphan-contact branch of `crm_contact_visible()` keeps unclaimed
contacts selectable, so only contacts already held by another Agent
disappear.

`AgentActivityMonitor.tsx:134` is a cross-Agent view and will render empty
for an Agent. Confirm its route is admin-only.

None of these were changed in PHASE 1B; decision no.10 confined the phase
to the database layer. The client-side ownership predicates at
`CrmKanbanBoard.tsx:147`, `crm/leads/page.tsx:196` and
`crm/followups/page.tsx:139` are now redundant with the row-level policy
rather than being the only barrier --- they are left in place.

**Verification status.** PHASE 1B is CLOSED — VERIFIED. An Agent session
was exercised manually by the project owner and confirmed the read
boundary: an Agent sees their own Leads and not another Agent's. That is
the row-scoping claim underlying every row of the table above.

Not confirmed, and not to be read as confirmed: the shrinking dropdowns,
the property-interest duplicate fix (T16), `AgentActivityMonitor`
rendering empty, and the `getLeadById` embed. Each follows from an
applied policy rather than from an observation. See
`docs/crm/00-schema-baseline.md` §13.2.

**Access decisions in force** (`docs/crm/00-schema-baseline.md` §13.3):
`marketing` and `commissioner` may **read all CRM data** and write none.
For `marketing` this is new visibility --- it previously saw zero rows.
For `commissioner` the read was already there and the **write** was
removed. Note that `normalizeRole()` still maps `commissioner` to
`viewer`, so `canAccessRoute` keeps `/crm` closed to it in the UI; the
database decision stands but is not reachable through these pages. That
divergence is M-4 and was left untouched.

## 15. No Duplicate Data Sources

**TARGET STATE.**

Do not create:

-   duplicate Lead databases
-   duplicate Follow-Up stores
-   independent Timeline databases
-   separate audit histories

Prefer a single source of truth for each domain object.

**CURRENT STATE.** Single sources exist per domain object. The nuance is
audit: two log stores already exist (`admin_audit_log` and
`crm_activities`) and that separation is intentional and should be kept
--- business activity and security audit are different domains. This rule
means "do not add a third", not "merge the two". See
`docs/crm/06-audit-system.md` §2.

# END
