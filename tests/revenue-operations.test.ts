import { describe, it, expect, vi, beforeEach } from 'vitest';
import { revenueOperationsService } from '@/services/revenue-operations.service';
import * as supabaseAdminModule from '@/lib/supabase/admin';
import * as auditLogModule from '@/lib/audit-log';

vi.mock('@/lib/supabase/admin');
vi.mock('@/lib/audit-log');

describe('Revenue Operations Service (Phase 11)', () => {
  let mockRpc: any;
  let mockFrom: any;
  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRpc = vi.fn();
    mockFrom = vi.fn();

    mockSupabase = {
      rpc: mockRpc,
      from: mockFrom,
    };

    vi.spyOn(supabaseAdminModule, 'createAdminClient').mockReturnValue(mockSupabase as any);
    vi.spyOn(auditLogModule, 'recordAudit').mockResolvedValue(undefined as any);
  });

  describe('processDealClosing (Atomic Deal Closing RPC)', () => {
    const leadId = 'lead-uuid-123';
    const actor = { userId: 'admin-uuid-1', email: 'admin@inland.co.id', role: 'admin' };
    const customRate = 0.03;

    it('rejects non-reviewer roles before creating a service-role client', async () => {
      const result = await revenueOperationsService.processDealClosing(leadId, {
        userId: 'agent-1',
        role: 'agent',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Hanya Admin atau Super Admin');
      expect(supabaseAdminModule.createAdminClient).not.toHaveBeenCalled();
      expect(mockRpc).not.toHaveBeenCalled();
    });

    it('calls PostgreSQL atomic RPC with exact parameters', async () => {
      mockRpc.mockResolvedValueOnce({
        data: {
          success: true,
          already_processed: false,
          invoice_id: 'inv-123',
          commission_id: 'comm-123',
          property_id: 'prop-123',
          property_status: 'terjual',
          sale_amount: 1000000000,
          commission_amount: 30000000,
        },
        error: null,
      });

      const result = await revenueOperationsService.processDealClosing(leadId, actor, customRate);

      expect(mockRpc).toHaveBeenCalledWith('process_deal_closing_atomic', {
        p_lead_id: leadId,
        p_actor_id: actor.userId,
        p_commission_rate: customRate,
      });
      expect(result.success).toBe(true);
      expect(result.invoiceId).toBe('inv-123');
      expect(result.commissionId).toBe('comm-123');
      expect(result.saleAmount).toBe(1000000000);
      expect(result.commissionAmount).toBe(30000000);

      // Audit recorded for new closing
      expect(auditLogModule.recordAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'invoice.closing_created',
          targetId: 'inv-123',
        })
      );
    });

    it('handles idempotent retry without recording duplicate audit log', async () => {
      mockRpc.mockResolvedValueOnce({
        data: {
          success: true,
          already_processed: true,
          invoice_id: 'inv-existing',
          commission_id: 'comm-existing',
          property_id: 'prop-123',
          sale_amount: 1000000000,
          commission_amount: 25000000,
        },
        error: null,
      });

      const result = await revenueOperationsService.processDealClosing(leadId, actor);

      expect(result.success).toBe(true);
      expect(result.alreadyProcessed).toBe(true);
      expect(result.invoiceId).toBe('inv-existing');
      // Must NOT record audit log for duplicate re-run
      expect(auditLogModule.recordAudit).not.toHaveBeenCalled();
    });

    it('fails explicitly when RPC function is missing (PGRST202 / migration 031 not applied)', async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST202', message: 'function process_deal_closing_atomic does not exist' },
      });

      const result = await revenueOperationsService.processDealClosing(leadId, actor);

      expect(result.success).toBe(false);
      expect(result.error).toContain('migration 031');
    });

    it('propagates RPC business rejection cleanly', async () => {
      mockRpc.mockResolvedValueOnce({
        data: { success: false, error: 'Lead deal_state must be pending_verification.' },
        error: null,
      });

      const result = await revenueOperationsService.processDealClosing(leadId, actor);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Lead deal_state must be pending_verification.');
    });

    it('catches unexpected exceptions without crashing', async () => {
      mockRpc.mockRejectedValueOnce(new Error('Network failure'));

      const result = await revenueOperationsService.processDealClosing(leadId, actor);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network failure');
    });
  });

  describe('updateCommissionStatus', () => {
    const commissionId = 'comm-123';

    it('rejects unauthorized roles (agent, commissioner, viewer) from mutating commission status', async () => {
      const agentActor = { userId: 'agent-1', email: 'agent@inland.co.id', role: 'agent' };
      const commissionerActor = { userId: 'comm-1', email: 'comm@inland.co.id', role: 'commissioner' };
      const viewerActor = { userId: 'view-1', email: 'view@inland.co.id', role: 'viewer' };

      const res1 = await revenueOperationsService.updateCommissionStatus(commissionId, 'approved', agentActor);
      expect(res1.success).toBe(false);
      expect(res1.error).toContain('Hanya Admin yang berwenang');

      const res2 = await revenueOperationsService.updateCommissionStatus(commissionId, 'paid', commissionerActor);
      expect(res2.success).toBe(false);

      const res3 = await revenueOperationsService.updateCommissionStatus(commissionId, 'approved', viewerActor);
      expect(res3.success).toBe(false);
    });

    it('allows Admin and Super Admin to approve and pay commissions', async () => {
      const adminActor = { userId: 'admin-1', email: 'admin@inland.co.id', role: 'admin' };

      const mockEq = vi.fn().mockResolvedValueOnce({ error: null });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
      mockFrom.mockReturnValue({ update: mockUpdate });

      const result = await revenueOperationsService.updateCommissionStatus(commissionId, 'approved', adminActor);

      expect(result.success).toBe(true);
      expect(mockFrom).toHaveBeenCalledWith('commission_ledger');
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'approved' })
      );
      expect(auditLogModule.recordAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'commission.status_updated',
          targetId: commissionId,
          detail: { new_status: 'approved' },
        })
      );
    });
  });

  describe('getCommissionLedgers', () => {
    it('scopes queries by agentId when specified', async () => {
      const mockQueryBuilder: any = {
        eq: vi.fn(),
        order: vi.fn(),
        limit: vi.fn(),
      };
      mockQueryBuilder.eq.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.order.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.limit.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.then = (resolve: any) =>
        resolve({
          data: [{ id: 'c1', agent_id: 'agent-1', sale_amount: 500000000, commission_amount: 12500000 }],
          error: null,
        });

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue(mockQueryBuilder),
      });

      const result = await revenueOperationsService.getCommissionLedgers({ agentId: 'agent-1' });

      expect(mockFrom).toHaveBeenCalledWith('commission_ledger');
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('agent_id', 'agent-1');
      expect(result).toHaveLength(1);
      expect(result[0].agent_id).toBe('agent-1');
    });
  });
});
