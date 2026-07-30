import { supabase } from "@/lib/supabase/client";

export async function logActivity({
  action,
  description,
  entityType = "system",
}: {
  action: string;
  description: string;
  entityType?: "property" | "lead" | "invoice" | "project" | "user" | "system";
}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    let userName = "Sistem";

    if (user) {
      // Ambil nama lengkap user dari metadata atau tabel users
      userName =
        user.user_metadata?.full_name ||
        user.email?.split("@")[0] ||
        "Pengguna";
    }

    await supabase.from("activity_logs").insert({
      user_id: user?.id || null,
      user_name: userName,
      action: action,
      description: `${userName} ${description}`,
      entity_type: entityType,
    });
  } catch (err) {
    console.error("Gagal mencatat log aktivitas:", err);
  }
}