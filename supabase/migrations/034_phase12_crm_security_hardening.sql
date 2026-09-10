-- Phase 12 Step 1D: database-authoritative CRM authorization and closing integrity.
-- Forward-only. This migration is self-contained from the production 031 + 033 baseline.

BEGIN;

-- Production currently has a small CRM dataset. Ten seconds is long enough for
-- drained writers to finish, while failing safely instead of stalling rollout.
-- Five minutes bounds the full transactional migration with ample local margin.
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '5min';

-- Serialize reconciliation with every table whose identity participates in a
-- close. This prevents a Migration 031 transaction from committing stale data
-- after the preflight scan but before the new guards are installed.
LOCK TABLE public.users, public.crm_contacts, public.crm_leads,
  public.crm_interests, public.properties, public.invoices,
  public.commission_ledger
  IN EXCLUSIVE MODE;

-- The application already treats commissioner as a canonical read-only role.
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS valid_role;
UPDATE public.users
SET role = 'super_admin'
WHERE lower(btrim(role)) = 'superadmin';
ALTER TABLE public.users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('super_admin', 'admin', 'agent', 'marketing', 'viewer', 'commissioner'));

-- Contact provenance closes global orphan-contact visibility without rewriting legacy rows.
ALTER TABLE public.crm_contacts
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_crm_contacts_created_by
  ON public.crm_contacts(created_by);

-- Migration 031 produced a different invoice amount. Never silently bless or
-- rewrite such rows; rollout must stop for explicit financial reconciliation.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.crm_leads AS l
    WHERE l.deal_state = 'verified'
      AND (
        NOT EXISTS (SELECT 1 FROM public.invoices AS i WHERE i.deal_id = l.id)
        OR NOT EXISTS (SELECT 1 FROM public.commission_ledger AS c WHERE c.lead_id = l.id)
      )
  ) THEN
    RAISE EXCEPTION 'Verified deals with incomplete financial records require reconciliation before Migration 034.'
      USING ERRCODE = '23514';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.invoices AS i
    JOIN public.crm_leads AS l ON l.id = i.deal_id
    WHERE i.deal_id IS NOT NULL
      AND (
        i.invoice_type IS DISTINCT FROM 'closing'
        OR i.client_id IS DISTINCT FROM l.id
        OR i.property_id IS DISTINCT FROM coalesce(
          l.property_id,
          (SELECT ci.property_id FROM public.crm_interests AS ci
           WHERE ci.lead_id = l.id ORDER BY ci.priority ASC NULLS LAST, ci.id ASC LIMIT 1)
        )
        OR i.total_amount IS DISTINCT FROM round(coalesce(l.budget, 0))::bigint
        OR i.created_by IS NULL
        OR i.invoice_number IS DISTINCT FROM (
          'INV-' || to_char(i.created_at AT TIME ZONE 'UTC', 'YYYYMMDD')
          || '-' || upper(substr(md5(l.id::text), 1, 6))
        )
      )
  ) THEN
    RAISE EXCEPTION 'Existing deal invoices require reconciliation before Migration 034.'
      USING ERRCODE = '23514';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.commission_ledger AS c
    JOIN public.crm_leads AS l ON l.id = c.lead_id
    LEFT JOIN public.invoices AS i ON i.deal_id = l.id
    WHERE c.deal_id IS DISTINCT FROM l.id
      OR c.property_id IS DISTINCT FROM coalesce(
        l.property_id,
        (SELECT ci.property_id FROM public.crm_interests AS ci
         WHERE ci.lead_id = l.id ORDER BY ci.priority ASC NULLS LAST, ci.id ASC LIMIT 1)
      )
      OR c.agent_id IS DISTINCT FROM l.assigned_to
      OR c.invoice_id IS NULL
      OR i.id IS NULL
      OR c.invoice_id IS DISTINCT FROM i.id
      OR c.sale_amount IS DISTINCT FROM round(coalesce(l.budget, 0), 2)
      OR c.commission_rate <= 0 OR c.commission_rate > 1
      OR c.commission_amount IS DISTINCT FROM round(c.sale_amount * c.commission_rate, 2)
  ) THEN
    RAISE EXCEPTION 'Existing commission rows require reconciliation before Migration 034.'
      USING ERRCODE = '23514';
  END IF;
END;
$$;

-- Missing, unknown, pending, and suspended profiles fail closed.
CREATE OR REPLACE FUNCTION public.crm_actor_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT CASE lower(btrim(u.role))
    WHEN 'superadmin' THEN 'super_admin'
    ELSE lower(btrim(u.role))
  END
  FROM public.users AS u
  WHERE u.id = auth.uid()
    AND lower(btrim(coalesce(u.status, ''))) = 'active'
    AND lower(btrim(u.role)) IN (
      'super_admin', 'superadmin', 'admin', 'agent', 'marketing', 'viewer', 'commissioner'
    );
$$;

CREATE OR REPLACE FUNCTION public.is_crm_reader()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT coalesce(public.crm_actor_role() IN ('admin', 'super_admin', 'commissioner'), false);
$$;

CREATE OR REPLACE FUNCTION public.is_crm_manager()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT coalesce(public.crm_actor_role() IN ('admin', 'super_admin'), false);
$$;

-- Base-table visibility contains owned leads only. The Agent claim pool is
-- exposed separately through a deliberately sanitized function below.
CREATE OR REPLACE FUNCTION public.crm_lead_visible(p_lead_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.crm_leads AS l
      WHERE l.id = p_lead_id
        AND (
          (
            public.crm_actor_role() = 'agent'
            AND (l.assigned_to = auth.uid() OR l.created_by = auth.uid())
          )
          OR (
            public.crm_actor_role() = 'marketing'
            AND (l.assigned_to = auth.uid() OR l.created_by = auth.uid())
          )
        )
    );
$$;

CREATE OR REPLACE FUNCTION public.list_claimable_crm_leads()
RETURNS SETOF jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT jsonb_build_object(
    'id', l.id,
    'status', l.status,
    'source', l.source,
    'interest_type', l.interest_type,
    'property_id', l.property_id,
    'assigned_to', NULL,
    'created_by', NULL,
    'contact_id', NULL,
    'deal_state', l.deal_state,
    'created_at', l.created_at,
    'updated_at', l.updated_at,
    'contact', NULL,
    'claimable', true
  )
  FROM public.crm_leads AS l
  WHERE public.crm_actor_role() = 'agent'
    AND l.assigned_to IS NULL
    AND l.status IN ('new', 'contacted', 'qualified', 'proposal', 'negotiation')
    AND l.deal_state IN ('none', 'rejected')
  ORDER BY l.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.claim_crm_lead_atomic(p_lead_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_updated_count integer;
BEGIN
  IF public.crm_actor_role() IS DISTINCT FROM 'agent' THEN
    RAISE EXCEPTION 'Only an active Agent may claim a lead.' USING ERRCODE = '42501';
  END IF;

  UPDATE public.crm_leads
  SET assigned_to = auth.uid(), updated_at = now()
  WHERE id = p_lead_id
    AND assigned_to IS NULL
    AND status IN ('new', 'contacted', 'qualified', 'proposal', 'negotiation')
    AND deal_state IN ('none', 'rejected');

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RETURN v_updated_count = 1;
END;
$$;

-- Ownership excludes the unassigned pool and is required for child writes.
CREATE OR REPLACE FUNCTION public.crm_lead_owned(p_lead_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT auth.uid() IS NOT NULL
    AND public.crm_actor_role() IN ('agent', 'marketing')
    AND EXISTS (
      SELECT 1
      FROM public.crm_leads AS l
      WHERE l.id = p_lead_id
        AND (l.assigned_to = auth.uid() OR l.created_by = auth.uid())
    );
$$;

CREATE OR REPLACE FUNCTION public.crm_contact_visible(p_contact_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT auth.uid() IS NOT NULL
    AND public.crm_actor_role() IN ('agent', 'marketing')
    AND (
      EXISTS (
        SELECT 1
        FROM public.crm_contacts AS c
        WHERE c.id = p_contact_id
          AND c.created_by = auth.uid()
      )
      OR EXISTS (
        SELECT 1
        FROM public.crm_leads AS l
        WHERE l.contact_id = p_contact_id
          AND public.crm_lead_visible(l.id)
      )
    );
$$;

-- This helper deliberately evaluates only persisted relationships. A new lead
-- cannot grant its own caller access to a previously unauthorized contact.
CREATE OR REPLACE FUNCTION public.crm_contact_owned(p_contact_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT auth.uid() IS NOT NULL
    AND public.crm_actor_role() IN ('agent', 'marketing')
    AND (
      EXISTS (
        SELECT 1
        FROM public.crm_contacts AS c
        WHERE c.id = p_contact_id
          AND c.created_by = auth.uid()
      )
      OR EXISTS (
        SELECT 1
        FROM public.crm_leads AS l
        WHERE l.contact_id = p_contact_id
          AND public.crm_lead_owned(l.id)
      )
    );
$$;

REVOKE EXECUTE ON FUNCTION public.crm_actor_role() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_crm_reader() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_crm_manager() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.crm_lead_visible(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.crm_lead_owned(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.crm_contact_visible(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.crm_contact_owned(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.list_claimable_crm_leads() FROM PUBLIC, anon, service_role;
REVOKE EXECUTE ON FUNCTION public.claim_crm_lead_atomic(uuid) FROM PUBLIC, anon, service_role;

GRANT EXECUTE ON FUNCTION public.crm_actor_role() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_crm_reader() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_crm_manager() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.crm_lead_visible(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.crm_lead_owned(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.crm_contact_visible(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.crm_contact_owned(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.list_claimable_crm_leads() TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_crm_lead_atomic(uuid) TO authenticated;

-- A permissive policy is ORed with every other policy. Remove unknown policies
-- before installing the exact final policy set.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.tablename, p.policyname
    FROM pg_policies AS p
    WHERE p.schemaname = 'public'
      AND p.tablename IN (
        'crm_leads', 'crm_contacts', 'crm_interests',
        'crm_followups', 'crm_activities', 'commission_ledger', 'invoices'
      )
      AND p.policyname NOT IN (
        'crm_leads_select', 'crm_leads_insert', 'crm_leads_update', 'crm_leads_delete',
        'crm_contacts_select', 'crm_contacts_insert', 'crm_contacts_update', 'crm_contacts_delete',
        'crm_interests_select', 'crm_interests_insert', 'crm_interests_update', 'crm_interests_delete',
        'crm_followups_select', 'crm_followups_insert', 'crm_followups_update', 'crm_followups_delete',
        'crm_activities_select', 'crm_activities_insert', 'crm_activities_update', 'crm_activities_delete',
        'commission_ledger_admin_all', 'commission_ledger_commissioner_select',
        'commission_ledger_agent_select',
        'invoices_select', 'invoices_insert', 'invoices_update', 'invoices_delete'
      )
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END;
$$;

ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS crm_leads_select ON public.crm_leads;
CREATE POLICY crm_leads_select ON public.crm_leads
  FOR SELECT TO authenticated
  USING (
    public.is_crm_reader()
    OR (
      public.crm_actor_role() = 'agent'
      AND (assigned_to = auth.uid() OR created_by = auth.uid())
    )
    OR (
      public.crm_actor_role() = 'marketing'
      AND (assigned_to = auth.uid() OR created_by = auth.uid())
    )
  );

DROP POLICY IF EXISTS crm_leads_insert ON public.crm_leads;
CREATE POLICY crm_leads_insert ON public.crm_leads
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_crm_manager()
    OR (
      public.crm_actor_role() IN ('agent', 'marketing')
      AND created_by = auth.uid()
      AND assigned_to = auth.uid()
    )
  );

DROP POLICY IF EXISTS crm_leads_update ON public.crm_leads;
CREATE POLICY crm_leads_update ON public.crm_leads
  FOR UPDATE TO authenticated
  USING (
    public.is_crm_manager()
    OR public.crm_lead_owned(id)
    OR (public.crm_actor_role() = 'agent' AND assigned_to IS NULL)
  )
  WITH CHECK (
    public.is_crm_manager()
    OR (
      public.crm_actor_role() IN ('agent', 'marketing')
      AND (assigned_to = auth.uid() OR created_by = auth.uid())
    )
  );

DROP POLICY IF EXISTS crm_leads_delete ON public.crm_leads;
CREATE POLICY crm_leads_delete ON public.crm_leads
  FOR DELETE TO authenticated
  USING (public.is_crm_manager());

DROP POLICY IF EXISTS crm_contacts_select ON public.crm_contacts;
CREATE POLICY crm_contacts_select ON public.crm_contacts
  FOR SELECT TO authenticated
  USING (public.is_crm_reader() OR public.crm_contact_visible(id));

DROP POLICY IF EXISTS crm_contacts_insert ON public.crm_contacts;
CREATE POLICY crm_contacts_insert ON public.crm_contacts
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_crm_manager()
    OR (
      public.crm_actor_role() IN ('agent', 'marketing')
      AND created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS crm_contacts_update ON public.crm_contacts;
CREATE POLICY crm_contacts_update ON public.crm_contacts
  FOR UPDATE TO authenticated
  USING (public.is_crm_manager() OR public.crm_contact_owned(id))
  WITH CHECK (public.is_crm_manager() OR public.crm_contact_owned(id));

DROP POLICY IF EXISTS crm_contacts_delete ON public.crm_contacts;
CREATE POLICY crm_contacts_delete ON public.crm_contacts
  FOR DELETE TO authenticated
  USING (public.is_crm_manager());

DROP POLICY IF EXISTS crm_interests_select ON public.crm_interests;
CREATE POLICY crm_interests_select ON public.crm_interests
  FOR SELECT TO authenticated
  USING (public.is_crm_reader() OR public.crm_lead_visible(lead_id));

DROP POLICY IF EXISTS crm_interests_insert ON public.crm_interests;
CREATE POLICY crm_interests_insert ON public.crm_interests
  FOR INSERT TO authenticated
  WITH CHECK (public.is_crm_manager() OR public.crm_lead_owned(lead_id));

DROP POLICY IF EXISTS crm_interests_update ON public.crm_interests;
CREATE POLICY crm_interests_update ON public.crm_interests
  FOR UPDATE TO authenticated
  USING (public.is_crm_manager() OR public.crm_lead_owned(lead_id))
  WITH CHECK (public.is_crm_manager() OR public.crm_lead_owned(lead_id));

DROP POLICY IF EXISTS crm_interests_delete ON public.crm_interests;
CREATE POLICY crm_interests_delete ON public.crm_interests
  FOR DELETE TO authenticated
  USING (public.is_crm_manager() OR public.crm_lead_owned(lead_id));

DROP POLICY IF EXISTS crm_followups_select ON public.crm_followups;
CREATE POLICY crm_followups_select ON public.crm_followups
  FOR SELECT TO authenticated
  USING (
    public.is_crm_reader()
    OR (
      public.crm_actor_role() IN ('agent', 'marketing')
      AND (assigned_to = auth.uid() OR created_by = auth.uid() OR public.crm_lead_visible(lead_id))
    )
  );

DROP POLICY IF EXISTS crm_followups_insert ON public.crm_followups;
CREATE POLICY crm_followups_insert ON public.crm_followups
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_crm_manager()
    OR (
      public.crm_actor_role() IN ('agent', 'marketing')
      AND created_by = auth.uid()
      AND assigned_to = auth.uid()
      AND public.crm_lead_owned(lead_id)
    )
  );

DROP POLICY IF EXISTS crm_followups_update ON public.crm_followups;
CREATE POLICY crm_followups_update ON public.crm_followups
  FOR UPDATE TO authenticated
  USING (
    public.is_crm_manager()
    OR (
      public.crm_actor_role() IN ('agent', 'marketing')
      AND (assigned_to = auth.uid() OR public.crm_lead_owned(lead_id))
    )
  )
  WITH CHECK (
    public.is_crm_manager()
    OR (
      public.crm_actor_role() IN ('agent', 'marketing')
      AND (assigned_to = auth.uid() OR public.crm_lead_owned(lead_id))
    )
  );

DROP POLICY IF EXISTS crm_followups_delete ON public.crm_followups;
CREATE POLICY crm_followups_delete ON public.crm_followups
  FOR DELETE TO authenticated
  USING (
    public.is_crm_manager()
    OR (
      public.crm_actor_role() IN ('agent', 'marketing')
      AND (assigned_to = auth.uid() OR public.crm_lead_owned(lead_id))
    )
  );

DROP POLICY IF EXISTS crm_activities_select ON public.crm_activities;
CREATE POLICY crm_activities_select ON public.crm_activities
  FOR SELECT TO authenticated
  USING (
    public.is_crm_reader()
    OR (
      public.crm_actor_role() IN ('agent', 'marketing')
      AND public.crm_lead_visible(lead_id)
    )
  );

DROP POLICY IF EXISTS crm_activities_insert ON public.crm_activities;
CREATE POLICY crm_activities_insert ON public.crm_activities
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_crm_manager()
    OR (
      public.crm_actor_role() IN ('agent', 'marketing')
      AND user_id = auth.uid()
      AND public.crm_lead_owned(lead_id)
    )
  );

DROP POLICY IF EXISTS crm_activities_update ON public.crm_activities;
CREATE POLICY crm_activities_update ON public.crm_activities
  FOR UPDATE TO authenticated
  USING (
    public.is_crm_manager()
    OR (
      public.crm_actor_role() IN ('agent', 'marketing')
      AND user_id = auth.uid()
      AND public.crm_lead_owned(lead_id)
    )
  )
  WITH CHECK (
    public.is_crm_manager()
    OR (
      public.crm_actor_role() IN ('agent', 'marketing')
      AND user_id = auth.uid()
      AND public.crm_lead_owned(lead_id)
    )
  );

DROP POLICY IF EXISTS crm_activities_delete ON public.crm_activities;
CREATE POLICY crm_activities_delete ON public.crm_activities
  FOR DELETE TO authenticated
  USING (public.is_crm_manager());

DROP POLICY IF EXISTS commission_ledger_admin_all ON public.commission_ledger;
CREATE POLICY commission_ledger_admin_all ON public.commission_ledger
  FOR ALL TO authenticated
  USING (public.is_crm_manager())
  WITH CHECK (public.is_crm_manager());

DROP POLICY IF EXISTS commission_ledger_commissioner_select ON public.commission_ledger;
CREATE POLICY commission_ledger_commissioner_select ON public.commission_ledger
  FOR SELECT TO authenticated
  USING (public.crm_actor_role() = 'commissioner');

DROP POLICY IF EXISTS commission_ledger_agent_select ON public.commission_ledger;
CREATE POLICY commission_ledger_agent_select ON public.commission_ledger
  FOR SELECT TO authenticated
  USING (public.crm_actor_role() = 'agent' AND agent_id = auth.uid());

-- Invoices are an Admin/Super Admin financial boundary in the application.
-- Use the same active authoritative manager predicate at the database boundary.
DROP POLICY IF EXISTS invoices_select ON public.invoices;
CREATE POLICY invoices_select ON public.invoices
  FOR SELECT TO authenticated
  USING (public.is_crm_manager());

DROP POLICY IF EXISTS invoices_insert ON public.invoices;
CREATE POLICY invoices_insert ON public.invoices
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_crm_manager()
    AND created_by = auth.uid()
  );

DROP POLICY IF EXISTS invoices_update ON public.invoices;
CREATE POLICY invoices_update ON public.invoices
  FOR UPDATE TO authenticated
  USING (public.is_crm_manager())
  WITH CHECK (public.is_crm_manager());

DROP POLICY IF EXISTS invoices_delete ON public.invoices;
CREATE POLICY invoices_delete ON public.invoices
  FOR DELETE TO authenticated
  USING (public.is_crm_manager());

REVOKE ALL PRIVILEGES ON TABLE public.crm_leads FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.crm_contacts FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.crm_interests FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.crm_followups FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.crm_activities FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.commission_ledger FROM anon;
REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLE
  public.crm_leads, public.crm_contacts, public.crm_interests,
  public.crm_followups, public.crm_activities, public.commission_ledger,
  public.invoices, public.properties
  FROM authenticated;

-- Fill provenance for the old scoped application when 034 is deployed first.
-- Service-role public intake has no auth.uid() and intentionally remains ownerless.
CREATE OR REPLACE FUNCTION public.prepare_crm_contact_provenance()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_role text := public.crm_actor_role();
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF v_role IN ('agent', 'marketing', 'admin', 'super_admin')
      AND NEW.created_by IS NULL
    THEN
      NEW.created_by := auth.uid();
    END IF;

    IF v_role IN ('agent', 'marketing')
      AND NEW.created_by IS DISTINCT FROM auth.uid()
    THEN
      RAISE EXCEPTION 'Contact creator must be the authenticated CRM user.'
        USING ERRCODE = '42501';
    END IF;
  ELSIF v_role IN ('agent', 'marketing')
    AND NEW.created_by IS DISTINCT FROM OLD.created_by
  THEN
    RAISE EXCEPTION 'Contact creator cannot be changed by a scoped CRM user.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prepare_crm_contact_provenance ON public.crm_contacts;
CREATE TRIGGER prepare_crm_contact_provenance
  BEFORE INSERT OR UPDATE OF created_by
  ON public.crm_contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.prepare_crm_contact_provenance();

-- Scoped ownership changes are limited to an atomic Agent claim. Contact
-- linkage is authorized before the new lead relationship exists.
CREATE OR REPLACE FUNCTION public.enforce_crm_lead_scope_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_role text := public.crm_actor_role();
BEGIN
  IF TG_OP = 'INSERT' AND v_role IN ('agent', 'marketing') THEN
    IF NEW.created_by IS NULL THEN
      NEW.created_by := auth.uid();
    END IF;

    IF NEW.created_by IS DISTINCT FROM auth.uid()
      OR NEW.assigned_to IS DISTINCT FROM auth.uid()
    THEN
      RAISE EXCEPTION 'Scoped CRM users may only create leads owned by themselves.'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  IF v_role IN ('agent', 'marketing')
    AND (TG_OP = 'INSERT' OR NEW.contact_id IS DISTINCT FROM OLD.contact_id)
    AND NOT public.crm_contact_owned(NEW.contact_id)
  THEN
    RAISE EXCEPTION 'Contact is not owned by the authenticated CRM user.'
      USING ERRCODE = '42501';
  END IF;

  IF TG_OP = 'UPDATE' AND v_role IN ('agent', 'marketing') THEN
    IF NEW.created_by IS DISTINCT FROM OLD.created_by THEN
      RAISE EXCEPTION 'Lead creator cannot be changed by a scoped CRM user.'
        USING ERRCODE = '42501';
    END IF;

    IF v_role = 'agent'
      AND OLD.assigned_to IS NULL
      AND NEW.assigned_to = auth.uid()
    THEN
      PERFORM 1
      FROM public.users AS u
      WHERE u.id = auth.uid()
        AND lower(btrim(u.role)) = 'agent'
        AND lower(btrim(coalesce(u.status, ''))) = 'active'
      FOR SHARE;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Only an active Agent may claim a lead.' USING ERRCODE = '42501';
      END IF;
    END IF;

    IF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to
      AND NOT (
        v_role = 'agent'
        AND OLD.assigned_to IS NULL
        AND NEW.assigned_to = auth.uid()
        AND (to_jsonb(NEW) - 'assigned_to' - 'updated_at')
          = (to_jsonb(OLD) - 'assigned_to' - 'updated_at')
      )
    THEN
      RAISE EXCEPTION 'Lead ownership changes must use the atomic Agent claim path.'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  IF v_role IN ('admin', 'super_admin')
    AND NEW.assigned_to IS NOT NULL
    AND (TG_OP = 'INSERT' OR NEW.assigned_to IS DISTINCT FROM OLD.assigned_to)
  THEN
    PERFORM 1
    FROM public.users AS u
    WHERE u.id = NEW.assigned_to
      AND lower(btrim(u.role)) = 'agent'
      AND lower(btrim(coalesce(u.status, ''))) = 'active'
    FOR SHARE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Lead assignments require an active Agent.' USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_crm_lead_scope_fields ON public.crm_leads;
CREATE TRIGGER enforce_crm_lead_scope_fields
  BEFORE INSERT OR UPDATE
  ON public.crm_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_crm_lead_scope_fields();

-- Enforce the canonical pipeline and keep won/verified behind the closing RPC.
CREATE OR REPLACE FUNCTION public.enforce_crm_lead_workflow()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_closing_path boolean := current_user = 'postgres';
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.status := coalesce(NEW.status, 'new');

    IF NEW.status = 'won' OR NEW.deal_state = 'verified' OR NEW.deal_verified_at IS NOT NULL THEN
      RAISE EXCEPTION 'New leads cannot start as won or verified.' USING ERRCODE = '23514';
    END IF;

    IF NEW.deal_state IS DISTINCT FROM 'none'
      OR NEW.deal_submitted_at IS NOT NULL
      OR NEW.deal_rejection_reason IS NOT NULL
    THEN
      RAISE EXCEPTION 'New leads must start with an unsubmitted deal state.' USING ERRCODE = '23514';
    END IF;
  ELSE
    IF OLD.deal_state = 'verified'
      AND NOT v_closing_path
      AND (
        NEW.contact_id IS DISTINCT FROM OLD.contact_id
        OR NEW.assigned_to IS DISTINCT FROM OLD.assigned_to
        OR NEW.created_by IS DISTINCT FROM OLD.created_by
        OR NEW.property_id IS DISTINCT FROM OLD.property_id
        OR NEW.budget IS DISTINCT FROM OLD.budget
        OR NEW.interest_type IS DISTINCT FROM OLD.interest_type
        OR NEW.status IS DISTINCT FROM OLD.status
        OR NEW.deal_state IS DISTINCT FROM OLD.deal_state
        OR NEW.deal_submitted_at IS DISTINCT FROM OLD.deal_submitted_at
        OR NEW.deal_verified_at IS DISTINCT FROM OLD.deal_verified_at
      )
    THEN
      RAISE EXCEPTION 'Verified deal identity is immutable.' USING ERRCODE = '42501';
    END IF;

    IF OLD.deal_state = 'pending_verification'
      AND NOT v_closing_path
      AND (
        NEW.contact_id IS DISTINCT FROM OLD.contact_id
        OR NEW.assigned_to IS DISTINCT FROM OLD.assigned_to
        OR NEW.created_by IS DISTINCT FROM OLD.created_by
        OR NEW.property_id IS DISTINCT FROM OLD.property_id
        OR NEW.budget IS DISTINCT FROM OLD.budget
        OR NEW.interest_type IS DISTINCT FROM OLD.interest_type
      )
    THEN
      RAISE EXCEPTION 'Submitted deal terms are frozen until review completes.'
        USING ERRCODE = '42501';
    END IF;

    IF NEW.status IS DISTINCT FROM OLD.status THEN
      IF NEW.status = 'won' THEN
        IF NOT v_closing_path
          OR OLD.status IS DISTINCT FROM 'negotiation'
          OR OLD.deal_state IS DISTINCT FROM 'pending_verification'
          OR NEW.deal_state IS DISTINCT FROM 'verified'
          OR NEW.deal_verified_at IS NULL
        THEN
          RAISE EXCEPTION 'Won is only valid through authorized deal closing.' USING ERRCODE = '42501';
        END IF;
      ELSIF NOT (
        (coalesce(OLD.status, 'new') = 'new' AND NEW.status IN ('contacted', 'lost'))
        OR (OLD.status = 'contacted' AND NEW.status IN ('qualified', 'lost'))
        OR (OLD.status = 'qualified' AND NEW.status IN ('proposal', 'lost'))
        OR (OLD.status = 'proposal' AND NEW.status IN ('negotiation', 'lost'))
        OR (OLD.status = 'negotiation' AND NEW.status = 'lost')
        OR (OLD.status = 'lost' AND NEW.status = 'new')
      ) THEN
        RAISE EXCEPTION 'Invalid CRM pipeline transition from % to %.', OLD.status, NEW.status
          USING ERRCODE = '23514';
      END IF;
    END IF;

    IF NEW.deal_state IS DISTINCT FROM OLD.deal_state THEN
      IF OLD.deal_state IN ('none', 'submitted', 'rejected')
        AND NEW.deal_state = 'pending_verification'
      THEN
        IF NEW.status IS DISTINCT FROM 'negotiation' OR NEW.deal_submitted_at IS NULL THEN
          RAISE EXCEPTION 'Deals may only be submitted from Negotiation with a submission timestamp.'
            USING ERRCODE = '23514';
        END IF;
        NEW.deal_rejection_reason := NULL;
      ELSIF OLD.deal_state = 'pending_verification' AND NEW.deal_state = 'rejected' THEN
        IF NOT public.is_crm_manager() OR btrim(coalesce(NEW.deal_rejection_reason, '')) = '' THEN
          RAISE EXCEPTION 'Only a CRM manager may reject a deal with a reason.'
            USING ERRCODE = '42501';
        END IF;
      ELSIF OLD.deal_state = 'pending_verification' AND NEW.deal_state = 'verified' THEN
        IF NOT v_closing_path
          OR NEW.status IS DISTINCT FROM 'won'
          OR NEW.deal_verified_at IS NULL
        THEN
          RAISE EXCEPTION 'Verified is only valid through authorized deal closing.'
            USING ERRCODE = '42501';
        END IF;
      ELSE
        RAISE EXCEPTION 'Invalid deal-state transition from % to %.', OLD.deal_state, NEW.deal_state
          USING ERRCODE = '23514';
      END IF;
    END IF;

    IF NOT v_closing_path
      AND NEW.deal_verified_at IS DISTINCT FROM OLD.deal_verified_at
    THEN
      RAISE EXCEPTION 'Deal verification metadata is written by the closing function.'
        USING ERRCODE = '42501';
    END IF;

    IF NOT v_closing_path
      AND NEW.deal_state IS NOT DISTINCT FROM OLD.deal_state
      AND (
        NEW.deal_submitted_at IS DISTINCT FROM OLD.deal_submitted_at
        OR NEW.deal_rejection_reason IS DISTINCT FROM OLD.deal_rejection_reason
      )
    THEN
      RAISE EXCEPTION 'Deal review metadata may only change with deal state.'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status = 'lost' AND NEW.status = 'new' THEN
    NEW.lost_reason := NULL;
    NEW.lost_explanation := NULL;
  END IF;

  IF (TG_OP = 'INSERT'
      OR NEW.status IS DISTINCT FROM OLD.status
      OR NEW.lost_reason IS DISTINCT FROM OLD.lost_reason
      OR NEW.lost_explanation IS DISTINCT FROM OLD.lost_explanation)
    AND NEW.status = 'lost' AND (
    NEW.lost_reason IS NULL
    OR (NEW.lost_reason = 'other' AND btrim(coalesce(NEW.lost_explanation, '')) = '')
  ) THEN
    RAISE EXCEPTION 'Lost leads require a valid reason and Other requires an explanation.'
      USING ERRCODE = '23514';
  END IF;

  IF (TG_OP = 'INSERT'
      OR NEW.status IS DISTINCT FROM OLD.status
      OR NEW.deal_state IS DISTINCT FROM OLD.deal_state
      OR NEW.deal_verified_at IS DISTINCT FROM OLD.deal_verified_at)
    AND NEW.status = 'won'
    AND (NEW.deal_state IS DISTINCT FROM 'verified' OR NEW.deal_verified_at IS NULL)
  THEN
    RAISE EXCEPTION 'Won and verified state must be committed together.' USING ERRCODE = '23514';
  END IF;

  IF (TG_OP = 'INSERT'
      OR NEW.status IS DISTINCT FROM OLD.status
      OR NEW.deal_state IS DISTINCT FROM OLD.deal_state
      OR NEW.deal_submitted_at IS DISTINCT FROM OLD.deal_submitted_at)
    AND NEW.deal_state = 'pending_verification'
    AND (NEW.status IS DISTINCT FROM 'negotiation' OR NEW.deal_submitted_at IS NULL)
  THEN
    RAISE EXCEPTION 'Pending verification requires Negotiation and a submission timestamp.'
      USING ERRCODE = '23514';
  END IF;

  IF (TG_OP = 'INSERT'
      OR NEW.deal_state IS DISTINCT FROM OLD.deal_state
      OR NEW.deal_rejection_reason IS DISTINCT FROM OLD.deal_rejection_reason)
    AND NEW.deal_state = 'rejected'
    AND btrim(coalesce(NEW.deal_rejection_reason, '')) = ''
  THEN
    RAISE EXCEPTION 'Rejected deals require a rejection reason.' USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_crm_lead_workflow ON public.crm_leads;
CREATE TRIGGER enforce_crm_lead_workflow
  BEFORE INSERT OR UPDATE
  ON public.crm_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_crm_lead_workflow();

CREATE OR REPLACE FUNCTION public.enforce_crm_child_scope_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_role text := public.crm_actor_role();
  v_old_lead_id uuid;
  v_new_lead_id uuid;
BEGIN
  v_old_lead_id := CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE (to_jsonb(OLD)->>'lead_id')::uuid END;
  v_new_lead_id := CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE (to_jsonb(NEW)->>'lead_id')::uuid END;

  PERFORM l.id
  FROM public.crm_leads AS l
  WHERE l.id IN (v_old_lead_id, v_new_lead_id)
  ORDER BY l.id
  FOR SHARE;

  IF current_user <> 'postgres' AND EXISTS (
    SELECT 1
    FROM public.crm_leads AS l
    WHERE l.id IN (v_old_lead_id, v_new_lead_id)
      AND l.deal_state IN ('pending_verification', 'verified')
  ) THEN
    RAISE EXCEPTION 'Child records of a submitted or verified deal are immutable.' USING ERRCODE = '42501';
  END IF;

  IF TG_OP = 'UPDATE' AND v_role IN ('agent', 'marketing') THEN
    IF v_new_lead_id IS DISTINCT FROM v_old_lead_id THEN
      RAISE EXCEPTION 'CRM child records cannot be moved to another lead.' USING ERRCODE = '42501';
    END IF;

    IF TG_TABLE_NAME = 'crm_followups' AND (
      (to_jsonb(NEW)->'assigned_to') IS DISTINCT FROM (to_jsonb(OLD)->'assigned_to')
      OR (to_jsonb(NEW)->'created_by') IS DISTINCT FROM (to_jsonb(OLD)->'created_by')
    ) THEN
      RAISE EXCEPTION 'Follow-up ownership cannot be changed by a scoped CRM user.'
        USING ERRCODE = '42501';
    END IF;

    IF TG_TABLE_NAME = 'crm_activities'
      AND (to_jsonb(NEW)->'user_id') IS DISTINCT FROM (to_jsonb(OLD)->'user_id')
    THEN
      RAISE EXCEPTION 'Activity actor cannot be changed by a scoped CRM user.'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

DROP TRIGGER IF EXISTS enforce_crm_interest_scope_fields ON public.crm_interests;
CREATE TRIGGER enforce_crm_interest_scope_fields
  BEFORE INSERT OR UPDATE OR DELETE ON public.crm_interests
  FOR EACH ROW EXECUTE FUNCTION public.enforce_crm_child_scope_fields();

DROP TRIGGER IF EXISTS enforce_crm_followup_scope_fields ON public.crm_followups;
CREATE TRIGGER enforce_crm_followup_scope_fields
  BEFORE INSERT OR UPDATE OR DELETE ON public.crm_followups
  FOR EACH ROW EXECUTE FUNCTION public.enforce_crm_child_scope_fields();

DROP TRIGGER IF EXISTS enforce_crm_activity_scope_fields ON public.crm_activities;
CREATE TRIGGER enforce_crm_activity_scope_fields
  BEFORE INSERT OR UPDATE OR DELETE ON public.crm_activities
  FOR EACH ROW EXECUTE FUNCTION public.enforce_crm_child_scope_fields();

-- Completion identity and timestamps come from the authenticated database session.
CREATE OR REPLACE FUNCTION public.enforce_crm_followup_completion()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_role text := public.crm_actor_role();
  v_is_actor boolean := v_role IN ('agent', 'marketing', 'admin', 'super_admin');
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'completed' THEN
      IF NOT v_is_actor THEN
        RAISE EXCEPTION 'Follow-up completion requires an authenticated CRM actor.'
          USING ERRCODE = '42501';
      END IF;
      NEW.completed_by := auth.uid();
      NEW.completed_at := clock_timestamp();
    ELSIF NEW.completed_by IS NOT NULL OR NEW.completed_at IS NOT NULL THEN
      RAISE EXCEPTION 'Incomplete follow-ups cannot carry completion metadata.'
        USING ERRCODE = '23514';
    END IF;
  ELSIF NEW.status IS DISTINCT FROM OLD.status AND NEW.status = 'completed' THEN
    IF NOT v_is_actor THEN
      RAISE EXCEPTION 'Follow-up completion requires an authenticated CRM actor.'
        USING ERRCODE = '42501';
    END IF;
    NEW.completed_by := auth.uid();
    NEW.completed_at := clock_timestamp();
  ELSIF NEW.status IS DISTINCT FROM OLD.status AND OLD.status = 'completed' THEN
    NEW.completed_by := NULL;
    NEW.completed_at := NULL;
  ELSIF NEW.completed_by IS DISTINCT FROM OLD.completed_by
    OR NEW.completed_at IS DISTINCT FROM OLD.completed_at
  THEN
    RAISE EXCEPTION 'Completion metadata may only change with follow-up status.'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.status = 'completed' AND (NEW.completed_by IS NULL OR NEW.completed_at IS NULL) THEN
    RAISE EXCEPTION 'Completed follow-ups require completion metadata.' USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_crm_followup_completion ON public.crm_followups;
CREATE TRIGGER enforce_crm_followup_completion
  BEFORE INSERT OR UPDATE OF status, completed_by, completed_at
  ON public.crm_followups
  FOR EACH ROW EXECUTE FUNCTION public.enforce_crm_followup_completion();

-- Direct PostgREST changes to security-sensitive state remain auditable even
-- when a caller bypasses the application action that normally records them.
CREATE OR REPLACE FUNCTION public.audit_crm_security_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_actor public.users%ROWTYPE;
  v_detail jsonb;
BEGIN
  IF v_actor_id IS NULL AND TG_TABLE_NAME <> 'commission_ledger' THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_actor FROM public.users AS u WHERE u.id = v_actor_id;

  IF TG_TABLE_NAME = 'crm_leads' THEN
    IF NEW.assigned_to IS NOT DISTINCT FROM OLD.assigned_to
      AND NEW.contact_id IS NOT DISTINCT FROM OLD.contact_id
       AND NEW.property_id IS NOT DISTINCT FROM OLD.property_id
       AND NEW.budget IS NOT DISTINCT FROM OLD.budget
       AND NEW.interest_type IS NOT DISTINCT FROM OLD.interest_type
       AND NEW.status IS NOT DISTINCT FROM OLD.status
      AND NEW.deal_state IS NOT DISTINCT FROM OLD.deal_state
    THEN
      RETURN NEW;
    END IF;

    v_detail := jsonb_build_object(
      'old_assigned_to', OLD.assigned_to,
      'new_assigned_to', NEW.assigned_to,
      'old_contact_id', OLD.contact_id,
      'new_contact_id', NEW.contact_id,
      'old_property_id', OLD.property_id,
      'new_property_id', NEW.property_id,
      'old_budget', OLD.budget,
      'new_budget', NEW.budget,
      'old_interest_type', OLD.interest_type,
      'new_interest_type', NEW.interest_type,
      'old_status', OLD.status,
      'new_status', NEW.status,
      'old_deal_state', OLD.deal_state,
      'new_deal_state', NEW.deal_state,
      'lost_reason', NEW.lost_reason,
      'deal_rejection_reason', NEW.deal_rejection_reason
    );
  ELSIF TG_TABLE_NAME = 'crm_contacts' THEN
    IF NEW.created_by IS NOT DISTINCT FROM OLD.created_by THEN
      RETURN NEW;
    END IF;
    v_detail := jsonb_build_object('old_created_by', OLD.created_by, 'new_created_by', NEW.created_by);
  ELSIF TG_TABLE_NAME = 'crm_followups' THEN
    IF NEW.status IS NOT DISTINCT FROM OLD.status
      AND NEW.assigned_to IS NOT DISTINCT FROM OLD.assigned_to
    THEN
      RETURN NEW;
    END IF;
    v_detail := jsonb_build_object(
      'lead_id', NEW.lead_id,
      'old_status', OLD.status,
      'new_status', NEW.status,
      'old_assigned_to', OLD.assigned_to,
      'new_assigned_to', NEW.assigned_to,
      'completed_by', NEW.completed_by
    );
  ELSE
    IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
      RETURN NEW;
    END IF;
    v_detail := jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status);
  END IF;

  INSERT INTO public.admin_audit_log (
    actor_id, actor_email, actor_role, action, target_id, detail
  ) VALUES (
    v_actor_id,
    v_actor.email,
    CASE lower(btrim(v_actor.role)) WHEN 'superadmin' THEN 'super_admin' ELSE lower(btrim(v_actor.role)) END,
    'database.' || TG_TABLE_NAME || '.security_changed',
    NEW.id,
    v_detail
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_crm_lead_security_change ON public.crm_leads;
CREATE TRIGGER audit_crm_lead_security_change
  AFTER UPDATE OF assigned_to, contact_id, property_id, budget, interest_type, status, deal_state ON public.crm_leads
  FOR EACH ROW EXECUTE FUNCTION public.audit_crm_security_change();

DROP TRIGGER IF EXISTS audit_crm_contact_security_change ON public.crm_contacts;
CREATE TRIGGER audit_crm_contact_security_change
  AFTER UPDATE OF created_by ON public.crm_contacts
  FOR EACH ROW EXECUTE FUNCTION public.audit_crm_security_change();

DROP TRIGGER IF EXISTS audit_crm_followup_security_change ON public.crm_followups;
CREATE TRIGGER audit_crm_followup_security_change
  AFTER UPDATE OF status, assigned_to ON public.crm_followups
  FOR EACH ROW EXECUTE FUNCTION public.audit_crm_security_change();

DROP TRIGGER IF EXISTS audit_commission_status_change ON public.commission_ledger;
CREATE TRIGGER audit_commission_status_change
  AFTER UPDATE OF status ON public.commission_ledger
  FOR EACH ROW EXECUTE FUNCTION public.audit_crm_security_change();

-- Ordinary invoices remain manageable, but closing identities are immutable
-- outside the postgres-owned atomic function.
CREATE OR REPLACE FUNCTION public.enforce_closing_invoice_identity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF current_user = 'postgres' THEN
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  END IF;

  IF (TG_OP = 'INSERT' AND (NEW.deal_id IS NOT NULL OR NEW.invoice_type = 'closing'))
    OR (TG_OP = 'DELETE' AND (OLD.deal_id IS NOT NULL OR OLD.invoice_type = 'closing'))
    OR (
      TG_OP = 'UPDATE'
      AND (OLD.deal_id IS NOT NULL OR NEW.deal_id IS NOT NULL OR OLD.invoice_type = 'closing' OR NEW.invoice_type = 'closing')
      AND (
        NEW.deal_id IS DISTINCT FROM OLD.deal_id
        OR NEW.invoice_type IS DISTINCT FROM OLD.invoice_type
        OR NEW.invoice_number IS DISTINCT FROM OLD.invoice_number
        OR NEW.created_at IS DISTINCT FROM OLD.created_at
        OR NEW.client_id IS DISTINCT FROM OLD.client_id
        OR NEW.property_id IS DISTINCT FROM OLD.property_id
        OR NEW.total_amount IS DISTINCT FROM OLD.total_amount
        OR NEW.created_by IS DISTINCT FROM OLD.created_by
      )
    )
  THEN
    RAISE EXCEPTION 'Closing invoice identity is managed by the deal-closing function.'
      USING ERRCODE = '42501';
  END IF;

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

DROP TRIGGER IF EXISTS enforce_closing_invoice_identity ON public.invoices;
CREATE TRIGGER enforce_closing_invoice_identity
  BEFORE INSERT OR UPDATE OR DELETE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.enforce_closing_invoice_identity();

CREATE OR REPLACE FUNCTION public.enforce_commission_identity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF current_user = 'postgres' THEN
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  END IF;

  IF TG_OP IN ('INSERT', 'DELETE') THEN
    RAISE EXCEPTION 'Commission identity is managed by the deal-closing function.'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.agent_id IS DISTINCT FROM OLD.agent_id
    OR NEW.lead_id IS DISTINCT FROM OLD.lead_id
    OR NEW.deal_id IS DISTINCT FROM OLD.deal_id
    OR NEW.property_id IS DISTINCT FROM OLD.property_id
    OR NEW.invoice_id IS DISTINCT FROM OLD.invoice_id
    OR NEW.sale_amount IS DISTINCT FROM OLD.sale_amount
    OR NEW.commission_rate IS DISTINCT FROM OLD.commission_rate
    OR NEW.commission_amount IS DISTINCT FROM OLD.commission_amount
  THEN
    RAISE EXCEPTION 'Commission identity is managed by the deal-closing function.'
      USING ERRCODE = '42501';
  END IF;

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

DROP TRIGGER IF EXISTS enforce_commission_identity ON public.commission_ledger;
CREATE TRIGGER enforce_commission_identity
  BEFORE INSERT OR UPDATE OR DELETE ON public.commission_ledger
  FOR EACH ROW EXECUTE FUNCTION public.enforce_commission_identity();

CREATE OR REPLACE FUNCTION public.enforce_property_agent_eligibility()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
    AND auth.uid() IS NOT NULL
    AND NEW.created_by IS DISTINCT FROM OLD.created_by
  THEN
    RAISE EXCEPTION 'Property creator is immutable.' USING ERRCODE = '42501';
  END IF;

  IF TG_OP = 'UPDATE'
    AND auth.uid() IS NOT NULL
    AND NEW.assigned_to IS DISTINCT FROM OLD.assigned_to
    AND public.crm_actor_role() IS DISTINCT FROM 'super_admin'
  THEN
    RAISE EXCEPTION 'Only Super Admin may change property assignment.' USING ERRCODE = '42501';
  END IF;

  IF TG_OP = 'UPDATE'
    AND OLD.status IN ('sold', 'rented')
    AND NEW.status IS DISTINCT FROM OLD.status
    AND EXISTS (
      SELECT 1
      FROM public.crm_leads AS l
      WHERE l.deal_state = 'verified'
        AND (
          l.property_id = NEW.id
          OR (
            l.property_id IS NULL
            AND NEW.id = (
              SELECT i.property_id FROM public.crm_interests AS i
              WHERE i.lead_id = l.id
              ORDER BY i.priority ASC NULLS LAST, i.id ASC
              LIMIT 1
            )
          )
        )
    )
  THEN
    RAISE EXCEPTION 'A property attached to a verified deal cannot leave its closed status.'
      USING ERRCODE = '42501';
  END IF;

  IF TG_OP = 'UPDATE'
    AND NEW.listing_type IS DISTINCT FROM OLD.listing_type
    AND EXISTS (
      SELECT 1
      FROM public.crm_leads AS l
      WHERE l.deal_state IN ('pending_verification', 'verified')
        AND (
          l.property_id = NEW.id
          OR (
            l.property_id IS NULL
            AND NEW.id = (
              SELECT i.property_id FROM public.crm_interests AS i
              WHERE i.lead_id = l.id
              ORDER BY i.priority ASC NULLS LAST, i.id ASC
              LIMIT 1
            )
          )
        )
    )
  THEN
    RAISE EXCEPTION 'Listing type is frozen while a linked deal is under review or verified.'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.assigned_to IS NOT NULL
    AND (
      TG_OP = 'INSERT'
      OR NEW.assigned_to IS DISTINCT FROM OLD.assigned_to
      OR NEW.status = 'published'
    )
  THEN
    PERFORM 1
    FROM public.users AS u
    WHERE u.id = NEW.assigned_to
      AND lower(btrim(u.role)) = 'agent'
      AND lower(btrim(coalesce(u.status, ''))) = 'active'
    FOR SHARE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Properties may only be assigned to an active Agent.'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  IF NEW.status = 'published'
    AND NEW.assigned_to IS NULL
    AND (TG_OP = 'INSERT'
      OR NEW.status IS DISTINCT FROM OLD.status
      OR NEW.assigned_to IS DISTINCT FROM OLD.assigned_to)
  THEN
    RAISE EXCEPTION 'Published properties require an active assigned Agent.'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_property_agent_eligibility ON public.properties;
CREATE TRIGGER enforce_property_agent_eligibility
  BEFORE INSERT OR UPDATE OF assigned_to, created_by, status, listing_type ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.enforce_property_agent_eligibility();

REVOKE EXECUTE ON FUNCTION public.prepare_crm_contact_provenance() FROM PUBLIC, anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.enforce_crm_lead_scope_fields() FROM PUBLIC, anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.enforce_crm_lead_workflow() FROM PUBLIC, anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.enforce_crm_child_scope_fields() FROM PUBLIC, anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.enforce_crm_followup_completion() FROM PUBLIC, anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.audit_crm_security_change() FROM PUBLIC, anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.enforce_closing_invoice_identity() FROM PUBLIC, anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.enforce_commission_identity() FROM PUBLIC, anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.enforce_property_agent_eligibility() FROM PUBLIC, anon, authenticated, service_role;

-- Signature intentionally matches Migration 031. All business rejections occur
-- before the first mutation; reconciliation mismatches raise and roll back.
CREATE OR REPLACE FUNCTION public.process_deal_closing_atomic(
  p_lead_id uuid,
  p_actor_id uuid,
  p_commission_rate numeric DEFAULT 0.0250
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
SET timezone = 'UTC'
AS $$
DECLARE
  v_actor public.users%ROWTYPE;
  v_lead public.crm_leads%ROWTYPE;
  v_property public.properties%ROWTYPE;
  v_contact public.crm_contacts%ROWTYPE;
  v_agent public.users%ROWTYPE;
  v_invoice public.invoices%ROWTYPE;
  v_commission public.commission_ledger%ROWTYPE;
  v_agent_id uuid;
  v_target_property_id uuid;
  v_target_status text;
  v_sale_input numeric;
  v_sale_amount numeric(15, 2);
  v_invoice_total bigint;
  v_rate numeric(5, 4);
  v_commission_amount numeric(15, 2);
  v_invoice_id uuid;
  v_invoice_number text;
  v_commission_id uuid;
  v_now timestamptz := clock_timestamp();
BEGIN
  SELECT * INTO v_actor
  FROM public.users AS u
  WHERE u.id = p_actor_id
    AND lower(btrim(u.role)) IN ('admin', 'super_admin', 'superadmin')
    AND lower(btrim(coalesce(u.status, ''))) = 'active'
  FOR SHARE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Aktor tidak berwenang memverifikasi deal.');
  END IF;

  IF coalesce(p_commission_rate, 0.0250) <= 0 OR coalesce(p_commission_rate, 0.0250) > 1 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tarif komisi tidak valid.');
  END IF;
  v_rate := round(coalesce(p_commission_rate, 0.0250), 4);
  IF v_rate <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tarif komisi terlalu kecil.');
  END IF;

  SELECT * INTO v_lead
  FROM public.crm_leads AS l
  WHERE l.id = p_lead_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Lead tidak ditemukan.');
  END IF;

  IF v_lead.deal_state NOT IN ('pending_verification', 'verified') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Deal harus menunggu verifikasi.');
  END IF;

  IF v_lead.deal_state = 'pending_verification' AND v_lead.status IS DISTINCT FROM 'negotiation' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Deal harus berada pada tahap Negotiation.');
  END IF;

  IF v_lead.deal_state = 'verified'
    AND (v_lead.status IS DISTINCT FROM 'won' OR v_lead.deal_verified_at IS NULL)
  THEN
    RAISE EXCEPTION 'Verified lead state is internally inconsistent.' USING ERRCODE = '23514';
  END IF;

  v_target_property_id := v_lead.property_id;
  IF v_target_property_id IS NULL THEN
    SELECT i.property_id INTO v_target_property_id
    FROM public.crm_interests AS i
    WHERE i.lead_id = p_lead_id
    ORDER BY i.priority ASC NULLS LAST, i.id ASC
    LIMIT 1;
  END IF;

  IF v_target_property_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Deal belum memiliki properti tertaut.');
  END IF;

  SELECT * INTO v_property
  FROM public.properties AS p
  WHERE p.id = v_target_property_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Properti tertaut tidak ditemukan.');
  END IF;

  IF lower(btrim(coalesce(v_property.listing_type, ''))) NOT IN ('jual', 'sewa') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Jenis listing properti tidak memenuhi syarat closing.');
  END IF;

  v_target_status := CASE WHEN lower(btrim(v_property.listing_type)) = 'sewa' THEN 'rented' ELSE 'sold' END;

  IF v_lead.deal_state = 'pending_verification' AND v_property.status IS DISTINCT FROM 'published' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Hanya properti published yang dapat diproses closing.');
  END IF;

  IF v_lead.deal_state = 'verified' AND v_property.status IS DISTINCT FROM v_target_status THEN
    RAISE EXCEPTION 'Verified deal property status is inconsistent.' USING ERRCODE = '23514';
  END IF;

  SELECT * INTO v_contact
  FROM public.crm_contacts AS c
  WHERE c.id = v_lead.contact_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Kontak lead tidak ditemukan.');
  END IF;

  v_agent_id := v_lead.assigned_to;
  IF v_lead.deal_state = 'pending_verification' THEN
    SELECT * INTO v_agent
    FROM public.users AS u
    WHERE u.id = v_agent_id
      AND lower(btrim(u.role)) = 'agent'
      AND lower(btrim(coalesce(u.status, ''))) = 'active'
    FOR SHARE;

    IF v_agent_id IS NULL OR NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'error', 'Deal harus ditugaskan kepada Agent aktif.');
    END IF;
  END IF;

  v_sale_input := coalesce(v_lead.budget, 0);
  IF v_sale_input <= 0 OR v_sale_input > 9999999999999.99 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Nilai transaksi tidak valid.');
  END IF;
  v_sale_amount := round(v_sale_input, 2);

  v_invoice_total := round(v_sale_amount)::bigint;
  IF v_invoice_total <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Nilai invoice tidak valid.');
  END IF;
  v_commission_amount := round(v_sale_amount * v_rate, 2);
  IF v_commission_amount <= 0 OR v_commission_amount > 9999999999999.99 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Nilai komisi tidak valid.');
  END IF;

  SELECT * INTO v_invoice
  FROM public.invoices AS i
  WHERE i.deal_id = p_lead_id
  LIMIT 1
  FOR UPDATE;

  IF FOUND THEN
    IF v_invoice.invoice_number IS DISTINCT FROM (
        'INV-' || to_char(v_invoice.created_at, 'YYYYMMDD') || '-' || upper(substr(md5(p_lead_id::text), 1, 6))
      )
      OR v_invoice.client_id IS DISTINCT FROM p_lead_id
      OR v_invoice.property_id IS DISTINCT FROM v_target_property_id
      OR v_invoice.invoice_type IS DISTINCT FROM 'closing'
      OR v_invoice.total_amount IS DISTINCT FROM v_invoice_total
    THEN
      RAISE EXCEPTION 'Existing closing invoice does not match authoritative deal fields.'
        USING ERRCODE = '23514';
    END IF;
    v_invoice_id := v_invoice.id;
  END IF;

  SELECT * INTO v_commission
  FROM public.commission_ledger AS c
  WHERE c.lead_id = p_lead_id
  LIMIT 1
  FOR UPDATE;

  IF FOUND THEN
    IF v_invoice_id IS NULL
      OR v_commission.agent_id IS DISTINCT FROM v_agent_id
      OR v_commission.deal_id IS DISTINCT FROM p_lead_id
      OR v_commission.property_id IS DISTINCT FROM v_target_property_id
      OR v_commission.invoice_id IS DISTINCT FROM v_invoice_id
      OR v_commission.sale_amount IS DISTINCT FROM v_sale_amount
      OR v_commission.commission_rate IS DISTINCT FROM v_rate
      OR v_commission.commission_amount IS DISTINCT FROM v_commission_amount
    THEN
      RAISE EXCEPTION 'Existing commission ledger does not match authoritative deal fields.'
        USING ERRCODE = '23514';
    END IF;
    v_commission_id := v_commission.id;
  END IF;

  IF v_lead.deal_state = 'verified' THEN
    IF v_invoice_id IS NULL OR v_commission_id IS NULL THEN
      RAISE EXCEPTION 'Verified deal is missing its authoritative financial records.'
        USING ERRCODE = '23514';
    END IF;

    RETURN jsonb_build_object(
      'success', true,
      'already_processed', true,
      'property_id', v_target_property_id,
      'property_status', v_target_status,
      'invoice_id', v_invoice_id,
      'commission_id', v_commission_id,
      'sale_amount', v_sale_amount,
      'commission_amount', v_commission_amount
    );
  END IF;

  IF v_invoice_id IS NULL THEN
    v_invoice_number := 'INV-' || to_char(v_now, 'YYYYMMDD') || '-' || upper(substr(md5(p_lead_id::text), 1, 6));
    INSERT INTO public.invoices (
      deal_id, client_id, property_id, invoice_number, invoice_type,
      client_name, client_email, client_phone, issue_date, due_date,
      total_amount, status, notes, created_by, created_at, updated_at
    ) VALUES (
      p_lead_id, p_lead_id, v_target_property_id, v_invoice_number, 'closing',
      coalesce(v_contact.full_name, 'Klien Closing Deal'), v_contact.email, v_contact.phone,
      v_now::date, (v_now + interval '14 days')::date,
      v_invoice_total, 'sent',
      'Faktur pelunasan closing deal resmi: ' || coalesce(v_property.title, v_property.listing_code, 'Properti'),
      p_actor_id, v_now, v_now
    ) RETURNING id INTO v_invoice_id;
  END IF;

  IF v_commission_id IS NULL THEN
    INSERT INTO public.commission_ledger (
      agent_id, lead_id, deal_id, property_id, invoice_id,
      sale_amount, commission_rate, commission_amount, status, notes,
      created_at, updated_at
    ) VALUES (
      v_agent_id, p_lead_id, p_lead_id, v_target_property_id, v_invoice_id,
      v_sale_amount, v_rate, v_commission_amount, 'pending',
      'Komisi transaksi penjualan/sewa unit: ' || coalesce(v_property.title, v_property.listing_code, ''),
      v_now, v_now
    ) RETURNING id INTO v_commission_id;
  END IF;

  UPDATE public.properties
  SET status = v_target_status, updated_at = v_now
  WHERE id = v_target_property_id;

  UPDATE public.crm_leads
  SET deal_state = 'verified', deal_verified_at = v_now, status = 'won', updated_at = v_now
  WHERE id = p_lead_id;

  INSERT INTO public.admin_audit_log (
    actor_id, actor_email, actor_role, action, target_id, detail
  ) VALUES (
    p_actor_id, v_actor.email,
    CASE lower(btrim(v_actor.role)) WHEN 'superadmin' THEN 'super_admin' ELSE lower(btrim(v_actor.role)) END,
    'deal.closed_atomic', p_lead_id,
    jsonb_build_object(
      'property_id', v_target_property_id,
      'invoice_id', v_invoice_id,
      'commission_id', v_commission_id,
      'agent_id', v_agent_id,
      'sale_amount', v_sale_amount,
      'commission_amount', v_commission_amount
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'already_processed', false,
    'property_id', v_target_property_id,
    'property_status', v_target_status,
    'invoice_id', v_invoice_id,
    'commission_id', v_commission_id,
    'sale_amount', v_sale_amount,
    'commission_amount', v_commission_amount
  );
END;
$$;

DO $$
DECLARE
  v_owner text;
BEGIN
  SELECT pg_get_userbyid(p.proowner) INTO v_owner
  FROM pg_proc AS p
  WHERE p.oid = 'public.process_deal_closing_atomic(uuid,uuid,numeric)'::regprocedure;

  IF v_owner IS DISTINCT FROM 'postgres' THEN
    RAISE EXCEPTION 'process_deal_closing_atomic must be owned by postgres; found %.', coalesce(v_owner, '<missing>');
  END IF;
END;
$$;

-- Preserve and restate Migration 033's containment exactly.
REVOKE EXECUTE ON FUNCTION public.process_deal_closing_atomic(uuid, uuid, numeric)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_deal_closing_atomic(uuid, uuid, numeric)
  TO service_role;

COMMIT;
