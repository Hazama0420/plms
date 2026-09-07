'use server';

import { createServerClientInstance } from '@/lib/supabase/server';
import { normalizeRole } from '@/lib/permissions';
import { recordAudit } from '@/lib/audit-log';
import { notifyEvent } from '@/lib/notification-helper';
import type { CRMFollowup } from '@/types/crm.types';

type ActionResult<T = unknown> = {
  success: boolean;
  data?: T;
  error: string | null;
  lifecycle?: {
    didTransitionToCompleted: boolean;
    shouldOfferNextFollowup: boolean;
    leadId: string;
  };
};

async function getActor(supabase: Awaited<ReturnType<typeof createServerClientInstance>>) {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
  return { user, role: normalizeRole(profile?.role ?? user.user_metadata?.role) };
}

export async function createCRMFollowupAction(data: {
  lead_id: string;
  followup_date: string;
  notes?: string | null;
  assigned_to?: string;
}): Promise<ActionResult<CRMFollowup>> {
  const supabase = await createServerClientInstance();
  const actor = await getActor(supabase);
  if (!actor) return { success: false, error: 'Sesi tidak valid. Silakan login kembali.' };

  if (!data.followup_date) {
    return { success: false, error: 'Tanggal follow-up wajib diisi.' };
  }

  const { data: lead, error: leadErr } = await supabase
    .from('crm_leads')
    .select('id, assigned_to, created_by')
    .eq('id', data.lead_id)
    .maybeSingle();

  if (leadErr || !lead) {
    return { success: false, error: 'Lead tidak ditemukan atau tidak berwenang.' };
  }

  const privileged = actor.role === 'admin' || actor.role === 'super_admin';
  const authorizedLead = privileged || lead.assigned_to === actor.user.id || lead.created_by === actor.user.id;
  if (!authorizedLead) {
    return { success: false, error: 'Anda tidak berwenang membuat Follow-Up untuk Lead ini.' };
  }

  const assignee = privileged ? (data.assigned_to || actor.user.id) : actor.user.id;

  const { data: followup, error } = await supabase
    .from('crm_followups')
    .insert({
      lead_id: data.lead_id,
      created_by: actor.user.id,
      assigned_to: assignee,
      followup_date: data.followup_date,
      notes: data.notes?.trim() || null,
      status: 'pending',
    })
    .select()
    .single();

  if (error || !followup) {
    return { success: false, error: error?.message || 'Gagal membuat agenda follow-up.' };
  }

  await recordAudit({
    actor: { userId: actor.user.id, email: actor.user.email ?? null, role: actor.role },
    action: 'followup.created',
    targetId: data.lead_id,
    detail: { followup_id: followup.id, assigned_to: assignee, followup_date: data.followup_date },
  });

  if (assignee !== actor.user.id) {
    const jadwal = new Date(data.followup_date).toLocaleString('id-ID', {
      dateStyle: 'full',
      timeStyle: 'short',
    });

    await notifyEvent({
      event: 'followup.created',
      userIds: [assignee],
      title: 'Agenda follow-up baru untuk Anda',
      message: `Follow-up dijadwalkan pada ${jadwal}.`,
      link: `/crm/leads/${data.lead_id}`,
      senderId: actor.user.id,
    }).catch((err) => console.error('Gagal kirim notifikasi follow-up:', err));
  }

  return { success: true, data: followup, error: null };
}

export async function updateCRMFollowupAction(
  followupId: string,
  data: {
    followup_date?: string;
    notes?: string | null;
    status?: 'pending' | 'completed' | 'cancelled';
    assigned_to?: string;
  }
): Promise<ActionResult<CRMFollowup>> {
  const supabase = await createServerClientInstance();
  const actor = await getActor(supabase);
  if (!actor) return { success: false, error: 'Sesi tidak valid. Silakan login kembali.' };

  const { data: followup, error: fetchErr } = await supabase
    .from('crm_followups')
    .select('id, lead_id, assigned_to, status, lead:crm_leads(assigned_to, created_by, status)')
    .eq('id', followupId)
    .maybeSingle();

  if (fetchErr || !followup) {
    return { success: false, error: 'Follow-Up tidak ditemukan atau tidak berwenang.' };
  }

  const lead = Array.isArray(followup.lead) ? followup.lead[0] : followup.lead;
  const privileged = actor.role === 'admin' || actor.role === 'super_admin';
  const authorized = privileged || followup.assigned_to === actor.user.id || lead?.assigned_to === actor.user.id || lead?.created_by === actor.user.id;

  if (!authorized) {
    return { success: false, error: 'Anda tidak berwenang mengubah Follow-Up ini.' };
  }

  if (!privileged && data.assigned_to !== undefined) {
    return { success: false, error: 'Agent tidak dapat mengubah penanggung jawab Follow-Up.' };
  }

  const now = new Date().toISOString();
  const didTransitionToCompleted = data.status === 'completed' && followup.status !== 'completed';
  const didTransitionToCancelled = data.status === 'cancelled' && followup.status !== 'cancelled';
  const shouldOfferNextFollowup = didTransitionToCompleted && Boolean(lead && lead.status !== 'lost' && lead.status !== 'won');

  const patch: Record<string, unknown> = { updated_at: now };
  if (data.followup_date !== undefined) patch.followup_date = data.followup_date;
  if (data.notes !== undefined) patch.notes = data.notes?.trim() || null;
  if (data.status !== undefined) patch.status = data.status;
  if (privileged && data.assigned_to !== undefined) patch.assigned_to = data.assigned_to;

  if (didTransitionToCompleted) {
    patch.completed_at = now;
    patch.completed_by = actor.user.id;
  } else if (data.status === 'pending' || data.status === 'cancelled') {
    patch.completed_at = null;
    patch.completed_by = null;
  }

  const { data: updated, error: updateErr } = await supabase
    .from('crm_followups')
    .update(patch)
    .eq('id', followupId)
    .select()
    .single();

  if (updateErr || !updated) {
    return { success: false, error: updateErr?.message || 'Gagal memperbarui Follow-Up.' };
  }

  if (didTransitionToCompleted || didTransitionToCancelled) {
    await recordAudit({
      actor: { userId: actor.user.id, email: actor.user.email ?? null, role: actor.role },
      action: didTransitionToCompleted ? 'followup.completed' : 'followup.cancelled',
      targetId: followup.lead_id,
      detail: { followup_id: followupId, previous_status: followup.status, status: data.status },
    });
  } else {
    await recordAudit({
      actor: { userId: actor.user.id, email: actor.user.email ?? null, role: actor.role },
      action: 'followup.updated',
      targetId: followup.lead_id,
      detail: { followup_id: followupId, fields: Object.keys(data).filter((k) => k !== 'assigned_to') },
    });
  }

  return {
    success: true,
    data: updated,
    error: null,
    lifecycle: { didTransitionToCompleted, shouldOfferNextFollowup, leadId: followup.lead_id },
  };
}

export async function deleteCRMFollowupAction(followupId: string): Promise<ActionResult> {
  const supabase = await createServerClientInstance();
  const actor = await getActor(supabase);
  if (!actor) return { success: false, error: 'Sesi tidak valid. Silakan login kembali.' };

  const { data: followup, error: fetchErr } = await supabase
    .from('crm_followups')
    .select('id, lead_id, assigned_to, lead:crm_leads(assigned_to, created_by)')
    .eq('id', followupId)
    .maybeSingle();

  if (fetchErr || !followup) {
    return { success: false, error: 'Follow-Up tidak ditemukan atau tidak berwenang.' };
  }

  const lead = Array.isArray(followup.lead) ? followup.lead[0] : followup.lead;
  const privileged = actor.role === 'admin' || actor.role === 'super_admin';
  const authorized = privileged || followup.assigned_to === actor.user.id || lead?.assigned_to === actor.user.id || lead?.created_by === actor.user.id;

  if (!authorized) {
    return { success: false, error: 'Anda tidak berwenang menghapus Follow-Up ini.' };
  }

  const { error } = await supabase.from('crm_followups').delete().eq('id', followupId);
  if (error) {
    return { success: false, error: error.message };
  }

  await recordAudit({
    actor: { userId: actor.user.id, email: actor.user.email ?? null, role: actor.role },
    action: 'followup.deleted',
    targetId: followup.lead_id,
    detail: { followup_id: followupId },
  });

  return { success: true, error: null };
}
