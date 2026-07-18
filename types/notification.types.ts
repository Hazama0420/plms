// types/notification.types.ts

export type NotificationType = "task" | "reminder" | "announcement" | "assignment" | "property_update";

export interface Notification {
  id: string;
  user_id: string;
  sender_id: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string | null;
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