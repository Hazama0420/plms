import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getAuthContext } from '@/lib/api-auth';
import * as serverClientModule from '@/lib/supabase/server';

vi.mock('@/lib/supabase/server');

describe('API authorization context', () => {
  const user = {
    id: 'user-1',
    email: 'user@test.local',
    user_metadata: { role: 'super_admin' },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function mockClient(profileResult: { data: unknown; error: unknown }) {
    const client = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue(profileResult),
          }),
        }),
      }),
    };
    vi.spyOn(serverClientModule, 'createServerClientInstance').mockResolvedValue(
      client as unknown as SupabaseClient
    );
    return client;
  }

  it('uses the authoritative profile role', async () => {
    mockClient({ data: { role: 'agent', status: 'active' }, error: null });

    const context = await getAuthContext();

    expect(context?.role).toBe('agent');
  });

  it.each(['agent', 'commissioner', 'admin', 'super_admin'])(
    'authorizes active authoritative profile role %s',
    async (role) => {
      mockClient({ data: { role, status: ' ACTIVE ' }, error: null });

      await expect(getAuthContext()).resolves.toMatchObject({ role });
    }
  );

  it.each(
    ['agent', 'commissioner', 'admin', 'super_admin'].flatMap((role) =>
      [
        ['pending', 'pending'],
        ['suspended', 'suspended'],
        ['null', null],
        ['empty', ''],
        ['unknown', 'disabled'],
      ].map(([label, status]) => ({ role, label, status }))
    )
  )('denies $role with $label status', async ({ role, status }) => {
    mockClient({ data: { role, status }, error: null });

    await expect(getAuthContext()).resolves.toBeNull();
  });

  it('does not fall back to privileged Auth metadata when the profile is missing', async () => {
    mockClient({ data: null, error: null });

    await expect(getAuthContext()).resolves.toBeNull();
  });

  it('fails closed when the profile query errors', async () => {
    mockClient({ data: null, error: { message: 'profile unavailable' } });
    await expect(getAuthContext()).resolves.toBeNull();
  });
});
