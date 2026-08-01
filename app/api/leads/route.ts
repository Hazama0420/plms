// app/api/leads/route.ts
import { NextResponse } from "next/server";
import { sendSystemNotification } from "@/lib/notification-helper";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWaToAgent } from "@/lib/fonnte"; // 🔑 Langsung import helper Fonnte

export async function POST(req: Request) {
  try {
    const supabase = createAdminClient();
    const body = await req.json();

    const name = body.name || body.full_name;
    const phone = body.phone || body.whatsapp;
    const email = body.email || null;
    const propertyIdInput = body.property_id || body.propertyId || null;
    const source = body.source || "Chat / Inquiry Properti";
    const notes = body.notes || body.message || null;

    if (!name) {
      return NextResponse.json({ error: "Nama calon pembeli wajib diisi." }, { status: 400 });
    }

    const cleanPhone = phone ? String(phone).replace(/[^0-9]/g, "") : null;

    // 1. Cari Data Properti & Pemilik (Agen Penanggung Jawab)
    let propertyTitle = "Properti Pilihan";
    let ownerAgentId = body.assigned_to || null;
    let validPropertyUuid: string | null = null;

    if (propertyIdInput) {
      const { data: propData } = await supabase
        .from("properties")
        .select("id, title, user_id")
        .or(`id.eq.${propertyIdInput},listing_code.eq.${propertyIdInput}`)
        .maybeSingle();

      if (propData) {
        propertyTitle = propData.title || propertyTitle;
        validPropertyUuid = propData.id;
        if (!ownerAgentId) {
          ownerAgentId = propData.user_id; // Pemilik listing otomatis jadi agen
        }
      }
    }

    // Fallback ke ID agen default jika agen belum terisi
    if (!ownerAgentId) {
      ownerAgentId = process.env.DEFAULT_AGENT_UUID || null;
    }

    // 2. Simpan / Cari Kontak Klien di 'crm_contacts'
    let contactId = null;

    if (cleanPhone) {
      const { data: existingContact } = await supabase
        .from("crm_contacts")
        .select("id")
        .eq("phone", cleanPhone)
        .maybeSingle();

      if (existingContact) {
        contactId = existingContact.id;
      }
    }

    if (!contactId) {
      const { data: newContact, error: contactErr } = await supabase
        .from("crm_contacts")
        .insert({
          contact_code: `CONT-${Date.now()}`,
          full_name: name,
          phone: cleanPhone,
          email: email,
        })
        .select("id")
        .single();

      if (contactErr) throw new Error("Gagal membuat kontak: " + contactErr.message);
      contactId = newContact.id;
    }

    // 3. Simpan Lead ke 'crm_leads'
    const { data: newLead, error: leadErr } = await supabase
      .from("crm_leads")
      .insert({
        contact_id: contactId,
        assigned_to: ownerAgentId,
        property_id: validPropertyUuid,
        source: source,
        status: "new",
        interest_type: propertyTitle,
        notes: notes,
      })
      .select("*, contact:crm_contacts(*)")
      .single();

    if (leadErr) throw new Error("Gagal membuat lead: " + leadErr.message);

    // 4. Simpan ke 'crm_interests' (Agar muncul di Tab Minat Detail CRM)
    if (validPropertyUuid) {
      const { error: interestErr } = await supabase
        .from("crm_interests")
        .insert({
          lead_id: newLead.id,
          property_id: validPropertyUuid,
          priority: 1,
          interest_level: "high",
          notes: `Inquiry / Chat dari viewer untuk properti: ${propertyTitle}`,
        });

      if (interestErr) {
        console.error("⚠️ Gagal simpan crm_interests:", interestErr.message);
      }
    }

    // 5. Kirim Notifikasi Lonceng Web
    if (ownerAgentId) {
      await sendSystemNotification({
        userId: ownerAgentId,
        title: "🔥 Calon Pembeli Baru (Lead)!",
        message: `${name} tertarik dengan listing "${propertyTitle}". Segera hubungi!`,
        type: "lead",
        link: `/crm/leads/${newLead.id}`,
      }).catch((err) => console.error("Gagal notif lonceng:", err));

      // 6. 🔥 LANGSUNG PANGGIL HELPER FONNTE SECARA DIRECT (TIDAK LAGI PAKAI FETCH DARI SERVER KE SERVER)
      try {
        const waResult = await sendWaToAgent({
          agentId: ownerAgentId,
          leadName: name,
          clientPhone: cleanPhone || "-",
          propertyInterest: propertyTitle,
        });

        if (waResult.success) {
          console.log("✅ WA Otomatis Fonnte BERHASIL Terkirim ke Agen!");
        } else {
          console.warn("⚠️ WA Fonnte tidak terkirim:", waResult.reason);
        }
      } catch (waErr) {
        console.error("⚠️ Error eksekusi WA Fonnte:", waErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Lead & Minat Properti berhasil tersimpan, WA terkirim otomatis!",
      data: newLead,
    });
  } catch (error: any) {
    console.error("API Leads Error:", error);
    return NextResponse.json(
      { error: error.message || "Gagal memproses lead" },
      { status: 500 }
    );
  }
}