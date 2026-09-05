// app/api/auth/register-agent/route.ts
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyEvent, getAdminRecipientIds } from "@/lib/notification-helper";
import { registerAgentSchema, validate } from "@/lib/validations";

export async function POST(req: Request) {
  try {
    const parsed = validate(registerAgentSchema, await req.json());
    if (!parsed.ok) return parsed.response;

    const { fullName, email, phone, password, address, ktpUrl, socials, experience, vehicle, reason } = parsed.data;
    const supabaseAdmin = createAdminClient();

    // 1. Cek apakah email sudah terdaftar di tabel users
    const { data: existingUser } = await supabaseAdmin
      .from("users")
      .select("id, status")
      .eq("email", email)
      .maybeSingle();

    if (existingUser) {
      const statusText = existingUser.status === "pending"
        ? "Email ini sudah terdaftar sebagai agen dan sedang menunggu persetujuan."
        : "Email ini sudah terdaftar di sistem.";
      return NextResponse.json(
        { success: false, error: statusText },
        { status: 409 }
      );
    }

    // 2. Buat akun di Auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        phone,
        role: "agent",
        status: "pending",
      },
    });

    if (authError) {
      console.error("[register-agent] Gagal membuat akun Auth:", authError.message);
      return NextResponse.json(
        { success: false, error: authError.message },
        { status: 409 }
      );
    }

    if (!authUser?.user) {
      return NextResponse.json(
        { success: false, error: "Gagal membuat akun — tidak ada respons dari Auth." },
        { status: 500 }
      );
    }

    const userId = authUser.user.id;

    // 3. Upsert profil ke public.users (mengantisipasi trigger yang sudah insert)
    const { error: upsertError } = await supabaseAdmin
      .from("users")
      .upsert({
        id: userId,
        email,
        full_name: fullName,
        phone,
        role: "agent",
        status: "pending",
        is_approved: false,
        address,
        ktp_url: ktpUrl,
        social_media: socials,
        experience,
        vehicle,
        join_reason: reason,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "id" });

    if (upsertError) {
      console.error("[register-agent] Gagal upsert ke users:", upsertError.message);
      // Rollback: hapus user dari Auth
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return NextResponse.json(
        { success: false, error: "Gagal menyimpan data profil: " + upsertError.message },
        { status: 500 }
      );
    }

    // 4. Notifikasi ke admin
    try {
      const adminIds = await getAdminRecipientIds(supabaseAdmin);
      if (adminIds.length > 0) {
        const agentName = fullName || email.split("@")[0];
        await notifyEvent({
          event: "account.registered",
          userIds: adminIds,
          title: "Permohonan Agen Baru",
          message: `${agentName} mendaftar sebagai agen dan menunggu persetujuan Anda.`,
          link: "/admin/users",
          senderId: userId,
        });
      }
    } catch (notifyErr) {
      console.warn("[register-agent] Notifikasi ke admin gagal:", notifyErr);
    }

    return NextResponse.json({ success: true, userId });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error("[register-agent]", detail);
    return NextResponse.json({ success: false, error: detail }, { status: 500 });
  }
}