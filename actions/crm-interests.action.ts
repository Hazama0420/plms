'use server';

import { createServerClientInstance } from '@/lib/supabase/server';
import { normalizeRole } from '@/lib/permissions';
import { recordAudit } from '@/lib/audit-log';
import type { CRMInterest } from '@/types/crm.types';

type ActionResult<T = unknown> = {
  success: boolean;
  data?: T;
  error: string | null;
};

async function getActor(supabase: Awaited<ReturnType<typeof createServerClientInstance>>) {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
  return { user, role: normalizeRole(profile?.role ?? user.user_metadata?.role) };
}

export async function createCRMInterestAction(data: {
  lead_id: string;
  property_id: string;
  interest_level?: string;
  notes?: string | null;
  priority?: number;
}): Promise<ActionResult<CRMInterest>> {
  const supabase = await createServerClientInstance();
  const actor = await getActor(supabase);
  if (!actor) return { success: false, error: 'Sesi tidak valid. Silakan login kembali.' };

  if (!data.lead_id || !data.property_id) {
    return { success: false, error: 'Lead dan Properti wajib ditentukan.' };
  }

  // Cek kepemilikan lead
  const { data: lead, error: leadErr } = await supabase
    .from('crm_leads')
    .select('id, assigned_to, created_by')
    .eq('id', data.lead_id)
    .maybeSingle();

  if (leadErr || !lead) {
    return { success: false, error: 'Lead tidak ditemukan atau tidak berwenang.' };
  }

  const privileged = actor.role === 'admin' || actor.role === 'super_admin';
  const authorized = privileged || lead.assigned_to === actor.user.id || lead.created_by === actor.user.id;
  if (!authorized) {
    return { success: false, error: 'Anda tidak berwenang menambahkan minat pada Lead ini.' };
  }

  const { data: interest, error } = await supabase
    .from('crm_interests')
    .insert({
      lead_id: data.lead_id,
      property_id: data.property_id,
      interest_level: data.interest_level || 'medium',
      notes: data.notes?.trim() || null,
      priority: typeof data.priority === 'number' ? data.priority : 1,
    })
    .select()
    .single();

  if (error || !interest) {
    return { success: false, error: error?.message || 'Gagal menambahkan minat properti.' };
  }

  await recordAudit({
    actor: { userId: actor.user.id, email: actor.user.email ?? null, role: actor.role },
    action: 'interest.created',
    targetId: data.lead_id,
    detail: { interest_id: interest.id, property_id: data.property_id, interest_level: interest.interest_level },
  });

  return { success: true, data: interest as CRMInterest, error: null };
}

export async function updateCRMInterestAction(
  interestId: string,
  data: {
    interest_level?: string;
    notes?: string | null;
    priority?: number;
  }
): Promise<ActionResult<CRMInterest>> {
  const supabase = await createServerClientInstance();
  const actor = await getActor(supabase);
  if (!actor) return { success: false, error: 'Sesi tidak valid. Silakan login kembali.' };

  const { data: interest, error: fetchErr } = await supabase
    .from('crm_interests')
    .select('id, lead_id, lead:crm_leads(assigned_to, created_by)')
    .eq('id', interestId)
    .maybeSingle();

  if (fetchErr || !interest) {
    return { success: false, error: 'Minat properti tidak ditemukan.' };
  }

  const lead = Array.isArray(interest.lead) ? interest.lead[0] : interest.lead;
  const privileged = actor.role === 'admin' || actor.role === 'super_admin';
  const authorized = privileged || lead?.assigned_to === actor.user.id || lead?.created_by === actor.user.id;
  if (!authorized) {
    return { success: false, error: 'Anda tidak berwenang mengubah minat properti ini.' };
  }

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (data.interest_level !== undefined) patch.interest_level = data.interest_level;
  if (data.notes !== undefined) patch.notes = data.notes?.trim() || null;
  if (data.priority !== undefined) patch.priority = data.priority;

  const { data: updated, error } = await supabase
    .from('crm_interests')
    .update(patch)
    .eq('id', interestId)
    .select()
    .single();

  if (error || !updated) {
    return { success: false, error: error?.message || 'Gagal memperbarui minat properti.' };
  }

  await recordAudit({
    actor: { userId: actor.user.id, email: actor.user.email ?? null, role: actor.role },
    action: 'interest.updated',
    targetId: interest.lead_id,
    detail: { interest_id: interestId, updated_fields: Object.keys(patch).filter((k) => k !== 'updated_at') },
  });

  return { success: true, data: updated as CRMInterest, error: null };
}

export async function deleteCRMInterestAction(interestId: string): Promise<ActionResult> {
  const supabase = await createServerClientInstance();
  const actor = await getActor(supabase);
  if (!actor) return { success: false, error: 'Sesi tidak valid. Silakan login kembali.' };

  const { data: interest, error: fetchErr } = await supabase
    .from('crm_interests')
    .select('id, lead_id, lead:crm_leads(assigned_to, created_by)')
    .eq('id', interestId)
    .maybeSingle();

  if (fetchErr || !interest) {
    return { success: false, error: 'Minat properti tidak ditemukan.' };
  }

  const lead = Array.isArray(interest.lead) ? interest.lead[0] : interest.lead;
  const privileged = actor.role === 'admin' || actor.role === 'super_admin';
  const authorized = privileged || lead?.assigned_to === actor.user.id || lead?.created_by === actor.user.id;
  if (!authorized) {
    return { success: false, error: 'Anda tidak berwenang menghapus minat properti ini.' };
  }

  const { error } = await supabase.from('crm_interests').delete().eq('id', interestId);
  if (error) {
    return { success: false, error: error.message };
  }

  await recordAudit({
    actor: { userId: actor.user.id, email: actor.user.email ?? null, role: actor.role },
    action: 'interest.deleted',
    targetId: interest.lead_id,
    detail: { interest_id: interestId },
  });

  return { success: true, error: null };
}

export async function syncCRMLeadInterestsAction(
  leadId: string,
  propertyIds: string[]
): Promise<ActionResult> {
  const supabase = await createServerClientInstance();
  const actor = await getActor(supabase);
  if (!actor) return { success: false, error: 'Sesi tidak valid. Silakan login kembali.' };

  const { data: lead, error: leadErr } = await supabase
    .from('crm_leads')
    .select('id, assigned_to, created_by')
    .eq('id', leadId)
    .maybeSingle();

  if (leadErr || !lead) {
    return { success: false, error: 'Lead tidak ditemukan atau tidak berwenang.' };
  }

  const privileged = actor.role === 'admin' || actor.role === 'super_admin';
  const authorized = privileged || lead.assigned_to === actor.user.id || lead.created_by === actor.user.id;
  if (!authorized) {
    return { success: false, error: 'Anda tidak berwenang mengubah minat properti pada Lead ini.' };
  }

  // Hapus interest lama
  const { error: delErr } = await supabase
    .from('crm_interests')
    .delete()
    .eq('lead_id', leadId);

  if (delErr) {
    return { success: false, error: delErr.message };
  }

  // Insert interest baru jika ada
  if (propertyIds.length > 0) {
    const rows = propertyIds.map((pid, idx) => ({
      lead_id: leadId,
      property_id: pid,
      interest_level: 'high',
      priority: idx + 1,
    }));

    const { error: insErr } = await supabase.from('crm_interests').insert(rows);
    if (insErr) {
      return { success: false, error: insErr.message };
    }
  }

  await recordAudit({
    actor: { userId: actor.user.id, email: actor.user.email ?? null, role: actor.role },
    action: 'interest.updated',
    targetId: leadId,
    detail: { sync_count: propertyIds.length, property_ids: propertyIds },
  });

  return { success: true, error: null };
}
