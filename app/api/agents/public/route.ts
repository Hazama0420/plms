import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("users")
    .select("id, full_name, avatar_url, role, bio")
    .in("role", ["agent", "admin"])
    .or("status.is.null,status.not.in.(pending,suspended)")
    .or("is_approved.is.null,is_approved.eq.true")
    .order("role")
    .order("full_name");

  if (error) {
    console.error("[agents/public] Query error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    data: data ?? [],
  });
}