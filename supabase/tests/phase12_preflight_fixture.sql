\set ON_ERROR_STOP on

INSERT INTO public.users (id, email, full_name, role, status) VALUES
  ('00000000-0000-0000-0000-000000000001', 'agent@test.local', 'Agent', 'agent', 'active');

INSERT INTO public.crm_contacts (id, contact_code, full_name) VALUES
  ('10000000-0000-0000-0000-000000000001', 'PREFLIGHT-C-1', 'Preflight Contact');

INSERT INTO public.properties (
  id, listing_code, title, slug, property_type, listing_type, status, created_by, assigned_to
) VALUES (
  '20000000-0000-0000-0000-000000000001',
  'PREFLIGHT-P-1',
  'Preflight Property',
  'preflight-property',
  'house',
  'jual',
  'sold',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
);

INSERT INTO public.crm_leads (
  id, contact_id, assigned_to, created_by, status, deal_state,
  property_id, budget, deal_submitted_at, deal_verified_at
) VALUES (
  '30000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'won',
  'verified',
  '20000000-0000-0000-0000-000000000001',
  1000000000,
  now(),
  now()
);
