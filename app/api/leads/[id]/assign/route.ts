// app/api/leads/[id]/assign/route.ts
//
// Penugasan agen penanggung jawab untuk sebuah lead CRM.
//
//
// MENGAPA RUTE INI ADA (M-17)
//
// Sampai sebelumnya, notifikasi penugasan lead ditulis oleh trigger basis data
// `on_lead_created_notify`. Trigger itu dipensiunkan karena barisnya tidak
// setara dengan yang ditulis aplikasi: ia mengabaikan sakelar
// `preferences.lead_alerts` dan tidak pernah mengirim push OneSignal — tidak ada
// jalur dari SQL ke OneSignal sama sekali. Sejak M-17, aplikasi menjadi
// satu-satunya produsen notifikasi lead.
//
// services/crm.service.ts tidak bisa mengambil alih pekerjaan itu sendiri:
// berkas itu mengimpor klien peramban, sedangkan notifyEvent() memanggil
// createAdminClient() yang menuntut SUPABASE_SERVICE_ROLE_KEY — server-only.
// Menulis baris `notifications` atas nama akun lain juga ditolak RLS dari
// peramban, sebagaimana dinyatakan di app/api/properties/[id]/assign/route.ts.
// Karena itu penulisan kolom dan notifikasinya dijalankan bersama di sini.
//
//
// POLANYA MENGIKUTI RUTE FOLLOW-UP, BUKAN RUTE PROPERTI
//
// app/api/leads/[id]/follow-up/route.ts menyelesaikan persoalan yang sama:
// tulis dengan KLIEN SESI supaya RLS tetap berlaku, lalu naikkan hak hanya
// untuk notifikasinya. Rute properti memakai service role untuk update-nya
// karena di sana hanya Super Admin yang boleh menugaskan; di CRM seorang agen
// boleh menugaskan lead miliknya sendiri, dan policy crm_leads_update-lah yang
// menentukan batasnya. Melewati RLS di sini berarti membuang penjaga itu.

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { notifyEvent } from "@/lib/notification-helper";
import { leadAssignSchema, validate } from "@/lib/validations";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  // Ejaan role dinormalkan oleh requireRole(); kolom users.role memuat dua
  // ejaan Super Admin dan daftar mentah akan menolak salah satunya.
  const auth = await requireRole(["super_admin", "admin", "agent"]);
  if (!auth.ok) return auth.response;

  const { supabase, userId } = auth.ctx;

  try {
    const { id: leadId } = await context.params;
    const parsed = validate(leadAssignSchema, await req.json());
    if (!parsed.ok) return parsed.response;

    const { assigned_to, kind } = parsed.data;

    // Keadaan sekarang dibaca lebih dulu karena kolom `assigned_to` hanya boleh
    // ditulis bila nilainya memang berubah.
    //
    // Alasannya bukan efisiensi. PostgreSQL menyalakan
    // `AFTER UPDATE OF assigned_to` bila kolom itu DISEBUT di klausa SET, bukan
    // bila nilainya berubah. Selama trigger `on_lead_created_notify` masih
    // terpasang (yaitu sampai migrasi 017 dijalankan), menulis ulang nilai yang
    // sama akan menyalakannya sekali lagi — createLead menjadi tiga baris, bukan
    // dua. Pemanggilan dari createLead memang selalu berupa nilai yang sama:
    // INSERT-nya sudah mengisi kolom itu.
    const { data: current, error: readError } = await supabase
      .from("crm_leads")
      .select("id, assigned_to, contact:crm_contacts(full_name)")
      .eq("id", leadId)
      .maybeSingle();

    if (readError) {
      console.error("[lead.assign] Gagal membaca lead:", readError.message);
      return NextResponse.json(
        { success: false, error: readError.message },
        { status: 400 }
      );
    }

    // maybeSingle() mengembalikan null tanpa galat bila tidak ada baris yang
    // cocok — lead-nya tidak ada, atau RLS menyembunyikannya dari pemanggil.
    // Keduanya bukan kegagalan server, dan tidak boleh lolos sebagai sukses
    // yang diam-diam tidak menulis apa pun.
    if (!current) {
      return NextResponse.json(
        { success: false, error: "Lead tidak ditemukan atau bukan milik Anda." },
        { status: 404 }
      );
    }

    const berubah = (current.assigned_to as string | null) !== assigned_to;

    // Klien sesi, bukan service role: policy crm_leads_update yang memutuskan
    // apakah pemanggil memang boleh menyentuh lead ini.
    //
    // UPDATE tetap dijalankan walau nilainya tidak berubah — dengan `updated_at`
    // saja. Itu bukan penulisan sia-sia: ia satu-satunya yang membuktikan
    // pemanggil benar-benar berhak MENULIS lead ini, bukan cuma membacanya.
    // Tanpa itu, seorang agen yang hanya bisa melihat lead di kolam klaim dapat
    // memicu notifikasi kepada penanggung jawabnya. Dan karena `assigned_to`
    // tidak disebut, triggernya tidak menyala.
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (berubah) patch.assigned_to = assigned_to;

    const { data: lead, error } = await supabase
      .from("crm_leads")
      .update(patch)
      .eq("id", leadId)
      .select("id, assigned_to")
      .maybeSingle();

    if (error) {
      console.error("[lead.assign] Gagal menugaskan agen:", error.message);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    if (!lead) {
      return NextResponse.json(
        {
          success: false,
          error: "Anda tidak berhak mengubah penugasan lead ini.",
        },
        { status: 403 }
      );
    }

    // Penerima dibaca dari BARIS HASIL UPDATE, tidak pernah dari body mentah.
    // Dengan begitu satu-satunya orang yang bisa dinotifikasi adalah orang yang
    // benar-benar tercatat di basis data setelah RLS ikut menimbang.
    const recipient = lead.assigned_to as string | null;

    // Dua keadaan yang sengaja tidak menghasilkan notifikasi:
    //
    //   1. Penugasan dilepas (assigned_to null) — tidak ada penerima yang jelas,
    //      sama seperti app/api/properties/[id]/assign/route.ts.
    //   2. Penerimanya pelakunya sendiri. Pada halaman Buat/Edit Lead, pengguna
    //      non-admin selalu menugaskan lead kepada dirinya sendiri; notifikasi
    //      itu hanya mengulang perbuatan yang baru saja ia lakukan. Alasan dan
    //      pola yang sama tertulis di follow-up/route.ts.
    const notified = Boolean(recipient) && recipient !== userId;

    if (notified) {
      const contact = current.contact as { full_name?: string | null } | null;
      const namaKontak = contact?.full_name?.trim() || "Tanpa Nama";

      // kind hanya memilih kata dan ikon. Keduanya tunduk pada sakelar
      // `lead_alerts` yang sama, jadi tidak ada sakelar baru di Pengaturan.
      const isCreated = kind === "created";

      await notifyEvent({
        event: isCreated ? "lead.created" : "lead.assigned",
        userIds: [recipient as string],
        title: isCreated
          ? "Prospek baru untuk Anda"
          : "Lead dialihkan kepada Anda",
        message: isCreated
          ? `${namaKontak} kini menjadi tanggung jawab Anda.`
          : `Anda kini menjadi penanggung jawab lead ${namaKontak}.`,
        link: `/crm/leads/${leadId}`,
        senderId: userId,
      }).catch((err) =>
        // Kegagalan notifikasi tidak boleh menggagalkan penugasannya: kolomnya
        // sudah tersimpan, dan membalas 500 di sini akan membuat pemanggil
        // mengira penugasannya batal.
        console.error("[lead.assign] Gagal kirim notifikasi:", err)
      );
    }

    return NextResponse.json({
      success: true,
      data: { id: lead.id, assigned_to: recipient },
      changed: berubah,
      notified,
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error("[lead.assign]", detail);
    return NextResponse.json({ success: false, error: detail }, { status: 500 });
  }
}
