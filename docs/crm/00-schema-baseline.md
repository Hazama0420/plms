# PLM CRM --- Database Schema Baseline

> **Document status:** created in PHASE 1A --- Emergency Security Hardening,
> 2026-08-08. Extended in PHASE 1B --- CRM Ownership & Role Hardening,
> 2026-08-08.
>
> Records the verified state of the five CRM tables as established by the
> PHASE 0.75 audit (W-1 through W-5), plus the changes made by PHASE 1A
> (migration `012`) and PHASE 1B (migrations `013` and `014`).
>
> **VERIFIED** = observed directly, with the method stated.
> **NOT VERIFIED** = not established by this audit. Never fill these in by
> inference.
>
> Two grades of VERIFIED are used from PHASE 1B onward and are never merged:
> **AUTOMATED** = asserted by `node scripts/verify-rls.mjs`, reproducible by
> re-running it. **MANUAL** = observed once by the project owner in the
> Supabase SQL Editor or the running application, reported here, not
> reproducible from this repository. A MANUAL result is evidence; it is not
> an automated assertion and must never be counted as one.
>
> This document describes what **is**. It is not a design document and does
> not authorize any change.

## 0. Why This Document Exists

There is no `CREATE TABLE` statement for any CRM table anywhere in
`supabase/migrations/`. `crm_leads` and `crm_contacts` appear only in
later RLS migrations; `crm_followups`, `crm_interests` and
`crm_activities` were created manually in the SQL Editor and are not
mentioned in any file at all.

The practical consequence: **the CRM schema cannot be reconstructed from
this repository.** This document is the closest thing to a written record
and exists so that later phases have a baseline to work against. It is
deliberately *not* a reconstruction --- no `CREATE TABLE` is inferred, no
`supabase db pull` was run, and columns that were not observed are marked
`NOT VERIFIED` rather than guessed.

**How the data was obtained.** Sections marked *SQL Editor* come from
queries run by the project owner against `pg_policies`, `pg_constraint`,
`pg_indexes`, `information_schema.role_table_grants` and `pg_trigger`.
Sections marked *PostgREST* were observed from this repository using the
anon and service-role keys over HTTP. `pg_catalog` and
`information_schema` are unreachable through PostgREST (`404 PGRST205`),
which is why the two methods are separated.

## 1. Tables

**VERIFIED --- PostgREST OpenAPI, 2026-08-08.**

| Table | Columns | NOT NULL (besides PK) | Rows |
| --- | --- | --- | --- |
| `crm_leads` | 12 | `contact_id` | 10 |
| `crm_contacts` | 12 | `full_name` | 13 |
| `crm_interests` | 8 | `lead_id`, `property_id` | 10 |
| `crm_followups` | 9 | `lead_id`, `followup_date` | 3 |
| `crm_activities` | 6 | `lead_id`, `activity_type` | 9 |

Two absences that matter to application code:

-   **`crm_followups` has no `created_by` column.** Four code sites read
    it --- see §10.
-   **`crm_activities` has no `updated_at` column.** The TypeScript type
    declares one --- see §10.

`crm_activities` also has no `assigned_to`; its actor column is
`user_id`.

## 2. RLS Status

RLS is enabled on all five tables. Every policy is bound to the
`authenticated` role. **No policy uses `USING (true)`.**

### 2.1 Before PHASE 1B --- historical

**VERIFIED --- SQL Editor (W-1), after the owner's direct RLS repair.**
Kept for the record; superseded by §2.2.

| Table | SELECT | INSERT | UPDATE | DELETE |
| --- | --- | --- | --- | --- |
| `crm_leads` | `is_internal_staff()` | `is_internal_staff()` | `is_internal_staff() OR assigned_to = auth.uid() OR created_by = auth.uid()` | `is_staff() OR created_by = auth.uid()` |
| `crm_contacts` | `is_internal_staff()` | `is_internal_staff()` | `is_internal_staff()` | `is_staff()` |
| `crm_interests` | `is_internal_staff()` | `is_internal_staff()` | `is_internal_staff()` | `is_staff()` |
| `crm_followups` | `is_internal_staff()` | `is_internal_staff()` | `is_internal_staff() OR assigned_to = auth.uid()` | `is_staff()` |
| `crm_activities` | `is_internal_staff()` | `is_internal_staff()` | `is_internal_staff() OR user_id = auth.uid()` | `is_staff()` |

**Read the OR branches carefully.** PERMISSIVE policies combine with
`OR`, so the `is_internal_staff()` branch already granted every internal
role full access, and the ownership branches beside it restricted
nothing. The same applied to SELECT: `is_internal_staff()` meant an Agent
read **every** Lead, not only their own.

### 2.2 After PHASE 1B --- migration `013`

Applied by the project owner, 2026-08-08. Twenty policies replaced, all
written `TO authenticated` explicitly, every UPDATE carrying an explicit
`WITH CHECK` rather than relying on Postgres copying `USING`.

Ownership of a Lead, reused by every table:

    assigned_to = auth.uid() OR created_by = auth.uid() OR assigned_to IS NULL

| Table | SELECT | INSERT | UPDATE | DELETE |
| --- | --- | --- | --- | --- |
| `crm_leads` | `is_crm_reader()` OR ownership inline | `is_staff() OR assigned_to = uid() OR created_by = uid()` | ownership, `USING` = `WITH CHECK` | `is_staff()` **(tightened)** |
| `crm_contacts` | `is_crm_reader() OR crm_contact_visible(id)` | `is_internal_staff()` --- see below | `is_staff() OR crm_contact_visible(id)` | `is_staff()` |
| `crm_interests` | `is_crm_reader() OR crm_lead_visible(lead_id)` | `is_staff() OR crm_lead_visible(lead_id)` | same | `is_staff() OR crm_lead_visible(lead_id)` **(loosened)** |
| `crm_followups` | `is_crm_reader() OR assigned_to = uid() OR crm_lead_visible(lead_id)` | `is_staff() OR crm_lead_visible(lead_id)` | + `assigned_to = uid()` | `is_staff()` |
| `crm_activities` | `is_crm_reader() OR user_id = uid() OR crm_lead_visible(lead_id)` | `user_id = uid() AND (is_staff() OR crm_lead_visible(lead_id))` | `is_staff() OR user_id = uid()` | `is_staff()` |

Helper membership:

-   `is_staff()` --- `admin`, `super_admin`, `superadmin`
-   `is_internal_staff()` --- `agent`, `admin`, `super_admin`,
    `superadmin`, `commissioner` --- **unchanged**, still used by
    `properties`, `property_owners`, `invoices`, `system_settings` and
    `users`
-   `is_crm_reader()` --- **new** --- `admin`, `super_admin`,
    `superadmin`, `marketing`, `commissioner`. Deliberately excludes
    `agent`; that is what makes the ownership branches bite

`crm_contacts_insert` is the one policy that keeps `is_internal_staff()`.
Decision no.8 forbids that helper *where it defeats an ownership branch*;
on a brand-new contact row there is no ownership to defeat and no other
branch in the policy. Keeping it preserves the Quick Contact dialog
(`crm/leads/create/page.tsx:308-317`,
`crm/leads/[id]/edit/page.tsx:326-335`). A newly created contact is always
orphaned, so its creator sees it immediately via the orphan branch of
`crm_contact_visible()`.

`crm_interests` DELETE is the only **loosening** in 013. It was
`is_staff()`; `crm/leads/[id]/edit/page.tsx:376` deletes interest rows as
a normal part of editing a Lead, so for an Agent the delete failed
silently (zero rows, error unchecked) while the following INSERT
succeeded --- property interests accumulated duplicates on every edit.
Ownership-scoped DELETE fixes that.

`rls_auto_enable()` is `SECURITY DEFINER` with
`SET search_path = pg_catalog` and performs only
`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`. It **creates no policies**.
The event trigger `ensure_rls` invokes it on `ddl_command_end`. Any new
table therefore arrives with RLS on and no policy --- closed, not open.
That is fail-safe, but a forgotten policy will present as an empty table
rather than an error.

`rls_auto_enable()` is `SECURITY DEFINER` with
`SET search_path = pg_catalog` and performs only
`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`. It **creates no policies**.
The event trigger `ensure_rls` invokes it on `ddl_command_end`. Any new
table therefore arrives with RLS on and no policy --- closed, not open.
That is fail-safe, but a forgotten policy will present as an empty table
rather than an error.

## 3. Grants

**VERIFIED --- SQL Editor (W-2), before PHASE 1A.**

| Table | anon, before PHASE 1A |
| --- | --- |
| `crm_leads` | `REFERENCES, SELECT, TRIGGER, TRUNCATE` |
| `crm_contacts` | `DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE` |
| `crm_interests` | `DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE` |
| `crm_followups` | `DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE` |
| `crm_activities` | `DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE` |

Root cause: the revoke loop in `007_rls_properties_users_billing.sql`
§8 lists eleven tables and includes only `crm_leads` from this group.

**PHASE 1A change --- migration `012`:** `INSERT, UPDATE, DELETE,
TRUNCATE` revoked from `anon` on all five tables. Grants for
`authenticated` and `service_role` are untouched, and no policy was
changed.

Confirmed independently over PostgREST using zero-row filters
(`id = 00000000-0000-0000-0000-000000000000`), so no row could be
touched either way:

| Table | UPDATE / DELETE before | after |
| --- | --- | --- |
| `crm_leads` | `401 42501` | `401 42501` |
| `crm_contacts` | `204` (statement accepted) | `401 42501` |
| `crm_interests` | `204` | `401 42501` |
| `crm_followups` | `204` | `401 42501` |
| `crm_activities` | `204` | `401 42501` |

`204` means the table privilege passed and the statement ran; zero rows
changed only because nothing matched the filter. `42501` is the intended
state: refused before RLS is consulted.

**This distinction is the whole point of PHASE 1A.** For UPDATE and
DELETE, a non-matching policy filters rows rather than refusing the
statement. While the privilege exists, one new policy that mistakenly
includes `anon` means data loss; without the privilege, the request never
gets that far. PHASE 1B writes new policies on exactly these four tables.

**PHASE 1B change --- migration `013`:** `SELECT` revoked from `anon` on
all five tables, closing M-12. Verified 2026-08-08 --- all five now
answer `42501` with `permission denied`, where before they answered `200`
with zero rows. The distinction matters: zero rows meant the privilege
was present and only RLS was holding, so the exposure was one loose
policy away.

The probe deliberately uses `.select('id').limit(1)` rather than
`head: true`. A HEAD request carries no response body, so the PostgREST
error code never reaches the caller and every refusal reads alike.

`REFERENCES` and `TRIGGER` for `anon` are Supabase defaults and were left
alone. Neither is reachable through PostgREST.

### 3.1 Function EXECUTE --- default privileges, M-19 CLOSED

**M-19 is CLOSED by migration `014`, applied 2026-08-08.** The measurement
below is the *before* state, kept because it is the evidence for why the
mechanism is what it is. The after state is at the end of this section.

**VERIFIED 2026-08-08 over PostgREST RPC.** This instance grants EXECUTE
on new `public` functions **directly to `anon`**, not through `PUBLIC`.
Supabase ships `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON
FUNCTIONS TO anon, authenticated, service_role`, so every
`CREATE FUNCTION` in `public` lands with `anon` already holding EXECUTE.

Consequence: `REVOKE EXECUTE ... FROM public` removes nothing, because
the privilege was never held via `PUBLIC`. Migration `013` §1 uses
exactly that form and therefore did **not** revoke anything from `anon`.

Measured **before `014`**, anon session, no JWT:

| Function | Origin | anon EXECUTE |
| --- | --- | --- |
| `is_crm_reader()` | `013`, revoke attempted | **allowed**, returns `false` |
| `crm_lead_visible(uuid)` | `013`, revoke attempted | **allowed**, returns `false` |
| `crm_contact_visible(uuid)` | `013`, revoke attempted | **allowed**, returns `false` |
| `is_staff()` | `003`, never revoked | **allowed**, returns `false` |
| `is_internal_staff()` | `004`, never revoked | **allowed**, returns `false` |

`is_staff()` and `is_internal_staff()` are the control: they were never
given an explicit grant by any migration, and `anon` can call them too.
That is what identifies default privileges, rather than something
specific to `013`, as the mechanism.

**No data was exposed by this.** All three `013` helpers open with
`auth.uid() IS NOT NULL`, and `is_crm_reader()` resolves `auth.uid()`
against `public.users`. For a sessionless caller `auth.uid()` is NULL, so
each returned `false` for every input --- confirmed above. They were not
even an existence oracle: the guard short-circuits before the lead or
contact id is looked at. For `authenticated` callers EXECUTE is intended
and the explicit grant in `013` is what makes the twenty policies
evaluable at all.

What was missing was the second layer, not the first.

**The fix --- migration `014`, applied 2026-08-08.**

`014` issues `REVOKE EXECUTE ... FROM anon` on the three helpers and does
nothing else. It contains no `CREATE OR REPLACE`, deliberately: rewriting
a function body would re-apply the schema default privileges and hand
`anon` EXECUTE straight back. It touches no policy, no function body, and
no privilege of `authenticated` or `service_role`.

| Grade | Result |
| --- | --- |
| **AUTOMATED** | `node scripts/verify-rls.mjs` → `anon` refused on all three helpers, `service_role` still succeeds on all three. The three assertions that failed before `014` now pass; total moved from 26 passed / 3 failed to **29 passed / 0 failed** |
| **MANUAL** | Project owner ran the `has_function_privilege` query in §2 of `014` in the SQL Editor: `anon` **false**, `authenticated` **true**, `service_role` **true** on all three |

The `authenticated` half can only be MANUAL. The script holds no
authenticated session and creates no accounts, and `pg_catalog` is
unreachable through PostgREST --- so the one result that matters most
here (if `authenticated` had lost EXECUTE, all twenty CRM policies would
fail at evaluation) is the one the script structurally cannot assert.

The script pairs each anon probe with a `service_role` call for that
reason: `anon` being refused proves nothing on its own, since a
misspelled function name is refused identically. The denial code is not
pinned --- after an EXECUTE revoke PostgREST may answer `42501` or drop
the function from that role's schema cache and answer `PGRST202`; both
mean not callable.

**Still open, and deliberately not fixed:** `is_staff()` and
`is_internal_staff()` carry the identical default-privileges gap.
`014` left them alone --- they are a separate finding on pre-existing
functions, outside the PHASE 1B scope.

## 4. Foreign Keys and ON DELETE

**VERIFIED --- SQL Editor (W-4).**

| Column | References | ON DELETE |
| --- | --- | --- |
| `crm_leads.assigned_to` | **`auth.users(id)`** | SET NULL |
| `crm_leads.assigned_to` | **`public.users(id)`** | SET NULL |
| `crm_leads.contact_id` | `crm_contacts(id)` | **CASCADE** |
| `crm_leads.created_by` | `auth.users(id)` | **not specified → NO ACTION** |
| `crm_leads.property_id` | `properties(id)` | SET NULL |
| `crm_followups.assigned_to` | **`auth.users(id)`** | SET NULL |
| `crm_followups.assigned_to` | **`public.users(id)`** | SET NULL |
| `crm_followups.lead_id` | `crm_leads(id)` | **CASCADE** |
| `crm_interests.lead_id` | `crm_leads(id)` | **CASCADE** |
| `crm_interests.property_id` | `properties(id)` | **CASCADE** |
| `crm_activities.lead_id` | `crm_leads(id)` | **CASCADE** |
| `crm_activities.user_id` | `public.users(id)` | **CASCADE** |

### 4.1 Duplicate FK on `assigned_to`

Both `crm_leads.assigned_to` and `crm_followups.assigned_to` carry **two**
foreign keys --- one to `auth.users(id)`, one to `public.users(id)` ---
with different naming conventions (`crm_leads_assigned_to_fkey` versus
`fk_crm_leads_assigned_to`), which suggests two separate creation
sessions.

**Correction of an earlier audit conclusion.** The PHASE 0.75 POST-RLS
report stated that `crm_leads.assigned_to` had a single unambiguous FK.
**That conclusion was wrong.** It rested on PostgREST returning `200`
rather than `300` for an implicit embed --- but PostgREST only sees
foreign keys whose target is in an **exposed schema**, and `auth` is not
exposed. The technique could never have detected an FK to `auth.users`.
The same error made `crm_leads.created_by` appear to have no FK at all;
it has one.

**Current impact: none.** Verified over PostgREST:

| Probe | Result |
| --- | --- |
| `crm_leads?select=id,users(id)` | `200` --- one visible relationship |
| `...users!assigned_to(id)` | `200` |
| `...users!fk_crm_leads_assigned_to(id)` | `200` --- public FK is in the cache |
| `...users!crm_leads_assigned_to_fkey(id)` | `400 PGRST200` --- auth FK is not |
| `...users!created_by(id)` | `400 PGRST200` |

All eleven `users` embeds in the CRM code resolve correctly today.

**The condition that would break them:** adding `auth` to Supabase's
Exposed Schemas. Both FKs would enter the schema cache, every implicit
`users` embed would return `300`, and the `users!assigned_to` column hint
**would not rescue it** --- the table name `users` itself becomes
ambiguous. Only constraint-name hints (`users!fk_crm_leads_assigned_to`)
are immune. A routine `NOTIFY pgrst, 'reload schema'` does **not** trigger
this; only changing the exposed-schema list does.

Recorded as M-6. No FK was changed in PHASE 1A.

### 4.2 Two-level CASCADE from `crm_contacts`

`crm_contacts` → `crm_leads` → {`crm_interests`, `crm_followups`,
`crm_activities`}, all CASCADE.

Deleting **one contact** destroys its Leads and then every interest,
follow-up and activity belonging to those Leads --- two levels, in one
statement. `crm.service.ts:142-143` issues exactly this delete, and RLS
DELETE on `crm_contacts` is `is_staff()`, so any Admin can trigger it.

This is plausibly intentional, but it is documented nowhere and the UI
gives no warning. Recorded as M-1.

### 4.3 `crm_leads.created_by` has no ON DELETE

It references `auth.users(id)` with no action specified, so NO ACTION
applies. `auth.admin.deleteUser()` therefore **fails** for any user who
has ever created a Lead. 7 of 10 Leads have a non-null `created_by`.
This is one link in the failure chain in §9. Recorded as H-3.

## 5. Indexes

**VERIFIED --- SQL Editor (W-3).**

Four duplicate pairs, eight indexes where four would do:

| Table | Duplicate pair | Column |
| --- | --- | --- |
| `crm_activities` | `idx_crm_activities_lead` + `idx_crm_activities_lead_id` | `lead_id` |
| `crm_followups` | `idx_crm_followups_assigned` + `idx_crm_followups_assigned_to` | `assigned_to` |
| `crm_followups` | `idx_crm_followups_lead` + `idx_crm_followups_lead_id` | `lead_id` |
| `crm_leads` | `idx_crm_leads_assigned` + `idx_crm_leads_assigned_to` | `assigned_to` |

Each duplicate costs a second B-tree maintained on every INSERT/UPDATE of
that column. At current volumes this is not measurable. It is schema
hygiene, not performance. Recorded as L-1. **Nothing was dropped** ---
confirm no other migration or deployment references these names first.

Coverage needed by PHASE 1B ownership filtering already exists:
`crm_leads(assigned_to, contact_id, property_id, status)`,
`crm_followups(assigned_to, lead_id, followup_date, status)`,
`crm_interests(lead_id, property_id)`, `crm_activities(lead_id)`.

**Missing:** `crm_activities(user_id)`, which the UPDATE policy uses and
which is also a CASCADE target. Not urgent at 9 rows. Recorded as L-7.

## 6. Constraints

**VERIFIED --- SQL Editor (W-4).**

| Constraint | Status |
| --- | --- |
| `crm_contacts` PK `(id)` | present |
| `crm_contacts` UNIQUE `(contact_code)` | present --- the only non-PK UNIQUE |
| CHECK on `crm_leads.status` | **absent** |
| CHECK on `crm_followups.status` | **absent** |
| CHECK on `crm_interests.interest_level` | **absent** |
| CHECK on `crm_activities.activity_type` | **absent** |
| UNIQUE `crm_interests(lead_id, property_id)` | **absent** |

Supported by the stored values --- `crm_activities.activity_type` mixes
two naming conventions in one column (`"Lead Masuk (Website)"`,
`"Status Update"`, `followup_completed`, `followup_scheduled`), which no
CHECK would allow.

`contact_code` is UNIQUE but nullable, and one row is NULL. Valid in
Postgres; it contradicts the TypeScript type --- see §10.

**Caveat on completeness.** The W-4 output listed `PRIMARY KEY (id)` only
for `crm_contacts`, although W-3 shows all five tables have a `_pkey`
index. The paste appears abridged. The absence of CHECK constraints is
well supported by the value evidence above, but re-run with
`where contype = 'c'` if certainty is needed. Recorded as M-7 and M-8.
**No constraint was added in PHASE 1A.**

## 7. Triggers (W-5, W-6, W-7)

**VERIFIED --- SQL Editor, 2026-08-08.** `pg_trigger` and
`pg_get_functiondef` are unreachable through PostgREST (`404 PGRST205`),
so everything in this section comes from the owner's SQL Editor runs:
W-5 (trigger definition), W-6 (function properties), W-7 (full
inventory).

### 7.1 Trigger inventory --- VERIFIED complete

| Table | Trigger |
| --- | --- |
| `crm_leads` | `on_lead_created_notify` |
| `crm_contacts` | none |
| `crm_interests` | none |
| `crm_followups` | none |
| `crm_activities` | none |

W-7 confirmed the four empty rows as an actual result, not an
unattempted query, so "none found" is now **"none exists"**. This closes
L-11. Repository evidence agrees --- all eight `create trigger`
statements in `supabase/migrations/` target non-CRM tables --- though
the repository was never authoritative here, since
`on_lead_created_notify` appears in no file.

Consequence: exactly one CRM trigger exists, on one table, on one
column. PHASE 1B does not need to reason about hidden side effects on
the other four tables.

### 7.2 `on_lead_created_notify`

```sql
CREATE TRIGGER on_lead_created_notify
AFTER INSERT OR UPDATE OF assigned_to
ON public.crm_leads
FOR EACH ROW
EXECUTE FUNCTION handle_new_lead_notification()
```

`public.handle_new_lead_notification()` --- `SECURITY DEFINER`,
`LANGUAGE plpgsql`, `OWNER postgres`. It reads `NEW.assigned_to`,
`NEW.contact_id` and `NEW.created_by`; looks up
`crm_contacts.full_name` by `contact_id`; and inserts a row into
`public.notifications` with `user_id = NEW.assigned_to` and
`sender_id = COALESCE(NEW.created_by, NEW.assigned_to)`.

**W-6 verified three properties of the body:**

1.  It guards the insert with `IF target_agent IS NOT NULL THEN` ---
    when `assigned_to` is NULL, no notification row is attempted.
2.  It references `public.crm_contacts` and `public.notifications`
    **schema-qualified**.
3.  It declares **no `SET search_path`**.

Property 1 closes B-1 (§7.4). Properties 2 and 3 together downgrade
M-16 (§7.5).

### 7.3 This is NOT an `updated_at` trigger

Stated explicitly, because the distinction changes what PHASE 2 may rely
on. Three independent reasons:

1.  It executes `handle_new_lead_notification()`, not
    `touch_updated_at()`.
2.  It is `AFTER`. An `AFTER` trigger cannot modify `NEW` --- a column
    such as `updated_at` can only be set from a `BEFORE` trigger.
3.  It is scoped `UPDATE OF assigned_to`, so it does not even fire on
    the ordinary updates an `updated_at` trigger would need to catch.

**M-9 therefore stands unchanged.** No CRM table has an `updated_at`
trigger; `updated_at` is still written by the client from the browser
clock at eight sites, and remains unsuitable as an audit or ordering
basis.

### 7.4 Failure surface --- B-1 CLOSED, does not fire

`notifications.sender_id` is **NOT NULL** with an FK to `users(id)`
(`user_id` is nullable; `sender_id` is not). The trigger is `AFTER` and
runs inside the caller's transaction, so any exception it raises would
abort the originating INSERT or UPDATE on `crm_leads`.

The concern recorded as B-1 was that
`sender_id = COALESCE(NEW.created_by, NEW.assigned_to)` is NULL when both
columns are NULL, violating NOT NULL and aborting the statement.

**W-6 closes it.** The insert sits inside
`IF target_agent IS NOT NULL THEN`, and `target_agent = NEW.assigned_to`.
When `assigned_to` is NULL the function reaches no insert at all, so
`sender_id` is never evaluated as NULL. Inside the guard, `COALESCE` has
a non-NULL second argument by construction and can never return NULL.
**The trigger cannot fail a `crm_leads` INSERT or UPDATE on this path.**

Both paths previously identified are therefore harmless:

-   **Public intake.** `app/api/leads/route.ts:382` inserts without
    `created_by`; when `ownerAgentId` is also null the guard skips and
    the Lead is stored normally.
-   **Unassignment.** `assigned_to := NULL` --- whether from
    `app/api/admin/users/delete/route.ts:76` or from the FK
    `ON DELETE SET NULL` --- passes through the guard with no write.

Two consequences follow from the guard rather than from a defect:

-   **H-1 reverts to its PHASE 0.75 form.** The trigger does not abort
    the unassign, so it provides no accidental protection against the
    delete-user chain. The half-state outcome described in §11 H-1
    stands exactly as originally assessed.
-   **An unassigned intake Lead notifies no one.** The guard skips the
    DB-side notification, and the application side is guarded too ---
    `route.ts:462` wraps `notifyEvent` in `if (ownerAgentId)`, and
    `notifyEvent` filters falsy recipients at
    `lib/notification-helper.ts:118`. The `crm_activities` row is also
    skipped (`route.ts:440-447`). With `DEFAULT_AGENT_UUID` absent from
    `.env.local`, a Lead whose property resolves no agent is stored
    silently, with no notification and no activity row, and no
    unassigned-Lead queue exists to surface it. Recorded as M-18.
-   **Self-addressed notifications.** On the intake path `created_by` is
    NULL, so `sender_id` collapses to `assigned_to` --- the recipient is
    also the sender. Cosmetic only. Recorded as L-12.

### 7.5 Security properties

`SECURITY DEFINER` + `OWNER postgres` means the function runs with
superuser-equivalent privileges and its write to `public.notifications`
**bypasses that table's RLS and grants entirely**. That is presumably the
intent --- an Agent should not need INSERT rights on another user's
notifications --- but it has consequences:

-   Any principal able to INSERT a `crm_leads` row causes a
    privileged write into `public.notifications`, and PHASE 1B policies
    on `notifications` will not constrain it.
-   The notification text derives from `crm_contacts.full_name`, which on
    the public intake path originates from **unauthenticated form
    input**. Stored text reaching an admin-facing UI; severity depends on
    how that UI renders it. Recorded as M-15.
-   **No `SET search_path`** --- W-6 verified its absence. This is what
    Supabase's `function_search_path_mutable` linter flags. The primary
    vector is closed by W-6's second finding: both referenced tables are
    written `public.crm_contacts` and `public.notifications`, so no table
    name can be hijacked by a schema placed earlier in the caller's
    search path. What remains is the narrow residue --- unqualified
    operator, cast and type resolution --- which requires CREATE on an
    earlier schema, a right `anon` and `authenticated` should not hold on
    PostgreSQL 15+ (not independently verified here). Downgraded from
    MEDIUM to LOW as **L-13**; `rls_auto_enable()` declares
    `SET search_path = pg_catalog` and this function does not, so it
    remains a consistency gap worth closing when the function is next
    edited.

### 7.6 Duplicate notification writes

The application already writes its own notification for the same event:
`app/api/leads/route.ts:462-465` calls `notifyEvent({event: "lead.created",
userIds: [ownerAgentId], ...})`, which inserts into `public.notifications`
via `lib/notification-helper.ts:177`. `crm.service.ts` does the same on
`createLead` (:300-310), `updateLead` (:334-341) and `bulkAssign`
(:867-872).

The trigger now performs an overlapping insert on the same events. Live
counts are consistent with duplication: 10 Leads and 10 `type=lead`
notifications, split 8 `category=crm` / 2 `category=system` --- two
distinct producers. Recorded as M-17.


## 8. Role Matrix

**VERIFIED --- W-1 helpers, plus live role distribution over PostgREST.**

Live distribution in `public.users` (8 rows): `admin` 1, `agent` 1,
`marketing` 2, `super_admin` 1, `viewer` 3. Zero `commissioner`, zero
`superadmin`.

### Database level (what RLS actually enforces)

| Role | In `users` | `is_internal_staff()` | `is_staff()` | SELECT | INSERT | UPDATE | DELETE |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `super_admin` | 1 | yes | yes | all 5 | all 5 | all 5 | all 5 |
| `admin` | 1 | yes | yes | all 5 | all 5 | all 5 | all 5 |
| `agent` | 1 | yes | no | all 5 | all 5 | all 5 | own-created Leads only |
| `superadmin` | 0 | yes | **no** | all 5 | all 5 | all 5 | own-created Leads only |
| `commissioner` | 0 | yes | no | all 5 | all 5 | all 5 | own-created Leads only |
| `marketing` | **2** | **no** | no | **none** | **none** | **none** | **none** |
| `viewer` | **3** | **no** | no | **none** | **none** | **none** | **none** |

### Application level (`normalizeRole` in `lib/permissions.ts:39-45`)

`UserRole` = `super_admin | admin | agent | marketing | viewer`. Unknown
values fall through to `viewer`.

| Role | Database | UI after `normalizeRole` | Aligned? |
| --- | --- | --- | --- |
| `super_admin` | staff | `super_admin` | yes |
| `admin` | staff | `admin` | yes |
| `agent` | internal | `agent` | yes |
| `superadmin` | internal, **not** staff | `super_admin` (full staff) | **no** |
| `commissioner` | **internal** | **`viewer`** | **no** |
| `marketing` | **not internal** | `marketing` | **no** |
| `viewer` | not internal | `viewer` | yes |

Three mismatches, pointing in different directions:

-   **`marketing` --- 2 live users.** The UI treats it as a valid role
    with CRM pages; the database returns zero rows. They see an empty
    interface with no explanation. This is a live condition, not
    hypothetical.
-   **`commissioner` --- database more permissive than the app.** RLS
    grants full CRM read; `normalizeRole` demotes it to `viewer`. Zero
    users, so no present impact, but RLS grants access to a role the type
    system does not model.
-   **`superadmin` --- app more permissive than the database.**
    `normalizeRole` maps it to `super_admin`;
    `is_staff()` in production no longer includes it. Zero users today,
    but `app/api/leads/[id]/follow-up/route.ts:12-17` records that this
    spelling **did** exist in production and caused 403s.

An additional ownership consequence: `viewer` accounts own 5 Leads, 2
activities and 1 follow-up, yet fail `is_internal_staff()` and cannot
read their own records. Recorded as M-3, M-4, M-14.

**Nothing in the role matrix was changed in PHASE 1A.**

## 9. `is_staff()` Divergence --- Documented, Not Fixed

**This is a known divergence between this repository and the live
database. PHASE 1A deliberately does not repair it.**

The production `is_staff()` returns true for `admin` and `super_admin`
only (W-1). Four migration files define it with `'superadmin'`
**included**:

| File | Line |
| --- | --- |
| `002_survey_system.sql` | 174 |
| `003_crm_contacts_rls.sql` | 33-43 |
| `004_crm_activities_rls.sql` | 30 |
| `007_rls_properties_users_billing.sql` | 81 |

Each uses `create or replace function`. **Re-running any one of them
silently restores `'superadmin'`** and undoes the owner's change. Because
`is_staff()` gates DELETE on all five CRM tables plus
`system_settings`, that is a privilege change disguised as a re-run.

Two rules follow, until the divergence is resolved in a later phase:

1.  Do not re-run `002`, `003`, `004` or `007` against this database.
2.  Any future migration that touches `is_staff()` must state which
    definition it intends and why.

No migration was created to fix this, per PHASE 1A scope.

## 10. TypeScript / Database Drift

**VERIFIED --- `types/crm.types.ts` compared against the live schema.**
**Nothing in that file was changed in PHASE 1A.**

| # | Interface | Kind | Detail |
| --- | --- | --- | --- |
| 1 | `CRMActivity.updated_at: string` | **phantom column** | no such column in `crm_activities` |
| 2 | `CRMLead` | **missing DB column** | `property_id` |
| 3 | `CRMLead` | **missing DB column** | `created_by` --- used by both the UPDATE and DELETE policies |
| 4 | `CRMContact` | **missing DB column** | `source` |
| 5 | `CRMInterest` | **missing DB column** | `priority` |
| 6 | `CRMContact.contact_code: string` | nullable mismatch | DB nullable, 1 row NULL |
| 7 | `CRMFollowup.assigned_to: string` | nullable mismatch | DB nullable, and both FKs are `ON DELETE SET NULL` --- NULL is guaranteed to occur |
| 8 | `CRMActivity.notes: string` | nullable mismatch | DB nullable |
| 9 | `CRMActivity.user_id: string` | nullable mismatch | DB nullable, CASCADE target |
| 10 | `CRMLead.created_at` / `updated_at` | nullable mismatch | DB nullable |
| 11 | `CRMFollowup.status` | enum mismatch | type restricts to three values; DB is `varchar` with no CHECK |
| 12 | `LeadStatus` | **ordering conflict** | orders `negotiation` before `proposal`; `CrmKanbanBoard.STATUS_STAGES` is the reverse; DB has no CHECK to arbitrate |
| 13 | `CRMInterest.updated_at` | time type split | `timestamptz` while its own `created_at` is `timestamp` --- in the same row |
| 14 | `CRMLead.budget?: number` | precision | `numeric` → JS `number` |

**Item 3 is the one that matters most for PHASE 1B.** `created_by`
determines who may UPDATE and DELETE a Lead at the policy level, yet it
does not exist in the type system. Note also that 3 of 10 Leads have
`created_by` NULL --- rows created by the service role through
`/api/leads`, where `auth.uid()` is null --- so the
`created_by = auth.uid()` branch can never match them. Correct behaviour,
but it must be accounted for when predicting PHASE 1B results.

A related drift lives in code rather than types: **`created_by` on
`crm_followups`** is read by four sites
(`crm/followups/create/page.tsx:255`, `followups/page.tsx:139`,
`followups/[id]/page.tsx:99`, `followups/[id]/edit/page.tsx:180`) and
exists in neither the type nor the database. It never reaches PostgREST
--- `crm.service.ts:668-672` drops it before the request --- so no error
is raised; the permission checks simply always evaluate false. An `as any`
cast suppresses the only compiler warning. Recorded as M-2.

## 11. Findings Register

Severity as assessed at the end of PHASE 0.75, revised after W-5, W-6 and
W-7, then again after PHASE 1B. **H-2 and H-6 were addressed in PHASE
1A; M-11, M-12 and M-19 in PHASE 1B**; B-1 and L-11 were closed by
verification rather than by any change. M-19 was opened by PHASE 1B
verification and closed by migration `014` in the same phase. M-3 and
M-13 are **addressed but not closed** --- the policy change is applied
and accepted by decision, but neither was exercised against a live
session of the role concerned (§13.2). Everything else is recorded and
left untouched.

### BLOCKER --- none open

| # | Finding | Status |
| --- | --- | --- |
| B-1 | `on_lead_created_notify` aborting a `crm_leads` INSERT/UPDATE when `assigned_to` and `created_by` are both NULL | **CLOSED --- disproved by W-6.** The insert sits inside `IF target_agent IS NOT NULL THEN`, so a NULL `assigned_to` reaches no insert and `sender_id` is never NULL (§7.4) |

### HIGH

| # | Finding | Status |
| --- | --- | --- |
| H-1 | Delete-user failure chain: `app/api/admin/users/delete/route.ts:78` writes the non-existent `crm_activities.assigned_to`, the error is unchecked, then `DELETE public.users` CASCADEs that user's activity rows away, then `auth.admin.deleteUser()` fails on `crm_leads.created_by` → 500, public profile gone, auth account orphaned, audit never written. **Unchanged by W-6**: the trigger's guard means the unassign at :76 and the FK `SET NULL` pass through without a write, so the trigger neither aborts the chain nor protects against it | open |
| H-2 | anon write grants on four CRM tables | **closed by `012`, verified 26/0** |
| H-3 | `crm_leads.created_by → auth.users` with no ON DELETE | open |
| H-4 | `is_staff()` repository/database divergence across four files | **documented, §9** |
| H-5 | No baseline `CREATE TABLE` for any CRM table in the repository. **W-5 widens this**: `on_lead_created_notify` and `handle_new_lead_notification` are likewise absent from every file, so a `SECURITY DEFINER` function owned by `postgres` exists outside code review | **documented, this file** |
| H-6 | `verify-rls.mjs` covered only `crm_leads` | **closed --- all five tables plus write-grant probes** |

### MEDIUM

| # | Finding |
| --- | --- |
| M-1 | Two-level CASCADE from `crm_contacts` (§4.2) |
| M-2 | Phantom `created_by` on `crm_followups`, 4 sites (§10) |
| M-3 | `marketing` (2 live users) gets zero CRM rows --- **addressed by `013`** via `is_crm_reader()`, and the read access is a recorded policy decision (§13.3). **Not exercised**: no `marketing` session has been run against it, by script or by hand |
| M-4 | `commissioner` granted internal access by RLS, demoted to `viewer` by the app --- the RLS half is now deliberate (`is_crm_reader()`, read-only, recorded decision §13.3). **Not exercised** against a `commissioner` session. The application-layer divergence is untouched and remains open |
| M-5 | 14 TypeScript/database mismatches (§10) |
| M-6 | Duplicate `assigned_to` FKs; safe today, breaks if `auth` is exposed (§4.1) |
| M-7 | No CHECK on `status` / `interest_level` / `activity_type` |
| M-8 | No UNIQUE on `crm_interests(lead_id, property_id)`; one duplicate pair already exists |
| M-9 | `updated_at` written from the browser clock --- **unchanged by W-5**, the new trigger is not an `updated_at` trigger (§7.3) |
| M-10 | All CRM mutations run in the browser; only four server routes exist |
| M-11 | Ownership branches in UPDATE policies restrict nothing while `is_internal_staff()` sits beside them (§2.1) --- **CLOSED by `013`**: the `is_internal_staff()` branch is gone from every UPDATE and every SELECT, and each UPDATE carries an explicit `WITH CHECK` (§2.2) |
| M-12 | anon holds SELECT on all 55 CRM columns including `phone`, `whatsapp`, `email` (§3) --- **CLOSED by `013`**, verified `42501` on all five tables |
| M-13 | `getLeadById` (`services/crm.service.ts:208`, embed at 213, throw at 236) throws `"Contact not found for lead <id>"` if the contact is unreadable --- `crm_leads` and `crm_contacts` must be scoped together in PHASE 1B --- **addressed by `013`** via `crm_contact_visible()`, which derives contact visibility from the same ownership predicate as the Lead. **Not proven end-to-end**: the owner's manual Agent pass confirmed row scoping, not that the embedded `contact` is non-`null` on every visible Lead. That specific assertion has not been run (§13.2) |
| M-14 | 5 Leads were created by `viewer` accounts that can no longer read them |
| M-15 | Notification text derives from `crm_contacts.full_name`, which originates from unauthenticated intake input, and is written by a privileged function that bypasses `notifications` RLS (§7.5) |
| M-16 | *Moved.* `SET search_path` absent on `handle_new_lead_notification()` --- downgraded to **L-13** after W-6 showed both referenced tables are schema-qualified (§7.5) |
| M-17 | Duplicate notification writes --- the trigger and the application layer both insert for the same events (§7.6) |
| M-18 | An intake Lead with no resolvable agent is stored silently: the trigger guard skips the notification, `route.ts:462` skips `notifyEvent`, and `route.ts:440-447` skips the activity row. `DEFAULT_AGENT_UUID` is absent from `.env.local` and no unassigned-Lead queue exists (§7.4) |
| M-19 | **Opened and closed in PHASE 1B.** `anon` retained EXECUTE on `is_crm_reader()`, `crm_lead_visible()` and `crm_contact_visible()`: `013` §1 revoked from `PUBLIC`, but this instance grants to `anon` directly via `ALTER DEFAULT PRIVILEGES`, so the revoke was a no-op. No exposure at any point --- all three returned `false` for a sessionless caller because of their `auth.uid() IS NOT NULL` guard --- but the intended second layer was absent. **CLOSED by `014`**: `anon` refused on all three (automated), `authenticated` and `service_role` retained (manual SQL Editor). The same gap on the pre-existing `is_staff()` / `is_internal_staff()` is left open (§3.1) |

### LOW

| # | Finding |
| --- | --- |
| L-1 | Four duplicate index pairs (§5) |
| L-2 | `lead.user_id` dead branch, `crm/leads/page.tsx:197` --- no such column |
| L-3 | `crm_interests.updated_at` is `timestamptz` while its `created_at` is `timestamp` |
| L-4 | `crm_activities.activity_type` mixes two naming conventions |
| L-5 | `crm_leads.source` holds five free-form phrases |
| L-6 | `TRUNCATE` for anon --- **revoked by `012`** |
| L-7 | No index on `crm_activities(user_id)` despite the UPDATE policy using it |
| L-8 | `contact_code` UNIQUE but nullable, 1 NULL row |
| L-9 | Inconsistent FK naming (`crm_leads_assigned_to_fkey` vs `fk_crm_leads_assigned_to`) |
| L-10 | Dual property links: `crm_leads.property_id` vs `crm_interests`, consistent on 5 of 10 |
| L-11 | Trigger inventory NOT VERIFIED as exhaustive --- **CLOSED by W-7**: the four non-`crm_leads` tables have no triggers (§7.1) |
| L-12 | Self-addressed notifications --- on the intake path `created_by` is NULL, so `sender_id` collapses to `assigned_to` and the recipient is also the sender (§7.4) |
| L-13 | `handle_new_lead_notification()` declares no `SET search_path`, unlike `rls_auto_enable()`. Downgraded from M-16: the tables it references are schema-qualified, leaving only operator/cast resolution, which needs CREATE on an earlier schema (§7.5) |

## 12. PHASE 1A Status --- CLOSED, VERIFIED

Migration `012` applied by the project owner, 2026-08-08.
`node scripts/verify-rls.mjs` → **26 passed, 0 failed**.

Exactly three files changed:

-   `supabase/migrations/012_phase1a_revoke_anon_crm_grants.sql` --- new
-   `scripts/verify-rls.mjs` --- five CRM tables plus write-grant probes
-   `docs/crm/00-schema-baseline.md` --- this file

No RLS policy, foreign key, index, constraint, trigger, function,
TypeScript type, role behaviour or application authorization logic was
modified.

## 13. PHASE 1B Status --- CLOSED, VERIFIED

Two migrations applied by the project owner, 2026-08-08:
`013_phase1b_crm_ownership_rls.sql` and
`014_phase1b_revoke_anon_execute_crm_helpers.sql`.

**Closed on the evidence in §13.1 and §13.2.** The two blockers recorded
in the earlier "VERIFIED IN PART" state are resolved: M-19 by migration
`014`, and the agent ownership boundary by the project owner's manual
pass with an existing `agent` account. §13.1 and §13.2 state exactly
which parts rest on automated assertions and which on that manual pass
--- the distinction is load-bearing and is not collapsed anywhere in
this document.

### 13.1 AUTOMATED --- `node scripts/verify-rls.mjs`

2026-08-08, after `014` → **29 passed, 0 failed, 3 skipped**.

| Assertion group | Count | Result |
| --- | --- | --- |
| Non-CRM row counts, anon vs service-role, 11 tables | 11 | pass |
| `properties` published-only for anon (16 of 23; 7 draft hidden) | 1 | pass |
| `users` sensitive columns refused to anon (`phone`, `email`, `whatsapp`) | 3 | pass |
| **anon SELECT refused on all five CRM tables** --- `013` | 5 | pass |
| **anon INSERT/UPDATE/DELETE refused on all five CRM tables** --- `012` | 5 | pass |
| Guest dashboard embed still readable | 1 | pass |
| **anon EXECUTE refused on the three CRM helpers, `service_role` retained** --- `014` | 3 | pass |
| Agent ownership isolation | 8 | **skipped --- see §13.2** |
| `marketing` read access, write denial | 2 | **skipped --- see §13.2** |
| `commissioner` read access, write denial | 2 | **skipped --- see §13.2** |

**29 passed, 0 failed.** The 12 role-layer assertions are `SKIP`, not
pass --- they are not counted in the 29 and are not claimed anywhere in
this document as automated results. The script's own tally reports **3
skipped**, one line per missing role group (agent pair, `marketing`,
`commissioner`); those three lines stand for the 12 assertions in the
last three rows above, which is why the two numbers differ. The suite
would run them if
`VERIFY_AGENT_*`, `VERIFY_AGENT2_*`, `VERIFY_MARKETING_*` and
`VERIFY_COMMISSIONER_*` were present in `.env.local`; by decision no new
test accounts were created, so they remain skipped.

What the automated layer proves is the **anon boundary**, completely: no
read, no write, no helper call. Before `013` the five tables answered
`200` with zero rows; after, all five answer `42501 permission denied`.
Before `014` the three helpers answered `200` to an anon caller; after,
all three are refused while `service_role` still succeeds.

What it cannot prove is anything about `authenticated` roles, because
every CRM policy is bound to `authenticated` and the script holds only
an anon key and a service-role key --- one is refused before policy
evaluation, the other bypasses it. That gap is what §13.2 covers.

**Regression --- no non-CRM policy moved.** `013` creates three new
functions and never touches `is_staff()` or `is_internal_staff()`, and
`014` alters no function at all, so the `007` policies on `properties`,
`property_owners`, `invoices`, `system_settings` and `users` cannot have
shifted. The row counts confirm it: `property_owners` 0/9, `invoices`
0/3, `system_settings` 0/1, `users` 2/8, `properties` 16/23 with all 7
drafts hidden, and the six `property_*` detail tables each below their
service-role count. All identical to the PHASE 1A run.

### 13.2 MANUAL --- observed by the project owner, not reproducible here

These results were reported by the project owner from the SQL Editor and
the running application. They are evidence and the phase is closed on
them. They are **not** automated assertions, were not produced by this
repository, and re-running `verify-rls.mjs` will not re-check them.

| # | Observation | Method | Covers |
| --- | --- | --- | --- |
| MV-1 | An `agent` sees only Leads that are their own; another agent's Leads are not visible | Existing `agent` account, running application | The core PHASE 1B boundary --- plan tests T3, and the read half of T6 |
| MV-2 | `anon` **false**, `authenticated` **true**, `service_role` **true** on all three CRM helpers | `has_function_privilege` query, §2 of `014`, SQL Editor | M-19. Also the precondition for the twenty policies being evaluable at all --- had `authenticated` lost EXECUTE, every CRM policy would error at evaluation |

MV-1 is the assertion the phase exists for. It was verified with an
account that already existed --- no test account was created, per the
standing instruction.

**Not observed, by either method.** These are neither automated nor
manual; they are simply untested, and no part of this document treats
them as verified:

-   agent-to-agent **write** isolation (plan T6 write half, T7, T8, T9)
-   `marketing` session (T10, T11) and `commissioner` session (T12, T13)
-   the M-13 embed assertion --- that `contact` is non-`null` on every
    Lead an Agent can see
-   T16, the property-interest duplicate fix
-   the twenty-policy shape (§13.4)

These follow from policies that are applied and were reviewed, but
"follows from an applied policy" is an inference, not an observation.
The phase is closed with them open because the anon boundary is fully
automated and the central ownership claim is manually confirmed --- not
because these were checked.

### 13.3 Access decisions recorded

Recorded here because they are policy choices, not findings, and because
`marketing` and `commissioner` read access will look like an exposure to
anyone reading the RLS in isolation.

| Role | CRM read | CRM write | Recorded by |
| --- | --- | --- | --- |
| `marketing` | **permitted, all rows** | none | Project owner, PHASE 1B decision no.1 |
| `commissioner` | **permitted, all rows** | none | Project owner, PHASE 1B decision no.2 |
| `agent` | own/assigned/unclaimed only | own scope only | decision no.3 |
| `admin` / `super_admin` / `superadmin` | all | all | decision no.4, pre-existing |
| `anon` | **none** | **none** | decision no.5 |

Both are implemented by membership in `is_crm_reader()`
(admin, super_admin, superadmin, marketing, commissioner) on the SELECT
policies only. Neither appears in any INSERT, UPDATE or DELETE policy,
so read-only is enforced by the absence of a write branch rather than by
a check --- there is nothing for them to satisfy.

For `marketing` this is a **grant**: previously it was absent from
`is_internal_staff()` and saw zero CRM rows despite holding
`manage_own_crm` in `ROLE_PERMISSIONS` (M-3). For `commissioner` it is a
**write restriction**, not a read grant: it already had full read via
`is_internal_staff()`, and what changed is that its write access was
removed (M-4). Note that `normalizeRole()` in `lib/permissions.ts` still
maps `commissioner` to `viewer`, so `canAccessRoute` closes `/crm` to it
at the application layer --- the database decision stands, but a
`commissioner` cannot reach the CRM UI to exercise it. That divergence
is M-4 and was deliberately not touched.

### 13.4 Policy shape --- not asserted by the script

`pg_policies`, `pg_catalog` and `information_schema` return `404
PGRST205` through PostgREST, so the script cannot confirm that twenty
policies exist, that all are `PERMISSIVE {authenticated}`, or that
`is_internal_staff()` survives only in `crm_contacts_insert`. The
verification queries are in §9 of migration `013` and must be run in the
SQL Editor. This is a permanent limitation of the method, not an
outstanding task.

### 13.5 Files changed in PHASE 1B

-   `supabase/migrations/013_phase1b_crm_ownership_rls.sql` --- new:
    three helper functions, defensive sweep, twenty policies, anon
    SELECT revoked on five tables
-   `supabase/migrations/014_phase1b_revoke_anon_execute_crm_helpers.sql`
    --- new: `REVOKE EXECUTE ... FROM anon` on the three helpers, M-19.
    No `CREATE OR REPLACE` --- rewriting a body would re-apply the schema
    default privileges and restore the grant it removes
-   `scripts/verify-rls.mjs` --- reversed anon-SELECT assertions, INSERT
    probes, helper-EXECUTE probes paired with `service_role`, optional
    per-role layer with synthetic fixture (inactive --- no credentials)
-   `docs/crm/00-schema-baseline.md` --- this file
-   `docs/crm/09-crm-ui.md` --- §14

No foreign key, index, constraint, trigger, TypeScript type or
application authorization logic was modified.
`handle_new_lead_notification()` was not touched. `is_staff()` and
`is_internal_staff()` were not touched.

### 13.6 Carried forward

Not defects in PHASE 1B, and not blockers to it --- work that a later
phase should pick up:

1.  The 12 role-layer assertions stay `SKIP` until four test accounts
    exist. Whoever creates them gets agent write isolation, the
    `marketing`/`commissioner` sessions and the M-13 embed check for
    free --- the assertions are already written.
2.  `is_staff()` and `is_internal_staff()` carry the same
    default-privileges gap `014` closed for the CRM helpers (§3.1).
    Same low severity, same reasoning; separate finding on pre-existing
    functions.
3.  M-4's application-layer half: `commissioner` has database read
    access it cannot reach through the UI.
4.  A manual UI pass as an Agent --- property-interest edit (T16, must
    not duplicate), Quick Contact, attempted self-delete (must be
    refused).

# END
