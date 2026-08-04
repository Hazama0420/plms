// services/onesignal.service.ts

export const oneSignalService = {
  async sendNotificationToUser({
    userId, // ID user Supabase (yang jadi External ID di OneSignal)
    title,
    message,
    url,
  }: {
    userId: string;
    title: string;
    message: string;
    url?: string;
  }) {
    try {
      const response = await fetch("https://onesignal.com/api/v1/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          // ⚠️ Ambil REST API Key dari environment variable server-side Anda
          Authorization: `Basic ${process.env.ONESIGNAL_REST_API_KEY}`,
        },
        body: JSON.stringify({
          app_id: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID,
          // Targetkan berdasarkan External ID (user.id Supabase)
          include_external_user_ids: [userId],
          headings: { en: title },
          contents: { en: message },
          url: url || `${window.location.origin}/crm`,
        }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Gagal mengirim OneSignal notification:", error);
    }
  },
};