import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = createAdminClient();

  // 1. Ambil followups pending
  const { data: followups, error: fErr } = await supabase
    .from("crm_followups")
    .select("id, followup_date, status, notes, created_at, lead_id, assigned_to")
    .eq("status", "pending")
    .order("followup_date", { ascending: true })
    .limit(10);

  if (fErr) {
    console.error("[followups] Error ambil followups:", fErr);
    return NextResponse.json({ error: fErr.message, data: [] }, { status: 500 });
  }

  if (!followups || followups.length === 0) {
    return NextResponse.json({ data: [] });
  }

  // 2. Kumpulkan lead_id unik
  const leadIds = [...new Set(followups.map((f) => f.lead_id).filter(Boolean))];

  if (leadIds.length === 0) {
    return NextResponse.json({ data: [] });
  }

  // 3. Ambil leads (tanpa JOIN)
  const { data: leads, error: lErr } = await supabase
    .from("crm_leads")
    .select("id, contact_id, property_id, interest_type, budget")
    .in("id", leadIds);

  if (lErr) {
    console.error("[followups] Error ambil leads:", lErr);
    return NextResponse.json({ error: lErr.message, data: [] }, { status: 500 });
  }

  // 4. Kumpulkan contact_id unik
  const contactIds = [...new Set(leads.map((l) => l.contact_id).filter(Boolean))];

  // 5. Ambil contacts (terpisah)
  let contactsMap = new Map();
  if (contactIds.length > 0) {
    const { data: contacts, error: cErr } = await supabase
      .from("crm_contacts")
      .select("id, name, phone, email")
      .in("id", contactIds);

    if (cErr) {
      console.error("[followups] Error ambil contacts:", cErr);
      // Tidak return error, hanya kosong
    } else if (contacts) {
      contacts.forEach((c) => contactsMap.set(c.id, c));
    }
  }

  // 6. Map lead
  const leadMap = new Map(leads.map((l) => [l.id, l]));

  // 7. Gabungkan hasil
  const mappedData = followups.map((f) => {
    const lead = leadMap.get(f.lead_id);
    const contact = lead?.contact_id ? contactsMap.get(lead.contact_id) : null;

    return {
      id: f.id,
      name: contact?.name || "Unknown",
      phone: contact?.phone || "-",
      property: lead?.interest_type || "N/A",
      status: f.status,
      created_at: f.created_at,
      followup_date: f.followup_date,
      notes: f.notes,
      lead_id: f.lead_id,
    };
  });

  return NextResponse.json({ data: mappedData });
}