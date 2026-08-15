// app/api/leads/route.ts
//
// Satu-satunya jalur tulis untuk inquiry properti. Dipakai tiga tempat: tombol
// WA di katalog properti, tombol WA di dasbor, dan form konsultasi di halaman
// detail properti.
//
// DUA JALUR IDENTITAS
// ===================
// 1. TAMU (belum login) — wajib mengisi form nama + nomor WhatsApp. Namanya
//    dan nomornya diambil dari body, karena tidak ada sumber lain.
// 2. CLIENT (role viewer, sudah terdaftar) — TIDAK mengisi form apa pun. Nama
//    dan nomor diambil server dari baris `users` miliknya, lalu tercatat di
//    log aktivitas CRM atas nama akun itu sendiri. Body tidak dipercaya untuk
//    identitas: kalau dipercaya, siapa pun yang login bisa mencatatkan
//    aktivitas atas nama orang lain.
//
// Staf internal (agen/admin/komisioner) yang menekan tombol WA sedang
// menghubungi rekan pemegang listing, bukan mengajukan diri sebagai calon
// pembeli — jadi tidak ada lead yang dibuat untuk mereka. Yang dikembalikan
// hanya nomor agen tujuan.
//
// Endpoint ini SENGAJA tetap bisa diakses tanpa login (jalur tamu) dan menulis
// dengan service role. Penjagaannya berupa validasi ketat + rate limit.
//
// Agen diberi tahu lewat lonceng web + push perangkat saja. Pesan WhatsApp
// otomatis sengaja TIDAK dipicu dari sini: jalur tamu terbuka untuk publik,
// sehingga setiap pengiriman berarti pesan Fonnte berbayar yang dapat dipicu
// siapa pun. WA tetap tersedia lewat aksi manual di halaman lead
// (/api/notifications/whatsapp) yang terjaga role.
import { NextResponse } from "next/server";
import { getAdminRecipientIds, notifyEvent } from "@/lib/notification-helper";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerClientInstance } from "@/lib/supabase/server";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { leadInsertSchema, validate } from "@/lib/validations";

// Maksimal 5 pengajuan per IP tiap 10 menit untuk tamu. Pemilik akun dibatasi
// per akun dengan jatah lebih longgar: satu client yang membandingkan sepuluh
// listing dalam satu sesi adalah perilaku wajar, sedangkan satu IP kantor bisa
// dipakai banyak orang sekaligus.
const GUEST_LEAD_LIMIT = 5;
const MEMBER_LEAD_LIMIT = 30;
const LEAD_WINDOW_MS = 10 * 60_000;

// Peran yang dianggap staf internal.  Ditulis dua ejaan karena basis data
// produksi memuat "super_admin" maupun "superadmin".
const INTERNAL_ROLES = new Set([
  "agent",
  "admin",
  "super_admin",
  "superadmin",
  "commissioner",
]);

/** Nomor Indonesia ke bentuk yang diterima wa.me: 62xxx, hanya digit. */
function toWaNumber(raw?: string | null): string | null {
  const digits = String(raw ?? "").replace(/[^0-9]/g, "");
  if (digits.length < 8) return null;
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("62")) return digits;
  // Nomor yang ditulis tanpa awalan apa pun ("81234567890").
  if (digits.startsWith("8")) return `62${digits}`;
  return digits;
}

export async function POST(req: Request) {
  try {
    const supabase = createAdminClient();
    const body = await req.json().catch(() => ({}));

    // ========================================================================
    // 1. Kenali sesi
    // ========================================================================
    //
    // Dibaca dari cookie, bukan dari body. Kegagalan di sini tidak boleh
    // menggagalkan permintaan: tamu memang tidak punya sesi, dan itu sah.
    let account:
      | {
          id: string;
          full_name: string | null;
          email: string | null;
          phone: string | null;
          role: string;
        }
      | null = null;

    try {
      const sessionClient = await createServerClientInstance();
      const {
        data: { user: sessionUser },
      } = await sessionClient.auth.getUser();

      if (sessionUser) {
        // Dibaca dengan service role supaya RLS di tabel users tidak membuat
        // profil sendiri jadi tak terbaca.
        const { data: profile } = await supabase
          .from("users")
          .select("id, full_name, email, phone, whatsapp, role")
          .eq("id", sessionUser.id)
          .maybeSingle();

        account = {
          id: sessionUser.id,
          full_name: profile?.full_name ?? null,
          email: profile?.email ?? sessionUser.email ?? null,
          // whatsapp didahulukan: itulah nomor yang benar-benar dipakai
          // berkomunikasi bila pengguna mengisi keduanya berbeda.
          phone: profile?.whatsapp || profile?.phone || null,
          role: String(profile?.role ?? "viewer").toLowerCase(),
        };
      }
    } catch (err) {
      console.error("Gagal membaca sesi pada /api/leads:", err);
    }

    // ========================================================================
    // 2. Rate limit
    // ========================================================================
    const clientIp = getClientIp(req);
    const limit = account
      ? rateLimit(`leads:user:${account.id}`, MEMBER_LEAD_LIMIT, LEAD_WINDOW_MS)
      : rateLimit(`leads:${clientIp}`, GUEST_LEAD_LIMIT, LEAD_WINDOW_MS);

    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Terlalu banyak pengajuan. Silakan coba lagi beberapa saat lagi." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
      );
    }

    // ========================================================================
    // 3. Tentukan identitas pengirim
    // ========================================================================
    //
    // Body dianggap "form terisi" hanya bila nama dan nomornya benar-benar
    // layak. Bila tidak, identitas diambil dari akun; bila akun juga tidak ada
    // atau datanya belum lengkap, pemanggil diminta menampilkan form.
    const rawBodyName =
      typeof body?.name === "string"
        ? body.name
        : typeof body?.full_name === "string"
          ? body.full_name
          : "";
    const rawBodyPhone =
      typeof body?.phone === "string"
        ? body.phone
        : typeof body?.whatsapp === "string"
          ? body.whatsapp
          : "";

    const formName = rawBodyName.trim();
    const formPhone = rawBodyPhone.replace(/[^0-9]/g, "");
    const hasFormIdentity = formName.length >= 2 && formPhone.length >= 8;

    const accountPhone = account?.phone ? account.phone.replace(/[^0-9]/g, "") : "";
    const accountName = account?.full_name?.trim() || "";
    const isInternal = account ? INTERNAL_ROLES.has(account.role) : false;

    // Staf internal: tidak ada lead, hanya nomor agen tujuan. Diperiksa sebelum
    // apa pun ditulis supaya tombol WA di katalog tidak mengisi CRM dengan
    // "prospek" yang sebenarnya rekan kerja sendiri.
    if (isInternal && !hasFormIdentity) {
      const agent = await resolveAgentContact(supabase, body?.property_id);
      return NextResponse.json({
        success: true,
        mode: "internal",
        message: "Kontak agen pemegang listing.",
        agent,
      });
    }

    if (!hasFormIdentity) {
      if (!account) {
        // Tamu — harus mengisi form dulu.
        return NextResponse.json(
          {
            error: "Lengkapi nama dan nomor WhatsApp Anda terlebih dahulu.",
            needsForm: true,
          },
          { status: 422 }
        );
      }

      if (accountName.length < 2 || accountPhone.length < 8) {
        // Client terdaftar tapi profilnya belum lengkap. Formnya tetap dibuka,
        // hanya saja sudah terisi sebagian.
        return NextResponse.json(
          {
            error: "Profil Anda belum memuat nama dan nomor WhatsApp yang lengkap.",
            needsForm: true,
            prefill: {
              name: accountName || "",
              phone: accountPhone || "",
            },
          },
          { status: 422 }
        );
      }
    }

    // Jalur akun dipakai bila form tidak terisi — di situlah nama dan nomor
    // diambil otomatis dari akun yang sedang login.
    const viaAccount = !hasFormIdentity && !!account;

    const identityName = viaAccount ? accountName : formName;
    const identityPhone = viaAccount ? accountPhone : formPhone;
    const identityEmail = viaAccount ? account!.email : body?.email;

    // ========================================================================
    // 4. Validasi
    // ========================================================================
    //
    // Identitas ditimpa lebih dulu supaya skema memvalidasi nilai yang benar-
    // benar dipakai, bukan nilai mentah dari body. `whatsapp` ikut ditimpa
    // karena skema memakainya sebagai alias `phone`.
    const parsed = validate(leadInsertSchema, {
      ...body,
      name: identityName,
      phone: identityPhone,
      whatsapp: identityPhone,
      email: identityEmail ?? "",
    });
    if (!parsed.ok) return parsed.response;

    const { name, source: sourceInput } = parsed.data;
    const propertyIdInput = parsed.data.property_id ?? null;
    const source = sourceInput || (viaAccount ? "Klik WA Client" : "Chat / Inquiry Properti");

    // Dinormalkan ke null: skema menghasilkan undefined untuk isian kosong,
    // dan kolom yang undefined akan dilewati saat insert alih-alih dikosongkan.
    const email = parsed.data.email ?? null;
    const notes = parsed.data.notes ?? null;

    // Sudah bersih dari karakter non-digit oleh skema.
    const cleanPhone = parsed.data.phone ?? null;

    // `status` dipaksa "new" di bawah — pengunjung tidak boleh menentukan
    // tahapan CRM atau menugaskan lead ke agen pilihannya sendiri.

    // ========================================================================
    // 5. Cari data properti & agen penanggung jawab
    // ========================================================================
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

    // ========================================================================
    // 6. Simpan / cari kontak klien di 'crm_contacts'
    // ========================================================================
    let contactId: string | null = null;

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
          source: viaAccount ? "Akun Client" : "Website",
        })
        .select("id")
        .single();

      if (contactErr) throw new Error("Gagal membuat kontak: " + contactErr.message);
      contactId = newContact.id;
    }

    // ========================================================================
    // 7. Pakai ulang lead yang masih terbuka, atau buat yang baru
    // ========================================================================
    //
    // Sebelumnya setiap pengiriman selalu membuat lead baru. Dengan tombol WA
    // yang kini mencatat otomatis, satu client yang menekan tombol tiga kali
    // akan memecah dirinya sendiri menjadi tiga prospek — dan agen melihat tiga
    // kartu untuk satu orang yang sama. Lead yang sudah "won"/"lost" tidak
    // dipakai ulang: minat baru setelah transaksi selesai memang prospek baru.
    let existingLead: { id: string; assigned_to: string | null } | null = null;

    if (contactId) {
      let leadQuery = supabase
        .from("crm_leads")
        .select("id, assigned_to")
        .eq("contact_id", contactId)
        .not("status", "in", "(won,lost)");

      leadQuery = validPropertyUuid
        ? leadQuery.eq("property_id", validPropertyUuid)
        : leadQuery.is("property_id", null);

      const { data: openLeads } = await leadQuery
        .order("created_at", { ascending: false })
        .limit(1);

      existingLead = openLeads?.[0] ?? null;
    }

    let leadId: string;
    let leadRow: any;
    const isNewLead = !existingLead;

    if (existingLead) {
      leadId = existingLead.id;
      // Agen yang sudah memegang lead tetap dipertahankan; menugaskan ulang
      // diam-diam akan memindahkan prospek dari meja orang lain.
      if (existingLead.assigned_to) ownerAgentId = existingLead.assigned_to;

      // Dinaikkan supaya lead ini kembali ke urutan teratas antrean agen.
      const { data: touched } = await supabase
        .from("crm_leads")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", leadId)
        .select("*, contact:crm_contacts(*)")
        .maybeSingle();

      leadRow = touched ?? { id: leadId };
    } else {
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

      leadId = newLead.id;
      leadRow = newLead;

      // Simpan ke 'crm_interests' agar muncul di tab Minat detail CRM. Hanya
      // untuk lead baru — lead yang dipakai ulang sudah punya barisnya.
      if (validPropertyUuid) {
        const { error: interestErr } = await supabase.from("crm_interests").insert({
          lead_id: leadId,
          property_id: validPropertyUuid,
          priority: 1,
          interest_level: "high",
          notes: `Inquiry / Chat dari viewer untuk properti: ${propertyTitle}`,
        });

        if (interestErr) {
          console.error("⚠️ Gagal simpan crm_interests:", interestErr.message);
        }
      }
    }

    // ========================================================================
    // 8. Catat jejak aktivitas
    // ========================================================================
    //
    // Dibaca tab Aktivitas di detail lead, AgentActivityMonitor, halaman
    // Admin → Logs, dan kartu "Aktivitas Terkini" di dasbor.
    //
    // Pemilihan `user_id` menentukan atas nama siapa baris ini muncul:
    // - Jalur akun  → id client yang menekan tombol. Laporan aktivitas jadi
    //   menampilkan nama dan nomor client itu sendiri, bukan agennya.
    // - Jalur form  → id agen penanggung jawab, karena pengirimnya tamu yang
    //   tidak punya baris di tabel users (kolomnya berelasi ke sana).
    // - Tanpa agen  → NULL (M-18). Lihat catatan di bawah.
    const contactLabel = cleanPhone ? `${name} (${cleanPhone})` : name;

    // M-18 — LEAD TANPA AGEN TIDAK LAGI TERSIMPAN DIAM-DIAM
    //
    // Sebelumnya cabang terakhir bernilai `null` dan tidak ada baris aktivitas
    // yang ditulis sama sekali. Digabung dengan penjaga notifikasi di §9 dan
    // penjaga `IF target_agent IS NOT NULL` di trigger
    // handle_new_lead_notification(), sebuah prospek yang propertinya tidak
    // menghasilkan agen mana pun masuk ke basis data tanpa satu pun jejak yang
    // bisa dilihat manusia. DEFAULT_AGENT_UUID tidak menyelamatkannya: nilainya
    // kosong di lingkungan ini.
    //
    // `user_id` NULL disengaja dan sah: kolomnya nullable (baseline §1), dan
    // memang tidak ada pelaku untuk dicatat — mengarang satu (mis. memakai id
    // admin pertama) akan membuat riwayat berbohong tentang siapa yang bertindak.
    // Seluruh pembaca kolom ini sudah tahan-NULL: Admin → Logs memakai
    // `log.users?.full_name || ... || "Sistem Administrator"`, AgentActivityMonitor
    // memakai `act.users || {}` → "Pengguna", dasbor tidak membacanya, dan tab
    // Aktivitas di detail lead tidak menampilkan pelakunya sama sekali.
    //
    // `activity_type` sengaja dibedakan dari label bertugas supaya keadaan ini
    // dapat disaring dan terbaca di halaman log, bukan menyamar sebagai lead
    // yang sudah tertangani. Kolomnya varchar(50) dan bertipe string bebas —
    // tidak ada CHECK maupun enum — dan setiap pembacanya sudah punya nilai
    // cadangan untuk label yang tidak dikenalinya.
    //
    // Anotasi tipenya ditulis eksplisit karena klien ini tidak bertipe skema
    // (createAdminClient memanggil createClient tanpa generic `Database`).
    // Tanpa anotasi, supabase-js menyimpulkan bentuk baris insert dari cabang
    // ternary yang pertama — `user_id: string` — lalu menolak cabang NULL.
    // Menulisnya di sini menyatakan bentuk yang benar sekali saja; `as any`
    // akan mematikan pemeriksaan untuk ketiga cabang sekaligus.
    const activityRow: {
      lead_id: string;
      user_id: string | null;
      activity_type: string;
      notes: string;
    } = viaAccount
      ? {
          lead_id: leadId,
          user_id: account!.id,
          // Kolomnya varchar(50) — jaga panjang label tetap pendek.
          activity_type: "Klik WhatsApp (Client)",
          notes: `Client ${contactLabel} menekan tombol WhatsApp untuk properti "${propertyTitle}"`,
        }
      : ownerAgentId
        ? {
            lead_id: leadId,
            user_id: ownerAgentId,
            activity_type: isNewLead ? "Lead Masuk (Website)" : "Inquiry Ulang (Website)",
            notes: `Prospek ${contactLabel} berminat pada properti "${propertyTitle}"`,
          }
        : {
            lead_id: leadId,
            user_id: null,
            activity_type: isNewLead ? "Lead Tanpa Agen" : "Inquiry Ulang Tanpa Agen",
            notes:
              `Prospek ${contactLabel} berminat pada properti "${propertyTitle}", ` +
              "tetapi tidak ada agen penanggung jawab. Perlu ditugaskan.",
          };

    const { error: actErr } = await supabase.from("crm_activities").insert(activityRow);
    if (actErr) {
      console.error("⚠️ Gagal simpan crm_activities:", actErr.message);
    }

    // ========================================================================
    // 9. Notifikasi
    // ========================================================================
    //
    // Kegagalan notifikasi tidak boleh menggagalkan penyimpanan lead: bagi
    // pengunjung, datanya sudah tercatat dan itulah yang penting.
    if (ownerAgentId) {
      await notifyEvent({
        event: "lead.created",
        userIds: [ownerAgentId],
        title: viaAccount ? "💬 Client Menghubungi via WhatsApp" : "🔥 Calon Pembeli Baru (Lead)!",
        message: viaAccount
          ? `${name} (${cleanPhone}) membuka WhatsApp untuk listing "${propertyTitle}".`
          : `${name} tertarik dengan listing "${propertyTitle}". Segera hubungi!`,
        link: `/crm/leads/${leadId}`,
      }).catch((err) => console.error("Gagal kirim notifikasi lead:", err));
    } else {
      // M-18 — TIDAK ADA AGEN, JADI ADMIN YANG DIBERI TAHU
      //
      // Cabang ini menyala TEPAT ketika cabang di atas tidak: ownerAgentId
      // NULL. Pada keadaan itu trigger basis data juga diam (penjaganya
      // `IF target_agent IS NOT NULL`), jadi tidak ada satu pun notifikasi yang
      // dikirim dua kali oleh tambahan ini — M-17 tidak diperburuk.
      //
      // Penerimanya seluruh admin: merekalah yang bisa menugaskan lead, dan
      // daftar agen tidak dipakai karena mengirim ke semua agen mengubah ini
      // menjadi rebutan alih-alih penugasan.
      //
      // getAdminRecipientIds mengembalikan [] bila kuerinya gagal, dan
      // notifyEvent memperlakukan penerima kosong sebagai sukses tanpa kirim.
      // Keduanya benar untuk alur ini — lead tetap tersimpan — tetapi berarti
      // "tidak ada admin" lewat tanpa suara, jadi dicatat ke log server.
      const adminIds = await getAdminRecipientIds(supabase);

      if (adminIds.length === 0) {
        console.error(
          `⚠️ Lead ${leadId} tersimpan tanpa agen dan tanpa admin penerima notifikasi.`
        );
      } else {
        await notifyEvent({
          event: "lead.unassigned",
          userIds: adminIds,
          title: "📥 Lead Baru Tanpa Agen",
          message: `${name} tertarik pada "${propertyTitle}" tetapi belum ada agen penanggung jawab. Segera tugaskan.`,
          link: `/crm/leads/${leadId}`,
        }).catch((err) =>
          console.error("Gagal kirim notifikasi lead tanpa agen:", err)
        );
      }
    }

    // ========================================================================
    // 10. Kembalikan kontak agen tujuan
    // ========================================================================
    //
    // Nomor tujuan ditentukan server, bukan peramban. Sebelumnya halaman
    // katalog membuka `wa.me/?text=...` tanpa penerima sama sekali (pemilih
    // kontak, bukan agen) dan dasbor memakai nomor cadangan yang ditulis keras
    // di kode. Dengan nomor datang dari sini, ketiga halaman memakai sumber
    // yang sama dan tidak perlu menarik direktori staf ke peramban.
    const agent = await resolveAgentContact(supabase, null, ownerAgentId);

    return NextResponse.json({
      success: true,
      mode: viaAccount ? "account" : "form",
      isNewLead,
      // "Agen telah diberi tahu" hanya benar bila ada agen yang diberi tahu.
      // Tanpa agen, yang menerima notifikasi adalah admin — dan itu urusan
      // internal, bukan kabar yang perlu disampaikan ke pengunjung. Jadi
      // kalimatnya diganti menjadi janji yang tetap benar, tanpa membocorkan
      // bahwa listing itu sedang tidak dipegang siapa pun.
      message: viaAccount
        ? "Aktivitas Anda tercatat. Membuka WhatsApp agen..."
        : ownerAgentId
          ? "Lead & minat properti berhasil tersimpan. Agen telah diberi tahu."
          : "Lead & minat properti berhasil tersimpan. Tim kami akan segera menghubungi Anda.",
      data: leadRow,
      agent,
      // Dipantulkan kembali supaya pemanggil bisa menyusun pesan WhatsApp
      // dengan nama pengirim tanpa harus tahu dari mana identitasnya berasal.
      // Isinya data milik pemanggil sendiri, bukan milik orang lain.
      inquirer: { name, phone: cleanPhone },
    });
  } catch (error: any) {
    console.error("API Leads Error:", error);
    return NextResponse.json(
      { error: error.message || "Gagal memproses lead" },
      { status: 500 }
    );
  }
}

/**
 * Nama dan nomor WhatsApp agen tujuan.
 *
 * Dipanggil dua cara: dengan `agentId` yang sudah diketahui (jalur normal),
 * atau dengan referensi properti mentah (jalur staf internal, yang berhenti
 * sebelum properti sempat dibaca).
 */
async function resolveAgentContact(
  supabase: ReturnType<typeof createAdminClient>,
  propertyRefInput?: unknown,
  agentId?: string | null
): Promise<{ name: string; whatsapp: string | null }> {
  let resolvedId = agentId ?? null;

  if (!resolvedId && propertyRefInput) {
    const propertyRef = String(propertyRefInput).trim();
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(propertyRef);
    const isListingCode = /^[A-Za-z0-9_-]{1,64}$/.test(propertyRef);

    if (isUuid || isListingCode) {
      const query = supabase.from("properties").select("*");
      const { data: propData } = await (isUuid
        ? query.eq("id", propertyRef)
        : query.eq("listing_code", propertyRef)
      ).maybeSingle();

      if (propData) {
        resolvedId =
          propData.assigned_to || propData.created_by || propData.user_id || null;
      }
    }
  }

  if (!resolvedId) resolvedId = process.env.DEFAULT_AGENT_UUID || null;
  if (!resolvedId) return { name: "Agen Inland", whatsapp: null };

  const { data: agentRow } = await supabase
    .from("users")
    .select("full_name, phone, whatsapp")
    .eq("id", resolvedId)
    .maybeSingle();

  if (!agentRow) return { name: "Agen Inland", whatsapp: null };

  return {
    name: agentRow.full_name || "Agen Inland",
    whatsapp: toWaNumber(agentRow.whatsapp || agentRow.phone),
  };
}
