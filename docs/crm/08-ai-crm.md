# PLM CRM --- AI Assistant

> **Document status:** revised in PHASE 0.5 --- Documentation Reconciliation,
> 2026-08-08.
>
> **CURRENT STATE** = verified by the PHASE 0 audit.
> **TARGET STATE** = intended design, not implemented unless stated.
>
> A TARGET STATE rule is never evidence that a control exists.

## 0. CURRENT STATE --- Infrastructure Verified Reusable, CRM AI Not Started

The PHASE 0 audit answered the inspection checklist in §1. Summary: the
AI stack is the best-factored part of the repository and should be reused
as-is. No CRM AI feature exists.

| Checklist item (§1) | Finding |
| --- | --- |
| existing chatbot implementation | `app/api/chat/route.ts` (77 lines), intentionally public, Agnes persona, `super_admin` unlimited |
| provider abstraction | `services/ai.service.ts` (363 lines), `aiService.generateWithFallback(prompt, systemPrompt)` |
| fallback chain | Agnes (`agnes-2.0-flash`) → Groq (`llama-3.3-70b-versatile`) → Gemini (several models in order) |
| API key storage | server-side environment variables; keys never reach the client |
| server-side request flow | server routes only |
| rate limits | `lib/ai-quota.ts` (434 lines), atomic via the `consume_ai_quota()` Postgres RPC from migration `005`, plus `add_ai_tokens` |
| model configuration | per-provider inside `ai.service.ts` |
| fallback/error handling | provider chain with per-provider failure handling |
| safe to reuse? | **yes** |

Existing quota surface:

    export type AiFeature = "chat" | "generate" | "followup" | "scan_invoice" | "parse_listing" | "dashboard_summary";

    const DEFAULT_LIMITS: Record<AiFeature, FeatureLimit> = {
      chat: { requests: 15, burst: 10 }, generate: { requests: 40, burst: 8 },
      followup: { requests: 30, burst: 8 }, scan_invoice: { requests: 20, burst: 5 },
      parse_listing: { requests: 20, burst: 5 }, dashboard_summary: { requests: 6, burst: 3 },
    };

Per-feature overrides come from `AI_LIMIT_<FEATURE>` environment
variables. The guard API is
`enforceAiQuota({feature, req, userId, role, estimatedTokens})`, followed
by `.commit(tokens)`.

**Adding a CRM AI feature therefore means:** a new value in the
`AiFeature` union, an entry in `DEFAULT_LIMITS`, a server route that
follows the pattern already established in `app/api/ai/followup/route.ts`
(`requireRole`, schema validation, markdown stripping of the model
output). No second AI architecture.

**The reference pattern already exists.** `app/api/ai/followup/route.ts`
uses `requireRole(["agent","admin","super_admin"])`, validates the body
against a schema, and strips markdown characters from the generated text
before returning it. Copy that shape.

**Two bugs already fixed in this repository, recorded in the code's own
comments, that a new CRM AI route must not reintroduce:**

-   `/api/chat` once used the **browser** Supabase client on the server,
    so `getUser()` always returned null and every caller looked
    anonymous
-   `/api/ai/followup` once read `userRole` from the **request body**, so
    anyone could send `{"userRole":"super_admin"}`

**The main gap: `requireRole` is not `verify Lead access`.** §11 of this
document requires per-Lead authorization before an AI call. Nothing
implements that today. Until PHASE 1B provides a server-side Lead
authorization check, a CRM AI endpoint would be exactly the backdoor §11
warns about --- and it would be a worse one than the UI, because it
returns synthesized content rather than rows, which is harder to notice
in review.

**Ordering is not negotiable.** CRM AI is PHASE 7. It must not be
implemented before authorization, ownership, RLS, audit and risk
foundations are complete. AI must never be part of the authorization
path: it is a consumer of already-authorized data, never a producer of
authorization decisions.

## 1. Existing AI Infrastructure

**CURRENT STATE --- inspection complete, see §0.**

Before implementing CRM AI:

1.  inspect the existing chatbot implementation
2.  identify provider abstraction
3.  inspect API key storage
4.  inspect server-side request flow
5.  inspect rate limits
6.  inspect model configuration
7.  inspect fallback/error handling
8.  determine whether the service can safely be reused

Do not create a second AI architecture without a technical reason.

Result: the service can safely be reused. Reuse it.

## 2. AI Is Advisory

**TARGET STATE.**

Authoritative systems remain:

-   PLM backend business rules
-   permissions
-   ownership
-   pipeline rules
-   System Logs
-   RLS
-   Admin/Super Admin verification

AI can:

-   summarize
-   recommend
-   draft
-   explain
-   analyze

AI cannot override authoritative rules.

**CURRENT STATE caveat.** Four of the seven authoritative systems listed
above are currently incomplete for the CRM --- permissions at row level,
ownership, System Logs, and RLS. "AI is advisory" is only meaningful once
the systems it defers to actually exist. This is the concrete reason AI
is PHASE 7 rather than earlier.

## 3. Lead Summary

**TARGET STATE --- not implemented.**

AI may summarize:

-   customer interest
-   budget
-   recent business activity
-   pipeline
-   Follow-Ups
-   next action

Use on-demand generation or cached results.

## 4. Lead Priority

**TARGET STATE --- not implemented.**

AI may recommend:

-   HOT
-   WARM
-   COLD

This is a recommendation.

Do not automatically change pipeline status because of AI.

## 5. Next Action

**TARGET STATE --- not implemented.**

AI may recommend:

-   contact customer
-   WhatsApp
-   arrange viewing
-   send property details
-   clarify budget
-   schedule Follow-Up

The Agent chooses whether to act.

## 6. Follow-Up Recommendation

**TARGET STATE --- partially available, not CRM-integrated.**

AI may propose:

-   action
-   suggested timing
-   reason

Agent can accept, edit, or reject.

**CURRENT STATE.** `aiService.generateFollowup` and
`app/api/ai/followup/route.ts` already exist and are role-guarded. They
are not Lead-authorization-aware, so integrating them into the CRM
requires §11 first.

## 7. WhatsApp Draft

**TARGET STATE --- not implemented.**

AI may generate a draft based on authorized Lead information.

The Agent must review it.

AI must not automatically send external WhatsApp messages.

**CURRENT STATE note.** This feature touches the phone-masking rule
directly. A draft must be generated from the representation the caller is
permitted to see. Do not send a full customer number into a prompt for a
role that is not allowed to see it, and do not return one in the draft.
Depends on PHASE 1B secure phone representation.

## 8. CRM Analyst

**TARGET STATE --- not implemented.**

Admin/Super Admin may ask operational questions such as:

-   Which Leads need attention today?
-   Which Follow-Ups are overdue?
-   Which Leads are in Negotiation?
-   Which Leads have no next action?

The backend must first retrieve authorized data.

AI must never receive unrestricted database access.

**CURRENT STATE note.** "Which Follow-Ups are overdue?" is not currently
answerable from stored data --- there is no persisted `OVERDUE` state
(`docs/crm/05-follow-up-rules.md` §8). Several analyst questions depend on
PHASES 3 and 4 landing first.

## 9. Risk Explanation

**TARGET STATE --- not implemented; depends on PHASE 6.**

The Risk Engine identifies objective signals.

AI may explain them.

Example:

Rules:

-   same normalized phone
-   same property
-   original Lead became Lost
-   similar Lead appeared later

AI explanation:

"This pattern may warrant review because the same customer indicators
appear across two Lead records."

AI must not conclude:

"Agent committed fraud."

The stored reasons must come from the deterministic rules. An AI
explanation is presentation, never the record --- see
`docs/crm/07-risk-engine.md` §12.

## 10. AI Data Minimization

**TARGET STATE.**

Send only required information.

Never send:

-   passwords
-   API keys
-   sessions
-   unnecessary security metadata
-   unrelated Agent records
-   unrelated Leads
-   unnecessary investigation data

Add to that list: **full phone numbers for roles not permitted to see
them**.

## 11. AI Authorization

**TARGET STATE --- not implemented. This is the blocking gap.**

Before an AI request:

-   authenticate user
-   verify role
-   verify Lead access
-   verify requested AI operation

An Agent cannot use an AI endpoint as a backdoor to analyze another
Agent's protected Lead.

**CURRENT STATE.** Steps 1 and 2 exist (`lib/api-auth.ts`, `requireRole`).
Steps 3 and 4 do not exist anywhere in the project. Step 3 is created by
PHASE 1B; until then, no CRM AI endpoint may be shipped.

## 12. AI Gateway

**CURRENT STATE --- already built.** `services/ai.service.ts` plus
`lib/ai-quota.ts` cover:

-   provider fallback --- yes, Agnes → Groq → Gemini
-   timeout --- per provider
-   retry --- via the fallback chain
-   rate limit --- yes, per feature, atomic through a Postgres RPC
-   token limit --- yes, `estimatedTokens` / `.commit(tokens)`
-   usage tracking --- yes, `ai_usage` table
-   error handling --- yes

Use it. Do not build a parallel gateway.

## 13. Free API Quota

**TARGET STATE.**

Do not call AI on every page render.

Prefer:

-   explicit button
-   cached summary
-   event-based generation only where justified

Invalidate cached AI output after meaningful Lead changes.

**CURRENT STATE.** Quota enforcement exists; **caching and invalidation
do not**. There is no AI result cache and no invalidation hook. Build
both with PHASE 7, and note that invalidation depends on the CRM emitting
meaningful change events --- which is PHASE 2.

## 14. AI Output

**CURRENT STATE --- pattern already established.**

Treat AI output as untrusted generated content.

Validate expected format and length.

Never execute AI output as code, SQL, or privileged commands.

`app/api/ai/followup/route.ts` already validates its input against a
schema and strips markdown characters (`[\*_#~\`]`) from the model
output. Follow the same approach for CRM AI routes.

## 15. AI and CRM State

**TARGET STATE.**

AI must not directly:

-   change owner
-   mark Lost
-   verify Deal
-   mark Won
-   modify permissions
-   delete records
-   delete audit logs
-   create, modify or dismiss a risk flag

Any state change must go through ordinary authorized backend operations.

**CURRENT STATE note.** For most of this list there is currently no
"ordinary authorized backend operation" to route through --- pipeline
changes, ownership changes and Follow-Up mutations all bypass the server
entirely today. This rule becomes enforceable after PHASES 1B, 3 and 4.

## 16. Failure

**TARGET STATE.**

AI failure must not break:

-   Leads
-   Pipeline
-   Follow-Ups
-   authentication
-   authorization
-   System Logs
-   RLS

AI is optional.

**CURRENT STATE.** The existing chatbot already degrades through the
provider fallback chain rather than failing hard. Preserve that
behaviour: a CRM AI panel that fails must leave the Lead workspace fully
usable.

# END
