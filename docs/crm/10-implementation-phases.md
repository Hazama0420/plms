# PLM CRM --- Implementation Phases

> **Document status:** revised in PHASE 0.5 --- Documentation Reconciliation,
> 2026-08-08. The phase order below **replaces** the previous ordering and
> reflects what the PHASE 0 audit actually found.

## Global Rule

Do not implement the entire CRM upgrade in one operation.

Work phase by phase.

After each phase:

-   inspect
-   implement
-   test
-   verify
-   report

Do not continue when a phase introduces unresolved security or
data-integrity problems.

## Phase Order

| Phase | Name | Status |
| --- | --- | --- |
| 0 | PLM CRM Audit | **DONE** 2026-08-08 |
| 0.5 | Documentation Reconciliation | **CURRENT** |
| 0.75 | CRM Database Baseline | next |
| 1A | Emergency CRM Security | pending |
| 1B | Authorization & Ownership | pending |
| 2 | Immutable CRM Security Audit | pending |
| 3 | Pipeline Governance | pending |
| 4 | Follow-Up Governance | pending |
| 5 | CRM UI Simplification | pending |
| 6 | Risk Engine | pending |
| 7 | AI CRM | pending |
| 8 | Monitoring | pending |
| 9 | Security Testing | pending |
| 10 | Regression Testing | pending |
| 11 | Final Review | pending |

## Ordering Rules

**AI CRM must remain PHASE 7.** Do not implement AI CRM before
authorization, ownership, RLS, audit and risk foundations are complete.
AI must never be part of the authorization path --- it consumes
already-authorized data and never produces an authorization decision.

**No CRM migration before PHASE 0.75.** The `crm_*` schema does not exist
in this repository; treat it as live/external until a verified baseline
exists. See `docs/project-rules.md` §15.

**PHASE 1A before PHASE 1B.** 1A closes an active exposure. 1B is a
larger architectural change. Do not bundle them.

**PHASE 6 cannot be pulled forward.** The Risk Engine reads history that
PHASES 2, 3 and 4 create. See `docs/crm/07-risk-engine.md` §0.

------------------------------------------------------------------------

# PHASE 0 --- PLM CRM AUDIT

**STATUS: DONE, 2026-08-08.** Branch
`feat/footer-legal-dan-pembersihan`. No code or database changes were
made.

Headline findings:

1.  `crm_followups` and `crm_interests` have **no RLS in any migration**
    --- exposed to the anon key, including logged-out visitors.
    `scripts/verify-rls.mjs` cannot detect this.
2.  Phone masking is **client-side cosmetics** over a payload containing
    real numbers.
3.  `crm_leads_select` is `is_internal_staff()` and `getLeads` applies no
    ownership filter --- every Agent reads every Lead.
4.  The CRM has **no complete server-side authorization layer**;
    `services/crm.service.ts` uses the browser Supabase client.
5.  Pipeline transitions are not validated server-side; there is no
    pipeline endpoint at all.
6.  `lost_reason` does not exist. Deal Submitted / Pending Verification
    do not exist. Assignment history does not exist.
7.  `crm_activities` --- what the admin "System Logs" screen reads --- is
    **not** an immutable audit log. `admin_audit_log` is immutable but
    holds zero CRM events.
8.  The `crm_*` schema is **not in the repository**.
9.  The AI infrastructure is well-factored and reusable.
10. `commissioner` exists in RLS but not in the application role model.

Findings are recorded per topic in the other documents in this folder.

------------------------------------------------------------------------

# PHASE 0.5 --- DOCUMENTATION RECONCILIATION

**STATUS: CURRENT.**

Goal: no PLM CRM document may claim a security control exists when the
audit proved it does not.

Scope --- documentation only. No source code, no migration, no database
change, no RLS change, no API change, no UI change, no feature work.

Rules applied across all eleven documents:

1.  Every document carries a status banner defining **CURRENT STATE** and
    **TARGET STATE**.
2.  Each document opens with a `§0 CURRENT STATE` section holding
    audit-verified facts with file references.
3.  Normative sections are labelled TARGET STATE where they are not yet
    implemented.
4.  False or misleading claims are corrected in place, with the
    correction stated rather than silently applied.
5.  The `crm_*` schema is treated as live/external throughout.
6.  Cross-references point to the document that owns each topic instead
    of restating it.

Exit criteria: all eleven documents revised; the phase order in this file
matches the audit; every claim of an existing control is either verified
or relabelled.

------------------------------------------------------------------------

# PHASE 0.75 --- CRM DATABASE BASELINE

Reason this phase exists: `grep -rn "create table.*crm_" supabase/migrations/`
returns zero matches. Every `crm_*` table was created manually in the
Supabase SQL Editor. The repository carries some of their RLS but none of
their definitions.

Inspect the live database and capture, per CRM table:

-   columns and types
-   nullability
-   defaults
-   CHECK constraints
-   unique constraints
-   primary keys
-   foreign keys
-   indexes
-   existing RLS state and policies

Tables to cover: `crm_leads`, `crm_contacts`, `crm_activities`,
`crm_followups`, `crm_interests`, plus `users`.

Specific questions the audit could not answer and that this phase must:

-   does `crm_leads.status` have a CHECK constraint or an enum type?
    (blocks the PHASE 3 design for Deal Submitted / Pending Verification)
-   which ownership columns actually exist on `crm_leads` ---
    `assigned_to`, `created_by`, `user_id`? `CRMLead` in
    `types/crm.types.ts` declares neither `created_by` nor `user_id`,
    yet RLS and `canModifyLead` both depend on them
-   do `crm_followups.completed_by` / `completed_at` exist?
-   are there source columns on `crm_leads`, and what are they called?
-   is `crm_activities.lead_id` NOT NULL, as
    `app/api/admin/logs/route.ts` states?
-   what is the default value of `users.status`? (this is why
    `BLOCKED_STATUSES` in `lib/permissions.ts` is a deny-list)
-   what is the actual distribution of `crm_leads.status` values?
    (needed before PHASE 3 validation, per
    `docs/crm/04-pipeline-rules.md` §13)

Rules:

-   **do not invent schema**
-   do not create a baseline migration until the schema is verified
    against the live database
-   the baseline must be idempotent and must describe what exists, not
    what the design wants
-   record findings in the relevant documents, replacing the "cannot be
    confirmed from the repository" notes

Exit criteria: a verified baseline exists, and no later phase needs to
guess at a column, type or constraint.

------------------------------------------------------------------------

# PHASE 1A --- EMERGENCY CRM SECURITY

Closes the active exposure. Keep this phase small and shippable.

Implement:

-   RLS on `crm_followups`
-   RLS on `crm_interests`
-   extend `scripts/verify-rls.mjs` to cover **every** `crm_*` table ---
    it currently probes only `crm_leads`
-   move Follow-Up mutations to server-side authorization

**Do not break existing functionality without replacing its access
path.** `services/crm.service.ts` `updateFollowup` and `deleteFollowup`
write directly from the browser and depend on the absence of RLS.
Enabling the policy alone will break Follow-Up editing. The policy and the
server-side write path must ship in the same change.

Verify:

-   the anon key returns zero rows from `crm_followups` and
    `crm_interests`
-   an Agent cannot read another Agent's Follow-Ups through PostgREST
-   Follow-Up create, edit, complete, cancel and delete still work for
    each role through the UI
-   `verify-rls.mjs` fails if any `crm_*` table has RLS disabled

Extend `verify-rls.mjs` **before** relying on it as a gate again --- it
reported success throughout the exposed period.

------------------------------------------------------------------------

# PHASE 1B --- AUTHORIZATION & OWNERSHIP

The architectural phase. This is where the missing middle layer is built.

Implement:

-   a server-side CRM authorization layer (routes or server actions) that
    `services/crm.service.ts` calls instead of PostgREST for protected
    reads and all writes
-   Lead ownership rules
-   Agent Lead visibility --- server-side scoping, not a client predicate
-   secure phone representation --- the server returns only the
    permitted form; the full number never reaches an unauthorized client
-   assignment rules, including an authorized `UNASSIGNED → ASSIGNED`
    path
-   `WITH CHECK` on `crm_leads_update`
-   prevent unauthorized ownership changes
-   verify Lead access in `app/api/leads/[id]/follow-up/route.ts` and
    stop accepting `assigned_to` from an Agent's request body
-   decide and document the `commissioner` role

Two decisions this phase must make explicitly, not by side effect:

1.  **The assignment path.** `crm_leads_update` currently has no branch
    matching an unassigned Lead, so an Agent cannot claim one --- which
    also means nobody can assign one. Tightening ownership without adding
    an authorized path leaves website Leads permanently unassignable. See
    `docs/crm/03-lead-governance.md` §3.
2.  **`commissioner`.** It has read access to every Lead, contact and
    activity through `is_internal_staff()` and no representation in
    `UserRole`. Either define it properly or remove it from the RLS
    helpers.

Test (direct PostgREST, not only the UI):

-   Agent A cannot retrieve Agent B's protected Lead
-   Agent A cannot create a Follow-Up for Agent B's Lead
-   an Agent cannot change ownership of any Lead, including one they
    created
-   a full phone number does not appear in any Agent-facing payload
-   Viewer/Guest remains fully excluded
-   RLS still protects the database when the server layer is bypassed

Expect statistics to change: `getCRMStats`, `getLeadsReport`,
`getFollowupReport`, `searchLeads`, `bulkAssign` and `bulkUpdateStatus`
all assume full visibility today. Correct by policy, but it will look
like a regression if unannounced.

------------------------------------------------------------------------

# PHASE 2 --- IMMUTABLE CRM SECURITY AUDIT

Extend the existing System Logs architecture. Do not create a competing
audit system.

**Target store: `admin_audit_log`.** Decided in PHASE 0.5 for three
reasons recorded in `docs/crm/06-audit-system.md` §0:

1.  `crm_activities` is updatable by its own author
    (`user_id = auth.uid()`), so an Agent can edit their own
    `status_change` rows
2.  `crm_activities` is deletable by `super_admin` through the admin Logs
    API, by design
3.  `crm_activities.lead_id` is NOT NULL, so lead-less events cannot be
    written there at all

Separate business activity from security audit:

-   `crm_activities` --- business activity the Agent sees
-   `admin_audit_log` --- security audit, role-restricted, immutable

Implement consistent events for:

-   Lead creation
-   assignment and reassignment
-   pipeline movement, with previous and new values
-   Lost
-   Follow-Up create / update / complete / cancel
-   Deal submission and verification
-   administrative override
-   unauthorized access attempts

Constraints:

-   `AuditAction` currently has five values, none CRM. This phase takes
    it to roughly twenty-five.
-   Follow the **existing** naming convention --- lowercase,
    dot-separated (`user.role_change`), not `LEAD_ASSIGNED`. Update
    `docs/crm/06-audit-system.md` §5 once the form is chosen.
-   Do **not** add an INSERT policy to `admin_audit_log`. Writes go
    through the service-role client by design; the absence of
    INSERT/UPDATE/DELETE policies is what makes the log immutable.
-   `lib/audit-log.ts` never throws. Keep that, but do not treat the log
    as guaranteed-complete when reasoning about coverage.
-   Some events cannot be emitted yet: `lost_reason` needs PHASE 3;
    overdue and escalation need PHASE 4; risk flags need PHASE 6. Emit
    what exists and add the rest with their features.
-   Decide whether `crm_activities` UPDATE should still allow
    `user_id = auth.uid()` after the separation.

Verify log integrity: an Agent cannot insert, update or delete any
`admin_audit_log` row through PostgREST.

------------------------------------------------------------------------

# PHASE 3 --- PIPELINE GOVERNANCE

Depends on PHASE 1B for a server-side write path --- there is currently
no pipeline endpoint at all; stage changes are column updates sent from
the browser.

Implement:

-   valid transitions, enforced server-side
-   `lost_reason` --- structured, with a required explanation for
    `Other`. It does not exist anywhere in the repository today
-   Won / Deal verification, separating submission from verification
-   pipeline history with previous and new values
-   authorized administrative override, recorded as such

Resolve first: the stage order conflict between
`components/crm/CrmKanbanBoard.tsx` `STATUS_STAGES`
(proposal → negotiation) and the `LeadStatus` union in
`types/crm.types.ts` (negotiation → proposal). Pick one authoritative
order before writing a validator.

Design against the live schema captured in PHASE 0.75 --- whether
intermediate states can be added as `status` values depends on
constraints not visible in the repository.

Apply validation to new transitions only. Existing rows predate any
validation and must not be silently rewritten
(`docs/crm/04-pipeline-rules.md` §13).

Test direct API and direct PostgREST attempts, not only the UI.

------------------------------------------------------------------------

# PHASE 4 --- FOLLOW-UP GOVERNANCE

Implement:

-   authorized Lead selection
-   responsible-Agent lock for the Agent role
-   persisted `OVERDUE` state --- it does not exist; overdue is currently
    computed at render time only
-   completion with actor attribution
-   escalation
-   next action

Verify scheduled/background behaviour. There is no cron, scheduled
function or worker in the repository today, so
`PENDING → OVERDUE` needs a mechanism chosen and built, not merely
wired.

**Also deliver here: phone normalization.** A normalized phone column
plus backfill. It is listed under the Risk Engine in
`docs/crm/07-risk-engine.md` §6, but duplicate detection needs it too,
and introducing it now means data accumulated during PHASES 2--5 already
carries the value instead of requiring a backfill over a larger dataset
later.

------------------------------------------------------------------------

# PHASE 5 --- CRM UI SIMPLIFICATION

Simplify existing presentation without unnecessarily changing routes.

Target:

-   CRM Overview
-   Leads
-   Lead Detail
-   Follow-Ups
-   Monitoring

Remove duplicate presentation of the same Follow-Up information. Preserve
data.

**This is a presentation phase, not a security phase.** Removing a screen
that displays data does not stop the data being fetched. Do not record a
closed duplicate view as a fix for an exposure --- those are closed in
PHASES 1A and 1B. See `docs/crm/09-crm-ui.md` §0.

Filters that become possible only after earlier phases: **My Leads**
needs 1B; **Overdue** needs 4; **High Risk** needs 6.

------------------------------------------------------------------------

# PHASE 6 --- RISK ENGINE

Implement deterministic rules first.

Initial signals may include:

-   duplicate Lead
-   repeated overdue Follow-Up
-   Lost without meaningful activity
-   suspicious reassignment
-   suspicious re-entry
-   same normalized customer identifier
-   unauthorized access attempts

Then implement risk score, risk flag and review workflow.

**Do not add AI yet.**

This phase cannot be pulled forward. Nearly every signal above reads
history that PHASES 2, 3 and 4 create --- persisted overdue state,
`lost_reason`, assignment history, pipeline before/after, security
events, normalized phone. The dependency table is in
`docs/crm/07-risk-engine.md` §0.

Create the risk-flag table **with** its RLS policy in the same migration,
restricted to Admin/Super Admin, and add it to `verify-rls.mjs` at the
same time. It holds investigative data about named people. The
`crm_followups` / `crm_interests` situation is the failure mode to avoid.

Every score must carry its deterministic reasons.

------------------------------------------------------------------------

# PHASE 7 --- AI CRM

**Only after CRM permissions and data governance are stable.** AI CRM
must not move earlier in the order.

Reuse the existing infrastructure --- verified suitable in PHASE 0:

-   `services/ai.service.ts` --- `aiService.generateWithFallback`,
    provider chain Agnes → Groq → Gemini
-   `lib/ai-quota.ts` --- `enforceAiQuota`, atomic quota via the
    `consume_ai_quota()` RPC from migration `005`
-   `app/api/ai/followup/route.ts` --- the reference route pattern:
    `requireRole`, schema validation, markdown stripping of model output

Adding a feature means a new `AiFeature` value and a `DEFAULT_LIMITS`
entry. Do not build a second AI architecture.

Implement incrementally:

1.  Lead Summary
2.  Next Action
3.  Follow-Up Recommendation
4.  WhatsApp Draft
5.  CRM Analyst
6.  Risk Explanation

Hard prerequisites:

-   **per-Lead authorization before every AI call.** `requireRole` is not
    Lead access. Without it an AI endpoint is a backdoor to another
    Agent's Lead --- and a worse one than the UI, because it returns
    synthesized text rather than rows. Delivered by PHASE 1B.
-   drafts and summaries must use the permitted phone representation,
    never the full number for a role not allowed to see it
-   AI result caching and invalidation, which depend on PHASE 2 change
    events

AI must remain advisory. It must never change owner, mark Lost or Won,
verify a Deal, modify permissions, delete records or audit logs, or
create, modify or dismiss a risk flag.

Do not reintroduce two bugs already fixed in this repository: using the
browser Supabase client in a server route, and reading the caller's role
from the request body.

------------------------------------------------------------------------

# PHASE 8 --- MONITORING

Admin/Super Admin:

-   Lead workload
-   pipeline distribution
-   overdue Follow-Ups
-   unassigned Leads
-   risk flags
-   potential Lead leakage
-   Agent operational metrics

Metrics must be contextualized and must not automatically imply
misconduct.

------------------------------------------------------------------------

# PHASE 9 --- SECURITY TESTING

Test:

-   direct CRM route access
-   direct API access
-   **direct PostgREST access with the anon key** --- this is the
    transport the CRM itself uses, so it is not optional
-   manipulated Lead IDs
-   unauthorized Lead retrieval
-   unauthorized Follow-Up retrieval
-   phone number leakage, inspected in the network payload rather than
    on screen
-   ownership manipulation
-   pipeline manipulation
-   Lost without reason
-   unauthorized Won verification
-   audit deletion/modification
-   role escalation, including the legacy `superadmin` spelling and
    `commissioner`
-   RLS bypass attempts

Run `scripts/verify-rls.mjs` --- after confirming the PHASE 1A extension
is in place. In its pre-1A form it probes one table and reports success
while others are exposed.

------------------------------------------------------------------------

# PHASE 10 --- REGRESSION TESTING

Verify existing PLM flows:

-   property catalog
-   WhatsApp CTA
-   Lead form
-   Lead creation, including the guest and member rate limits
-   Admin System Logs
-   pipeline
-   Follow-Ups
-   authentication
-   roles
-   Viewer restrictions
-   AI chatbot

------------------------------------------------------------------------

# PHASE 11 --- FINAL REVIEW

Produce:

-   changed files
-   migrations
-   changed API endpoints
-   permission changes
-   RLS changes
-   audit events
-   risk rules
-   AI integration
-   tests
-   unresolved issues
-   rollback considerations
-   recommended next improvements

Confirm that every "CURRENT STATE" note in `docs/crm/` and
`docs/project-rules.md` still matches the code. A note that has been
overtaken by an implemented phase must be updated --- documentation drift
is what made PHASE 0.5 necessary.

# END

