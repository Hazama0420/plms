# PLM CRM --- Risk Engine

> **Document status:** revised in PHASE 0.5 --- Documentation Reconciliation,
> 2026-08-08.
>
> **CURRENT STATE** = verified by the PHASE 0 audit.
> **TARGET STATE** = intended design, not implemented unless stated.
>
> A TARGET STATE rule is never evidence that a control exists.

## 0. CURRENT STATE --- Nothing in This Document Is Implemented

The PHASE 0 audit found no Risk Engine of any kind: no risk table, no
risk score, no risk flag, no review workflow, no risk UI.

That is expected --- the Risk Engine is PHASE 6. This section records the
**prerequisites**, because most of the signals in §4 cannot be computed
from the data the system currently keeps.

| Signal in §4 | Data needed | Exists today? | Delivered by |
| --- | --- | --- | --- |
| repeated overdue Follow-Ups | persisted `OVERDUE` state | **no** --- overdue is computed at render time only | PHASE 4 |
| unusually high Lost rate | `status` history | partially --- current value only | PHASE 2/3 |
| Lost without sufficient activity | `lost_reason` + reliable activity | **no** --- `lost_reason` does not exist; activity rows are editable by their author | PHASE 3 / PHASE 2 |
| suspicious reassignment | assignment history | **no** --- reassignment overwrites in place | PHASE 2 |
| unexpected source changes | source protection + audit | **no** | PHASE 2 |
| duplicate customer | normalized phone | **no** | see §6 |
| same normalized phone | normalized phone | **no** | see §6 |
| unusual pipeline manipulation | pipeline history with before/after | **no** | PHASE 2/3 |
| repeated unauthorized access | security events | **no** --- and RLS currently permits the access, so it is not unauthorized at the database level | PHASE 1B + PHASE 2 |
| Deal submitted without expected activity | Deal Submitted state | **no** | PHASE 3 |
| company Lead re-entered as another Lead | normalized identifiers + Lost history | **no** | PHASE 3/4 + §6 |

The practical consequence: **the Risk Engine cannot be pulled forward.**
It is not blocked by effort, it is blocked by the absence of the history
it would read. PHASES 2, 3 and 4 are what create that history.

A second consequence for PHASE 6 design: risk scores computed today would
run over `crm_activities`, a table an Agent can edit their own rows in
(`user_id = auth.uid()`). Any signal based on activity volume is
manipulable until that is resolved --- see
`docs/crm/06-audit-system.md` §3.

## 1. Purpose

**TARGET STATE.**

The Risk Engine identifies unusual CRM patterns that deserve
administrative review.

It is a monitoring mechanism, not an accusation system.

Preferred labels:

-   Potential Risk
-   Potential Lead Leakage
-   Suspicious Pattern
-   Requires Review

Avoid automatically labeling an Agent as fraudulent.

## 2. Architecture

**TARGET STATE.**

Use:

`Deterministic Rules + Optional AI Explanation`

Rules provide objective signals.

AI can explain context.

The rule engine remains authoritative.

**Ordering note.** Deterministic rules are PHASE 6; AI explanation is
PHASE 7. Do not add AI to the Risk Engine in PHASE 6, and never let AI
output produce, modify or dismiss a risk flag --- see
`docs/crm/08-ai-crm.md` §15.

## 3. Suggested Risk Levels

**TARGET STATE.**

-   0--29: LOW
-   30--59: MEDIUM
-   60--79: HIGH
-   80--100: CRITICAL

Thresholds should be configurable.

**Implementation note.** The project already has a configurable-limits
pattern worth reusing: `lib/ai-quota.ts` reads per-feature overrides from
`AI_LIMIT_<FEATURE>` environment variables on top of a
`DEFAULT_LIMITS` table. Follow that shape rather than inventing a new
configuration mechanism.

## 4. Risk Signals

**TARGET STATE.** Possible signals:

-   repeated overdue Follow-Ups
-   unusually high Lost rate
-   Lost without sufficient activity
-   suspicious reassignment
-   unexpected source changes
-   duplicate customer
-   same normalized phone across suspicious records
-   unusual pipeline manipulation
-   repeated unauthorized access
-   Deal submitted without expected activity
-   company Lead appearing to be re-entered as another Lead

Do not assume every signal indicates misconduct.

**CURRENT STATE.** See the prerequisite table in §0 --- none of these is
computable today.

## 5. Lead Leakage Pattern

**TARGET STATE.**

High-priority example:

Company Lead → assigned to Agent A → becomes Lost → similar Lead appears
later → same customer identifier → same property/interest → same Agent
involved

Generate a reviewable risk flag.

**CURRENT STATE.** Every element of this pattern is currently
unobservable: there is no assignment history, no Lost reason, no
normalized customer identifier, and property interest lives in
`crm_interests` --- a table with no RLS, whose contents can be read and
altered by anyone holding the anon key, which makes it an unreliable
basis for an investigation until PHASE 1A closes that hole.

## 6. Phone Matching

**TARGET STATE.**

Normalize phone numbers before comparison.

Do not expose full phone numbers to unauthorized users.

**CURRENT STATE --- both halves unmet.** There is no normalized phone
column; `toWaNumber()` in `app/api/leads/route.ts` formats a number for a
WhatsApp link and does not persist a comparable value. And full phone
numbers are currently sent to every Agent's browser --- see
`docs/crm/02-roles-permissions.md` §6.

**Sequencing recommendation.** Introduce and backfill the normalized
column earlier than PHASE 6 --- ideally alongside PHASE 4 --- so that
data accumulated during PHASES 2--5 already carries it, rather than
backfilling a larger dataset later. Recorded also in
`docs/crm/03-lead-governance.md` §8.

## 7. Duplicate Matching

**TARGET STATE.** Potential matching inputs:

-   normalized phone
-   email
-   normalized name
-   property interest
-   timing

Use multiple signals.

**CURRENT STATE.** The intake route already prevents some duplicates by
reusing an open Lead for a matching contact. Nothing detects duplicates
arriving by other paths.

## 8. Risk Flag

**TARGET STATE.** Conceptual fields:

-   risk flag ID
-   Lead ID
-   Agent ID
-   risk type
-   score
-   reasons
-   status
-   created at
-   reviewed at
-   reviewed by
-   resolution

Adapt to existing database conventions.

**PHASE 0.75 / PHASE 1A dependency.** A risk-flag table is a new table
holding sensitive investigative data about named people. It must be
created **with** its RLS policy in the same migration, restricted to
Admin/Super Admin, and added to `scripts/verify-rls.mjs` at the same
time. The `crm_followups` and `crm_interests` situation --- tables
created manually with RLS left as an afterthought and never noticed ---
is precisely the failure mode to avoid here. See
`docs/project-rules.md` §6 and §15.

## 9. Risk Status

**TARGET STATE.** Suggested:

-   OPEN
-   UNDER_REVIEW
-   RESOLVED
-   DISMISSED

A `CONFIRMED` state may be used for confirmation of the risk condition
itself, not a legal or moral judgment about a person.

## 10. Admin Review

**TARGET STATE.** Admin/Super Admin can:

-   open review
-   dismiss
-   resolve
-   confirm the risk condition
-   add internal notes

Every review action is audited.

**Dependency.** "Every review action is audited" requires PHASE 2, and
the events `RISK_FLAG_CREATED` / `RISK_FLAG_REVIEWED` listed in
`docs/crm/06-audit-system.md` §5 are added with PHASE 6, not before.

## 11. Agent Visibility

**TARGET STATE.**

Agents must not see internal investigation details.

They continue seeing normal operational CRM information required for
their work.

**CURRENT STATE.** There is no mechanism to enforce this yet. Note that
`crm_activities` SELECT is `is_internal_staff()`, so if risk information
were ever written there it would be visible to every internal role,
including `commissioner`. Risk data must not go into `crm_activities`.

## 12. Explainability

**TARGET STATE.**

Every risk score must expose its reasons to authorized reviewers.

Example:

`Risk Score: 72`

Reasons:

-   same normalized phone
-   same property
-   original company Lead became Lost
-   similar Lead created shortly afterward

Avoid unexplained black-box scores.

**Design constraint.** The reasons must be produced by the deterministic
rules and stored with the flag. An AI-generated explanation (PHASE 7) may
be displayed alongside them but never in place of them, and never as the
stored reason.

# END
