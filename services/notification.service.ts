// services/notification.service.ts
import { supabase } from "@/lib/supabase/client";
import type { Notification, CreateNotificationDto, SendNotificationDto } from "@/types/notification.types";

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
  // CREATE NOTIFICATION – Buat notifikasi baru (internal)
  // ============================================================
  async createNotification(data: CreateNotificationDto): Promise<Notification> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Pengguna tidak terautentikasi");

    // Cek role (hanya admin/super_admin yang bisa create)
    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!userData || !["super_admin", "admin"].includes(userData.role)) {
      throw new Error("Hanya admin yang bisa mengirim notifikasi");
    }

    const { data: notification, error } = await supabase
      .from("notifications")
      .insert({
        user_id: data.user_id,
        sender_id: user.id,
        type: data.type,
        title: data.title,
        message: data.message,
        link: data.link || null,
      })
      .select(`
        *,
        sender:sender_id(id, full_name, avatar_url)
      `)
      .single();

    if (error) throw new Error(error.message);
    return notification as Notification;
  },

  // ============================================================
  // SEND NOTIFICATION – Kirim notifikasi ke satu/lebih user
  // ============================================================
  async sendNotification(data: SendNotificationDto): Promise<Notification[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Pengguna tidak terautentikasi");

    // Cek role
    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!userData || !["super_admin", "admin"].includes(userData.role)) {
      throw new Error("Hanya admin yang bisa mengirim notifikasi");
    }

    let targetUserIds: string[] = [];

    if (data.recipient_type === "specific") {
      targetUserIds = data.user_ids || [];
    } else if (data.recipient_type === "all_agents") {
      const { data: agents } = await supabase
        .from("users")
        .select("id")
        .eq("role", "agent");
      targetUserIds = agents?.map((a) => a.id) || [];
    } else if (data.recipient_type === "all_admins") {
      const { data: admins } = await supabase
        .from("users")
        .select("id")
        .in("role", ["super_admin", "admin"]);
      targetUserIds = admins?.map((a) => a.id) || [];
    } else if (data.recipient_type === "all_users") {
      const { data: users } = await supabase.from("users").select("id");
      targetUserIds = users?.map((u) => u.id) || [];
    }

    if (targetUserIds.length === 0) {
      throw new Error("Tidak ada penerima yang valid");
    }

    const notifications = [];
    for (const userId of targetUserIds) {
      const result = await this.createNotification({
        user_id: userId,
        type: data.type,
        title: data.title,
        message: data.message,
        link: data.link,
      });
      notifications.push(result);
    }

    return notifications;
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