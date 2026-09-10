-- Read-only Phase 12 security reconciliation.
-- Run only against the explicitly selected Supabase project:
--   supabase db query --linked --file scripts/verify-phase12-security.sql

BEGIN TRANSACTION READ ONLY;

SELECT version, name
FROM supabase_migrations.schema_migrations
WHERE version IN ('031', '032', '033', '034')
ORDER BY version;

SELECT role AS exact_role_spelling, count(*) AS user_count
FROM public.users
GROUP BY role
ORDER BY role;

SELECT tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'crm_leads', 'crm_contacts', 'crm_interests',
    'crm_followups', 'crm_activities', 'commission_ledger', 'invoices'
  )
ORDER BY tablename, cmd, policyname;

SELECT
  p.oid::regprocedure AS function_signature,
  p.prosecdef AS security_definer,
  has_function_privilege('anon', p.oid, 'execute') AS anon_execute,
  has_function_privilege('authenticated', p.oid, 'execute') AS authenticated_execute,
  has_function_privilege('service_role', p.oid, 'execute') AS service_role_execute
FROM pg_proc AS p
JOIN pg_namespace AS n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'crm_actor_role', 'is_crm_reader', 'is_crm_manager',
    'crm_lead_visible', 'crm_lead_owned',
    'crm_contact_visible', 'crm_contact_owned',
    'list_claimable_crm_leads', 'claim_crm_lead_atomic',
    'process_deal_closing_atomic'
  )
ORDER BY p.oid::regprocedure::text;

SELECT table_name, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND grantee = 'anon'
  AND table_name IN (
    'crm_leads', 'crm_contacts', 'crm_interests',
    'crm_followups', 'crm_activities', 'commission_ledger'
  )
ORDER BY table_name, privilege_type;

SELECT table_name, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND grantee = 'authenticated'
  AND privilege_type IN ('TRUNCATE', 'REFERENCES', 'TRIGGER')
  AND table_name IN (
    'crm_leads', 'crm_contacts', 'crm_interests', 'crm_followups',
    'crm_activities', 'commission_ledger', 'invoices', 'properties'
  )
ORDER BY table_name, privilege_type;

SELECT
  count(*) FILTER (WHERE l.status = 'won' AND l.deal_state <> 'verified') AS won_without_verified,
  count(*) FILTER (WHERE l.deal_state = 'verified' AND l.status <> 'won') AS verified_without_won,
  count(*) FILTER (
    WHERE l.deal_state = 'verified'
      AND NOT EXISTS (SELECT 1 FROM public.invoices AS i WHERE i.deal_id = l.id)
  ) AS verified_without_invoice,
  count(*) FILTER (
    WHERE l.deal_state = 'verified'
      AND NOT EXISTS (SELECT 1 FROM public.commission_ledger AS c WHERE c.lead_id = l.id)
  ) AS verified_without_commission
FROM public.crm_leads AS l;

COMMIT;
