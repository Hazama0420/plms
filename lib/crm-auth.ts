import type { SupabaseClient, User } from '@supabase/supabase-js';
import { isAuthorizedStatus, normalizeRole } from '@/lib/permissions';
import type { UserRole } from '@/types/user.types';

export interface CRMAuthoritativeActor {
  user: User;
  role: UserRole;
  status: unknown;
}

const CRM_MANAGERS: UserRole[] = ['agent', 'marketing', 'admin', 'super_admin'];

export async function getCRMAuthoritativeActor(
  supabase: SupabaseClient
): Promise<CRMAuthoritativeActor | null> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return null;

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('role, status')
    .eq('id', user.id)
    .single();

  if (profileError || !profile || !isAuthorizedStatus(profile.status)) return null;

  return { user, role: normalizeRole(profile.role), status: profile.status };
}

export function canManageCRM(role: UserRole): boolean {
  return CRM_MANAGERS.includes(role);
}

export function canManageAllCRM(role: UserRole): boolean {
  return role === 'admin' || role === 'super_admin';
}

export function canClaimUnassignedCRM(role: UserRole): boolean {
  return role === 'agent';
}

export function isEligibleCRMAgentProfile(
  profile: { role?: unknown; status?: unknown } | null | undefined
): boolean {
  return normalizeRole(profile?.role) === 'agent'
    && isAuthorizedStatus(profile?.status);
}
