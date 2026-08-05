// app/api/properties/[id]/assign/route.ts
//
// Penugasan agen penanggung jawab untuk sebuah listing.
//
// Dipisahkan dari PUT /api/properties/[id] karena aksinya memberi tahu ORANG
// LAIN. Baris notifikasi untuk akun lain hanya bisa ditulis dengan service role
// — dari peramban, RLS menolaknya tanpa penjelasan. Karena itu update dan
// notifikasinya dijalankan bersama di sisi server.

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyEvent } from "@/lib/notification-helper";
import { propertyAssignSchema, validate } from "@/lib/validations";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Sepadan dengan penjagaan di UI (handleAssignAgent pada halaman detail
    // properti): hanya Super Admin yang boleh memindahkan penanggung jawab.
    const auth = await requireRole(["super_admin"]);
    if (!auth.ok) return auth.response;

    const { id: propertyId } = await context.params;
    const parsed = validate(propertyAssignSchema, await request.json());
    if (!parsed.ok) return parsed.response;

    const { assigned_to } = parsed.data;
    const supabase = createAdminClient();

    // Melepas agen dari listing yang sedang terbit akan meninggalkannya publik
    // tanpa penanggung jawab — persis keadaan yang dilarang. Karena itu listingnya
    // sekaligus dikembalikan ke draf.
    const patch: Record<string, any> = {
      assigned_to,
      updated_at: new Date().toISOString(),
    };

    let draftedByUnassign = false;
    if (!assigned_to) {
      const { data: existing } = await supabase
        .from("properties")
        .select("status")
        .eq("id", propertyId)
        .single();

      if (existing?.status === "published") {
        patch.status = "draft";
        draftedByUnassign = true;
      }
    }

    const { data: property, error } = await supabase
      .from("properties")
      .update(patch)
      .eq("id", propertyId)
      .select()
      .single();

    if (error) {
      console.error("Gagal menugaskan agen:", error.message);
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    // Melepas penugasan (assigned_to = null) tidak mengirim notifikasi:
    // tidak ada penerima yang jelas, dan mengabari pemilik lama bahwa listingnya
    // dicabut bukan bagian dari cakupan yang disepakati.
    if (assigned_to) {
      await notifyEvent({
        event: "property.assigned",
        userIds: [assigned_to],
        title: "Listing baru ditugaskan kepada Anda",
        message: `Anda kini menjadi penanggung jawab "${property.title}".`,
        link: `/properties/${propertyId}`,
        senderId: auth.ctx.userId,
      }).catch((err) => console.error("Gagal kirim notifikasi penugasan:", err));
    }

    return NextResponse.json({
      success: true,
      data: property,
      drafted: draftedByUnassign,
      ...(draftedByUnassign
        ? { message: "Penugasan dilepas dan listing dikembalikan ke draf karena tidak ada penanggung jawab." }
        : {}),
    });
  } catch (error: any) {
    console.error("API assign properti error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Gagal menugaskan agen" },
      { status: 500 }
    );
  }
}
