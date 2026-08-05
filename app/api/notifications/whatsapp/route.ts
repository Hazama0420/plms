// app/api/notifications/whatsapp/route.ts
import { NextResponse } from "next/server";
import { sendWaToAgent } from "@/lib/fonnte";
import { requireRole } from "@/lib/api-auth";
import { validate, whatsappNotificationSchema } from "@/lib/validations";

export async function POST(req: Request) {
  try {
    // Mengirim WhatsApp memakai token Fonnte berbayar milik perusahaan.
    // Tanpa penjagaan ini siapa pun bisa mengirim pesan atas nama Anda.
    const auth = await requireRole(["agent", "marketing", "admin", "super_admin"]);
    if (!auth.ok) return auth.response;

    const parsed = validate(whatsappNotificationSchema, await req.json());
    if (!parsed.ok) return parsed.response;

    const { agentId, leadName, clientPhone, propertyInterest } = parsed.data;

    // Panggil helper Fonnte
    const res = await sendWaToAgent({
      agentId,
      leadName,
      clientPhone,
      propertyInterest,
    });

    if (!res.success) {
      return NextResponse.json(
        { error: res.reason || "Gagal mengirim WhatsApp via Fonnte" },
        { status: 400 }
      );
    }

    // Gunakan 'as any' untuk menghindari error TypeScript pada properti tambahan
    const fonnteRes = res as any;

    return NextResponse.json({
      success: true,
      message: "Notifikasi WhatsApp berhasil dikirim ke agen",
      recipient: fonnteRes.recipient || null,
      phone: fonnteRes.phone || null,
      result: fonnteRes.result || null,
    });
  } catch (error: any) {
    console.error("API WhatsApp Notification Error:", error);
    return NextResponse.json(
      { error: error.message || "Terjadi kesalahan internal pada server" },
      { status: 500 }
    );
  }
}