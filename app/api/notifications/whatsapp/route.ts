// app/api/notifications/whatsapp/route.ts
import { NextResponse } from "next/server";
import { sendWaToAgent } from "@/lib/fonnte";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { agentId, leadName, clientPhone, propertyInterest } = body;

    if (!agentId) {
      return NextResponse.json({ error: "Parameter agentId wajib diisi" }, { status: 400 });
    }

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