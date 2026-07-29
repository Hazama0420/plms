// app/api/leads/[id]/follow-up/route.ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: any) {
            cookieStore.set({ name, value: "", ...options });
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (!userData || !["super_admin", "admin", "agent"].includes(userData.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: leadId } = await context.params; // ✅ Await params
    const body = await req.json();
    const { followup_date, notes, assigned_to } = body;

    if (!followup_date) {
      return NextResponse.json(
        { error: "Tanggal follow-up wajib diisi" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("crm_followups")
      .insert({
        lead_id: leadId,
        assigned_to: assigned_to || null,
        followup_date: followup_date,
        notes: notes || null,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating follow-up:", error);
      return NextResponse.json(
        { error: error.message || "Gagal membuat follow-up" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error("Error in follow-up API:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}