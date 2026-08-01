// services/admin-activity.service.ts
import { supabase } from "@/lib/supabase/client";

export interface LogActivityParams {
  userId: string;
  action: string;      // Contoh: "USER_ROLE_UPDATED", "PROPERTY_DELETED", "SYSTEM_CONFIG_CHANGED"
  module: string;      // Contoh: "Admin Users", "Properties", "Settings"
  description: string; // Deskripsi detail yang mudah dibaca manusia
}

export const adminActivityService = {
  async logAction({ userId, action, module, description }: LogActivityParams) {
    try {
      // Kita catat ke tabel crm_activities atau tabel log khusus admin
      const { error } = await supabase.from("crm_activities").insert([
        {
          user_id: userId,
          activity_type: `[Admin] ${module}: ${action}`,
          notes: description,
          created_at: new Date().toISOString(),
        },
      ]);

      if (error) {
        console.error("Gagal mencatat admin activity log:", error.message);
      }
    } catch (err) {
      console.error("Error exception saat mencatat log:", err);
    }
  },
};