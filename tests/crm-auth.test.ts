import { describe, expect, it } from 'vitest';
import {
  canClaimUnassignedCRM,
  canManageAllCRM,
  canManageCRM,
  getCRMAuthoritativeActor,
} from '@/lib/crm-auth';

const user = { id: 'user-1', email: 'user@test.local' };

function createClient(role: string, status: unknown) {
  return {
    auth: {
      getUser: async () => ({ data: { user }, error: null }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: { role, status }, error: null }),
        }),
      }),
    }),
  };
}

describe('CRM authoritative actor status policy', () => {
  it.each(['agent', 'commissioner', 'admin', 'super_admin'])(
    'accepts active %s and preserves its normal role policy',
    async (role) => {
      const actor = await getCRMAuthoritativeActor(createClient(role, ' ACTIVE ') as never);

      expect(actor?.role).toBe(role);
      if (role === 'agent') {
        expect(canManageCRM(actor!.role)).toBe(true);
        expect(canClaimUnassignedCRM(actor!.role)).toBe(true);
      } else if (role === 'commissioner') {
        expect(canManageCRM(actor!.role)).toBe(false);
      } else {
        expect(canManageAllCRM(actor!.role)).toBe(true);
      }
    }
  );

  it.each(
    ['agent', 'commissioner', 'admin', 'super_admin'].flatMap((role) =>
      [
        ['pending', 'pending'],
        ['suspended', 'suspended'],
        ['null', null],
        ['empty', ''],
        ['whitespace', '   '],
        ['unknown', 'blocked'],
      ].map(([label, status]) => ({ role, label, status }))
    )
  )('denies $role with $label status', async ({ role, status }) => {
    await expect(
      getCRMAuthoritativeActor(createClient(role, status) as never)
    ).resolves.toBeNull();
  });

  it.each(['active', 'pending', 'suspended', null, '', 'unknown'])(
    'viewer remains denied CRM management with status %j',
    async (status) => {
      const actor = await getCRMAuthoritativeActor(createClient('viewer', status) as never);
      expect(actor === null || !canManageCRM(actor.role)).toBe(true);
    }
  );
});
