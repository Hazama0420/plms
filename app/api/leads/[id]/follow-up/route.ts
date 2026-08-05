// app/api/leads/[id]/follow-up/route.ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { notifyEvent } from "@/lib/notification-helper";

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

    // Tanpa penanggung jawab eksplisit, agenda menjadi milik pembuatnya.
    // Sebelumnya disimpan sebagai null, sehingga agendanya tidak muncul di
    // daftar siapa pun dan tidak ada yang bisa dinotifikasi.
    const assignee: string = assigned_to || user.id;

    const { data, error } = await supabase
      .from("crm_followups")
      .insert({
        lead_id: leadId,
        assigned_to: assignee,
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

    // Beri tahu penanggung jawab agenda.
    //
    // Sengaja dilewati bila agenda dibuat untuk diri sendiri: penggunanya baru
    // saja mengisi formulirnya, jadi notifikasi itu hanya mengulang perbuatan
    // sendiri. Notifikasi tetap dikirim untuk penugasan ke orang lain, yang
    // memang tidak tahu apa-apa sampai diberi tahu.
    if (assignee !== user.id) {
      const jadwal = new Date(followup_date).toLocaleString("id-ID", {
        dateStyle: "full",
        timeStyle: "short",
      });

      await notifyEvent({
        event: "followup.created",
        userIds: [assignee],
        title: "Agenda follow-up baru untuk Anda",
        message: `Follow-up dijadwalkan pada ${jadwal}.`,
        link: `/crm/leads/${leadId}`,
        senderId: user.id,
      }).catch((err) => console.error("Gagal kirim notifikasi follow-up:", err));
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