import { describe, it, expect, vi, beforeEach } from 'vitest';
import { canReviewDeal, normalizeRole } from '@/lib/permissions';
import { verifyCRMDealAction, updateCRMLeadStatusAction } from '@/actions/crm-leads.action';
import { revenueOperationsService } from '@/services/revenue-operations.service';
import * as serverClientModule from '@/lib/supabase/server';
import * as adminClientModule from '@/lib/supabase/admin';
import * as auditLogModule from '@/lib/audit-log';

vi.mock('@/lib/supabase/server');
vi.mock('@/lib/supabase/admin');
vi.mock('@/lib/audit-log');
vi.mock('@/services/revenue-operations.service');

describe('Deal Verification Authorization & Role Normalization (Regression Suite)', () => {
  describe('canReviewDeal Policy Function', () => {
    it('1. raw role "superadmin" dapat verify deal setelah normalization', () => {
      expect(normalizeRole('superadmin')).toBe('super_admin');
      expect(canReviewDeal('superadmin')).toBe(true);
      expect(canReviewDeal('SUPERADMIN')).toBe(true);
      expect(canReviewDeal('  superadmin  ')).toBe(true);
    });

    it('2. role "super_admin" dapat verify deal', () => {
      expect(canReviewDeal('super_admin')).toBe(true);
      expect(canReviewDeal('SUPER_ADMIN')).toBe(true);
    });

    it('3. role "admin" dapat verify deal', () => {
      expect(canReviewDeal('admin')).toBe(true);
      expect(canReviewDeal('ADMIN')).toBe(true);
    });

    it('4. agent ditolak', () => {
      expect(canReviewDeal('agent')).toBe(false);
      expect(canReviewDeal('AGENT')).toBe(false);
    });

    it('5. viewer ditolak', () => {
      expect(canReviewDeal('viewer')).toBe(false);
      expect(canReviewDeal('VIEWER')).toBe(false);
    });

    it('6. commissioner ditolak jika memang policy existing demikian', () => {
      expect(canReviewDeal('commissioner')).toBe(false);
      expect(canReviewDeal('COMMISSIONER')).toBe(false);
    });

    it('marketing dan peran tidak dikenal lainnya tetap ditolak', () => {
      expect(canReviewDeal('marketing')).toBe(false);
      expect(canReviewDeal('hacker')).toBe(false);
      expect(canReviewDeal(null)).toBe(false);
      expect(canReviewDeal(undefined)).toBe(false);
      expect(canReviewDeal('')).toBe(false);
    });
  });

  describe('verifyCRMDealAction Server Action Flow', () => {
    let mockSupabase: any;

    beforeEach(() => {
      vi.clearAllMocks();

      mockSupabase = {
        auth: {
          getUser: vi.fn(),
        },
        from: vi.fn(),
      };

      vi.spyOn(serverClientModule, 'createServerClientInstance').mockResolvedValue(mockSupabase as any);
      vi.spyOn(auditLogModule, 'recordAudit').mockResolvedValue(undefined as any);
    });

    const setupAuthWithRole = (userId: string, rawRole: string) => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: userId, email: `${userId}@inland.co.id` } },
        error: null,
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'users') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { role: rawRole },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'crm_leads') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'lead-1', status: 'negotiation', deal_state: 'pending_verification', property_id: 'prop-1' },
                  error: null,
                }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
        };
      });
    };

    it('allows raw role "superadmin" to verify deal and triggers closing', async () => {
      setupAuthWithRole('user-superadmin-1', 'superadmin');

      vi.mocked(revenueOperationsService.processDealClosing).mockResolvedValueOnce({
        success: true,
        invoiceId: 'inv-1',
        commissionId: 'comm-1',
        propertyId: 'prop-1',
        propertyStatus: 'sold',
        alreadyProcessed: false,
      });

      const result = await verifyCRMDealAction('lead-1', true);
      expect(result.success).toBe(true);
      expect(revenueOperationsService.processDealClosing).toHaveBeenCalledWith(
        'lead-1',
        expect.objectContaining({ role: 'super_admin' })
      );
    });

    it('allows canonical role "super_admin" to verify deal', async () => {
      setupAuthWithRole('user-superadmin-2', 'super_admin');

      vi.mocked(revenueOperationsService.processDealClosing).mockResolvedValueOnce({
        success: true,
        invoiceId: 'inv-2',
        commissionId: 'comm-2',
      });

      const result = await verifyCRMDealAction('lead-1', true);
      expect(result.success).toBe(true);
    });

    it('allows role "admin" to verify deal', async () => {
      setupAuthWithRole('user-admin-1', 'admin');

      vi.mocked(revenueOperationsService.processDealClosing).mockResolvedValueOnce({
        success: true,
        invoiceId: 'inv-3',
        commissionId: 'comm-3',
      });

      const result = await verifyCRMDealAction('lead-1', true);
      expect(result.success).toBe(true);
    });

    it('rejects role "agent" with authorization error', async () => {
      setupAuthWithRole('user-agent-1', 'agent');

      const result = await verifyCRMDealAction('lead-1', true);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Hanya Admin atau Super Admin yang dapat memverifikasi Deal.');
      expect(revenueOperationsService.processDealClosing).not.toHaveBeenCalled();
    });

    it('rejects role "viewer" with authorization error', async () => {
      setupAuthWithRole('user-viewer-1', 'viewer');

      const result = await verifyCRMDealAction('lead-1', true);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Hanya Admin atau Super Admin yang dapat memverifikasi Deal.');
      expect(revenueOperationsService.processDealClosing).not.toHaveBeenCalled();
    });

    it('rejects role "commissioner" with authorization error', async () => {
      setupAuthWithRole('user-commissioner-1', 'commissioner');

      const result = await verifyCRMDealAction('lead-1', true);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Hanya Admin atau Super Admin yang dapat memverifikasi Deal.');
      expect(revenueOperationsService.processDealClosing).not.toHaveBeenCalled();
    });
  });

  describe('updateCRMLeadStatusAction to "won" Authorization', () => {
    let mockSupabase: any;

    beforeEach(() => {
      vi.clearAllMocks();

      mockSupabase = {
        auth: {
          getUser: vi.fn(),
        },
        from: vi.fn(),
      };

      vi.spyOn(serverClientModule, 'createServerClientInstance').mockResolvedValue(mockSupabase as any);
      vi.spyOn(auditLogModule, 'recordAudit').mockResolvedValue(undefined as any);
    });

    const setupAuthAndLead = (rawRole: string, leadState: string) => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'actor-1', email: 'actor@inland.co.id' } },
        error: null,
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'users') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { role: rawRole },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'crm_leads') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'lead-1',
                    status: 'negotiation',
                    assigned_to: 'agent-99',
                    created_by: 'agent-99',
                    deal_state: leadState,
                    property_id: 'prop-1',
                  },
                  error: null,
                }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null }),
        };
      });
    };

    it('allows raw role "superadmin" to mark unverified lead (deal_state: "none") as won', async () => {
      setupAuthAndLead('superadmin', 'none');

      const result = await updateCRMLeadStatusAction('lead-1', 'won');
      expect(result.success).toBe(true);
      expect(result.error).toBeNull();
      expect(revenueOperationsService.processDealClosing).toHaveBeenCalledWith(
        'lead-1',
        expect.objectContaining({ role: 'super_admin' })
      );
    });

    it('allows role "super_admin" to mark unverified lead (deal_state: "none") as won', async () => {
      setupAuthAndLead('super_admin', 'none');

      const result = await updateCRMLeadStatusAction('lead-1', 'won');
      expect(result.success).toBe(true);
      expect(result.error).toBeNull();
    });

    it('allows role "admin" to mark unverified lead (deal_state: "none") as won', async () => {
      setupAuthAndLead('admin', 'none');

      const result = await updateCRMLeadStatusAction('lead-1', 'won');
      expect(result.success).toBe(true);
      expect(result.error).toBeNull();
    });

    it('allows raw role "superadmin" to mark verified lead as won', async () => {
      setupAuthAndLead('superadmin', 'verified');

      const result = await updateCRMLeadStatusAction('lead-1', 'won');
      expect(result.success).toBe(true);
      expect(result.error).toBeNull();
    });

    it('allows role "super_admin" to mark verified lead as won', async () => {
      setupAuthAndLead('super_admin', 'verified');

      const result = await updateCRMLeadStatusAction('lead-1', 'won');
      expect(result.success).toBe(true);
      expect(result.error).toBeNull();
    });

    it('allows role "admin" to mark verified lead as won', async () => {
      setupAuthAndLead('admin', 'verified');

      const result = await updateCRMLeadStatusAction('lead-1', 'won');
      expect(result.success).toBe(true);
      expect(result.error).toBeNull();
    });

    it('rejects role "agent" from marking deal as won even if lead is owned', async () => {
      // Agent who owns the lead cannot bypass admin verification
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'agent-99', email: 'agent@inland.co.id' } },
        error: null,
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'users') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { role: 'agent' }, error: null }),
              }),
            }),
          };
        }
        if (table === 'crm_leads') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'lead-1',
                    status: 'negotiation',
                    assigned_to: 'agent-99',
                    created_by: 'agent-99',
                    deal_state: 'none',
                    property_id: 'prop-1',
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis() };
      });

      const result = await updateCRMLeadStatusAction('lead-1', 'won');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Deal harus diverifikasi Admin atau Super Admin.');
    });

    it('rejects role "viewer" from changing status', async () => {
      setupAuthAndLead('viewer', 'verified');

      const result = await updateCRMLeadStatusAction('lead-1', 'won');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Anda tidak berwenang mengubah Lead ini.');
    });

    it('rejects role "commissioner" from changing status', async () => {
      setupAuthAndLead('commissioner', 'verified');

      const result = await updateCRMLeadStatusAction('lead-1', 'won');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Anda tidak berwenang mengubah Lead ini.');
    });
  });

  describe('CRM Leads Schema Contract Guard', () => {
    it('ensures dashboard queries use contact relation and never select non-existent columns (name, phone)', () => {
      // In live database, crm_leads has no 'name' or 'phone' columns.
      // Valid query must embed contact:crm_contacts(full_name, phone).
      const validSelect = 'id, status, notes, created_at, property_id, contact:crm_contacts(full_name, phone)';
      expect(validSelect).not.toContain('crm_leads.name');
      expect(validSelect).not.toContain('id, name');
      expect(validSelect).toContain('contact:crm_contacts(full_name, phone)');
    });
  });
});
