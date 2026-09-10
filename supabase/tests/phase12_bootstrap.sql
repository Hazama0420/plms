\set ON_ERROR_STOP on

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN BYPASSRLS;
  END IF;
END;
$$;

CREATE SCHEMA IF NOT EXISTS auth;
GRANT USAGE ON SCHEMA auth, public TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated, service_role;

CREATE TABLE public.users (
  id uuid PRIMARY KEY,
  email text NOT NULL,
  full_name text,
  role text NOT NULL DEFAULT 'viewer',
  status text DEFAULT 'active',
  CONSTRAINT users_role_check CHECK (role IN ('super_admin', 'superadmin', 'admin', 'agent', 'marketing', 'viewer')),
  CONSTRAINT valid_role CHECK (role IN ('super_admin', 'superadmin', 'admin', 'agent', 'marketing', 'viewer'))
);

CREATE TABLE public.crm_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_code varchar UNIQUE,
  full_name varchar NOT NULL,
  phone varchar,
  whatsapp varchar,
  email varchar,
  occupation varchar,
  city varchar,
  notes text,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  source varchar
);

CREATE TABLE public.properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_code varchar NOT NULL UNIQUE,
  title varchar NOT NULL,
  slug varchar NOT NULL UNIQUE,
  property_type varchar NOT NULL,
  listing_type varchar NOT NULL CHECK (listing_type IN ('jual', 'sewa')),
  status varchar NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'published', 'sold', 'rented', 'archived')),
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  assigned_to uuid REFERENCES public.users(id) ON DELETE SET NULL,
  updated_at timestamp DEFAULT now()
);

CREATE TABLE public.crm_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
  assigned_to uuid REFERENCES public.users(id) ON DELETE SET NULL,
  source varchar,
  status varchar DEFAULT 'new' CHECK (status IS NULL OR status IN ('new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost')),
  interest_type varchar,
  budget numeric,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  created_by uuid DEFAULT auth.uid() REFERENCES public.users(id) ON DELETE SET NULL,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  notes text,
  lost_reason text CHECK (lost_reason IS NULL OR lost_reason IN (
    'customer_not_responding', 'budget_mismatch', 'not_interested',
    'chose_another_property', 'purchase_postponed', 'property_unsuitable', 'duplicate', 'other'
  )),
  lost_explanation text,
  deal_state text NOT NULL DEFAULT 'none' CHECK (deal_state IN ('none', 'submitted', 'pending_verification', 'verified', 'rejected')),
  deal_submitted_at timestamptz,
  deal_verified_at timestamptz,
  deal_rejection_reason text
);

CREATE TABLE public.crm_interests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  priority smallint DEFAULT 1,
  created_at timestamp DEFAULT now(),
  interest_level text DEFAULT 'medium' CHECK (interest_level IS NULL OR interest_level IN ('low', 'medium', 'high')),
  notes text,
  updated_at timestamptz DEFAULT now(),
  UNIQUE (lead_id, property_id)
);

CREATE TABLE public.crm_followups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  assigned_to uuid REFERENCES public.users(id) ON DELETE SET NULL,
  followup_date timestamp NOT NULL,
  status varchar DEFAULT 'pending' CHECK (status IS NULL OR status IN ('pending', 'completed', 'cancelled', 'overdue')),
  notes text,
  completed_at timestamp,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  completed_by uuid REFERENCES public.users(id) ON DELETE SET NULL
);

CREATE TABLE public.crm_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  activity_type varchar NOT NULL,
  notes text,
  created_at timestamp DEFAULT now()
);

CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text NOT NULL UNIQUE,
  client_id uuid REFERENCES public.crm_leads(id) ON DELETE SET NULL,
  client_name text NOT NULL,
  client_email text,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  issue_date date NOT NULL DEFAULT current_date,
  due_date date NOT NULL,
  total_amount bigint NOT NULL DEFAULT 0,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  notes text,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  paid_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  client_phone text
);

CREATE TABLE public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  actor_email text,
  actor_role text,
  action text NOT NULL,
  target_id uuid,
  target_email text,
  target_role text,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY crm_leads_select ON public.crm_leads FOR SELECT TO authenticated USING (true);
CREATE POLICY crm_leads_insert ON public.crm_leads FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY crm_leads_update ON public.crm_leads FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY crm_leads_delete ON public.crm_leads FOR DELETE TO authenticated USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated, service_role;

INSERT INTO public.users (id, email, full_name, role, status)
VALUES (
  '00000000-0000-0000-0000-000000000006',
  'super@test.local',
  'Legacy Super Admin',
  'superadmin',
  'active'
);
