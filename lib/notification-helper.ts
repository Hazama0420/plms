// lib/notification-helper.ts
import { createClient } from "@supabase/supabase-js";

interface TriggerNotificationProps {
  userId: string;       // ID User/Agen yang akan menerima notifikasi
  title: string;        // Judul notifikasi
  message: string;      // Isi pesan
  type: "lead" | "property" | "announcement"; // Kategori notifikasi
  link?: string;        // URL tujuan saat notifikasi diklik
}

export async function sendSystemNotification({
  userId,
  title,
  message,
  type,
  link,
}: TriggerNotificationProps) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // 1. Cek dulu preferensi di settings user (apakah sakelar lead/property aktif?)
    const { data: userDoc } = await supabaseAdmin
      .from("users")
      .select("preferences")
      .eq("id", userId)
      .maybeSingle();

    if (userDoc?.preferences) {
      const prefs = userDoc.preferences;
      // Jika user mematikan alert prospek di settings, batalkan pengiriman
      if (type === "lead" && prefs.lead_alerts === false) return;
      // Jika user mematikan update properti di settings, batalkan pengiriman
      if (type === "property" && prefs.property_updates === false) return;
    }

    // 2. Simpan ke tabel 'notifications' (Agar masuk ke Lonceng Web)
    const { error: dbError } = await supabaseAdmin.from("notifications").insert({
      user_id: userId,
      sender_id: userId,
      type: type,
      title: title,
      message: message,
      link: link,
      is_read: false,
    });

    if (dbError) throw dbError;

    // 3. Kirim Push Notification via OneSignal REST API (Ke HP/PC luar web)
    const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
    const apiKey = process.env.ONESIGNAL_REST_API_KEY;

    if (appId && apiKey) {
      await fetch("https://onesignal.com/api/v1/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Authorization": `Basic ${apiKey}`,
        },
        body: JSON.stringify({
          app_id: appId,
          included_segments: ["All"], // Bisa disesuaikan target segment/user
          headings: { en: title },
          contents: { en: message },
          url: link || undefined,
        }),
      });
    }
  } catch (error) {
    console.error("Gagal mentrigger sistem notifikasi:", error);
  }
}