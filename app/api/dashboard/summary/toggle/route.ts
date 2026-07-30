// app/api/dashboard/summary/toggle/route.ts
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const enabled = Boolean(body.enabled);
    
    // Gunakan metode getAll & setAll sesuai standar @supabase/ssr untuk Next.js App Router
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
            } catch {
              // Diabaikan jika dipanggil dari konteks yang tidak mengizinkan set cookie
            }
          },
        },
      }
    );

    // Ambil user terautentikasi dari cookie
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Sesi telah berakhir / Unauthorized" }, { status: 401 });
    }

    // Ambil role dari tabel users atau user_metadata
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const userRole = (profile?.role || user.user_metadata?.role || "").toLowerCase();
    
    // Izinkan Super Admin dan Admin biasa mengontrol toggle AI
    const allowedRoles = ["super_admin", "superadmin", "admin"];
    if (!allowedRoles.includes(userRole)) {
      return NextResponse.json(
        { error: "Hanya Admin & Super Admin yang diizinkan mengontrol fitur AI." },
        { status: 403 }
      );
    }

    // Simpan status ke tabel system_settings
    const { error: dbError } = await supabase.from("system_settings").upsert({
      key: "ai_summary_enabled",
      value: enabled ? "true" : "false",
      updated_at: new Date().toISOString()
    }, { onConflict: "key" });

    if (dbError) {
      console.error("Gagal menyimpan ke system_settings:", dbError);
      return NextResponse.json({ error: "Gagal menyimpan konfigurasi ke database." }, { status: 500 });
    }

    return NextResponse.json({ success: true, enabled });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}