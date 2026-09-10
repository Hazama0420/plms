import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCommissionLedgersAction, updateCommissionStatusAction } from '@/actions/commissions.action';
import * as serverClientModule from '@/lib/supabase/server';
import { revenueOperationsService } from '@/services/revenue-operations.service';

vi.mock('@/lib/supabase/server');
vi.mock('@/services/revenue-operations.service');

describe('Commission Server Actions (Phase 11)', () => {
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
  });

  describe('getCommissionLedgersAction', () => {
    it('rejects unauthenticated requests', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: new Error('No session'),
      });

      const result = await getCommissionLedgersAction();
      expect(result.success).toBe(false);
      expect(result.error).toContain('Sesi tidak valid');
      expect(result.data).toEqual([]);
    });

    it('rejects unauthorized roles like viewer', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: 'user-1', email: 'viewer@inland.co.id' } },
        error: null,
      });

      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { role: 'viewer', status: 'active' }, error: null }),
          }),
        }),
      });

      const result = await getCommissionLedgersAction();
      expect(result.success).toBe(false);
      expect(result.error).toContain('Anda tidak berwenang');
    });

    it('fails closed for a blocked profile despite Admin metadata', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: 'blocked-1', user_metadata: { role: 'admin' } } },
        error: null,
      });
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { role: 'admin', status: 'suspended' },
              error: null,
            }),
          }),
        }),
      });

      const result = await getCommissionLedgersAction();

      expect(result.success).toBe(false);
      expect(revenueOperationsService.getCommissionLedgers).not.toHaveBeenCalled();
    });

    it('forces agent role to only view their own commissions (agentId scoping)', async () => {
      const agentId = 'agent-uuid-777';
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: agentId, email: 'agent@inland.co.id' } },
        error: null,
      });

      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { role: 'agent', status: 'active' }, error: null }),
          }),
        }),
      });

      vi.spyOn(revenueOperationsService, 'getCommissionLedgers').mockResolvedValueOnce([]);

      // Request dengan agentId orang lain ('other-agent')
      await getCommissionLedgersAction({ agentId: 'other-agent', status: 'pending' });

      // Verifikasi bahwa service dipanggil dengan agentId milik diri sendiri, bukan 'other-agent'
      expect(revenueOperationsService.getCommissionLedgers).toHaveBeenCalledWith(
        expect.objectContaining({
          agentId: agentId,
          status: 'pending',
        })
      );
    });

    it('allows commissioner to view commissions with original params (read-only)', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: 'comm-1', email: 'comm@inland.co.id' } },
        error: null,
      });

      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { role: 'commissioner', status: 'active' }, error: null }),
          }),
        }),
      });

      vi.spyOn(revenueOperationsService, 'getCommissionLedgers').mockResolvedValueOnce([]);

      const result = await getCommissionLedgersAction({ status: 'approved' });
      expect(result.success).toBe(true);
      expect(revenueOperationsService.getCommissionLedgers).toHaveBeenCalledWith({ status: 'approved' });
    });
  });

  describe('updateCommissionStatusAction', () => {
    it('rejects unauthenticated mutations', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: new Error('Session expired'),
      });

      const result = await updateCommissionStatusAction('comm-1', 'approved');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Sesi tidak valid');
    });

    it('forwards actor metadata to revenueOperationsService for Admin mutation', async () => {
      const adminId = 'admin-uuid-1';
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: adminId, email: 'admin@inland.co.id' } },
        error: null,
      });

      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { role: 'admin', status: 'active' }, error: null }),
          }),
        }),
      });

      vi.spyOn(revenueOperationsService, 'updateCommissionStatus').mockResolvedValueOnce({ success: true });

      const result = await updateCommissionStatusAction('comm-1', 'paid');

      expect(result.success).toBe(true);
      expect(revenueOperationsService.updateCommissionStatus).toHaveBeenCalledWith(
        'comm-1',
        'paid',
        expect.objectContaining({
          userId: adminId,
          email: 'admin@inland.co.id',
          role: 'admin',
        })
      );
    });

    it('rejects commissioner mutation at service layer', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: 'comm-1', email: 'comm@inland.co.id' } },
        error: null,
      });

      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { role: 'commissioner', status: 'active' }, error: null }),
          }),
        }),
      });

      vi.spyOn(revenueOperationsService, 'updateCommissionStatus').mockResolvedValueOnce({
        success: false,
        error: 'Hanya Admin yang berwenang mengubah status komisi.',
      });

      const result = await updateCommissionStatusAction('comm-1', 'approved');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Hanya Admin yang berwenang');
      expect(revenueOperationsService.updateCommissionStatus).not.toHaveBeenCalled();
    });
  });
});
