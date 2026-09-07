-- ============================================================
-- 031_phase11_sales_revenue_operations.sql
-- ============================================================
-- Phase 11: Sales & Revenue Operations
-- Secure Closing, Invoice Automation, Commission Ledger & Atomicity
--
-- 1. Invoices Table Enhancement:
--    - deal_id: Authoritative foreign key referencing crm_leads(id)
--    - invoice_type: Disambiguates 'closing' vs 'standard' / 'booking_fee'
--    - uq_invoices_closing_deal: Exactly ONE closing invoice per deal
-- 2. Commission Ledger:
--    - Authoritative source of truth for agent commission payouts
--    - Exactly ONE commission ledger record per closed deal (uq_commission_ledger_lead)
--    - Comprehensive RLS policies (Admin, Super Admin, Commissioner, Agent)
-- 3. Atomic Closing Stored Function (PostgreSQL Transaction Boundary):
--    - process_deal_closing_atomic(): Atomically updates property status,
--      creates closing invoice, and registers commission ledger.
-- ============================================================

BEGIN;

-- 1. INVOICES SCHEMA EXPANSION
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS deal_id uuid REFERENCES public.crm_leads (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS invoice_type text NOT NULL DEFAULT 'standard';

-- Partial unique index ensuring strictly 1 closing invoice per deal
CREATE UNIQUE INDEX IF NOT EXISTS uq_invoices_closing_deal
  ON public.invoices (deal_id)
  WHERE deal_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_deal_id
  ON public.invoices (deal_id);

CREATE INDEX IF NOT EXISTS idx_invoices_property_id
  ON public.invoices (property_id);

-- 2. COMMISSION LEDGER TABLE
CREATE TABLE IF NOT EXISTS public.commission_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.users (id) ON DELETE RESTRICT,
  lead_id uuid NOT NULL REFERENCES public.crm_leads (id) ON DELETE RESTRICT,
  property_id uuid NOT NULL REFERENCES public.properties (id) ON DELETE RESTRICT,
  invoice_id uuid REFERENCES public.invoices (id) ON DELETE SET NULL,
  deal_id uuid REFERENCES public.crm_leads (id) ON DELETE RESTRICT,
  sale_amount numeric(15, 2) NOT NULL DEFAULT 0,
  commission_rate numeric(5, 4) NOT NULL DEFAULT 0.0250,
  commission_amount numeric(15, 2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'cancelled')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_commission_ledger_lead UNIQUE (lead_id)
);

CREATE INDEX IF NOT EXISTS idx_commission_ledger_agent
  ON public.commission_ledger (agent_id);

CREATE INDEX IF NOT EXISTS idx_commission_ledger_property
  ON public.commission_ledger (property_id);

CREATE INDEX IF NOT EXISTS idx_commission_ledger_status
  ON public.commission_ledger (status);

CREATE INDEX IF NOT EXISTS idx_commission_ledger_invoice
  ON public.commission_ledger (invoice_id);

-- 3. RLS FOR COMMISSION LEDGER
ALTER TABLE public.commission_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS commission_ledger_admin_all ON public.commission_ledger;
CREATE POLICY commission_ledger_admin_all ON public.commission_ledger
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'super_admin', 'superadmin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'super_admin', 'superadmin')
    )
  );

DROP POLICY IF EXISTS commission_ledger_commissioner_select ON public.commission_ledger;
CREATE POLICY commission_ledger_commissioner_select ON public.commission_ledger
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
        AND users.role = 'commissioner'
    )
  );

DROP POLICY IF EXISTS commission_ledger_agent_select ON public.commission_ledger;
CREATE POLICY commission_ledger_agent_select ON public.commission_ledger
  FOR SELECT
  TO authenticated
  USING (
    agent_id = auth.uid()
  );

-- 4. ATOMIC DEAL CLOSING POSTGRESQL FUNCTION
-- This function is the AUTHORITATIVE transaction boundary for deal closing.
-- It atomically performs ALL of:
--   a) Transition crm_leads: deal_state pending_verification -> verified, status -> won
--   b) Update property status (Jual -> sold, Sewa -> rented)
--   c) Create closing invoice (idempotent)
--   d) Create commission ledger entry (idempotent)
-- Calling this with an already-processed deal is safe (idempotent).
CREATE OR REPLACE FUNCTION public.process_deal_closing_atomic(
  p_lead_id uuid,
  p_actor_id uuid,
  p_commission_rate numeric DEFAULT 0.0250
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead RECORD;
  v_property RECORD;
  v_contact RECORD;
  v_target_property_id uuid;
  v_target_status text;
  v_sale_amount numeric;
  v_commission_amount numeric;
  v_invoice_id uuid;
  v_invoice_number text;
  v_commission_id uuid;
  v_now timestamptz := now();
  v_already_processed boolean := false;
BEGIN
  -- A. Validasi dan Lock Lead (row-level lock)
  SELECT * INTO v_lead FROM public.crm_leads WHERE id = p_lead_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Lead tidak ditemukan.');
  END IF;

  -- Hanya izinkan closing dari state pending_verification ATAU sudah verified (idempotent re-run)
  IF v_lead.deal_state NOT IN ('pending_verification', 'verified') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Deal harus dalam status pending_verification untuk dapat diproses closing. State saat ini: ' || coalesce(v_lead.deal_state, 'null')
    );
  END IF;

  -- B. Atomik: Set deal_state = verified, status = won (jika belum)
  IF v_lead.deal_state = 'pending_verification' THEN
    UPDATE public.crm_leads
    SET
      deal_state       = 'verified',
      deal_verified_at = v_now,
      status           = 'won',
      updated_at       = v_now
    WHERE id = p_lead_id;
    -- Re-read lead so downstream logic sees updated values
    SELECT * INTO v_lead FROM public.crm_leads WHERE id = p_lead_id;
  ELSE
    -- Sudah verified, ini re-run idempotent — tetap proses invoice/commission
    v_already_processed := true;
  END IF;

  -- C. Tentukan Property Target (dari crm_leads.property_id atau crm_interests)
  v_target_property_id := v_lead.property_id;
  IF v_target_property_id IS NULL THEN
    SELECT property_id INTO v_target_property_id
    FROM public.crm_interests
    WHERE lead_id = p_lead_id
    LIMIT 1;
  END IF;

  IF v_target_property_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tidak ada properti yang ditautkan ke Deal ini.');
  END IF;

  -- D. Lock dan Update Status Properti (Jual -> sold, Sewa -> rented)
  SELECT * INTO v_property FROM public.properties WHERE id = v_target_property_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Properti tertaut tidak ditemukan di inventaris.');
  END IF;

  IF lower(coalesce(v_property.listing_type, '')) = 'sewa' THEN
    v_target_status := 'rented';
  ELSE
    v_target_status := 'sold';
  END IF;

  IF v_property.status != v_target_status THEN
    UPDATE public.properties
    SET status = v_target_status, updated_at = v_now
    WHERE id = v_target_property_id;
  END IF;

  -- E. Hitung Nominal Transaksi & Komisi
  v_sale_amount := coalesce(v_lead.budget, 0);
  IF v_sale_amount <= 0 THEN
    v_sale_amount := 0;
  END IF;

  v_commission_amount := round(v_sale_amount * coalesce(p_commission_rate, 0.0250), 2);
  IF v_commission_amount <= 0 THEN
    v_commission_amount := 0;
  END IF;

  -- Ambil data kontak klien untuk invoice
  SELECT * INTO v_contact FROM public.crm_contacts WHERE id = v_lead.contact_id;

  -- F. Idempotent Closing Invoice Insertion
  SELECT id INTO v_invoice_id FROM public.invoices WHERE deal_id = p_lead_id LIMIT 1;
  IF v_invoice_id IS NULL THEN
    v_invoice_number := 'INV-' || to_char(v_now, 'YYYYMMDD') || '-' || upper(substr(md5(p_lead_id::text), 1, 6));
    INSERT INTO public.invoices (
      deal_id,
      client_id,
      property_id,
      invoice_number,
      invoice_type,
      client_name,
      client_email,
      client_phone,
      issue_date,
      due_date,
      total_amount,
      status,
      notes,
      created_by,
      created_at,
      updated_at
    ) VALUES (
      p_lead_id,
      p_lead_id,
      v_target_property_id,
      v_invoice_number,
      'closing',
      coalesce(v_contact.full_name, 'Klien Closing Deal'),
      v_contact.email,
      v_contact.phone,
      to_char(v_now, 'YYYY-MM-DD'),
      to_char(v_now + interval '14 days', 'YYYY-MM-DD'),
      CASE WHEN v_commission_amount > 0 THEN v_commission_amount ELSE 1000000 END,
      'sent',
      'Faktur pelunasan closing deal resmi: ' || coalesce(v_property.title, v_property.listing_code, 'Properti'),
      p_actor_id,
      v_now,
      v_now
    )
    RETURNING id INTO v_invoice_id;
  ELSE
    v_already_processed := true;
  END IF;

  -- G. Idempotent Commission Ledger Insertion
  SELECT id INTO v_commission_id FROM public.commission_ledger WHERE lead_id = p_lead_id LIMIT 1;
  IF v_commission_id IS NULL THEN
    INSERT INTO public.commission_ledger (
      agent_id,
      lead_id,
      deal_id,
      property_id,
      invoice_id,
      sale_amount,
      commission_rate,
      commission_amount,
      status,
      notes,
      created_at,
      updated_at
    ) VALUES (
      coalesce(v_lead.assigned_to, p_actor_id),
      p_lead_id,
      p_lead_id,
      v_target_property_id,
      v_invoice_id,
      v_sale_amount,
      coalesce(p_commission_rate, 0.0250),
      v_commission_amount,
      'pending',
      'Komisi transaksi penjualan/sewa unit: ' || coalesce(v_property.title, v_property.listing_code, ''),
      v_now,
      v_now
    )
    RETURNING id INTO v_commission_id;
  ELSE
    -- Jika invoice_id baru terbuat atau sebelumnya null, update relasinya
    UPDATE public.commission_ledger
    SET invoice_id = v_invoice_id, updated_at = v_now
    WHERE id = v_commission_id AND invoice_id IS NULL;
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

COMMIT;
