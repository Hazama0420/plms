// app/api/leads/route.ts
//
// Endpoint ini SENGAJA publik: dipakai form inquiry pengunjung yang belum login,
// dan menulis dengan service role. Penjagaannya berupa validasi ketat + rate
// limit per IP.
//
// Agen diberi tahu lewat lonceng web + push perangkat saja. Pesan WhatsApp
// otomatis sengaja TIDAK dipicu dari sini: endpoint ini terbuka untuk publik,
// sehingga setiap pengiriman berarti pesan Fonnte berbayar yang dapat dipicu
// siapa pun. WA tetap tersedia lewat aksi manual di halaman lead
// (/api/notifications/whatsapp) yang terjaga role.
import { NextResponse } from "next/server";
import { notifyEvent } from "@/lib/notification-helper";
import { createAdminClient } from "@/lib/supabase/admin";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { leadInsertSchema, validate } from "@/lib/validations";

// Maksimal 5 pengajuan lead per IP tiap 10 menit.
const LEAD_LIMIT = 5;
const LEAD_WINDOW_MS = 10 * 60_000;

export async function POST(req: Request) {
  try {
    const clientIp = getClientIp(req);
    const limit = rateLimit(`leads:${clientIp}`, LEAD_LIMIT, LEAD_WINDOW_MS);

    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Terlalu banyak pengajuan. Silakan coba lagi beberapa saat lagi." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
      );
    }

    const supabase = createAdminClient();
    const body = await req.json();

    // Validasi terpusat: batas panjang, format email, dan pembersihan nomor
    // telepon kini ditangani skema (lib/validations.ts), termasuk penyeragaman
    // alias field dari berbagai form pemanggil.
    const parsed = validate(leadInsertSchema, body);
    if (!parsed.ok) return parsed.response;

    const { name, source: sourceInput } = parsed.data;
    const propertyIdInput = parsed.data.property_id ?? null;
    const source = sourceInput || "Chat / Inquiry Properti";

    // Dinormalkan ke null: skema menghasilkan undefined untuk isian kosong,
    // dan kolom yang undefined akan dilewati saat insert alih-alih dikosongkan.
    const email = parsed.data.email ?? null;
    const notes = parsed.data.notes ?? null;

    // Sudah bersih dari karakter non-digit oleh skema.
    const cleanPhone = parsed.data.phone ?? null;

    // `status` dipaksa "new" di bawah — pengunjung tidak boleh menentukan
    // tahapan CRM atau menugaskan lead ke agen pilihannya sendiri.

    // 1. Cari Data Properti & Pemilik (Agen Penanggung Jawab)
    //
    // `assigned_to` dari body sengaja diabaikan: kalau dipakai, pengunjung
    // anonim bisa menimpakan lead ke agen mana pun. Penanggung jawab hanya
    // boleh berasal dari pemilik listing atau agen default.
    let propertyTitle = "Properti Pilihan";
    let ownerAgentId: string | null = null;
    let validPropertyUuid: string | null = null;
    // Harga listing dipakai sebagai perkiraan anggaran calon pembeli, meniru
    // perilaku form inquiry sebelumnya.
    let budgetValue: number | null = null;

    if (propertyIdInput) {
      const propertyRef = String(propertyIdInput).trim();

      // Nilai ini masuk ke filter PostgREST, jadi bentuknya harus dipastikan
      // dulu — string bebas bisa menyelundupkan operator filter lain.
      const isUuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(propertyRef);
      const isListingCode = /^[A-Za-z0-9_-]{1,64}$/.test(propertyRef);

      if (isUuid || isListingCode) {
        // select("*") disengaja: repo ini memakai `user_id` (diisi saat listing
        // dibuat) dan `created_by` di tempat berbeda, jadi menyebut kolom satu
        // per satu berisiko menunjuk kolom yang tidak ada — dan query yang gagal
        // membuat seluruh lead jatuh ke agen default tanpa jejak.
        const query = supabase.from("properties").select("*, price:property_price(*)");
        const { data: propData } = await (isUuid
          ? query.eq("id", propertyRef)
          : query.eq("listing_code", propertyRef)
        ).maybeSingle();

        if (propData) {
          propertyTitle = propData.title || propertyTitle;
          validPropertyUuid = propData.id;
          // Agen pemegang didahulukan atas pembuat listing: dialah yang sedang
          // bertanggung jawab atas properti ini setelah penugasan ulang.
          ownerAgentId =
            propData.assigned_to || propData.created_by || propData.user_id || null;

          // PostgREST mengembalikan relasi satu-ke-satu sebagai objek, tetapi
          // sebagai larik bila kardinalitasnya tidak dapat disimpulkannya.
          const priceRow = Array.isArray(propData.price) ? propData.price[0] : propData.price;
          budgetValue = priceRow?.selling_price || priceRow?.rental_price || null;
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
          // Kontak dari inquiry web selalu dihubungi lewat nomor yang sama;
          // mengisi kedua kolom membuat tombol WA di CRM langsung berfungsi.
          whatsapp: cleanPhone,
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
        budget: budgetValue,
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

    // 5. Catat jejak aktivitas.
    //
    // Dibaca tab Aktivitas di detail lead, AgentActivityMonitor, halaman
    // Admin → Logs, dan kartu "Aktivitas Terkini" di dasbor. Tanpa baris ini,
    // lead dari website tidak meninggalkan jejak sama sekali di keempatnya.
    //
    // Dilewati bila belum ada agen penanggung jawab: `user_id` menunjuk ke tabel
    // users, sedangkan pengirim inquiry adalah tamu yang tidak punya akun.
    if (ownerAgentId) {
      const { error: actErr } = await supabase.from("crm_activities").insert({
        lead_id: newLead.id,
        user_id: ownerAgentId,
        activity_type: "Lead Masuk (Website)",
        notes: `Prospek baru "${name}" berminat pada properti "${propertyTitle}"`,
      });

      if (actErr) {
        console.error("⚠️ Gagal simpan crm_activities:", actErr.message);
      }
    }

    // 6. Kirim Notifikasi Lonceng Web + Push ke agen penanggung jawab.
    //
    // Kegagalan notifikasi tidak boleh menggagalkan penyimpanan lead: bagi
    // pengunjung, datanya sudah tercatat dan itulah yang penting.
    if (ownerAgentId) {
      await notifyEvent({
        event: "lead.created",
        userIds: [ownerAgentId],
        title: "🔥 Calon Pembeli Baru (Lead)!",
        message: `${name} tertarik dengan listing "${propertyTitle}". Segera hubungi!`,
        link: `/crm/leads/${newLead.id}`,
      }).catch((err) => console.error("Gagal kirim notifikasi lead:", err));
    }

    return NextResponse.json({
      success: true,
      message: "Lead & minat properti berhasil tersimpan. Agen telah diberi tahu.",
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