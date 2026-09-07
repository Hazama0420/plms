'use server';

import { createServerClientInstance } from '@/lib/supabase/server';
import { normalizeRole } from '@/lib/permissions';
import { recordAudit } from '@/lib/audit-log';
import type { CRMContact } from '@/types/crm.types';

type ActionResult<T = unknown> = { success: boolean; data?: T; error: string | null };

async function getActor(supabase: Awaited<ReturnType<typeof createServerClientInstance>>) {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
  return { user, role: normalizeRole(profile?.role ?? user.user_metadata?.role) };
}

export async function createCRMContactAction(data: {
  full_name: string;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  occupation?: string | null;
  city?: string | null;
  notes?: string | null;
  source?: string | null;
}): Promise<ActionResult<CRMContact>> {
  const supabase = await createServerClientInstance();
  const actor = await getActor(supabase);
  if (!actor) return { success: false, error: 'Sesi tidak valid. Silakan login kembali.' };

  if (!data.full_name || data.full_name.trim().length < 2) {
    return { success: false, error: 'Nama kontak minimal 2 karakter.' };
  }

  const { data: contact, error } = await supabase
    .from('crm_contacts')
    .insert({
      contact_code: `CONT-${Date.now()}`,
      full_name: data.full_name.trim(),
      phone: data.phone?.trim() || null,
      whatsapp: data.whatsapp?.trim() || null,
      email: data.email?.trim() || null,
      occupation: data.occupation?.trim() || null,
      city: data.city?.trim() || null,
      notes: data.notes?.trim() || null,
      source: data.source || 'Manual Entry',
    })
    .select()
    .single();

  if (error || !contact) {
    return { success: false, error: error?.message || 'Gagal membuat kontak.' };
  }

  await recordAudit({
    actor: { userId: actor.user.id, email: actor.user.email ?? null, role: actor.role },
    action: 'contact.created',
    targetId: contact.id,
    detail: { full_name: contact.full_name, contact_code: contact.contact_code },
  });

  return { success: true, data: contact, error: null };
}

export async function updateCRMContactAction(
  contactId: string,
  data: Partial<CRMContact>
): Promise<ActionResult<CRMContact>> {
  const supabase = await createServerClientInstance();
  const actor = await getActor(supabase);
  if (!actor) return { success: false, error: 'Sesi tidak valid. Silakan login kembali.' };

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (data.full_name !== undefined) patch.full_name = data.full_name.trim();
  if (data.phone !== undefined) patch.phone = data.phone?.trim() || null;
  if (data.whatsapp !== undefined) patch.whatsapp = data.whatsapp?.trim() || null;
  if (data.email !== undefined) patch.email = data.email?.trim() || null;
  if (data.occupation !== undefined) patch.occupation = data.occupation?.trim() || null;
  if (data.city !== undefined) patch.city = data.city?.trim() || null;
  if (data.notes !== undefined) patch.notes = data.notes?.trim() || null;

  const { data: contact, error } = await supabase
    .from('crm_contacts')
    .update(patch)
    .eq('id', contactId)
    .select()
    .single();

  if (error || !contact) {
    return { success: false, error: error?.message || 'Gagal memperbarui kontak.' };
  }

  await recordAudit({
    actor: { userId: actor.user.id, email: actor.user.email ?? null, role: actor.role },
    action: 'contact.updated',
    targetId: contactId,
    detail: { updated_fields: Object.keys(patch).filter((k) => k !== 'updated_at') },
  });

  return { success: true, data: contact, error: null };
}

export async function deleteCRMContactAction(contactId: string): Promise<ActionResult> {
  const supabase = await createServerClientInstance();
  const actor = await getActor(supabase);
  if (!actor) return { success: false, error: 'Sesi tidak valid. Silakan login kembali.' };

  const privileged = actor.role === 'admin' || actor.role === 'super_admin';
  if (!privileged) {
    return { success: false, error: 'Hanya Admin atau Super Admin yang dapat menghapus kontak.' };
  }

  const { error } = await supabase.from('crm_contacts').delete().eq('id', contactId);
  if (error) {
    return { success: false, error: error.message };
  }

  await recordAudit({
    actor: { userId: actor.user.id, email: actor.user.email ?? null, role: actor.role },
    action: 'contact.deleted',
    targetId: contactId,
  });

  return { success: true, error: null };
}
