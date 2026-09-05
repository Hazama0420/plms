# PLM CRM --- Lead Governance

> **Document status:** revised in PHASE 0.5 --- Documentation Reconciliation,
> 2026-08-08.
>
> **CURRENT STATE** = verified by the PHASE 0 audit.
> **TARGET STATE** = intended design, not implemented unless stated.
>
> A TARGET STATE rule is never evidence that a control exists.

## 0. CURRENT STATE --- Audit Summary for This Document

| Rule | Implemented? |
| --- | --- |
| §1 ownership model | partially --- ownership columns exist, assignment history does not |
| §2 assignment recording | **no** |
| §3 Agent cannot self-claim | accidentally blocked, not governed --- see §3 |
| §4 Lead visibility scoped to Agent | **no** --- every Agent reads every Lead |
| §5 Lead directory masks phone numbers | **no** --- masking is client-side only |
| §6 source immutable | partially --- the intake route ignores client input, nothing protects later edits |
| §7 duplicate detection | **no** |
| §8 phone normalization | **no** |
| §9 unauthorized access rejected and logged | **no** |
| §10 reassignment preserves history | **no** |
| §11 company/personal classification | n/a --- feature does not exist |

Ownership columns referenced by RLS and by the UI are `assigned_to`,
`created_by` and `user_id` on `crm_leads`. Note that `CRMLead` in
`types/crm.types.ts` declares **neither** `created_by` nor `user_id`,
even though `crm_leads_update` and `canModifyLead` in
`app/(dashboard)/crm/leads/page.tsx` both depend on them. The actual
column set can only be confirmed against the live database --- see
`docs/project-rules.md` §15.

## 1. Ownership Model

**TARGET STATE.**

Every company Lead should have:

-   Lead ID
-   source
-   creation timestamp
-   responsible Agent when assigned
-   assignment history

Use existing schema where possible.

**CURRENT STATE.** The first four exist as columns. **Assignment history
does not exist** --- there is no history table and no audit event, so
changing `assigned_to` overwrites the previous owner with no trace.

## 2. Assignment

**TARGET STATE.**

New Lead may initially be:

`UNASSIGNED`

Then:

`ASSIGNED`

Assignment should record:

-   previous owner if any
-   new owner
-   actor
-   timestamp

**CURRENT STATE.** Nothing about an assignment is recorded. Website Leads
are inserted with the service-role client, so `created_by` is NULL and
`assigned_to` is either NULL or the `DEFAULT_AGENT_UUID` fallback
resolved by `resolveAgentContact()` in `app/api/leads/route.ts`.

## 3. Agent Cannot Self-Claim Arbitrary Leads

**TARGET STATE.**

An Agent must not be able to select any Lead from the complete database
and assign it to themselves.

The server must enforce this.

**CURRENT STATE --- the outcome is correct but the cause is a defect, and
it also blocks the legitimate path.**

`crm_leads_update` USING is:

    public.is_staff() or assigned_to = auth.uid() or created_by = auth.uid()

For an unassigned website Lead, `assigned_to` and `created_by` are both
NULL, so an Agent satisfies no branch and the UPDATE is rejected by RLS.
Self-claim is therefore impossible today --- not because a rule forbids
it, but because no policy branch permits any Agent write to an unassigned
Lead.

The same gap blocks assignment as a legitimate operation. §2 above
recognises an `UNASSIGNED → ASSIGNED` transition, and there is currently
no way to perform it as an Agent and no server route that performs it as
an Admin.

**Decision required in PHASE 1B.** Tightening ownership without providing
an authorized assignment path would leave website Leads permanently
unassignable. The path must exist --- through Admin, or through a bounded
and audited claim mechanism --- and it must be explicit rather than a
side effect of a policy expression.

**CURRENT STATE --- the inverse hole.** `crm_leads_update` declares no
`WITH CHECK`, so Postgres reuses USING as WITH CHECK. On a Lead where
`created_by = auth.uid()`, an Agent may set `assigned_to` to any user:
the modified row still satisfies the `created_by` branch. An Agent can
therefore hand a Lead they created to someone else, which §9 of
`docs/crm/02-roles-permissions.md` forbids.

## 4. Lead Visibility

**TARGET STATE.**

Agent:

-   assigned Leads
-   explicitly shared Leads, if PLM implements sharing

Admin/Super Admin:

-   all operational Leads according to role

Do not solve collaboration by making the entire Lead database equally
visible to every Agent.

**CURRENT STATE --- exactly what the last sentence forbids is what
happens.** Two independent causes:

1.  `crm_leads_select` is `public.is_internal_staff()` with no ownership
    branch, so at the database level every internal role reads every
    Lead.
2.  `services/crm.service.ts` `getLeads` defaults `assigned_to` to
    `"all"`, and `app/(dashboard)/crm/leads/page.tsx` calls it with
    `{search, status, page, limit}` and **no ownership filter**. The
    `.eq("assigned_to", userId)` filter in that file applies to the
    Follow-Ups query only, not to Leads.

The `search` term is also applied client-side after the fetch, so even
searching operates over the full dataset.

Fixing this requires both a policy change and a data-layer change.
PHASE 1B.

## 5. Existing Lead Directory

**CURRENT STATE --- corrected.** The previous revision of this document
stated that the Leads directory shows broader Lead information "while
masking phone numbers". That is inaccurate and was one of the more
consequential documentation errors found by the audit: it described
masking as an effective control.

What actually happens is that the full `crm_contacts` row, including the
real phone number, is fetched into the browser and the number is replaced
at render time. See `docs/crm/02-roles-permissions.md` §6.

**TARGET STATE.**

The upgrade should move toward least-privilege access.

If a field is not needed for an Agent to work a Lead, do not expose it.

"Expose" means *do not send it to the client*, not *do not display it*.

## 6. Lead Source

**TARGET STATE.**

Original Lead source must be immutable or protected from Agent
modification.

Example:

`WEBSITE → PROPERTY_WHATSAPP_FORM`

If an administrative correction is needed, record it as an audited
change.

**CURRENT STATE --- partially protected at intake only.**
`app/api/leads/route.ts` ignores a body-supplied `assigned_to` and forces
`status: "new"`, which is good. But once the Lead exists, any writable
column can be changed through PostgREST by anyone whose RLS branch
matches, and no change is audited. Whether dedicated source columns exist
cannot be confirmed from the repository.

## 7. Duplicate Detection

**TARGET STATE --- not implemented.**

Potential duplicates may be detected using:

-   normalized phone
-   email where available
-   customer name
-   property interest

Never automatically delete a possible duplicate.

Create a reviewable duplicate signal.

**CURRENT STATE.** The intake route reuses an existing open Lead for a
matching contact, which prevents some duplicates at creation time. There
is no detection of duplicates created by other paths, and no duplicate
signal or review surface. Depends on §8. Delivery is PHASE 6.

## 8. Phone Normalization

**TARGET STATE --- not implemented.**

Normalize phone numbers for matching.

Example:

`08123456789`

and

`+628123456789`

may represent the same customer.

Keep original display data if required; use normalized value for
comparison.

**CURRENT STATE.** No normalized phone column and no normalization at
write time. `toWaNumber()` in `app/api/leads/route.ts` formats a number
for a WhatsApp link; it does not persist a normalized value for matching.

**Sequencing note.** The Risk Engine (PHASE 6) and duplicate detection
(§7) both depend on this. The column should be introduced and backfilled
early --- ideally with PHASE 4 --- so that data accumulated during
PHASES 2--5 already carries the normalized value, rather than backfilling
a larger dataset later.

## 9. Unauthorized Access

**TARGET STATE --- not implemented.**

If Agent A requests Agent B's protected Lead:

-   backend authorization rejects it
-   appropriate HTTP error is returned
-   optional security event is logged

Do not return partial sensitive data before authorization.

**CURRENT STATE.** None of the three happens. There is no backend to
reject the request --- reads go browser → PostgREST --- and RLS currently
permits the read, so it is not an unauthorized access at the database
level at all. No security event is recorded.

Recording such events also has a structural obstacle:
`crm_activities.lead_id` is NOT NULL, so an attempt against a
non-existent or unrelated Lead ID cannot be written there. See
`docs/crm/06-audit-system.md` §4.

Rejection is PHASE 1B; logging is PHASE 2.

## 10. Reassignment

**TARGET STATE --- not implemented.**

Reassignment should preserve historical ownership.

Do not overwrite the history.

Example:

Lead 123: Agent A → Agent B

The audit history should retain both states.

**CURRENT STATE.** `assigned_to` is overwritten in place. There is no
history table and no audit event, so the previous owner is unrecoverable.
Delivery is PHASE 2 for the audit trail; PHASE 1B for the rules that
govern who may reassign.

## 11. Personal/Company Classification

**TARGET STATE.**

If PLM later supports a personal Lead source or manually created Lead
type, company-origin Leads must remain identifiable.

Do not allow an Agent to convert a company Lead into a personal Lead
without an explicit authorized workflow and audit trail.

**CURRENT STATE.** No personal Lead type exists, so the rule is not yet
applicable. It becomes a hard requirement the moment such a type is
introduced, and it depends on §6 source protection being real.

# END
