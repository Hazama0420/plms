// app/api/leads/[id]/follow-up/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { notifyEvent } from "@/lib/notification-helper";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  // Otorisasi lewat requireRole(), bukan pemeriksaan buatan sendiri.
  //
  // Versi sebelumnya mencocokkan role mentah dengan daftar
  // ["super_admin", "admin", "agent"] — tanpa ejaan 'superadmin'. Kolom
  // users.role di produksi memuat kedua ejaan, sehingga Super Admin berejaan
  // lama justru ditolak 403 di endpointnya sendiri. requireRole() memakai
  // normalizeRole() lebih dulu, jadi kedua ejaan diperlakukan sama, dan akun
  // berstatus pending/suspended ikut tersaring.
  const auth = await requireRole(["super_admin", "admin", "agent"]);
  if (!auth.ok) return auth.response;

  const { supabase, userId } = auth.ctx;

  try {
    const { id: leadId } = await context.params;
    const body = await req.json();
    const { followup_date, notes, assigned_to } = body;

    if (!followup_date) {
      return NextResponse.json(
        { error: "Tanggal follow-up wajib diisi" },
        { status: 400 }
      );
    }

    // Tanpa penanggung jawab eksplisit, agenda menjadi milik pembuatnya.
    // Sebelumnya disimpan sebagai null, sehingga agendanya tidak muncul di
    // daftar siapa pun dan tidak ada yang bisa dinotifikasi.
    const assignee: string = assigned_to || userId;

    const { data, error } = await supabase
      .from("crm_followups")
      .insert({
        lead_id: leadId,
        assigned_to: assignee,
        followup_date: followup_date,
        notes: notes || null,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating follow-up:", error);
      return NextResponse.json(
        { error: error.message || "Gagal membuat follow-up" },
        { status: 500 }
      );
    }

    // Beri tahu penanggung jawab agenda.
    //
    // Sengaja dilewati bila agenda dibuat untuk diri sendiri: penggunanya baru
    // saja mengisi formulirnya, jadi notifikasi itu hanya mengulang perbuatan
    // sendiri. Notifikasi tetap dikirim untuk penugasan ke orang lain, yang
    // memang tidak tahu apa-apa sampai diberi tahu.
    if (assignee !== userId) {
      const jadwal = new Date(followup_date).toLocaleString("id-ID", {
        dateStyle: "full",
        timeStyle: "short",
      });

      await notifyEvent({
        event: "followup.created",
        userIds: [assignee],
        title: "Agenda follow-up baru untuk Anda",
        message: `Follow-up dijadwalkan pada ${jadwal}.`,
        link: `/crm/leads/${leadId}`,
        senderId: userId,
      }).catch((err) => console.error("Gagal kirim notifikasi follow-up:", err));
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error("Error in follow-up API:", detail);
    return NextResponse.json({ error: detail }, { status: 500 });
  }
}
