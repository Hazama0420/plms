import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, message } = body;

    const onesignalAppId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
    const onesignalApiKey = process.env.ONESIGNAL_REST_API_KEY;

    if (!onesignalApiKey || !onesignalAppId) {
      return NextResponse.json(
        { success: false, error: "OneSignal REST API Key belum disetel di .env.local" },
        { status: 400 }
      );
    }

    // Kirim perintah push notification ke server OneSignal
    const res = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Authorization": `Basic ${onesignalApiKey}`,
      },
      body: JSON.stringify({
        app_id: onesignalAppId,
        included_segments: ["All"], // Mengirim ke semua user yang sudah subscribe
        headings: { en: title },
        contents: { en: message },
      }),
    });

    const result = await res.json();

    if (!res.ok) {
      throw new Error(result.errors ? result.errors.join(", ") : "Gagal mengirim ke OneSignal");
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error("OneSignal Push Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}