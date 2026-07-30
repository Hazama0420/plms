// app/api/notifications/send/route.ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { title, message, targetRole, category, type, actionUrl } = await req.json();

    const ONESIGNAL_APP_ID = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
    const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY;

    if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
      return NextResponse.json(
        { success: false, error: "Kunci OneSignal (App ID / REST API Key) belum diatur di file .env" },
        { status: 400 }
      );
    }

    // Tentukan segment OneSignal penerima
    let segment = "Subscribed Users"; // Default semua user
    if (targetRole === "internal") {
      segment = "Active Users"; // Ubah sesuai segment internal Anda di OneSignal Dashboard
    }

    const oneSignalPayload = {
      app_id: ONESIGNAL_APP_ID,
      included_segments: [segment],
      headings: { en: title, id: title },
      contents: { en: message, id: message },
      url: actionUrl || undefined,
      data: {
        category: category || "admin",
        type: type || "announcement",
        targetRole: targetRole || "internal",
      },
    };

    // Kirim request ke OneSignal REST API
    const response = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Authorization: `Basic ${ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify(oneSignalPayload),
    });

    const resultData = await response.json();

    if (!response.ok) {
      throw new Error(resultData.errors ? JSON.stringify(resultData.errors) : "Gagal terhubung ke OneSignal API");
    }

    return NextResponse.json({
      success: true,
      message: "Push notification berhasil dikirim via OneSignal",
      response: resultData,
    });
  } catch (error: any) {
    console.error("OneSignal Send Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Terjadi kesalahan pada server pengiriman OneSignal" },
      { status: 500 }
    );
  }
}