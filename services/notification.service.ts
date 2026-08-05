// services/notification.service.ts
import { supabase } from "@/lib/supabase/client";
import type { Notification, SendNotificationDto } from "@/types/notification.types";

export const notificationService = {
  // ============================================================
  // GET NOTIFICATIONS – Ambil daftar notifikasi user
  // ============================================================
  async getNotifications(params: {
    page?: number;
    limit?: number;
    is_read?: boolean;
  } = {}) {
    const { page = 1, limit = 20, is_read } = params;
    const offset = (page - 1) * limit;

    try {
      const { data: { user } } = await supabase.auth.getUser();

      // 🛡️ Jika user belum login (Tamu/Guest), kembalikan data kosong secara aman
      if (!user) {
        return {
          data: [],
          count: 0,
          page,
          totalPages: 1,
        };
      }

      let query = supabase
        .from("notifications")
        .select(`
          *,
          sender:sender_id(id, full_name, avatar_url)
        `, { count: "exact" })
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (is_read !== undefined) {
        query = query.eq("is_read", is_read);
      }

      const { data, error, count } = await query;

      if (error) {
        console.error("Error fetching notifications:", error);
        return {
          data: [],
          count: 0,
          page,
          totalPages: 1,
        };
      }

      const totalCount = count || 0;

      return {
        data: (data as Notification[]) || [],
        count: totalCount,
        page,
        totalPages: Math.max(1, Math.ceil(totalCount / limit)),
      };
    } catch (err) {
      console.error("Unexpected error in getNotifications:", err);
      return {
        data: [],
        count: 0,
        page,
        totalPages: 1,
      };
    }
  },

  // ============================================================
  // GET UNREAD COUNT – Jumlah notifikasi belum dibaca
  // ============================================================
  async getUnreadCount(): Promise<number> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;

      const { count, error } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false);

      if (error) {
        console.error("Error fetching unread count:", error);
        return 0;
      }

      return count || 0;
    } catch (err) {
      console.error("Unexpected error in getUnreadCount:", err);
      return 0;
    }
  },

  // ============================================================
  // MARK AS READ – Tandai notifikasi sudah dibaca
  // ============================================================
  async markAsRead(notificationId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId)
      .eq("user_id", user.id);

    if (error) throw new Error(error.message);
  },

  // ============================================================
  // MARK ALL AS READ – Tandai semua notifikasi sudah dibaca
  // ============================================================
  async markAllAsRead(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    if (error) throw new Error(error.message);
  },

  // ============================================================
  // SEND NOTIFICATION – Kirim notifikasi ke satu/lebih user
  // ============================================================
  //
  // Dialihkan ke Route Handler /api/notifications.
  //
  // Versi sebelumnya menyisipkan baris langsung dari peramban memakai kunci
  // anon. RLS melarang penyisipan atas nama akun lain — dan memang seharusnya
  // begitu — sehingga pengiriman ke agen/admin lain tidak pernah tersimpan.
  // Route tersebut memakai klien service-role, memeriksa role pengirim, dan
  // sekaligus mengirim push ke perangkat penerima.
  async sendNotification(data: SendNotificationDto): Promise<Notification[]> {
    const response = await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipient_type: data.recipient_type,
        user_ids: data.user_ids,
        type: data.type,
        title: data.title,
        message: data.message,
        link: data.link,
      }),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok || !result?.success) {
      throw new Error(result?.error || "Gagal mengirim notifikasi");
    }

    return (result.data as Notification[]) || [];
  },

  // ============================================================
  // DELETE NOTIFICATION – Hapus notifikasi
  // ============================================================
  async deleteNotification(notificationId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", notificationId)
      .eq("user_id", user.id);

    if (error) throw new Error(error.message);
  },
};