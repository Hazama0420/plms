\set ON_ERROR_STOP on

CREATE SCHEMA test;
CREATE OR REPLACE FUNCTION test.assert_true(condition boolean, message text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF NOT coalesce(condition, false) THEN
    RAISE EXCEPTION 'ASSERTION FAILED: %', message;
  END IF;
END;
$$;
GRANT USAGE ON SCHEMA test TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION test.assert_true(boolean, text) TO anon, authenticated, service_role;

-- A local Supabase clone has the real auth.users FK; the lightweight PostgreSQL
-- bootstrap intentionally does not. Seed Auth identities only when that table exists.
DO $$
BEGIN
  IF to_regclass('auth.users') IS NOT NULL THEN
    INSERT INTO auth.users (id, aud, role, email, created_at, updated_at)
    SELECT id, 'authenticated', 'authenticated', email, now(), now()
    FROM (VALUES
      ('00000000-0000-0000-0000-000000000001'::uuid, 'agent1@test.local'),
      ('00000000-0000-0000-0000-000000000002'::uuid, 'agent2@test.local'),
      ('00000000-0000-0000-0000-000000000003'::uuid, 'marketing@test.local'),
      ('00000000-0000-0000-0000-000000000004'::uuid, 'viewer@test.local'),
      ('00000000-0000-0000-0000-000000000005'::uuid, 'admin@test.local'),
      ('00000000-0000-0000-0000-000000000006'::uuid, 'super@test.local'),
      ('00000000-0000-0000-0000-000000000007'::uuid, 'commissioner@test.local'),
      ('00000000-0000-0000-0000-000000000008'::uuid, 'suspended@test.local'),
      ('00000000-0000-0000-0000-000000000009'::uuid, 'admin2@test.local'),
      ('00000000-0000-0000-0000-000000000010'::uuid, 'pending-agent@test.local'),
      ('00000000-0000-0000-0000-000000000011'::uuid, 'null-agent@test.local'),
      ('00000000-0000-0000-0000-000000000012'::uuid, 'empty-agent@test.local'),
      ('00000000-0000-0000-0000-000000000013'::uuid, 'unknown-agent@test.local'),
      ('00000000-0000-0000-0000-000000000014'::uuid, 'null-commissioner@test.local'),
      ('00000000-0000-0000-0000-000000000015'::uuid, 'null-admin@test.local'),
      ('00000000-0000-0000-0000-000000000016'::uuid, 'null-super@test.local'),
      ('00000000-0000-0000-0000-000000000017'::uuid, 'unknown-admin@test.local'),
      ('00000000-0000-0000-0000-000000000018'::uuid, 'suspended-super@test.local'),
      ('00000000-0000-0000-0000-000000000019'::uuid, 'whitespace-agent@test.local'),
      ('00000000-0000-0000-0000-000000000020'::uuid, 'missing-profile@test.local'),
      ('00000000-0000-0000-0000-000000000021'::uuid, 'pending-admin@test.local'),
      ('00000000-0000-0000-0000-000000000022'::uuid, 'empty-admin@test.local'),
      ('00000000-0000-0000-0000-000000000023'::uuid, 'whitespace-super@test.local'),
      ('00000000-0000-0000-0000-000000000024'::uuid, 'suspended-admin@test.local')
    ) AS fixture(id, email)
    ON CONFLICT (id) DO NOTHING;
  END IF;
END;
$$;

INSERT INTO public.users (id, email, full_name, role, status) VALUES
  ('00000000-0000-0000-0000-000000000001', 'agent1@test.local', 'Agent One', 'agent', 'active'),
  ('00000000-0000-0000-0000-000000000002', 'agent2@test.local', 'Agent Two', 'agent', 'active'),
  ('00000000-0000-0000-0000-000000000003', 'marketing@test.local', 'Marketing', 'marketing', 'active'),
  ('00000000-0000-0000-0000-000000000004', 'viewer@test.local', 'Viewer', 'viewer', 'active'),
  ('00000000-0000-0000-0000-000000000005', 'admin@test.local', 'Admin', 'admin', 'active'),
  ('00000000-0000-0000-0000-000000000006', 'super@test.local', 'Super Admin', 'super_admin', 'active'),
  ('00000000-0000-0000-0000-000000000007', 'commissioner@test.local', 'Commissioner', 'commissioner', 'active'),
  ('00000000-0000-0000-0000-000000000008', 'suspended@test.local', 'Suspended Agent', 'agent', 'suspended'),
  ('00000000-0000-0000-0000-000000000009', 'admin2@test.local', 'Admin Two', 'admin', 'active'),
  ('00000000-0000-0000-0000-000000000010', 'pending-agent@test.local', 'Pending Agent', 'agent', 'pending'),
  ('00000000-0000-0000-0000-000000000011', 'null-agent@test.local', 'Null Agent', 'agent', NULL),
  ('00000000-0000-0000-0000-000000000012', 'empty-agent@test.local', 'Empty Agent', 'agent', ''),
  ('00000000-0000-0000-0000-000000000013', 'unknown-agent@test.local', 'Unknown Agent', 'agent', 'blocked'),
  ('00000000-0000-0000-0000-000000000014', 'null-commissioner@test.local', 'Null Commissioner', 'commissioner', NULL),
  ('00000000-0000-0000-0000-000000000015', 'null-admin@test.local', 'Null Admin', 'admin', NULL),
  ('00000000-0000-0000-0000-000000000016', 'null-super@test.local', 'Null Super Admin', 'super_admin', NULL),
  ('00000000-0000-0000-0000-000000000017', 'unknown-admin@test.local', 'Unknown Admin', 'admin', 'unknown'),
  ('00000000-0000-0000-0000-000000000018', 'suspended-super@test.local', 'Suspended Super Admin', 'super_admin', 'suspended'),
  ('00000000-0000-0000-0000-000000000019', 'whitespace-agent@test.local', 'Whitespace Agent', 'agent', '   '),
  ('00000000-0000-0000-0000-000000000021', 'pending-admin@test.local', 'Pending Admin', 'admin', 'pending'),
  ('00000000-0000-0000-0000-000000000022', 'empty-admin@test.local', 'Empty Admin', 'admin', ''),
  ('00000000-0000-0000-0000-000000000023', 'whitespace-super@test.local', 'Whitespace Super Admin', 'super_admin', '   '),
  ('00000000-0000-0000-0000-000000000024', 'suspended-admin@test.local', 'Suspended Admin', 'admin', 'suspended')
ON CONFLICT (id) DO NOTHING;

SELECT test.assert_true(
  (SELECT role = 'super_admin' FROM public.users WHERE id = '00000000-0000-0000-0000-000000000006'),
  'Migration 034 must normalize the legacy superadmin spelling'
);

INSERT INTO public.crm_contacts (id, contact_code, full_name, created_by) VALUES
  ('10000000-0000-0000-0000-000000000001', 'C-1', 'Agent One Contact', '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000002', 'C-2', 'Agent Two Contact', '00000000-0000-0000-0000-000000000002'),
  ('10000000-0000-0000-0000-000000000003', 'C-3', 'Marketing Contact', '00000000-0000-0000-0000-000000000003'),
  ('10000000-0000-0000-0000-000000000004', 'C-4', 'Unassigned Contact', NULL),
  ('10000000-0000-0000-0000-000000000005', 'C-5', 'Closing Contact', '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000006', 'C-6', 'Mismatch Contact', '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000007', 'C-7', 'Concurrency Contact', NULL);

INSERT INTO public.properties (id, listing_code, title, slug, property_type, listing_type, status, assigned_to, created_by) VALUES
  ('20000000-0000-0000-0000-000000000001', 'P-1', 'Closing House', 'closing-house', 'house', 'jual', 'published', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000002', 'P-2', 'Mismatch House', 'mismatch-house', 'house', 'jual', 'published', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000003', 'P-3', 'Assignment House', 'assignment-house', 'house', 'sewa', 'draft', NULL, '00000000-0000-0000-0000-000000000005');

INSERT INTO public.crm_leads (
  id, contact_id, assigned_to, created_by, status, deal_state, property_id, budget, deal_submitted_at
) VALUES
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'new', 'none', NULL, 100000000, NULL),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'new', 'none', NULL, 100000000, NULL),
  ('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003', 'new', 'none', NULL, 100000000, NULL),
  ('30000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000004', NULL, NULL, 'new', 'none', NULL, 100000000, NULL),
  ('30000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'negotiation', 'none', '20000000-0000-0000-0000-000000000001', 1000000000, NULL),
  ('30000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'negotiation', 'none', '20000000-0000-0000-0000-000000000002', 500000000, NULL),
  ('30000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000007', NULL, NULL, 'new', 'none', NULL, 100000000, NULL);

INSERT INTO public.invoices (
  id, invoice_number, client_name, due_date, total_amount, status, created_by, invoice_type
) VALUES (
  '50000000-0000-0000-0000-000000000009',
  'INV-NONACTIVE-OWNER',
  'Synthetic Non-Active Owner',
  current_date + 14,
  1000000,
  'draft',
  '00000000-0000-0000-0000-000000000011',
  'standard'
);

INSERT INTO public.crm_interests (id, lead_id, property_id, priority) VALUES (
  '60000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  1
);

INSERT INTO public.crm_followups (
  id, lead_id, assigned_to, created_by, followup_date, status
) VALUES (
  '40000000-0000-0000-0000-000000000009',
  '30000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  now() + interval '1 day',
  'pending'
);

INSERT INTO public.crm_activities (id, lead_id, user_id, activity_type, notes) VALUES (
  '70000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'note',
  'Protected fixture'
);

SELECT test.assert_true(
  NOT has_function_privilege('anon', 'public.process_deal_closing_atomic(uuid,uuid,numeric)', 'execute')
  AND NOT has_function_privilege('authenticated', 'public.process_deal_closing_atomic(uuid,uuid,numeric)', 'execute')
  AND has_function_privilege('service_role', 'public.process_deal_closing_atomic(uuid,uuid,numeric)', 'execute'),
  'closing ACL must remain service-role-only'
);
SELECT test.assert_true(
  NOT has_table_privilege('authenticated', 'public.crm_leads', 'TRUNCATE')
  AND NOT has_table_privilege('authenticated', 'public.crm_contacts', 'TRUNCATE')
  AND NOT has_table_privilege('authenticated', 'public.commission_ledger', 'TRUNCATE')
  AND NOT has_table_privilege('authenticated', 'public.invoices', 'TRUNCATE')
  AND NOT has_table_privilege('authenticated', 'public.properties', 'TRUNCATE'),
  'authenticated must not bypass row security with TRUNCATE'
);
SELECT test.assert_true(
  NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'invoices'
      AND policyname = 'invoices_legacy_allow_all'
  )
  AND (
    SELECT count(*) FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'invoices'
  ) = 4,
  'Migration 034 must replace all invoice policies with the exact final set'
);

CREATE OR REPLACE FUNCTION test.assert_nonactive_crm_denied(p_actor_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_count integer;
  v_claimed boolean;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', p_actor_id::text, true);

  IF public.crm_actor_role() IS NOT NULL THEN
    RAISE EXCEPTION 'non-active profile % received CRM role', p_actor_id;
  END IF;

  SELECT count(*) INTO v_count FROM public.crm_leads;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'non-active profile % selected protected CRM rows', p_actor_id;
  END IF;

  SELECT count(*) INTO v_count FROM public.crm_contacts;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'non-active profile % selected protected CRM contacts', p_actor_id;
  END IF;

  SELECT count(*) INTO v_count FROM public.crm_interests;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'non-active profile % selected protected CRM interests', p_actor_id;
  END IF;

  SELECT count(*) INTO v_count FROM public.crm_followups;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'non-active profile % selected protected CRM follow-ups', p_actor_id;
  END IF;

  SELECT count(*) INTO v_count FROM public.crm_activities;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'non-active profile % selected protected CRM activities', p_actor_id;
  END IF;

  SELECT count(*) INTO v_count FROM public.list_claimable_crm_leads();
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'non-active profile % received claimable CRM rows', p_actor_id;
  END IF;

  SELECT count(*) INTO v_count
  FROM public.invoices
  WHERE id = '50000000-0000-0000-0000-000000000009';
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'non-active profile % selected protected invoice data', p_actor_id;
  END IF;

  BEGIN
    INSERT INTO public.crm_leads (contact_id, assigned_to, created_by, status)
    VALUES (
      '10000000-0000-0000-0000-000000000001',
      p_actor_id,
      p_actor_id,
      'new'
    );
    RAISE EXCEPTION 'non-active profile % inserted CRM data', p_actor_id;
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;

  BEGIN
    INSERT INTO public.invoices (
      invoice_number, client_name, due_date, total_amount, status, created_by, invoice_type
    ) VALUES (
      'INV-FORBIDDEN-' || replace(p_actor_id::text, '-', ''),
      'Forbidden Invoice',
      current_date + 14,
      1,
      'draft',
      p_actor_id,
      'standard'
    );
    RAISE EXCEPTION 'non-active profile % inserted invoice data', p_actor_id;
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;

  UPDATE public.crm_leads
  SET notes = 'forbidden non-active update'
  WHERE id = '30000000-0000-0000-0000-000000000001';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'non-active profile % updated CRM data', p_actor_id;
  END IF;

  DELETE FROM public.crm_leads
  WHERE id = '30000000-0000-0000-0000-000000000001';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'non-active profile % deleted CRM data', p_actor_id;
  END IF;

  UPDATE public.invoices
  SET status = 'sent'
  WHERE id = '50000000-0000-0000-0000-000000000009';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'non-active profile % updated invoice data', p_actor_id;
  END IF;

  DELETE FROM public.invoices
  WHERE id = '50000000-0000-0000-0000-000000000009';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'non-active profile % deleted invoice data', p_actor_id;
  END IF;

  BEGIN
    v_claimed := public.claim_crm_lead_atomic('30000000-0000-0000-0000-000000000004');
    IF coalesce(v_claimed, false) THEN
      RAISE EXCEPTION 'non-active profile % claimed a lead', p_actor_id;
    END IF;
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END;
$$;

GRANT EXECUTE ON FUNCTION test.assert_nonactive_crm_denied(uuid) TO authenticated;

SET ROLE authenticated;
SELECT test.assert_nonactive_crm_denied(id)
FROM (VALUES
  ('00000000-0000-0000-0000-000000000008'::uuid),
  ('00000000-0000-0000-0000-000000000010'::uuid),
  ('00000000-0000-0000-0000-000000000011'::uuid),
  ('00000000-0000-0000-0000-000000000012'::uuid),
  ('00000000-0000-0000-0000-000000000013'::uuid),
  ('00000000-0000-0000-0000-000000000014'::uuid),
  ('00000000-0000-0000-0000-000000000015'::uuid),
  ('00000000-0000-0000-0000-000000000016'::uuid),
  ('00000000-0000-0000-0000-000000000017'::uuid),
  ('00000000-0000-0000-0000-000000000018'::uuid),
  ('00000000-0000-0000-0000-000000000019'::uuid),
  ('00000000-0000-0000-0000-000000000020'::uuid),
  ('00000000-0000-0000-0000-000000000021'::uuid),
  ('00000000-0000-0000-0000-000000000022'::uuid),
  ('00000000-0000-0000-0000-000000000023'::uuid),
  ('00000000-0000-0000-0000-000000000024'::uuid)
) AS nonactive(id);
RESET ROLE;

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000004', false);
SELECT test.assert_true((SELECT count(*) FROM public.crm_leads) = 0, 'viewer must not read CRM leads');
SELECT test.assert_true((SELECT count(*) FROM public.invoices) = 0, 'Viewer must not read invoices');
RESET ROLE;

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
SELECT test.assert_true(
  (SELECT array_agg(id ORDER BY id) FROM public.crm_leads) = ARRAY[
    '30000000-0000-0000-0000-000000000001'::uuid,
    '30000000-0000-0000-0000-000000000005'::uuid,
    '30000000-0000-0000-0000-000000000006'::uuid
  ],
  'Agent base-table access must contain owned leads only'
);
SELECT test.assert_true((SELECT count(*) FROM public.invoices) = 0, 'Agent must not read invoices');
SELECT test.assert_true(
  (SELECT array_agg((claim->>'id')::uuid ORDER BY (claim->>'id')::uuid)
   FROM public.list_claimable_crm_leads() AS claim) = ARRAY[
    '30000000-0000-0000-0000-000000000004'::uuid,
    '30000000-0000-0000-0000-000000000007'::uuid
  ],
  'Agent must receive unassigned lead ids through the sanitized claim pool'
);
SELECT test.assert_true(
  NOT EXISTS (
    SELECT 1 FROM public.list_claimable_crm_leads() AS claim
    WHERE claim ?| ARRAY['contact_id', 'budget', 'notes']
      AND claim->>coalesce((SELECT key FROM jsonb_object_keys(claim) AS key
                           WHERE key IN ('contact_id', 'budget', 'notes') LIMIT 1), '') IS NOT NULL
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.crm_contacts
    WHERE id IN (
      '10000000-0000-0000-0000-000000000004',
      '10000000-0000-0000-0000-000000000007'
    )
  ),
  'unassigned claim pool must not expose contact identity or lead notes/budget'
);

INSERT INTO public.crm_contacts (contact_code, full_name) VALUES ('C-AUTO', 'Auto Owner');
SELECT test.assert_true(
  (SELECT created_by FROM public.crm_contacts WHERE contact_code = 'C-AUTO') = auth.uid(),
  'old app contact insert must receive authenticated provenance'
);

DO $$
BEGIN
  BEGIN
    INSERT INTO public.crm_leads (contact_id, assigned_to, created_by, status)
    VALUES (
      '10000000-0000-0000-0000-000000000002', auth.uid(), auth.uid(), 'new'
    );
    RAISE EXCEPTION 'expected unauthorized contact linkage to fail';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END;
$$;

DO $$
BEGIN
  BEGIN
    UPDATE public.properties
    SET assigned_to = '00000000-0000-0000-0000-000000000002'
    WHERE id = '20000000-0000-0000-0000-000000000001';
    RAISE EXCEPTION 'expected generic Agent property reassignment to fail';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;

  BEGIN
    UPDATE public.properties
    SET created_by = '00000000-0000-0000-0000-000000000002'
    WHERE id = '20000000-0000-0000-0000-000000000001';
    RAISE EXCEPTION 'expected property creator mutation to fail';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END;
$$;

DO $$
BEGIN
  BEGIN
    UPDATE public.crm_leads
    SET status = 'won', deal_state = 'verified', deal_verified_at = now()
    WHERE id = '30000000-0000-0000-0000-000000000001';
    RAISE EXCEPTION 'expected direct won transition to fail';
  EXCEPTION WHEN insufficient_privilege OR check_violation THEN
    NULL;
  END;
END;
$$;

INSERT INTO public.crm_followups (id, lead_id, assigned_to, created_by, followup_date, status)
VALUES (
  '40000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000001', auth.uid(), auth.uid(), now(), 'pending'
);
UPDATE public.crm_followups
SET status = 'completed',
    completed_by = '00000000-0000-0000-0000-000000000002',
    completed_at = '2000-01-01'
WHERE id = '40000000-0000-0000-0000-000000000001';
SELECT test.assert_true(
  (SELECT completed_by = auth.uid() AND completed_at > '2020-01-01' FROM public.crm_followups WHERE id = '40000000-0000-0000-0000-000000000001'),
  'follow-up completion identity must be database-authored'
);
RESET ROLE;

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000003', false);
SELECT test.assert_true(
  (SELECT bool_and(assigned_to IS NOT NULL) FROM public.crm_leads),
  'Marketing must not see the unassigned claim pool'
);
RESET ROLE;

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000007', false);
SELECT test.assert_true((SELECT count(*) FROM public.crm_leads) = 7, 'Commissioner must read all CRM leads');
SELECT test.assert_true((SELECT count(*) FROM public.invoices) = 0, 'Commissioner must not read invoices');
WITH changed AS (
  UPDATE public.crm_leads SET notes = 'forbidden' WHERE id = '30000000-0000-0000-0000-000000000001' RETURNING id
)
SELECT test.assert_true((SELECT count(*) FROM changed) = 0, 'Commissioner must not mutate CRM leads');
RESET ROLE;

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000005', false);
SELECT test.assert_true((SELECT count(*) FROM public.invoices) = 1, 'active Admin must read invoices');
DO $$
BEGIN
  BEGIN
    INSERT INTO public.crm_leads (id, contact_id, assigned_to, created_by, status)
    VALUES (
      '30000000-0000-0000-0000-000000000008',
      '10000000-0000-0000-0000-000000000001',
      auth.uid(), auth.uid(), 'new'
    );
    RAISE EXCEPTION 'expected manager-as-Agent assignment to fail';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;
END;
$$;

DO $$
BEGIN
  BEGIN
    UPDATE public.crm_leads
    SET assigned_to = '00000000-0000-0000-0000-000000000008'
    WHERE id = '30000000-0000-0000-0000-000000000001';
    RAISE EXCEPTION 'expected suspended lead assignee to fail';
  EXCEPTION WHEN insufficient_privilege OR check_violation THEN
    NULL;
  END;
END;
$$;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000006', false);
DO $$
BEGIN
  BEGIN
    UPDATE public.properties
    SET assigned_to = '00000000-0000-0000-0000-000000000008'
    WHERE id = '20000000-0000-0000-0000-000000000003';
    RAISE EXCEPTION 'expected suspended property assignee to fail';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;
END;
$$;
UPDATE public.properties
SET assigned_to = '00000000-0000-0000-0000-000000000002'
WHERE id = '20000000-0000-0000-0000-000000000003';

UPDATE public.users
SET status = 'suspended'
WHERE id = '00000000-0000-0000-0000-000000000002';
DO $$
BEGIN
  BEGIN
    UPDATE public.properties
    SET status = 'published'
    WHERE id = '20000000-0000-0000-0000-000000000003';
    RAISE EXCEPTION 'expected publishing with a suspended Agent to fail';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;
END;
$$;
UPDATE public.users
SET status = 'active'
WHERE id = '00000000-0000-0000-0000-000000000002';

INSERT INTO public.crm_leads (
  id, contact_id, assigned_to, created_by, status, deal_state, deal_submitted_at
) VALUES (
  '30000000-0000-0000-0000-000000000008',
  '10000000-0000-0000-0000-000000000004',
  NULL,
  '00000000-0000-0000-0000-000000000006',
  'negotiation',
  'none',
  NULL
);
UPDATE public.crm_leads
SET deal_state = 'pending_verification', deal_submitted_at = now()
WHERE id = '30000000-0000-0000-0000-000000000008';

RESET ROLE;
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
SELECT test.assert_true(
  NOT EXISTS (
    SELECT 1 FROM public.list_claimable_crm_leads() AS claim
    WHERE claim->>'id' = '30000000-0000-0000-0000-000000000008'
  )
  AND NOT public.claim_crm_lead_atomic('30000000-0000-0000-0000-000000000008'),
  'pending-verification leads must not be listed or claimed'
);
RESET ROLE;
DELETE FROM public.crm_leads
WHERE id = '30000000-0000-0000-0000-000000000008';

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000006', false);

DO $$
BEGIN
  BEGIN
    INSERT INTO public.commission_ledger (
      agent_id, lead_id, deal_id, property_id, sale_amount, commission_rate, commission_amount
    ) VALUES (
      '00000000-0000-0000-0000-000000000001',
      '30000000-0000-0000-0000-000000000005',
      '30000000-0000-0000-0000-000000000005',
      '20000000-0000-0000-0000-000000000001', 1000000000, 0.0250, 25000000
    );
    RAISE EXCEPTION 'expected direct commission insert to fail';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END;
$$;
RESET ROLE;

-- Submit the two closing fixtures through the normal scoped transition.
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
UPDATE public.crm_leads
SET deal_state = 'pending_verification', deal_submitted_at = now()
WHERE id IN (
  '30000000-0000-0000-0000-000000000005',
  '30000000-0000-0000-0000-000000000006'
);

DO $$
BEGIN
  BEGIN
    UPDATE public.crm_leads
    SET budget = budget + 1
    WHERE id = '30000000-0000-0000-0000-000000000006';
    RAISE EXCEPTION 'expected submitted deal terms to be frozen';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END;
$$;

DO $$
BEGIN
  BEGIN
    INSERT INTO public.crm_interests (lead_id, property_id)
    VALUES (
      '30000000-0000-0000-0000-000000000006',
      '20000000-0000-0000-0000-000000000003'
    );
    RAISE EXCEPTION 'expected submitted deal interests to be frozen';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END;
$$;

DO $$
BEGIN
  BEGIN
    UPDATE public.crm_leads
    SET status = 'lost', lost_reason = 'duplicate'
    WHERE id = '30000000-0000-0000-0000-000000000006';
    RAISE EXCEPTION 'expected pending deal pipeline change to fail';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;
END;
$$;
RESET ROLE;

SELECT set_config('request.jwt.claim.sub', '', false);
SET ROLE service_role;
SELECT test.assert_true(
  NOT (public.process_deal_closing_atomic(
    '30000000-0000-0000-0000-000000000005',
    '00000000-0000-0000-0000-000000000015',
    0.0250
  )->>'success')::boolean,
  'Admin with NULL status must not authorize closing'
);
SELECT test.assert_true(
  NOT (public.process_deal_closing_atomic(
    '30000000-0000-0000-0000-000000000005',
    '00000000-0000-0000-0000-000000000016',
    0.0250
  )->>'success')::boolean,
  'Super Admin with NULL status must not authorize closing'
);
SELECT test.assert_true(
  NOT (public.process_deal_closing_atomic(
    '30000000-0000-0000-0000-000000000005',
    '00000000-0000-0000-0000-000000000017',
    0.0250
  )->>'success')::boolean,
  'Admin with unknown status must not authorize closing'
);
SELECT test.assert_true(
  NOT (public.process_deal_closing_atomic(
    '30000000-0000-0000-0000-000000000005',
    '00000000-0000-0000-0000-000000000018',
    0.0250
  )->>'success')::boolean,
  'suspended Super Admin must not authorize closing'
);
SELECT test.assert_true(
  NOT (public.process_deal_closing_atomic(
    '30000000-0000-0000-0000-000000000005',
    '00000000-0000-0000-0000-000000000001',
    0.0250
  )->>'success')::boolean,
  'active Agent must not authorize closing'
);
SELECT test.assert_true(
  NOT (public.process_deal_closing_atomic(
    '30000000-0000-0000-0000-000000000005',
    '00000000-0000-0000-0000-000000000007',
    0.0250
  )->>'success')::boolean,
  'active Commissioner must not authorize closing'
);
SELECT test.assert_true(
  NOT (public.process_deal_closing_atomic(
    '30000000-0000-0000-0000-000000000005',
    '00000000-0000-0000-0000-000000000003',
    0.0250
  )->>'success')::boolean,
  'active Marketing must not authorize closing'
);
SELECT test.assert_true(
  NOT (public.process_deal_closing_atomic(
    '30000000-0000-0000-0000-000000000005',
    '00000000-0000-0000-0000-000000000004',
    0.0250
  )->>'success')::boolean,
  'active Viewer must not authorize closing'
);
SELECT test.assert_true(
  NOT (public.process_deal_closing_atomic(
    '30000000-0000-0000-0000-000000000005',
    '00000000-0000-0000-0000-000000000020',
    0.0250
  )->>'success')::boolean,
  'authenticated user without a profile must not authorize closing'
);
SELECT test.assert_true(
  NOT (public.process_deal_closing_atomic(
    '30000000-0000-0000-0000-000000000005',
    '00000000-0000-0000-0000-000000000021',
    0.0250
  )->>'success')::boolean,
  'pending Admin must not authorize closing'
);
SELECT test.assert_true(
  NOT (public.process_deal_closing_atomic(
    '30000000-0000-0000-0000-000000000005',
    '00000000-0000-0000-0000-000000000022',
    0.0250
  )->>'success')::boolean,
  'Admin with empty status must not authorize closing'
);
SELECT test.assert_true(
  NOT (public.process_deal_closing_atomic(
    '30000000-0000-0000-0000-000000000005',
    '00000000-0000-0000-0000-000000000023',
    0.0250
  )->>'success')::boolean,
  'Super Admin with whitespace status must not authorize closing'
);
SELECT test.assert_true(
  NOT (public.process_deal_closing_atomic(
    '30000000-0000-0000-0000-000000000005',
    '00000000-0000-0000-0000-000000000024',
    0.0250
  )->>'success')::boolean,
  'suspended Admin must not authorize closing'
);
SELECT test.assert_true(
  (public.process_deal_closing_atomic(
    '30000000-0000-0000-0000-000000000005',
    '00000000-0000-0000-0000-000000000005',
    0.0250
  )->>'success')::boolean,
  'authorized closing must succeed'
);
SELECT test.assert_true(
  (public.process_deal_closing_atomic(
    '30000000-0000-0000-0000-000000000005',
    '00000000-0000-0000-0000-000000000006',
    0.0250
  )->>'already_processed')::boolean,
  'active Super Admin must authorize idempotent closing'
);
RESET ROLE;

SELECT test.assert_true(
  (SELECT status = 'won' AND deal_state = 'verified' AND deal_verified_at IS NOT NULL
   FROM public.crm_leads WHERE id = '30000000-0000-0000-0000-000000000005'),
  'closing must verify and win the lead'
);
SELECT test.assert_true(
  (SELECT status = 'sold' FROM public.properties WHERE id = '20000000-0000-0000-0000-000000000001'),
  'closing must sell the property'
);
SELECT test.assert_true(
  (SELECT total_amount = 1000000000 AND invoice_type = 'closing'
   FROM public.invoices WHERE deal_id = '30000000-0000-0000-0000-000000000005'),
  'closing invoice must use the authoritative sale amount'
);
SELECT test.assert_true(
  (SELECT agent_id = '00000000-0000-0000-0000-000000000001'
      AND sale_amount = 1000000000 AND commission_rate = 0.0250 AND commission_amount = 25000000
   FROM public.commission_ledger WHERE lead_id = '30000000-0000-0000-0000-000000000005'),
  'commission must use the active responsible Agent and canonical rate'
);
SELECT test.assert_true(
  EXISTS (SELECT 1 FROM public.admin_audit_log WHERE action = 'deal.closed_atomic' AND target_id = '30000000-0000-0000-0000-000000000005'),
  'closing must write an atomic audit event'
);

CREATE OR REPLACE FUNCTION test.assert_nonactive_commission_denied(p_actor_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_count integer;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', p_actor_id::text, true);
  SELECT count(*) INTO v_count FROM public.commission_ledger;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'non-active profile % read commission data', p_actor_id;
  END IF;
  UPDATE public.commission_ledger
  SET status = 'approved'
  WHERE lead_id = '30000000-0000-0000-0000-000000000005';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'non-active profile % mutated commission data', p_actor_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION test.assert_nonactive_commission_denied(uuid) TO authenticated;

SET ROLE authenticated;
SELECT test.assert_nonactive_commission_denied(id)
FROM (VALUES
  ('00000000-0000-0000-0000-000000000008'::uuid),
  ('00000000-0000-0000-0000-000000000010'::uuid),
  ('00000000-0000-0000-0000-000000000011'::uuid),
  ('00000000-0000-0000-0000-000000000012'::uuid),
  ('00000000-0000-0000-0000-000000000013'::uuid),
  ('00000000-0000-0000-0000-000000000014'::uuid),
  ('00000000-0000-0000-0000-000000000015'::uuid),
  ('00000000-0000-0000-0000-000000000016'::uuid),
  ('00000000-0000-0000-0000-000000000017'::uuid),
  ('00000000-0000-0000-0000-000000000018'::uuid),
  ('00000000-0000-0000-0000-000000000019'::uuid),
  ('00000000-0000-0000-0000-000000000020'::uuid),
  ('00000000-0000-0000-0000-000000000021'::uuid),
  ('00000000-0000-0000-0000-000000000022'::uuid),
  ('00000000-0000-0000-0000-000000000023'::uuid),
  ('00000000-0000-0000-0000-000000000024'::uuid)
) AS nonactive(id);
RESET ROLE;

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000005', false);
DO $$
BEGIN
  BEGIN
    UPDATE public.crm_leads
    SET interest_type = 'mutated after close'
    WHERE id = '30000000-0000-0000-0000-000000000005';
    RAISE EXCEPTION 'expected verified deal interest mutation to fail';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END;
$$;
RESET ROLE;

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000005', false);
DO $$
BEGIN
  BEGIN
    UPDATE public.properties
    SET status = 'published'
    WHERE id = '20000000-0000-0000-0000-000000000001';
    RAISE EXCEPTION 'expected closed property reopening to fail';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END;
$$;
RESET ROLE;

-- Account lifecycle changes must not invalidate an already committed close.
SELECT set_config('request.jwt.claim.sub', '', false);
UPDATE public.users SET status = 'suspended'
WHERE id = '00000000-0000-0000-0000-000000000001';
UPDATE public.users SET role = 'viewer'
WHERE id = '00000000-0000-0000-0000-000000000005';

SELECT set_config('request.jwt.claim.sub', '', false);
SET ROLE service_role;
SELECT test.assert_true(
  (public.process_deal_closing_atomic(
    '30000000-0000-0000-0000-000000000005',
    '00000000-0000-0000-0000-000000000009',
    0.0250
  )->>'already_processed')::boolean,
  'another authorized Admin must receive an idempotent result'
);
RESET ROLE;

UPDATE public.users SET status = 'active'
WHERE id = '00000000-0000-0000-0000-000000000001';
UPDATE public.users SET role = 'admin'
WHERE id = '00000000-0000-0000-0000-000000000005';

-- Seed a mismatched invoice as postgres to prove the RPC raises before mutation.
INSERT INTO public.invoices (
  id, invoice_number, client_id, client_name, property_id, due_date,
  total_amount, status, created_by, deal_id, invoice_type
) VALUES (
  '50000000-0000-0000-0000-000000000001',
  'INV-20000101-BADBAD',
  '30000000-0000-0000-0000-000000000006',
  'Mismatch Contact',
  '20000000-0000-0000-0000-000000000002',
  current_date + 14,
  1,
  'sent',
  '00000000-0000-0000-0000-000000000005',
  '30000000-0000-0000-0000-000000000006',
  'closing'
);

SELECT set_config('request.jwt.claim.sub', '', false);
SET ROLE service_role;
DO $$
BEGIN
  BEGIN
    PERFORM public.process_deal_closing_atomic(
      '30000000-0000-0000-0000-000000000006',
      '00000000-0000-0000-0000-000000000005',
      0.0250
    );
    RAISE EXCEPTION 'expected mismatched invoice closing to fail';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;
END;
$$;
RESET ROLE;

SELECT test.assert_true(
  (SELECT status = 'negotiation' AND deal_state = 'pending_verification'
   FROM public.crm_leads WHERE id = '30000000-0000-0000-0000-000000000006'),
  'mismatch failure must leave lead unclosed'
);
SELECT test.assert_true(
  (SELECT status = 'published' FROM public.properties WHERE id = '20000000-0000-0000-0000-000000000002'),
  'mismatch failure must leave property unchanged'
);
SELECT test.assert_true(
  NOT EXISTS (SELECT 1 FROM public.commission_ledger WHERE lead_id = '30000000-0000-0000-0000-000000000006'),
  'mismatch failure must not create commission data'
);

SELECT 'phase12_security_test: PASS' AS result;
