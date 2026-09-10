'use server';

import { createServerClientInstance } from '@/lib/supabase/server';
import { isLostReason, isPipelineStage, isPipelineTransitionAllowed } from '@/lib/crm-pipeline';
import { canReviewDeal } from '@/lib/permissions';
import {
  canClaimUnassignedCRM,
  canManageAllCRM,
  canManageCRM,
  getCRMAuthoritativeActor,
  isEligibleCRMAgentProfile,
} from '@/lib/crm-auth';
import { recordAudit } from '@/lib/audit-log';
import { revenueOperationsService } from '@/services/revenue-operations.service';

type ActionResult = { success: boolean; error: string | null };

export async function updateCRMLeadStatusAction(
  leadId: string,
  newStatus: string,
  options?: { lostReason?: string; lostExplanation?: string }
): Promise<ActionResult> {
  const supabase = await createServerClientInstance();
  const actor = await getCRMAuthoritativeActor(supabase);
  if (!actor) return { success: false, error: 'Sesi tidak valid. Silakan login kembali.' };
  if (!canManageCRM(actor.role)) return { success: false, error: 'Anda tidak memiliki akses untuk mengelola CRM.' };
  if (!isPipelineStage(newStatus)) return { success: false, error: 'Status pipeline tidak valid.' };

  const { data: lead, error: fetchError } = await supabase
    .from('crm_leads')
    .select('id, status, assigned_to, created_by, deal_state, property_id')
    .eq('id', leadId)
    .single();
  if (fetchError || !lead) return { success: false, error: 'Lead tidak ditemukan atau tidak berwenang.' };

  const privileged = canManageAllCRM(actor.role);
  const ownsLead = lead.assigned_to === actor.user.id || lead.created_by === actor.user.id;
  if (!privileged && !ownsLead) return { success: false, error: 'Anda tidak berwenang mengubah Lead ini.' };

  const currentStatus = lead.status || 'new';
  if (newStatus === 'won') {
    return { success: false, error: 'Status Won hanya dapat ditetapkan melalui verifikasi Deal.' };
  }
  if (currentStatus === newStatus) return { success: true, error: null };
  if (!isPipelineTransitionAllowed(currentStatus, newStatus)) {
    return { success: false, error: `Transisi status tidak valid dari '${currentStatus}' ke '${newStatus}'.` };
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
  } else if (currentStatus === 'lost') {
    patch.lost_reason = null;
    patch.lost_explanation = null;
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
  const actor = await getCRMAuthoritativeActor(supabase);
  if (!actor) return { success: false, error: 'Sesi tidak valid.' };
  if (!canManageCRM(actor.role)) return { success: false, error: 'Anda tidak memiliki akses untuk mengelola CRM.' };
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
  const actor = await getCRMAuthoritativeActor(supabase);
  if (!actor) return { success: false, error: 'Sesi tidak valid.' };
  if (!canReviewDeal(actor.role)) return { success: false, error: 'Hanya Admin atau Super Admin yang dapat memverifikasi Deal.' };

  // Validate deal is in pending_verification state
  const { data: lead } = await supabase
    .from('crm_leads')
    .select('id, status, deal_state, property_id')
    .eq('id', leadId)
    .single();
  if (!lead || lead.deal_state !== 'pending_verification') {
    return { success: false, error: 'Deal tidak sedang menunggu verifikasi.' };
  }

  if (!verified) {
    // Rejection path: simple update, no revenue operations
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('crm_leads')
      .update({
        deal_state: 'rejected',
        deal_rejection_reason: reason?.trim() || 'Ditolak saat verifikasi',
        updated_at: now,
      })
      .eq('id', leadId);
    if (error) return { success: false, error: error.message };

    await recordAudit({
      actor: { userId: actor.user.id, email: actor.user.email ?? null, role: actor.role },
      action: 'deal.rejected', targetId: leadId,
      detail: { previous_state: 'pending_verification', new_state: 'rejected', reason: reason?.trim() || null },
    });
    return { success: true, error: null };
  }

  // Approval path: delegate entire closing to atomic RPC via revenue service.
  // The RPC atomically transitions deal_state -> verified, status -> won,
  // updates property status, creates closing invoice, and creates commission ledger.
  const closingResult = await revenueOperationsService.processDealClosing(
    leadId,
    { userId: actor.user.id, email: actor.user.email ?? null, role: actor.role }
  );

  if (!closingResult.success) {
    return { success: false, error: closingResult.error ?? 'Gagal memproses closing deal.' };
  }

  // Audit: deal.verified recorded after successful atomic closing
  await recordAudit({
    actor: { userId: actor.user.id, email: actor.user.email ?? null, role: actor.role },
    action: 'deal.verified', targetId: leadId,
    detail: {
      previous_state: 'pending_verification',
      new_state: 'verified',
      invoice_id: closingResult.invoiceId ?? null,
      commission_id: closingResult.commissionId ?? null,
      property_id: closingResult.propertyId ?? null,
      property_status: closingResult.propertyStatus ?? null,
      already_processed: closingResult.alreadyProcessed ?? false,
    },
  });
  return { success: true, error: null };
}

export async function createCRMLeadAction(data: {
  contact_id: string;
  assigned_to?: string | null;
  source?: string | null;
  status?: string;
  interest_type?: string | null;
  budget?: number | null;
  notes?: string | null;
  property_id?: string | null;
  property_ids?: string[];
}): Promise<ActionResult & { data?: any }> {
  const supabase = await createServerClientInstance();
  const actor = await getCRMAuthoritativeActor(supabase);
  if (!actor) return { success: false, error: 'Sesi tidak valid. Silakan login kembali.' };
  if (!canManageCRM(actor.role)) return { success: false, error: 'Anda tidak memiliki akses untuk mengelola CRM.' };

  if (!data.contact_id) {
    return { success: false, error: 'Kontak wajib dipilih untuk membuat Lead.' };
  }

  if (data.status === 'won') {
    return { success: false, error: 'Lead baru tidak dapat langsung dibuat dengan status Won.' };
  }

  const { data: contact } = await supabase
    .from('crm_contacts')
    .select('id')
    .eq('id', data.contact_id)
    .maybeSingle();
  if (!contact) {
    return { success: false, error: 'Kontak tidak ditemukan atau tidak berwenang.' };
  }

  const privileged = canManageAllCRM(actor.role);
  const assignedTo = privileged ? (data.assigned_to || null) : actor.user.id;
  if (privileged && assignedTo) {
    const { data: assignee } = await supabase
      .from('users')
      .select('role, status')
      .eq('id', assignedTo)
      .maybeSingle();
    if (!isEligibleCRMAgentProfile(assignee)) {
      return { success: false, error: 'Lead hanya dapat ditugaskan kepada Agent aktif.' };
    }
  }
  const initialStatus = data.status && isPipelineStage(data.status) ? data.status : 'new';

  const { data: lead, error: leadError } = await supabase
    .from('crm_leads')
    .insert({
      contact_id: data.contact_id,
      assigned_to: assignedTo,
      created_by: actor.user.id,
      source: data.source?.trim() || 'Manual Entry',
      status: initialStatus,
      interest_type: data.interest_type?.trim() || null,
      budget: typeof data.budget === 'number' ? data.budget : null,
      notes: data.notes?.trim() || null,
      property_id: data.property_id || null,
    })
    .select()
    .single();

  if (leadError || !lead) {
    return { success: false, error: leadError?.message || 'Gagal membuat Lead.' };
  }

  // Simpan interests jika disediakan
  if (data.property_ids && data.property_ids.length > 0) {
    const interestRows = data.property_ids.map((property_id) => ({
      lead_id: lead.id,
      property_id,
      interest_level: 'medium',
      priority: 1,
    }));

    const { error: interestError } = await supabase
      .from('crm_interests')
      .insert(interestRows);

    if (interestError) {
      console.error('Gagal mencatat crm_interests di createCRMLeadAction:', interestError.message);
    }
  }

  await recordAudit({
    actor: { userId: actor.user.id, email: actor.user.email ?? null, role: actor.role },
    action: 'lead.created',
    targetId: lead.id,
    detail: {
      contact_id: data.contact_id,
      assigned_to: assignedTo,
      status: initialStatus,
      source: data.source,
    },
  });

  return { success: true, data: lead, error: null };
}

export async function deleteCRMLeadAction(leadId: string): Promise<ActionResult> {
  const supabase = await createServerClientInstance();
  const actor = await getCRMAuthoritativeActor(supabase);
  if (!actor) return { success: false, error: 'Sesi tidak valid. Silakan login kembali.' };

  if (!canManageAllCRM(actor.role)) {
    return { success: false, error: 'Hanya Admin atau Super Admin yang dapat menghapus Lead.' };
  }

  const { data: lead } = await supabase
    .from('crm_leads')
    .select('id, contact_id, assigned_to')
    .eq('id', leadId)
    .maybeSingle();

  if (!lead) {
    return { success: false, error: 'Lead tidak ditemukan.' };
  }

  const { error } = await supabase.from('crm_leads').delete().eq('id', leadId);
  if (error) {
    return { success: false, error: error.message };
  }

  await recordAudit({
    actor: { userId: actor.user.id, email: actor.user.email ?? null, role: actor.role },
    action: 'lead.deleted',
    targetId: leadId,
    detail: { contact_id: lead.contact_id, assigned_to: lead.assigned_to },
  });

  return { success: true, error: null };
}

export async function updateCRMLeadAction(
  leadId: string,
  data: {
    contact_id?: string;
    notes?: string | null;
    budget?: number | null;
    interest_type?: string | null;
    property_id?: string | null;
    source?: string | null;
    assigned_to?: string | null;
  }
): Promise<ActionResult & { data?: any }> {
  const supabase = await createServerClientInstance();
  const actor = await getCRMAuthoritativeActor(supabase);
  if (!actor) return { success: false, error: 'Sesi tidak valid. Silakan login kembali.' };
  if (!canManageCRM(actor.role)) return { success: false, error: 'Anda tidak memiliki akses untuk mengelola CRM.' };

  const { data: lead, error: fetchError } = await supabase
    .from('crm_leads')
    .select('id, assigned_to, created_by, contact_id, notes, budget, interest_type, source, property_id')
    .eq('id', leadId)
    .maybeSingle();

  if (fetchError || !lead) {
    return { success: false, error: 'Lead tidak ditemukan atau tidak berwenang.' };
  }

  const privileged = canManageAllCRM(actor.role);
  const ownsLead = lead.assigned_to === actor.user.id || lead.created_by === actor.user.id;
  if (!privileged && !ownsLead) {
    return { success: false, error: 'Anda tidak berwenang mengubah Lead ini.' };
  }

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (data.contact_id !== undefined) patch.contact_id = data.contact_id;
  if (data.notes !== undefined) patch.notes = data.notes?.trim() || null;
  if (data.budget !== undefined) patch.budget = typeof data.budget === 'number' ? data.budget : null;
  if (data.interest_type !== undefined) patch.interest_type = data.interest_type?.trim() || null;
  if (data.property_id !== undefined) patch.property_id = data.property_id || null;
  if (data.source !== undefined) patch.source = data.source?.trim() || null;

  // Proteksi pengubahan penanggung jawab
  if (data.assigned_to !== undefined) {
    if (!privileged && data.assigned_to !== lead.assigned_to) {
      return { success: false, error: 'Perubahan penanggung jawab harus melalui jalur assignment yang berwenang.' };
    }
    if (privileged && data.assigned_to) {
      const { data: assignee } = await supabase
        .from('users')
        .select('role, status')
        .eq('id', data.assigned_to)
        .maybeSingle();
      if (!isEligibleCRMAgentProfile(assignee)) {
        return { success: false, error: 'Lead hanya dapat ditugaskan kepada Agent aktif.' };
      }
    }
    patch.assigned_to = data.assigned_to;
  }

  if (data.contact_id !== undefined && data.contact_id !== lead.contact_id) {
    const { data: contact } = await supabase
      .from('crm_contacts')
      .select('id')
      .eq('id', data.contact_id)
      .maybeSingle();
    if (!contact) {
      return { success: false, error: 'Kontak tidak ditemukan atau tidak berwenang.' };
    }
  }

  const { data: updated, error: updateError } = await supabase
    .from('crm_leads')
    .update(patch)
    .eq('id', leadId)
    .select()
    .single();

  if (updateError || !updated) {
    return { success: false, error: updateError?.message || 'Gagal memperbarui Lead.' };
  }

  const updatedKeys = Object.keys(patch).filter((k) => k !== 'updated_at');
  await recordAudit({
    actor: { userId: actor.user.id, email: actor.user.email ?? null, role: actor.role },
    action: 'lead.updated',
    targetId: leadId,
    detail: {
      updated_fields: updatedKeys,
      previous: Object.fromEntries(updatedKeys.map((k) => [k, (lead as any)[k]])),
    },
  });

  return { success: true, data: updated, error: null };
}

export async function bulkUpdateCRMLeadsStatusAction(
  leadIds: string[],
  newStatus: string,
  options?: { lostReason?: string; lostExplanation?: string }
): Promise<ActionResult & { count?: number }> {
  const supabase = await createServerClientInstance();
  const actor = await getCRMAuthoritativeActor(supabase);
  if (!actor) return { success: false, error: 'Sesi tidak valid. Silakan login kembali.' };
  if (!canManageCRM(actor.role)) return { success: false, error: 'Anda tidak memiliki akses untuk mengelola CRM.' };

  if (!Array.isArray(leadIds) || leadIds.length === 0) {
    return { success: false, error: 'Daftar ID Lead tidak boleh kosong.' };
  }

  if (!isPipelineStage(newStatus)) {
    return { success: false, error: 'Status pipeline tidak valid.' };
  }

  const privileged = canManageAllCRM(actor.role);
  if (newStatus === 'won') {
    return { success: false, error: 'Status Won hanya dapat ditetapkan melalui verifikasi Deal satu per satu.' };
  }

  if (newStatus === 'lost') {
    if (!options?.lostReason || !isLostReason(options.lostReason)) {
      return { success: false, error: 'Alasan Lost wajib dipilih.' };
    }
    if (options.lostReason === 'other' && !options.lostExplanation?.trim()) {
      return { success: false, error: 'Penjelasan wajib diisi untuk alasan Other.' };
    }
  }

  // Ambil semua target leads
  const { data: leads, error: fetchError } = await supabase
    .from('crm_leads')
    .select('id, status, assigned_to, created_by, deal_state')
    .in('id', leadIds);

  if (fetchError || !leads || leads.length !== leadIds.length) {
    return { success: false, error: 'Satu atau lebih Lead tidak ditemukan atau tidak berwenang.' };
  }

  // Validasi kepemilikan dan transisi pipeline untuk setiap lead
  for (const lead of leads) {
    const ownsLead = lead.assigned_to === actor.user.id || lead.created_by === actor.user.id;
    if (!privileged && !ownsLead) {
      return { success: false, error: 'Terdapat Lead yang bukan milik Anda dalam daftar pilihan.' };
    }

    const currentStatus = lead.status || 'new';
    if (currentStatus !== newStatus && !isPipelineTransitionAllowed(currentStatus, newStatus)) {
      return {
        success: false,
        error: `Transisi status tidak valid dari '${currentStatus}' ke '${newStatus}' pada salah satu Lead.`,
      };
    }
  }

  const now = new Date().toISOString();
  const patch: Record<string, unknown> = {
    status: newStatus,
    updated_at: now,
  };
  if (newStatus === 'lost') {
    patch.lost_reason = options?.lostReason;
    patch.lost_explanation = options?.lostExplanation?.trim() || null;
  } else if (leads.some((lead) => lead.status === 'lost')) {
    patch.lost_reason = null;
    patch.lost_explanation = null;
  }

  const { error: updateError } = await supabase
    .from('crm_leads')
    .update(patch)
    .in('id', leadIds);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  // Audit log untuk setiap lead yang diupdate
  for (const lead of leads) {
    await recordAudit({
      actor: { userId: actor.user.id, email: actor.user.email ?? null, role: actor.role },
      action: newStatus === 'lost' ? 'lead.marked_lost' : 'lead.pipeline_changed',
      targetId: lead.id,
      detail: {
        previous_status: lead.status || 'new',
        new_status: newStatus,
        bulk: true,
      },
    });
  }

  return { success: true, count: leadIds.length, error: null };
}

export async function bulkAssignCRMLeadsAction(
  leadIds: string[],
  assignedTo: string
): Promise<ActionResult & { count?: number }> {
  const supabase = await createServerClientInstance();
  const actor = await getCRMAuthoritativeActor(supabase);
  if (!actor) return { success: false, error: 'Sesi tidak valid. Silakan login kembali.' };
  if (!canManageCRM(actor.role)) return { success: false, error: 'Anda tidak memiliki akses untuk mengelola CRM.' };

  if (!Array.isArray(leadIds) || leadIds.length === 0) {
    return { success: false, error: 'Daftar ID Lead tidak boleh kosong.' };
  }

  if (!assignedTo) {
    return { success: false, error: 'Agen penerima penugasan wajib dipilih.' };
  }

  const privileged = canManageAllCRM(actor.role);
  if (!privileged) {
    return { success: false, error: 'Hanya Admin atau Super Admin yang dapat menugaskan Lead secara massal.' };
  }

  // Verifikasi target agen ada di sistem
  const { data: targetUser, error: userError } = await supabase
    .from('users')
    .select('id, full_name, email, role, status')
    .eq('id', assignedTo)
    .maybeSingle();

  if (userError || !isEligibleCRMAgentProfile(targetUser)) {
    return { success: false, error: 'Agen penerima harus merupakan Agent aktif.' };
  }

  // Ambil semua target leads
  const { data: leads, error: fetchError } = await supabase
    .from('crm_leads')
    .select('id, assigned_to, created_by')
    .in('id', leadIds);

  if (fetchError || !leads || leads.length !== leadIds.length) {
    return { success: false, error: 'Satu atau lebih Lead tidak ditemukan atau tidak berwenang.' };
  }

  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from('crm_leads')
    .update({ assigned_to: assignedTo, updated_at: now })
    .in('id', leadIds);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  // Audit log untuk setiap penugasan
  for (const lead of leads) {
    await recordAudit({
      actor: { userId: actor.user.id, email: actor.user.email ?? null, role: actor.role },
      action: 'lead.assigned',
      targetId: lead.id,
      detail: {
        previous_assigned_to: lead.assigned_to,
        new_assigned_to: assignedTo,
        bulk: true,
      },
    });
  }

  return { success: true, count: leadIds.length, error: null };
}

/**
 * BUG-13: Claim Unassigned Lead
 * Memungkinkan Agent aktif mengklaim Lead yang belum memiliki penanggung jawab (assigned_to IS NULL).
 * Menggunakan update database atomik dengan kondisi `is('assigned_to', null)` untuk mencegah race condition (concurrency protection).
 */
export async function claimCRMLeadAction(leadId: string): Promise<ActionResult & { data?: any }> {
  const supabase = await createServerClientInstance();
  const actor = await getCRMAuthoritativeActor(supabase);
  if (!actor) return { success: false, error: 'Sesi tidak valid. Silakan login kembali.' };

  if (!canClaimUnassignedCRM(actor.role)) {
    return { success: false, error: 'Role Anda tidak diizinkan untuk mengklaim Lead.' };
  }
  if (!isEligibleCRMAgentProfile({ role: actor.role, status: actor.status })) {
    return { success: false, error: 'Hanya Agent aktif yang dapat mengklaim Lead.' };
  }

  if (!leadId) {
    return { success: false, error: 'ID Lead tidak valid.' };
  }

  const now = new Date().toISOString();

  // The claim-pool row is intentionally hidden from the base table until this
  // database function atomically assigns it to the current active Agent.
  const { data: claimed, error: updateError } = await supabase
    .rpc('claim_crm_lead_atomic', { p_lead_id: leadId });

  if (updateError) {
    return { success: false, error: `Gagal mengklaim Lead: ${updateError.message}` };
  }

  // Jika tidak ada baris yang terupdate, periksa apakah lead memang sudah diklaim orang lain atau tidak ada
  if (!claimed) {
    const { data: existingLead } = await supabase
      .from('crm_leads')
      .select('id, assigned_to')
      .eq('id', leadId)
      .maybeSingle();

    if (!existingLead) {
      return { success: false, error: 'Lead tidak ditemukan.' };
    }

    if (existingLead.assigned_to) {
      if (existingLead.assigned_to === actor.user.id) {
        return { success: true, data: existingLead, error: null }; // Sudah milik sendiri
      }
      return {
        success: false,
        error: 'Lead ini sudah diambil oleh agen lain. Silakan muat ulang halaman.',
      };
    }

    return { success: false, error: 'Gagal mengklaim Lead. Silakan coba lagi.' };
  }

  const { data: updatedRows } = await supabase
    .from('crm_leads')
    .select('id, assigned_to, contact_id, status')
    .eq('id', leadId)
    .maybeSingle();

  // Ambil nama agen untuk activity log
  const { data: actorProfile } = await supabase
    .from('users')
    .select('full_name')
    .eq('id', actor.user.id)
    .maybeSingle();

  const actorName = actorProfile?.full_name || actor.user.email || 'Agen';

  // Catat aktivitas di crm_activities
  await supabase.from('crm_activities').insert({
    lead_id: leadId,
    user_id: actor.user.id,
    activity_type: 'status_change',
    notes: `Lead berhasil diambil oleh ${actorName}`,
    created_at: now,
  });

  // Catat jejak audit
  await recordAudit({
    actor: { userId: actor.user.id, email: actor.user.email ?? null, role: actor.role },
    action: 'lead.assigned',
    targetId: leadId,
    detail: {
      action_type: 'claim',
      assigned_to: actor.user.id,
      agent_name: actorName,
    },
  });

  return { success: true, data: updatedRows, error: null };
}

