// lib/crm-activity.ts
import { supabase } from "@/lib/supabase/client";

interface LogWAClickParams {
  leadId: string;
  agentId: string;
  agentName?: string;
  clientName: string;
  clientPhone: string;
  notes?: string;
}

export async function logAgentWAClick({
  leadId,
  agentId,
  agentName,
  clientName,
  clientPhone,
  notes,
}: LogWAClickParams) {
  try {
    // 1. Simpan aktivitas ke tabel crm_activities
    const { error } = await supabase.from("crm_activities").insert([
      {
        lead_id: leadId,
        user_id: agentId,
        activity_type: "WhatsApp Chat", // Tipe aktivitas khusus kontak WA
        notes: notes || `Agen ${agentName || "Resmi"} melakukan interaksi Chat WA ke klien ${clientName} (${clientPhone})`,
        created_at: new Date().toISOString(),
      },
    ]);

    if (error) throw error;

    // 2. Opsional: Update status follow-up atau last_contacted pada lead
    await supabase
      .from("crm_leads")
      .update({
        updated_at: new Date().toISOString(),
      })
      .eq("id", leadId);

    return { success: true };
  } catch (err) {
    console.error("Gagal mencatat log aktivitas WA:", err);
    return { success: false, error: err };
  }
}