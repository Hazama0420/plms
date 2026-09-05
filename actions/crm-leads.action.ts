'use server';

import { createServerClientInstance } from '@/lib/supabase/server';
import { isLostReason, isPipelineStage, isPipelineTransitionAllowed } from '@/lib/crm-pipeline';
import { normalizeRole } from '@/lib/permissions';
import { recordAudit } from '@/lib/audit-log';
import { revenueOperationsService } from '@/services/revenue-operations.service';

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
    .select('id, status, assigned_to, created_by, deal_state, property_id')
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

  if (newStatus === 'won') {
    await syncPropertyStatusOnDealWon(supabase, actor, leadId, lead.property_id);
  }

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

async function syncPropertyStatusOnDealWon(
  supabase: Awaited<ReturnType<typeof createServerClientInstance>>,
  actor: { user: { id: string; email?: string | null }; role: string },
  leadId: string,
  leadPropertyId?: string | null
) {
  try {
    let targetPropertyId = leadPropertyId;
    if (!targetPropertyId) {
      const { data: interest } = await supabase
        .from('crm_interests')
        .select('property_id')
        .eq('lead_id', leadId)
        .limit(1)
        .maybeSingle();
      if (interest?.property_id) {
        targetPropertyId = interest.property_id;
      }
    }

    if (!targetPropertyId) return;

    const { data: prop } = await supabase
      .from('properties')
      .select('id, listing_type, status')
      .eq('id', targetPropertyId)
      .maybeSingle();

    if (!prop) return;

    const targetStatus = (prop.listing_type || '').toLowerCase() === 'sewa' ? 'rented' : 'sold';

    // Idempotency: hanya update jika status belum sesuai target
    if (prop.status !== targetStatus) {
      const now = new Date().toISOString();
      const { error: propUpdateErr } = await supabase
        .from('properties')
        .update({ status: targetStatus, updated_at: now })
        .eq('id', prop.id);

      if (!propUpdateErr) {
        await recordAudit({
          actor: { userId: actor.user.id, email: actor.user.email ?? null, role: actor.role },
          action: 'property.status_changed',
          targetId: prop.id,
          detail: {
            previous_status: prop.status,
            new_status: targetStatus,
            trigger: 'deal.verified',
            lead_id: leadId,
          },
        });
      }
    }
  } catch (err) {
    console.error('Gagal menyinkronkan status properti saat deal won:', err);
  }
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
  const actor = await getActor(supabase);
  if (!actor) return { success: false, error: 'Sesi tidak valid. Silakan login kembali.' };

  if (!data.contact_id) {
    return { success: false, error: 'Kontak wajib dipilih untuk membuat Lead.' };
  }

  const privileged = canReviewDeal(actor.role);
  const assignedTo = privileged ? (data.assigned_to || actor.user.id) : actor.user.id;
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
  const actor = await getActor(supabase);
  if (!actor) return { success: false, error: 'Sesi tidak valid. Silakan login kembali.' };

  const privileged = canReviewDeal(actor.role);
  if (!privileged) {
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
  const actor = await getActor(supabase);
  if (!actor) return { success: false, error: 'Sesi tidak valid. Silakan login kembali.' };

  const { data: lead, error: fetchError } = await supabase
    .from('crm_leads')
    .select('id, assigned_to, created_by, contact_id, notes, budget, interest_type, source, property_id')
    .eq('id', leadId)
    .maybeSingle();

  if (fetchError || !lead) {
    return { success: false, error: 'Lead tidak ditemukan atau tidak berwenang.' };
  }

  const privileged = canReviewDeal(actor.role);
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
    if (!privileged && data.assigned_to !== lead.assigned_to && data.assigned_to !== actor.user.id) {
      return { success: false, error: 'Hanya Admin yang dapat mengalihkan penanggung jawab Lead ke agen lain.' };
    }
    patch.assigned_to = data.assigned_to;
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
  const actor = await getActor(supabase);
  if (!actor) return { success: false, error: 'Sesi tidak valid. Silakan login kembali.' };

  if (!Array.isArray(leadIds) || leadIds.length === 0) {
    return { success: false, error: 'Daftar ID Lead tidak boleh kosong.' };
  }

  if (!isPipelineStage(newStatus)) {
    return { success: false, error: 'Status pipeline tidak valid.' };
  }

  const privileged = canReviewDeal(actor.role);
  if (newStatus === 'won' && !privileged) {
    return { success: false, error: 'Pembaruan massal ke status Won hanya diizinkan untuk Admin.' };
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
  const actor = await getActor(supabase);
  if (!actor) return { success: false, error: 'Sesi tidak valid. Silakan login kembali.' };

  if (!Array.isArray(leadIds) || leadIds.length === 0) {
    return { success: false, error: 'Daftar ID Lead tidak boleh kosong.' };
  }

  if (!assignedTo) {
    return { success: false, error: 'Agen penerima penugasan wajib dipilih.' };
  }

  const privileged = canReviewDeal(actor.role);
  if (!privileged && assignedTo !== actor.user.id) {
    return { success: false, error: 'Hanya Admin yang dapat menugaskan Lead secara massal ke agen lain.' };
  }

  // Verifikasi target agen ada di sistem
  const { data: targetUser, error: userError } = await supabase
    .from('users')
    .select('id, full_name, email, role')
    .eq('id', assignedTo)
    .maybeSingle();

  if (userError || !targetUser) {
    return { success: false, error: 'Agen penerima penugasan tidak ditemukan.' };
  }

  // Ambil semua target leads
  const { data: leads, error: fetchError } = await supabase
    .from('crm_leads')
    .select('id, assigned_to, created_by')
    .in('id', leadIds);

  if (fetchError || !leads || leads.length !== leadIds.length) {
    return { success: false, error: 'Satu atau lebih Lead tidak ditemukan atau tidak berwenang.' };
  }

  // Validasi kepemilikan untuk setiap lead jika bukan admin
  if (!privileged) {
    for (const lead of leads) {
      if (lead.assigned_to !== actor.user.id && lead.created_by !== actor.user.id) {
        return { success: false, error: 'Anda tidak berwenang mengubah penugasan pada salah satu Lead terpilih.' };
      }
    }
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
 * Memungkinkan Agent, Admin, atau Super Admin mengklaim Lead yang belum memiliki penanggung jawab (assigned_to IS NULL).
 * Menggunakan update database atomik dengan kondisi `is('assigned_to', null)` untuk mencegah race condition (concurrency protection).
 */
export async function claimCRMLeadAction(leadId: string): Promise<ActionResult & { data?: any }> {
  const supabase = await createServerClientInstance();
  const actor = await getActor(supabase);
  if (!actor) return { success: false, error: 'Sesi tidak valid. Silakan login kembali.' };

  // Hanya role yang berwenang (agent, marketing, admin, super_admin, superadmin) yang boleh klaim lead
  const allowedRoles = ['agent', 'marketing', 'admin', 'super_admin', 'superadmin'];
  if (!allowedRoles.includes(actor.role)) {
    return { success: false, error: 'Role Anda tidak diizinkan untuk mengklaim Lead.' };
  }

  if (!leadId) {
    return { success: false, error: 'ID Lead tidak valid.' };
  }

  const now = new Date().toISOString();

  // ATOMIC CONCURRENCY PROTECTION:
  // Hanya baris dengan id = leadId DAN assigned_to IS NULL yang akan terupdate.
  // Jika 2 agen mengeksekusi ini secara bersamaan, hanya 1 transaksi yang mengubah baris dan mengembalikan data.
  const { data: updatedRows, error: updateError } = await supabase
    .from('crm_leads')
    .update({
      assigned_to: actor.user.id,
      updated_at: now,
    })
    .eq('id', leadId)
    .is('assigned_to', null)
    .select('id, assigned_to, contact_id, status')
    .maybeSingle();

  if (updateError) {
    return { success: false, error: `Gagal mengklaim Lead: ${updateError.message}` };
  }

  // Jika tidak ada baris yang terupdate, periksa apakah lead memang sudah diklaim orang lain atau tidak ada
  if (!updatedRows) {
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

