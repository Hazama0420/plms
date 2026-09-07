import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { maskPhoneNumber } from "@/lib/phone-masker";

export async function GET(request: Request) {
  // 1. Otorisasi ketat: hanya staf internal yang berhak mengakses data CRM
  const auth = await requireRole(["super_admin", "admin", "agent", "marketing", "commissioner"]);
  if (!auth.ok) return auth.response;

  const { supabase, userId, role } = auth.ctx;
  const privileged = role === "admin" || role === "super_admin" || role === "commissioner";

  const url = new URL(request.url);
  const statusParam = url.searchParams.get("status") || "pending";
  const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") || "20", 10), 1), 100);

  // 2. Ambil followups sesuai kewenangan role
  let followupsQuery = supabase
    .from("crm_followups")
    .select("id, followup_date, status, notes, created_at, lead_id, assigned_to")
    .order("followup_date", { ascending: true })
    .limit(limit);

  if (statusParam && statusParam !== "all") {
    followupsQuery = followupsQuery.eq("status", statusParam);
  }

  // Agent hanya boleh mengambil follow-up yang ditugaskan kepada dirinya
  if (role === "agent") {
    followupsQuery = followupsQuery.eq("assigned_to", userId);
  }

  const { data: followups, error: fErr } = await followupsQuery;

  if (fErr) {
    console.error("[followups] Error ambil followups:", fErr);
    return NextResponse.json({ error: fErr.message, data: [] }, { status: 500 });
  }

  if (!followups || followups.length === 0) {
    return NextResponse.json({ data: [] });
  }

  // 3. Kumpulkan lead_id unik
  const leadIds = [...new Set(followups.map((f) => f.lead_id).filter(Boolean))];

  if (leadIds.length === 0) {
    return NextResponse.json({ data: [] });
  }

  // 4. Ambil leads yang berkaitan
  const { data: leads, error: lErr } = await supabase
    .from("crm_leads")
    .select("id, contact_id, property_id, interest_type, budget, assigned_to, created_by")
    .in("id", leadIds);

  if (lErr) {
    console.error("[followups] Error ambil leads:", lErr);
    return NextResponse.json({ error: lErr.message, data: [] }, { status: 500 });
  }

  // 5. Kumpulkan contact_id unik
  const contactIds = [...new Set((leads || []).map((l) => l.contact_id).filter(Boolean))];

  // 6. Ambil contacts
  const contactsMap = new Map();
  if (contactIds.length > 0) {
    const { data: contacts, error: cErr } = await supabase
      .from("crm_contacts")
      .select("id, full_name, phone, email")
      .in("id", contactIds);

    if (cErr) {
      console.error("[followups] Error ambil contacts:", cErr);
      return NextResponse.json({ error: cErr.message, data: [] }, { status: 500 });
    } else if (contacts) {
      contacts.forEach((c) => contactsMap.set(c.id, c));
    }
  }

  const leadMap = new Map((leads || []).map((l) => [l.id, l]));

  // 7. Gabungkan hasil dengan contact masking sesuai hak akses
  const mappedData = followups.map((f) => {
    const lead = leadMap.get(f.lead_id);
    const contact = lead?.contact_id ? contactsMap.get(lead.contact_id) : null;

    // Nomor telepon hanya boleh terlihat utuh oleh Admin/SuperAdmin atau Agen pemilik lead/follow-up
    const canSeeFullPhone = privileged || f.assigned_to === userId || lead?.assigned_to === userId || lead?.created_by === userId;
    const rawPhone = contact?.phone || null;
    const displayedPhone = canSeeFullPhone ? (rawPhone || "-") : (maskPhoneNumber(rawPhone) || "-");

    // Catatan internal terlindungi jika bukan penanggung jawab
    const canSeeInternalNotes = privileged || f.assigned_to === userId || lead?.assigned_to === userId;
    const displayedNotes = canSeeInternalNotes ? f.notes : "[Catatan internal terlindungi]";

    return {
      id: f.id,
      name: contact?.full_name || "Unknown",
      phone: displayedPhone,
      property: lead?.interest_type || "N/A",
      status: f.status,
      created_at: f.created_at,
      followup_date: f.followup_date,
      notes: displayedNotes,
      lead_id: f.lead_id,
      assigned_to: f.assigned_to,
    };
  });

  return NextResponse.json({ data: mappedData });
}