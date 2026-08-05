// app/api/properties/[id]/status/route.ts
//
// Perubahan status publikasi listing (draft → review → published → sold/…).
//
// Sama seperti route assign: notifikasinya ditujukan ke akun lain (agen
// penanggung jawab dan pembuat listing), jadi penulisannya harus memakai
// service role di sisi server.
//
// Karena service role melewati RLS, kepemilikan diperiksa manual di sini —
// agen hanya boleh mengubah listing yang dia pegang atau dia buat.

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyEvent } from "@/lib/notification-helper";
import { NO_AGENT_MESSAGE, resolvePublishStatus } from "@/lib/property-publish";
import { propertyStatusSchema, validate } from "@/lib/validations";

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  review: "Menunggu Review",
  published: "Tayang",
  sold: "Terjual",
  rented: "Tersewa",
  archived: "Diarsipkan",
};

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRole(["agent", "marketing", "admin", "super_admin"]);
    if (!auth.ok) return auth.response;

    const { id: propertyId } = await context.params;
    const parsed = validate(propertyStatusSchema, await request.json());
    if (!parsed.ok) return parsed.response;

    const { status } = parsed.data;
    const supabase = createAdminClient();

    // Ambil baris apa adanya: repo ini memakai `user_id` (diisi saat listing
    // dibuat) dan `created_by` di tempat berbeda, jadi memilih kolom satu per
    // satu berisiko menyebut kolom yang tidak ada dan menggagalkan query.
    const { data: existing, error: fetchError } = await supabase
      .from("properties")
      .select("*")
      .eq("id", propertyId)
      .maybeSingle();

    if (fetchError || !existing) {
      return NextResponse.json(
        { success: false, error: "Properti tidak ditemukan." },
        { status: 404 }
      );
    }

    const ownerId = existing.created_by ?? existing.user_id ?? null;
    const isAdmin = ["admin", "super_admin"].includes(auth.ctx.role);
    const isOwner =
      existing.assigned_to === auth.ctx.userId || ownerId === auth.ctx.userId;

    if (!isAdmin && !isOwner) {
      return NextResponse.json(
        { success: false, error: "Anda hanya dapat mengubah status listing yang Anda pegang." },
        { status: 403 }
      );
    }

    // Listing tanpa agen penanggung jawab tidak boleh terbit — permintaannya
    // diturunkan menjadi draf, bukan ditolak, lalu penurunannya dikabarkan lewat
    // respons supaya UI bisa menjelaskan kenapa pilihannya berubah.
    const resolved = resolvePublishStatus(status, existing.assigned_to);

    const { data: property, error } = await supabase
      .from("properties")
      .update({ status: resolved.status, updated_at: new Date().toISOString() })
      .eq("id", propertyId)
      .select()
      .single();

    if (error) {
      console.error("Gagal mengubah status properti:", error.message);
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    // Penerima: agen pemegang + pembuat listing. Duplikat dan nilai kosong
    // dibersihkan di dalam notifyEvent, dan pengirim tidak dikecualikan secara
    // khusus — agen yang mengubah statusnya sendiri tetap mendapat catatan di
    // lonceng sebagai jejak riwayat.
    //
    // Yang dikabarkan adalah status yang BENAR-BENAR tersimpan, bukan yang
    // diminta: notifikasi tidak boleh mengatakan "kini tayang" untuk listing
    // yang barusan diturunkan ke draf.
    await notifyEvent({
      event: "property.status",
      userIds: [existing.assigned_to, ownerId],
      title: "Status listing diperbarui",
      message: `"${property.title}" kini berstatus ${STATUS_LABELS[resolved.status] ?? resolved.status}.`,
      link: `/properties/${propertyId}`,
      senderId: auth.ctx.userId,
    }).catch((err) => console.error("Gagal kirim notifikasi status:", err));

    return NextResponse.json({
      success: true,
      data: property,
      downgraded: resolved.downgraded,
      ...(resolved.downgraded ? { message: NO_AGENT_MESSAGE } : {}),
    });
  } catch (error: any) {
    console.error("API status properti error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Gagal mengubah status" },
      { status: 500 }
    );
  }
}
