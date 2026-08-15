'use server';

import { createServerClientInstance } from '@/lib/supabase/server';
import { isLostReason, isPipelineStage, isPipelineTransitionAllowed } from '@/lib/crm-pipeline';
import { normalizeRole } from '@/lib/permissions';
import { recordAudit } from '@/lib/audit-log';

type ActionResult = { success: boolean; error: string | null };
const canReviewDeal = (role: string) => role === 'admin' || role === 'super_admin';

async function getActor(supabase: Awaited<ReturnType<typeof createServerClientInstance>>) {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
  return { user, role: normalizeRole(profile?.role ?? user.user_metadata?.role) };
}

export async function updateCRMLeadStatusAction(
  leadId: string,
  newStatus: string,
  options?: { lostReason?: string; lostExplanation?: string }
): Promise<ActionResult> {
  const supabase = await createServerClientInstance();
  const actor = await getActor(supabase);
  if (!actor) return { success: false, error: 'Sesi tidak valid. Silakan login kembali.' };
  if (!isPipelineStage(newStatus)) return { success: false, error: 'Status pipeline tidak valid.' };

  const { data: lead, error: fetchError } = await supabase
    .from('crm_leads')
    .select('id, status, assigned_to, created_by, deal_state')
    .eq('id', leadId)
    .single();
  if (fetchError || !lead) return { success: false, error: 'Lead tidak ditemukan atau tidak berwenang.' };

  const privileged = canReviewDeal(actor.role);
  const ownsLead = lead.assigned_to === actor.user.id || lead.created_by === actor.user.id;
  if (!privileged && !ownsLead) return { success: false, error: 'Anda tidak berwenang mengubah Lead ini.' };

  const currentStatus = lead.status || 'new';
  if (currentStatus === newStatus) return { success: true, error: null };
  if (!isPipelineTransitionAllowed(currentStatus, newStatus)) {
    return { success: false, error: `Transisi status tidak valid dari '${currentStatus}' ke '${newStatus}'.` };
  }
  if (newStatus === 'won' && (!privileged || lead.deal_state !== 'verified')) {
    return { success: false, error: 'Deal harus diverifikasi Admin atau Super Admin.' };
  }
  if (newStatus === 'lost') {
    if (!options?.lostReason || !isLostReason(options.lostReason)) {
      return { success: false, error: 'Alasan Lost wajib dipilih.' };
    }
    if (options.lostReason === 'other' && !options.lostExplanation?.trim()) {
      return { success: false, error: 'Penjelasan wajib diisi untuk alasan Other.' };
    }
  }

  const patch: Record<string, unknown> = {
    status: newStatus,
    updated_at: new Date().toISOString(),
  };
  if (newStatus === 'lost') {
    patch.lost_reason = options?.lostReason;
    patch.lost_explanation = options?.lostExplanation?.trim() || null;
  }

  const { error: updateError } = await supabase.from('crm_leads').update(patch).eq('id', leadId);
  if (updateError) return { success: false, error: updateError.message };

  await recordAudit({
    actor: { userId: actor.user.id, email: actor.user.email ?? null, role: actor.role },
    action: newStatus === 'lost' ? 'lead.marked_lost' : 'lead.pipeline_changed',
    targetId: leadId,
    detail: {
      previous_status: currentStatus,
      new_status: newStatus,
      ...(newStatus === 'lost'
        ? { lost_reason: options?.lostReason, lost_explanation: options?.lostExplanation?.trim() || null }
        : {}),
    },
  });
  return { success: true, error: null };
}

export async function submitCRMDealAction(leadId: string): Promise<ActionResult> {
  const supabase = await createServerClientInstance();
  const actor = await getActor(supabase);
  if (!actor) return { success: false, error: 'Sesi tidak valid.' };
  const { data: lead } = await supabase
    .from('crm_leads')
    .select('id,status,assigned_to,created_by,deal_state')
    .eq('id', leadId)
    .single();
  if (!lead) return { success: false, error: 'Lead tidak ditemukan atau tidak berwenang.' };
  if (lead.status !== 'negotiation') return { success: false, error: 'Deal hanya dapat diajukan dari tahap Negotiation.' };
  const ownsLead = lead.assigned_to === actor.user.id || lead.created_by === actor.user.id;
  if (!ownsLead && !canReviewDeal(actor.role)) return { success: false, error: 'Anda tidak berwenang mengajukan Deal ini.' };
  if (lead.deal_state === 'pending_verification' || lead.deal_state === 'verified') return { success: false, error: 'Deal sudah diajukan atau diverifikasi.' };

  const now = new Date().toISOString();
  const { error } = await supabase
    .from('crm_leads')
    .update({ deal_state: 'pending_verification', deal_submitted_at: now, deal_rejection_reason: null, updated_at: now })
    .eq('id', leadId);
  if (error) return { success: false, error: error.message };
  await recordAudit({
    actor: { userId: actor.user.id, email: actor.user.email ?? null, role: actor.role },
    action: 'deal.submitted', targetId: leadId,
    detail: { previous_state: lead.deal_state ?? 'none', new_state: 'pending_verification' },
  });
  return { success: true, error: null };
}

export async function verifyCRMDealAction(leadId: string, verified: boolean, reason?: string): Promise<ActionResult> {
  const supabase = await createServerClientInstance();
  const actor = await getActor(supabase);
  if (!actor) return { success: false, error: 'Sesi tidak valid.' };
  if (!canReviewDeal(actor.role)) return { success: false, error: 'Hanya Admin atau Super Admin yang dapat memverifikasi Deal.' };
  const { data: lead } = await supabase.from('crm_leads').select('id,status,deal_state').eq('id', leadId).single();
  if (!lead || lead.deal_state !== 'pending_verification') return { success: false, error: 'Deal tidak sedang menunggu verifikasi.' };

  const now = new Date().toISOString();
  const nextState = verified ? 'verified' : 'rejected';
  const patch = verified
    ? { deal_state: nextState, deal_verified_at: now, status: 'won', updated_at: now }
    : { deal_state: nextState, deal_rejection_reason: reason?.trim() || 'Ditolak saat verifikasi', updated_at: now };
  const { error } = await supabase.from('crm_leads').update(patch).eq('id', leadId);
  if (error) return { success: false, error: error.message };
  await recordAudit({
    actor: { userId: actor.user.id, email: actor.user.email ?? null, role: actor.role },
    action: verified ? 'deal.verified' : 'deal.rejected', targetId: leadId,
    detail: { previous_state: 'pending_verification', new_state: nextState, reason: reason?.trim() || null },
  });
  return { success: true, error: null };
}
