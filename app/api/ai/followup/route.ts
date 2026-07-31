import { aiService } from "@/services/ai.service";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(req: Request) {
  try {
    const { leadName, property, status, userRole } = await req.json();

    // 🔒 PROTEKSI SERVER-SIDE: Hanya Super Admin & Admin
    let role = (userRole || "").toLowerCase();

    // Jika userRole tidak dikirim dari frontend, cek via Supabase Auth Token dari header request
    if (!role) {
      const authHeader = req.headers.get("authorization") || "";
      const token = authHeader.replace("Bearer ", "");

      if (token) {
        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
          global: { headers: { Authorization: `Bearer ${token}` } },
        });

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from("users")
            .select("role")
            .eq("id", user.id)
            .maybeSingle();

          role = (profile?.role || user.user_metadata?.role || "viewer").toLowerCase();
        }
      }
    }

    const isAdmin =
      role === "super_admin" ||
      role === "superadmin" ||
      role === "admin";

    if (!isAdmin) {
      return NextResponse.json(
        { error: "Akses Ditolak: Fitur AI Writer Follow-Up hanya untuk Super Admin dan Admin." },
        { status: 403 }
      );
    }

    // 🤖 PROMPT AI PRIBADI & KUSTOM
    const prompt = `Buat pesan WhatsApp profesional dalam Bahasa Indonesia untuk agen properti. 
Nama klien: ${leadName || "Bapak/Ibu"}. 
Properti yang diminati: ${property || "Properti Pilihan"}. 
Status terakhir: ${status || "Perlu Follow-up"}.

Buat pesan yang:
1. Personal, hangat, dan ramah
2. Menawarkan jadwal survey lokasi atau diskusi simulasi KPR
3. Menyebutkan keunggulan properti
4. Maksimal 3-4 kalimat ringkas dengan emoji yang relevan

Jawaban hanya berupa teks pesan, tanpa tambahan pengantar apapun.`;

    // Menggunakan aiService bawaan project Anda
    const { text } = await aiService.generateWithFallback(prompt);

    return NextResponse.json({
      message: text || `Halo ${leadName || "Bapak/Ibu"}, terima kasih atas ketertarikannya pada ${property}. Apakah ada jadwal luang minggu ini untuk survey lokasi bersama?`,
    });
  } catch (error: any) {
    console.error("Gagal generate pesan AI:", error);
    return NextResponse.json({ error: "Gagal generate pesan AI" }, { status: 500 });
  }
}