import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  canClaimUnassignedCRM,
  canManageAllCRM,
  canManageCRM,
  isEligibleCRMAgentProfile,
} from '@/lib/crm-auth';

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/034_phase12_crm_security_hardening.sql'),
  'utf8'
);
const leadActions = readFileSync(resolve(process.cwd(), 'actions/crm-leads.action.ts'), 'utf8');
const publicLeadRoute = readFileSync(resolve(process.cwd(), 'app/api/leads/route.ts'), 'utf8');
const propertyRoute = readFileSync(resolve(process.cwd(), 'app/api/properties/[id]/route.ts'), 'utf8');
const leadDetailPage = readFileSync(resolve(process.cwd(), 'app/(dashboard)/crm/leads/[id]/page.tsx'), 'utf8');
const kanban = readFileSync(resolve(process.cwd(), 'components/crm/CrmKanbanBoard.tsx'), 'utf8');

describe('Phase 12 CRM security contract', () => {
  it('keeps CRM management and unassigned claiming role-scoped', () => {
    expect(canManageCRM('viewer')).toBe(false);
    expect(canManageCRM('commissioner')).toBe(false);
    expect(canManageCRM('agent')).toBe(true);
    expect(canManageCRM('marketing')).toBe(true);
    expect(canManageAllCRM('admin')).toBe(true);
    expect(canManageAllCRM('super_admin')).toBe(true);
    expect(canClaimUnassignedCRM('agent')).toBe(true);
    expect(canClaimUnassignedCRM('marketing')).toBe(false);
    expect(canClaimUnassignedCRM('admin')).toBe(false);
    expect(canClaimUnassignedCRM('super_admin')).toBe(false);
    expect(isEligibleCRMAgentProfile({ role: 'agent', status: 'active' })).toBe(true);
    expect(isEligibleCRMAgentProfile({ role: 'admin', status: 'active' })).toBe(false);
    expect(isEligibleCRMAgentProfile({ role: 'agent', status: 'suspended' })).toBe(false);
  });

  it('requires active authoritative profiles in RLS, closing, and invoice policies', () => {
    expect(migration).toContain("AND lower(btrim(coalesce(u.status, ''))) = 'active'");
    expect(migration).not.toContain("NOT IN ('pending', 'suspended')");
    expect(migration).toContain("'commission_ledger_agent_select',");
    expect(migration).toContain("'invoices_select', 'invoices_insert', 'invoices_update', 'invoices_delete'");
    expect(migration).toContain('CREATE POLICY invoices_select ON public.invoices');
    expect(migration).toContain('CREATE POLICY invoices_update ON public.invoices');
    expect(migration).toMatch(/CREATE POLICY invoices_select ON public\.invoices[\s\S]*?USING \(public\.is_crm_manager\(\)\);/);
    expect(migration).toMatch(/CREATE POLICY invoices_insert ON public\.invoices[\s\S]*?public\.is_crm_manager\(\)[\s\S]*?created_by = auth\.uid\(\)/);
  });

  it('bounds lock acquisition and total migration execution transaction-locally', () => {
    expect(migration).toContain("SET LOCAL lock_timeout = '10s';");
    expect(migration).toContain("SET LOCAL statement_timeout = '5min';");
    expect(migration.indexOf('SET LOCAL lock_timeout')).toBeLessThan(migration.indexOf('LOCK TABLE'));
  });

  it('makes the closing RPC service-role-only', () => {
    expect(migration).toMatch(
      /REVOKE EXECUTE ON FUNCTION public\.process_deal_closing_atomic\(uuid, uuid, numeric\)[\s\S]*FROM PUBLIC, anon, authenticated;/
    );
    expect(migration).toMatch(
      /GRANT EXECUTE ON FUNCTION public\.process_deal_closing_atomic\(uuid, uuid, numeric\)[\s\S]*TO service_role;/
    );
  });

  it('exposes unassigned ids only through the sanitized atomic claim boundary', () => {
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.crm_lead_owned');
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.list_claimable_crm_leads');
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.claim_crm_lead_atomic');
    expect(migration).not.toContain("'budget', l.budget");
    expect(migration).not.toContain("'notes', l.notes");
    expect(migration).toContain('WITH CHECK (public.is_crm_manager() OR public.crm_lead_owned(lead_id));');
    expect(migration).toContain("AND (to_jsonb(NEW) - 'assigned_to' - 'updated_at')");
    expect(leadActions).toContain(".rpc('claim_crm_lead_atomic', { p_lead_id: leadId })");
  });

  it('authorizes contacts before a new lead relationship can grant visibility', () => {
    expect(migration).toContain('AND NOT public.crm_contact_owned(NEW.contact_id)');
    expect(migration).toContain('This helper deliberately evaluates only persisted relationships');
  });

  it('enforces workflow, follow-up identity, and eligible assignment in PostgreSQL', () => {
    expect(migration).toContain('Pending verification requires Negotiation and a submission timestamp.');
    expect(migration).toContain('NEW.completed_by := auth.uid();');
    expect(migration).toContain('Properties may only be assigned to an active Agent.');
    expect(migration).toContain("AND lower(btrim(coalesce(u.status, ''))) = 'active'");
  });

  it('reconciles authoritative financial relationships before mutation', () => {
    expect(migration).toContain('v_invoice.total_amount IS DISTINCT FROM v_invoice_total');
    expect(migration).toContain('v_commission.commission_rate IS DISTINCT FROM v_rate');
    expect(migration).toContain('Existing commission ledger does not match authoritative deal fields.');
    expect(migration).toContain('Deal harus ditugaskan kepada Agent aktif.');
  });

  it('has no business-error return after closing mutations begin', () => {
    const closingFunctionStart = migration.indexOf('CREATE OR REPLACE FUNCTION public.process_deal_closing_atomic');
    const mutationStart = migration.indexOf('INSERT INTO public.invoices', closingFunctionStart);
    const functionEnd = migration.indexOf(
      'REVOKE EXECUTE ON FUNCTION public.process_deal_closing_atomic',
      mutationStart
    );
    const mutationSection = migration.slice(mutationStart, functionEnd);

    expect(mutationStart).toBeGreaterThan(-1);
    expect(mutationSection).not.toContain("'success', false");
    expect(mutationSection).toContain("'success', true");
  });

  it('keeps verifyCRMDealAction as the only application closing caller', () => {
    expect(leadActions.match(/processDealClosing\(/g)).toHaveLength(1);
    expect(leadActions).toContain('Status Won hanya dapat ditetapkan melalui verifikasi Deal.');
    expect(leadActions).not.toContain('user.user_metadata?.role');
    expect(leadDetailPage).toContain('submitCRMDealAction');
    expect(leadDetailPage).toContain('verifyCRMDealAction');
    expect(leadDetailPage).toContain('disabled: true');
  });

  it('keeps property identity and assignment out of generic PATCH', () => {
    expect(propertyRoute).toContain('delete body.created_by;');
    expect(propertyRoute).toContain('delete body.assigned_to;');
    expect(migration).toContain('Property creator is immutable.');
    expect(migration).toContain('Only Super Admin may change property assignment.');
    expect(migration).toContain('Published properties require an active assigned Agent.');
  });

  it('keeps Commissioner Kanban full-read and read-only', () => {
    expect(kanban).toContain('["super_admin", "superadmin", "admin", "commissioner"].includes(role)');
    expect(kanban).toContain('["super_admin", "superadmin", "admin", "agent", "marketing"].includes(role)');
    expect(kanban).toContain('{canDragAndMove && STATUS_STAGES.filter');
  });

  it('does not expose CRM rows, existence flags, or raw errors from public intake', () => {
    expect(publicLeadRoute).not.toContain('data: leadRow');
    expect(publicLeadRoute).not.toContain('isNewLead,');
    expect(publicLeadRoute).not.toContain('{ error: error.message');
    expect(publicLeadRoute).not.toContain('.select("*, contact:crm_contacts(*)")');
    expect(publicLeadRoute).toContain('agent: { name: SITE.name, whatsapp: toWaNumber(SITE.whatsapp) }');
    expect(publicLeadRoute).toContain('Pengajuan berhasil diproses. Tim kami akan segera menghubungi Anda.');
    expect(publicLeadRoute).toContain('account.status === "active"');
  });
});
