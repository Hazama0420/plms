# PLM CRM --- Roles and Permissions

> **Document status:** revised in PHASE 0.5 --- Documentation Reconciliation,
> 2026-08-08.
>
> **CURRENT STATE** = verified by the PHASE 0 audit.
> **TARGET STATE** = intended design, not implemented unless stated.
>
> A TARGET STATE rule is never evidence that a control exists.

## 0. CURRENT STATE --- Enforcement Reality

The whole of this document, except this section, describes TARGET STATE.
The audit found the following:

**There is no complete server-side CRM authorization layer.**
`services/crm.service.ts` line 2 imports the browser Supabase client:

    import { supabase } from "@/lib/supabase/client";

That is `createBrowserClient` with the anon key. Around 30 CRM functions
--- `getLeads`, `getLeadById`, `updateLead`, `updateStatus`,
`deleteLead`, `getFollowups`, `updateFollowup`, `deleteFollowup`,
`bulkAssign`, `bulkUpdateStatus`, `getCRMStats`, `getLeadsReport` and
others --- run browser → PostgREST directly. There are no CRM server
actions.

Consequence: for the CRM, layer 2 of the four listed in §1 is not in the
path. RLS is effectively the only boundary, and it has holes.

**Undocumented roles.**

| Role | In `UserRole` (`types/user.types.ts`) | In `is_internal_staff()` RLS |
| --- | --- | --- |
| `super_admin` / `superadmin` | yes | yes |
| `admin` | yes | yes |
| `agent` | yes | yes |
| `marketing` | yes | no |
| `viewer` | yes | no |
| `commissioner` | **no** | **yes** |

`commissioner` can read every `crm_lead`, `crm_contact` and
`crm_activity` and appears in no permission review because the
application layer does not know it exists. Resolve in PHASE 1B.

**`manage_own_crm` is not enforced at row level.** RLS uses
`is_internal_staff()`, which does not distinguish "own" from "all".

**`normalizeRole`** in `lib/permissions.ts` maps `"superadmin"` →
`"super_admin"` and any unknown role → `"viewer"`. Any new role check
must handle both spellings; a past 403 bug in
`app/api/leads/[id]/follow-up/route.ts` came from raw role matching that
omitted `'superadmin'`.

## 1. Permission Architecture

**TARGET STATE.**

PLM uses:

1.  `proxy.ts`
2.  `lib/api-auth.ts`
3.  `lib/permissions.ts`
4.  Supabase RLS

CRM authorization must be enforced through the authoritative backend
layer and protected by RLS.

Frontend hiding is not sufficient.

**CURRENT STATE.** Layers 2 and 3 are used by exactly four API routes and
by `proxy.ts` route gating. They are not used by the CRM data layer at
all. See §0.

## 2. Super Admin

**TARGET STATE.**

Super Admin may:

-   view all Leads
-   view full phone numbers
-   assign and reassign Leads
-   view all Follow-Ups
-   view authorized Timeline/Audit information
-   review Risk Flags
-   investigate suspicious patterns
-   verify Deals
-   perform authorized administrative overrides
-   access System Logs

Sensitive actions must be audited.

**CURRENT STATE.** Read/write access works. Risk Flags and Deal
verification do not exist. Audit of CRM actions does not exist
(`admin_audit_log` has zero CRM events). `admin_audit_log` is readable by
Super Admin only, via `is_super_admin()`, and is not writable through
PostgREST by anyone --- that part is correct and should be preserved.

## 3. Admin

**TARGET STATE.**

Admin may:

-   view all operational Leads
-   view full phone numbers
-   assign/reassign Leads
-   view all Follow-Ups
-   manage Follow-Ups
-   monitor Agents
-   review Risk Flags
-   verify submitted Deals
-   perform authorized overrides

Do not automatically grant system-level privileges beyond existing PLM
permission definitions.

**CURRENT STATE.** Read/write works via `is_staff()`. Deal verification
and Risk Flags do not exist. Overrides are not distinguishable from
ordinary writes because nothing is audited.

## 4. Agent

**TARGET STATE.**

Agent may:

-   view assigned Leads
-   view permitted Lead details
-   view property interests
-   create/manage Follow-Ups for authorized Leads
-   perform permitted pipeline transitions
-   submit Deal information

Agent must not:

-   claim arbitrary Leads
-   change Lead ownership
-   view another Agent's private Lead data
-   view internal risk investigations
-   verify their own Deal
-   delete audit records
-   retrieve full phone numbers if PLM's masking policy applies
-   create Follow-Ups for unauthorized Leads

**CURRENT STATE --- most of the "must not" list is not enforced.**

| Prohibition | Enforced today? | Why |
| --- | --- | --- |
| claim arbitrary Leads | **accidentally yes** | `crm_leads_update` has no matching branch for an unassigned Lead, so the update fails. This also blocks legitimate assignment --- see `docs/crm/03-lead-governance.md` §3 |
| change Lead ownership | **no** | `crm_leads_update` has no `WITH CHECK`, so USING is reused as WITH CHECK; for a Lead where `created_by = auth.uid()` an Agent may set `assigned_to` to anyone |
| view another Agent's Lead data | **no** | `crm_leads_select` is `is_internal_staff()`; every Agent reads every Lead |
| view internal risk investigations | n/a | Risk Engine does not exist |
| verify their own Deal | **no** | no verification step exists; an Agent can set `status = "won"` |
| delete audit records | **partially** | `admin_audit_log` is protected. `crm_activities`, which the admin UI presents as System Logs, is **updatable by its own author** (`user_id = auth.uid()`) |
| retrieve full phone numbers | **no** | see §6 |
| create Follow-Ups for unauthorized Leads | **no** | `app/api/leads/[id]/follow-up/route.ts` checks role but not Lead ownership |

## 5. Viewer/Guest

**CURRENT STATE --- enforced at the route layer.**

Viewer/Guest:

-   cannot access CRM
-   cannot access Leads
-   cannot access Follow-Ups
-   cannot access CRM System Logs

`canAccessRoute` default-denies and CRM requires one of
`manage_own_crm`, `manage_all_crm`, `view_all_crm`, `view_own_crm`.

**CURRENT STATE caveat.** Route denial is not data denial. An
unauthenticated visitor holding the anon key can still read
`crm_followups` and `crm_interests` directly through PostgREST, because
those two tables have no RLS. See `docs/crm/05-follow-up-rules.md` §0.

## 6. Phone Number

**TARGET STATE.**

-   Super Admin: full number
-   Admin: full number
-   Agent: masked number

The backend must return only the permitted representation.

Do not send the full number to the browser and mask it only with CSS.

**CURRENT STATE --- this rule is violated. Masking is client-side
cosmetics.**

`services/crm.service.ts` `getLeads` selects
`*, contact:crm_contacts(*)`, so the real number is in the network
payload. The UI then replaces it at render time. Representative code,
`app/(dashboard)/crm/leads/page.tsx`:

    const isAdminOrSuperAdmin = useMemo(() => (
      currentUserRole === "super_admin" || currentUserRole === "superadmin" || currentUserRole === "admin"
    ), [currentUserRole]);

    // MASKING NOMOR TELEPON TOTAL UNTUK ROLE AGENT
    const formatPhoneForUser = useCallback((phone?: string) => {
      if (!phone) return "-";
      if (isAdminOrSuperAdmin) return phone;
      return "08xx-xxxx-xxxx";
    }, [isAdminOrSuperAdmin]);

The real number is readable from the DevTools Network tab. Eight sites
implement the same cosmetic mask, all returning the literal
`"08xx-xxxx-xxxx"`:

-   `app/(dashboard)/crm/leads/page.tsx`
-   `app/(dashboard)/crm/leads/[id]/page.tsx`
-   `app/(dashboard)/crm/followups/page.tsx`
-   `app/(dashboard)/crm/followups/create/page.tsx`
-   `app/(dashboard)/crm/followups/[id]/page.tsx`
-   `app/(dashboard)/crm/followups/[id]/edit/page.tsx`
-   `components/crm/AgentActivityMonitor.tsx`
-   `components/crm/CrmKanbanBoard.tsx`

A separate regex-based `maskPhoneNumbers` (→ `"xxxxxx"`) exists in
`app/properties/[id]/page.tsx`; that is a different mechanism for a
different surface.

Independently of the UI, `crm_contacts` SELECT is `is_internal_staff()`,
so an Agent can query `crm_contacts` directly through PostgREST and
bypass the UI entirely.

Secure phone representation is PHASE 1B.

## 7. Timeline

**TARGET STATE.**

Agent should not see sensitive administrative Timeline information.

Admin/Super Admin may see appropriate historical information according
to their role.

Risk investigation details remain restricted.

**CURRENT STATE.** There is no separation. `crm_activities` SELECT is
`is_internal_staff()`, so any internal role reads all activity rows.
Business activity and audit are not distinguished. See
`docs/crm/06-audit-system.md` §3.

## 8. Follow-Up Visibility

**TARGET STATE.**

Agent: only Follow-Ups associated with authorized Leads.

Admin: all operational Follow-Ups.

Super Admin: all operational Follow-Ups.

**CURRENT STATE --- there is no visibility control of any kind.**
`crm_followups` has **no RLS**. It is readable and writable by anyone
holding the anon key, including logged-out visitors. The UI applies
`.eq("assigned_to", userId)` on the Follow-Ups query, which is a
convenience filter, not a boundary. This is the highest-severity finding
of the audit and is addressed in PHASE 1A.

## 9. Ownership

**TARGET STATE.**

Agent: cannot change owner.

Admin: can assign/reassign.

Super Admin: can assign/reassign.

Every ownership change is audited.

**CURRENT STATE.** An Agent **can** change `assigned_to` on a Lead where
`created_by = auth.uid()`, because `crm_leads_update` declares no
`WITH CHECK` and Postgres therefore reuses the USING expression as the
WITH CHECK expression --- the modified row still satisfies the
`created_by` branch.

No ownership change is audited, and no assignment history table exists,
so a reassignment leaves no trace of the previous owner.

## 10. API Rule

**TARGET STATE.**

For every CRM endpoint/server action:

1.  authenticate
2.  determine role
3.  verify Lead/entity access
4.  verify operation permission
5.  perform operation
6.  write audit event where required

**CURRENT STATE.** There are almost no CRM endpoints to apply this to.
Steps 1--2 are implemented in `lib/api-auth.ts` (`getAuthContext` always
uses `supabase.auth.getUser()`, never `getSession()`; blocked statuses
return null) and are used by four routes. Steps 3, 4 and 6 are
implemented nowhere in the CRM.

Building this is PHASE 1B, and step 6 depends on PHASE 2.

**Known pitfalls, recorded from bugs already fixed in this repository:**

-   never use the browser Supabase client in a server route ---
    `getUser()` will always return null (`/api/chat`, fixed)
-   never read the caller's role from the request body --- anyone can
    send `{"userRole":"super_admin"}` (`/api/ai/followup`, fixed)
-   always accept both `super_admin` and the legacy `superadmin`
    spelling (`/api/leads/[id]/follow-up`, fixed)

# END
