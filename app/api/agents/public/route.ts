import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("users")
    .select("id, full_name, avatar_url, role, bio, arebi_number")
    .in("role", ["agent", "admin"])
    .eq("status", "active")
    .eq("is_approved", true)
    .order("role")
    .order("full_name")
    .limit(12);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [] });
}
