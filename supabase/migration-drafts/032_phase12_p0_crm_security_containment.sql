-- Phase 12 Step 1: contain P0 CRM authorization and deal-closing risks.
-- Forward-only. Apply only after testing against a disposable Supabase project.

BEGIN;

-- Canonical role spelling and the complete supported role set.
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS valid_role;

UPDATE public.users
SET role = 'super_admin'
WHERE lower(btrim(role)) = 'superadmin';

ALTER TABLE public.users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('super_admin', 'admin', 'agent', 'marketing', 'viewer', 'commissioner'));

-- A standalone contact needs an owner before it can safely be visible to its creator.
ALTER TABLE public.crm_contacts
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_crm_contacts_created_by
  ON public.crm_contacts(created_by);

-- Database-authoritative CRM role. Unknown/missing/blocked profiles fail closed.
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
    AND coalesce(lower(btrim(u.status)), '') NOT IN ('pending', 'suspended')
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
            AND (
              l.assigned_to = auth.uid()
              OR l.created_by = auth.uid()
              OR l.assigned_to IS NULL
            )
          )
          OR (
            public.crm_actor_role() = 'marketing'
            AND (
              l.assigned_to = auth.uid()
              OR l.created_by = auth.uid()
            )
          )
        )
    );
$$;

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

GRANT EXECUTE ON FUNCTION public.crm_actor_role() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_crm_reader() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_crm_manager() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.crm_lead_visible(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.crm_lead_owned(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.crm_contact_visible(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.crm_contact_owned(uuid) TO authenticated, service_role;

-- Leads: viewer has no branch; commissioner only has the full-read branch.
DROP POLICY IF EXISTS crm_leads_select ON public.crm_leads;
CREATE POLICY crm_leads_select ON public.crm_leads
  FOR SELECT TO authenticated
  USING (
    public.is_crm_reader()
    OR (
      public.crm_actor_role() = 'agent'
      AND (assigned_to = auth.uid() OR created_by = auth.uid() OR assigned_to IS NULL)
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

-- Contacts follow their creator or an authorized lead. Orphan contacts are no longer global.
DROP POLICY IF EXISTS crm_contacts_select ON public.crm_contacts;
CREATE POLICY crm_contacts_select ON public.crm_contacts
  FOR SELECT TO authenticated
  USING (
    public.is_crm_reader()
    OR (
      public.crm_actor_role() IN ('agent', 'marketing')
      AND (
        created_by = auth.uid()
        OR EXISTS (
          SELECT 1
          FROM public.crm_leads AS l
          WHERE l.contact_id = crm_contacts.id
            AND public.crm_lead_visible(l.id)
        )
      )
    )
  );

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
  USING (
    public.is_crm_manager()
    OR (
      public.crm_actor_role() IN ('agent', 'marketing')
      AND (
        created_by = auth.uid()
        OR EXISTS (
          SELECT 1
          FROM public.crm_leads AS l
          WHERE l.contact_id = crm_contacts.id
            AND public.crm_lead_owned(l.id)
        )
      )
    )
  )
  WITH CHECK (
    public.is_crm_manager()
    OR (
      public.crm_actor_role() IN ('agent', 'marketing')
      AND (
        created_by = auth.uid()
        OR EXISTS (
          SELECT 1
          FROM public.crm_leads AS l
          WHERE l.contact_id = crm_contacts.id
            AND public.crm_lead_owned(l.id)
        )
      )
    )
  );

DROP POLICY IF EXISTS crm_contacts_delete ON public.crm_contacts;
CREATE POLICY crm_contacts_delete ON public.crm_contacts
  FOR DELETE TO authenticated
  USING (public.is_crm_manager());

-- Interests inherit the lead scope.
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

-- Follow-ups are writable only by full managers or scoped users assigned to them.
DROP POLICY IF EXISTS crm_followups_select ON public.crm_followups;
CREATE POLICY crm_followups_select ON public.crm_followups
  FOR SELECT TO authenticated
  USING (
    public.is_crm_reader()
    OR (
      public.crm_actor_role() IN ('agent', 'marketing')
      AND (
        assigned_to = auth.uid()
        OR created_by = auth.uid()
        OR public.crm_lead_visible(lead_id)
      )
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

-- Activities remain operational CRM data, but no viewer-owned bypass remains.
DROP POLICY IF EXISTS crm_activities_select ON public.crm_activities;
CREATE POLICY crm_activities_select ON public.crm_activities
  FOR SELECT TO authenticated
  USING (
    public.is_crm_reader()
    OR (
      public.crm_actor_role() IN ('agent', 'marketing')
      AND (user_id = auth.uid() OR public.crm_lead_visible(lead_id))
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
    OR (public.crm_actor_role() IN ('agent', 'marketing') AND user_id = auth.uid())
  )
  WITH CHECK (
    public.is_crm_manager()
    OR (public.crm_actor_role() IN ('agent', 'marketing') AND user_id = auth.uid())
  );

DROP POLICY IF EXISTS crm_activities_delete ON public.crm_activities;
CREATE POLICY crm_activities_delete ON public.crm_activities
  FOR DELETE TO authenticated
  USING (public.is_crm_manager());

-- Preserve the Phase 11 commission visibility model with canonical role checks.
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

REVOKE ALL PRIVILEGES ON TABLE public.commission_ledger FROM anon;

-- Scoped roles cannot rewrite ownership metadata. The only exception is an
-- agent claim that changes an unassigned lead's assignee and updated_at only.
CREATE OR REPLACE FUNCTION public.enforce_crm_lead_ownership_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_role text := public.crm_actor_role();
BEGIN
  IF v_role IN ('agent', 'marketing') THEN
    IF NEW.created_by IS DISTINCT FROM OLD.created_by THEN
      RAISE EXCEPTION 'Lead creator cannot be changed by a scoped CRM user.'
        USING ERRCODE = '42501';
    END IF;

    IF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to THEN
      IF NOT (
        v_role = 'agent'
        AND OLD.assigned_to IS NULL
        AND NEW.assigned_to = auth.uid()
        AND (to_jsonb(NEW) - 'assigned_to' - 'updated_at')
          = (to_jsonb(OLD) - 'assigned_to' - 'updated_at')
      ) THEN
        RAISE EXCEPTION 'Lead ownership changes must use an authorized assignment path.'
          USING ERRCODE = '42501';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_crm_lead_ownership_fields ON public.crm_leads;
CREATE TRIGGER enforce_crm_lead_ownership_fields
  BEFORE UPDATE OF assigned_to, created_by
  ON public.crm_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_crm_lead_ownership_fields();

CREATE OR REPLACE FUNCTION public.enforce_crm_contact_creator()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF public.crm_actor_role() IN ('agent', 'marketing')
    AND NEW.created_by IS DISTINCT FROM OLD.created_by
  THEN
    RAISE EXCEPTION 'Contact creator cannot be changed by a scoped CRM user.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_crm_contact_creator ON public.crm_contacts;
CREATE TRIGGER enforce_crm_contact_creator
  BEFORE UPDATE OF created_by
  ON public.crm_contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_crm_contact_creator();

CREATE OR REPLACE FUNCTION public.enforce_crm_child_scope_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF public.crm_actor_role() IN ('agent', 'marketing') THEN
    IF (to_jsonb(NEW)->'lead_id') IS DISTINCT FROM (to_jsonb(OLD)->'lead_id') THEN
      RAISE EXCEPTION 'CRM child records cannot be moved to another lead.'
        USING ERRCODE = '42501';
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

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_crm_interest_scope_fields ON public.crm_interests;
CREATE TRIGGER enforce_crm_interest_scope_fields
  BEFORE UPDATE OF lead_id
  ON public.crm_interests
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_crm_child_scope_fields();

DROP TRIGGER IF EXISTS enforce_crm_followup_scope_fields ON public.crm_followups;
CREATE TRIGGER enforce_crm_followup_scope_fields
  BEFORE UPDATE OF lead_id, assigned_to, created_by
  ON public.crm_followups
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_crm_child_scope_fields();

DROP TRIGGER IF EXISTS enforce_crm_activity_scope_fields ON public.crm_activities;
CREATE TRIGGER enforce_crm_activity_scope_fields
  BEFORE UPDATE OF lead_id, user_id
  ON public.crm_activities
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_crm_child_scope_fields();

REVOKE EXECUTE ON FUNCTION public.enforce_crm_lead_ownership_fields() FROM PUBLIC, anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.enforce_crm_contact_creator() FROM PUBLIC, anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.enforce_crm_child_scope_fields() FROM PUBLIC, anon, authenticated, service_role;

-- Only the postgres-owned closing function may introduce won/verified state.
CREATE OR REPLACE FUNCTION public.enforce_crm_lead_closing_path()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF (
    TG_OP = 'INSERT'
    AND (
      NEW.status = 'won'
      OR NEW.deal_state = 'verified'
      OR NEW.deal_verified_at IS NOT NULL
    )
  ) OR (
    TG_OP = 'UPDATE'
    AND (
      (
        NEW.status IS DISTINCT FROM OLD.status
        OR NEW.deal_state IS DISTINCT FROM OLD.deal_state
        OR NEW.deal_verified_at IS DISTINCT FROM OLD.deal_verified_at
      )
      AND (
        OLD.status = 'won'
        OR NEW.status = 'won'
        OR OLD.deal_state = 'verified'
        OR NEW.deal_state = 'verified'
        OR NEW.deal_verified_at IS DISTINCT FROM OLD.deal_verified_at
      )
    )
  ) THEN
    IF current_user <> 'postgres' THEN
      RAISE EXCEPTION 'Won/verified transitions must use the authorized deal-closing function.'
        USING ERRCODE = '42501';
    END IF;

    IF NEW.status IS DISTINCT FROM 'won'
      OR NEW.deal_state IS DISTINCT FROM 'verified'
      OR NEW.deal_verified_at IS NULL
    THEN
      RAISE EXCEPTION 'Won and verified state must be committed together.'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_crm_lead_closing_path ON public.crm_leads;
CREATE TRIGGER enforce_crm_lead_closing_path
  BEFORE INSERT OR UPDATE
  ON public.crm_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_crm_lead_closing_path();

REVOKE EXECUTE ON FUNCTION public.enforce_crm_lead_closing_path() FROM PUBLIC, anon, authenticated, service_role;

-- Existing invoice policies predate deal_id. They may still manage ordinary
-- invoices, but only the closing function may assign closing identity fields.
CREATE OR REPLACE FUNCTION public.enforce_closing_invoice_identity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF current_user <> 'postgres' AND (
    (
      TG_OP = 'INSERT'
      AND (NEW.deal_id IS NOT NULL OR NEW.invoice_type = 'closing')
    )
    OR (
      TG_OP = 'UPDATE'
      AND (
        NEW.deal_id IS DISTINCT FROM OLD.deal_id
        OR NEW.invoice_type IS DISTINCT FROM OLD.invoice_type
      )
      AND (
        OLD.deal_id IS NOT NULL
        OR NEW.deal_id IS NOT NULL
        OR OLD.invoice_type = 'closing'
        OR NEW.invoice_type = 'closing'
      )
    )
  ) THEN
    RAISE EXCEPTION 'Closing invoice identity must be assigned by the deal-closing function.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_closing_invoice_identity ON public.invoices;
CREATE TRIGGER enforce_closing_invoice_identity
  BEFORE INSERT OR UPDATE
  ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_closing_invoice_identity();

REVOKE EXECUTE ON FUNCTION public.enforce_closing_invoice_identity() FROM PUBLIC, anon, authenticated, service_role;

-- The caller is service_role, but the human actor is independently verified in public.users.
CREATE OR REPLACE FUNCTION public.process_deal_closing_atomic(
  p_lead_id uuid,
  p_actor_id uuid,
  p_commission_rate numeric DEFAULT 0.0250
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_role text;
  v_lead public.crm_leads%ROWTYPE;
  v_property public.properties%ROWTYPE;
  v_contact public.crm_contacts%ROWTYPE;
  v_target_property_id uuid;
  v_target_status text;
  v_sale_amount numeric;
  v_rate numeric := coalesce(p_commission_rate, 0.0250);
  v_commission_amount numeric;
  v_invoice_id uuid;
  v_invoice_property_id uuid;
  v_invoice_client_id uuid;
  v_invoice_created_by uuid;
  v_invoice_type text;
  v_invoice_number text;
  v_commission_id uuid;
  v_ledger_agent_id uuid;
  v_ledger_property_id uuid;
  v_ledger_invoice_id uuid;
  v_agent_id uuid;
  v_now timestamptz := now();
  v_already_processed boolean := false;
BEGIN
  SELECT CASE lower(btrim(u.role))
    WHEN 'superadmin' THEN 'super_admin'
    ELSE lower(btrim(u.role))
  END
  INTO v_actor_role
  FROM public.users AS u
  WHERE u.id = p_actor_id
    AND coalesce(lower(btrim(u.status)), '') NOT IN ('pending', 'suspended')
  FOR SHARE;

  IF v_actor_role IS NULL OR v_actor_role NOT IN ('admin', 'super_admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Aktor tidak berwenang memverifikasi deal.');
  END IF;

  IF v_rate <= 0 OR v_rate > 1 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tarif komisi tidak valid.');
  END IF;

  SELECT * INTO v_lead
  FROM public.crm_leads
  WHERE id = p_lead_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Lead tidak ditemukan.');
  END IF;

  IF v_lead.deal_state NOT IN ('pending_verification', 'verified') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Deal harus dalam status pending_verification untuk diproses.'
    );
  END IF;

  IF v_lead.deal_state = 'verified' AND (
    v_lead.status IS DISTINCT FROM 'won'
    OR v_lead.deal_verified_at IS NULL
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'State deal terverifikasi tidak konsisten.');
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
  FROM public.properties
  WHERE id = v_target_property_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Properti tertaut tidak ditemukan.');
  END IF;

  SELECT * INTO v_contact
  FROM public.crm_contacts
  WHERE id = v_lead.contact_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Kontak lead tidak ditemukan.');
  END IF;

  v_agent_id := coalesce(v_lead.assigned_to, p_actor_id);
  IF NOT EXISTS (SELECT 1 FROM public.users AS u WHERE u.id = v_agent_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Penerima komisi tidak ditemukan.');
  END IF;

  SELECT i.id, i.property_id, i.client_id, i.created_by, i.invoice_type
  INTO v_invoice_id, v_invoice_property_id, v_invoice_client_id, v_invoice_created_by, v_invoice_type
  FROM public.invoices AS i
  WHERE i.deal_id = p_lead_id
  LIMIT 1
  FOR UPDATE;

  IF v_invoice_id IS NOT NULL AND (
    v_invoice_property_id IS DISTINCT FROM v_target_property_id
    OR v_invoice_client_id IS DISTINCT FROM p_lead_id
    OR v_invoice_type IS DISTINCT FROM 'closing'
    OR NOT EXISTS (
      SELECT 1
      FROM public.users AS u
      WHERE u.id = v_invoice_created_by
        AND lower(btrim(u.role)) IN ('admin', 'super_admin', 'superadmin')
    )
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invoice closing tidak konsisten dengan deal.');
  END IF;

  SELECT c.id, c.agent_id, c.property_id, c.invoice_id
  INTO v_commission_id, v_ledger_agent_id, v_ledger_property_id, v_ledger_invoice_id
  FROM public.commission_ledger AS c
  WHERE c.lead_id = p_lead_id
  LIMIT 1
  FOR UPDATE;

  IF v_commission_id IS NOT NULL AND (
    v_ledger_agent_id IS DISTINCT FROM v_agent_id
    OR v_ledger_property_id IS DISTINCT FROM v_target_property_id
    OR (v_ledger_invoice_id IS NOT NULL AND v_ledger_invoice_id IS DISTINCT FROM v_invoice_id)
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ledger komisi tidak konsisten dengan deal.');
  END IF;

  v_target_status := CASE
    WHEN lower(coalesce(v_property.listing_type, '')) = 'sewa' THEN 'rented'
    ELSE 'sold'
  END;
  v_sale_amount := greatest(coalesce(v_lead.budget, 0), 0);
  v_commission_amount := greatest(round(v_sale_amount * v_rate, 2), 0);
  v_already_processed := (
    v_lead.deal_state = 'verified'
    AND v_invoice_id IS NOT NULL
    AND v_commission_id IS NOT NULL
  );

  IF v_property.status IS DISTINCT FROM v_target_status THEN
    UPDATE public.properties
    SET status = v_target_status, updated_at = v_now
    WHERE id = v_target_property_id;
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
      to_char(v_now, 'YYYY-MM-DD'), to_char(v_now + interval '14 days', 'YYYY-MM-DD'),
      CASE WHEN v_commission_amount > 0 THEN v_commission_amount ELSE 1000000 END,
      'sent',
      'Faktur pelunasan closing deal resmi: ' || coalesce(v_property.title, v_property.listing_code, 'Properti'),
      p_actor_id, v_now, v_now
    )
    RETURNING id INTO v_invoice_id;
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
    )
    RETURNING id INTO v_commission_id;
  ELSIF v_ledger_invoice_id IS NULL THEN
    UPDATE public.commission_ledger
    SET invoice_id = v_invoice_id, updated_at = v_now
    WHERE id = v_commission_id;
  END IF;

  IF v_lead.deal_state = 'pending_verification' THEN
    UPDATE public.crm_leads
    SET deal_state = 'verified', deal_verified_at = v_now, status = 'won', updated_at = v_now
    WHERE id = p_lead_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'already_processed', v_already_processed,
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

REVOKE EXECUTE ON FUNCTION public.process_deal_closing_atomic(uuid, uuid, numeric)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_deal_closing_atomic(uuid, uuid, numeric)
  TO service_role;

COMMIT;
