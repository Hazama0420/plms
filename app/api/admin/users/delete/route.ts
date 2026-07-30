// app/api/admin/users/delete/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const { targetUserId } = await req.json();

    if (!targetUserId) {
      return NextResponse.json({ error: "Target User ID wajib diisi" }, { status: 400 });
    }

    // 1. Verifikasi Sesi Pengirim Request dengan @supabase/ssr
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {}
          },
        },
      }
    );

    // Dapatkan & verifikasi user dari server Auth
    const { data: { user: currentUser }, error: authUserError } = await supabase.auth.getUser();

    if (authUserError || !currentUser) {
      return NextResponse.json({ error: "Unauthorized / Sesi Berakhir" }, { status: 401 });
    }

    // Cek Role Pengirim di tabel users & user_metadata
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", currentUser.id)
      .maybeSingle();

    const senderRole = (profile?.role || currentUser.user_metadata?.role || "").toLowerCase();
    const isSuperAdmin = senderRole === "super_admin" || senderRole === "superadmin";

    if (!isSuperAdmin) {
      return NextResponse.json(
        { error: "Hanya Super Admin yang diizinkan menghapus user!" },
        { status: 403 }
      );
    }

    if (currentUser.id === targetUserId) {
      return NextResponse.json(
        { error: "Anda tidak dapat menghapus akun Anda sendiri!" },
        { status: 400 }
      );
    }

    // 2. Inisialisasi Supabase Admin Client dengan Service Role Key
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      return NextResponse.json(
        {
          error:
            "Server Configuration Error: SUPABASE_SERVICE_ROLE_KEY belum dikonfigurasi di file .env.local",
        },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // 3. Unassign / Lepaskan relasi Foreign Key di berbagai tabel
    try {
      await supabaseAdmin.from("properties").update({ assigned_to: null }).eq("assigned_to", targetUserId);
      await supabaseAdmin.from("crm_leads").update({ assigned_to: null }).eq("assigned_to", targetUserId);
      await supabaseAdmin.from("crm_followups").update({ assigned_to: null }).eq("assigned_to", targetUserId);
      await supabaseAdmin.from("crm_activities").update({ assigned_to: null }).eq("assigned_to", targetUserId);
    } catch (e) {
      console.warn("Unassign FK minor notice:", e);
    }

    // 4. Hapus data di public.users terlebih dahulu
    const { error: publicDeleteError } = await supabaseAdmin
      .from("users")
      .delete()
      .eq("id", targetUserId);

    if (publicDeleteError) {
      console.error("Gagal hapus dari public.users:", publicDeleteError.message);
      return NextResponse.json(
        { error: `Gagal menghapus profil tabel users: ${publicDeleteError.message}` },
        { status: 500 }
      );
    }

    // 5. Hapus User dari Auth Supabase (auth.users)
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);

    if (deleteAuthError) {
      console.error("Gagal hapus dari auth.users:", deleteAuthError.message || deleteAuthError);
      return NextResponse.json(
        {
          error:
            deleteAuthError.message ||
            "Gagal menghapus akun autentikasi dari auth.users",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "User berhasil dihapus secara permanen dari sistem.",
    });
  } catch (error: any) {
    console.error("API User Delete Exception:", error);
    return NextResponse.json(
      { error: error.message || "Terjadi kesalahan pada server" },
      { status: 500 }
    );
  }
}