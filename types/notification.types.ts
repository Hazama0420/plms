// types/notification.types.ts

// Nilai kolom `notifications.type`.
//
// Harus identik dengan kunci TYPE_ICONS/TYPE_LABELS di
// components/notification-bell.tsx — tipe di luar daftar itu tampil dengan ikon
// jatuhan 📌 dan badge berisi nilai mentah. lib/notification-events.ts adalah
// satu-satunya tempat yang memilih nilai ini saat mengirim.
export type NotificationType =
  | "task"
  | "reminder"
  | "announcement"
  | "assignment"
  | "property_update"
  | "lead"
  | "support";

export interface Notification {
  id: string;
  user_id: string;
  sender_id: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string | null;
  /** Kolom kedua untuk tujuan klik; diisi sama dengan `link`. */
  action_url?: string | null;
  is_read: boolean;
  read_at?: string | null;
  created_at: string;
  sender?: {
    id: string;
    full_name: string;
    avatar_url?: string | null;
  };
}

export interface CreateNotificationDto {
  user_id: string; // penerima
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
}

export interface SendNotificationDto {
  recipient_type: "specific" | "all_agents" | "all_admins" | "all_users";
  user_ids?: string[];
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
}