// app/api/chat/route.ts
import { NextResponse } from "next/server";
import { aiService } from "@/services/ai.service";
import { supabase } from "@/lib/supabase/client";

const DAILY_LIMIT = 15; // Batas maksimal pesan per hari untuk non-superadmin

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Format pesan tidak valid" },
        { status: 400 }
      );
    }

    const lastMessage = messages[messages.length - 1]?.text;
    if (!lastMessage) {
      return NextResponse.json({ error: "Pesan kosong" }, { status: 400 });
    }

    // 1. Identifikasi Pengguna & Cek Role di Database
    const forwardedFor = req.headers.get("x-forwarded-for");
    const clientIp = forwardedFor ? forwardedFor.split(",")[0] : "127.0.0.1";
    
    const { data: { user } } = await supabase.auth.getUser();
    let userRole = "viewer";
    let userIdentifier = clientIp;

    if (user) {
      userIdentifier = user.id;
      // Ambil role asli dari tabel users
      const { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (profile && profile.role) {
        userRole = profile.role.toLowerCase();
      } else if (user.user_metadata?.role) {
        userRole = user.user_metadata.role.toLowerCase();
      }
    }

    // Cek apakah user adalah Super Admin
    const isSuperAdmin = userRole === "super_admin" || userRole === "superadmin";

    // 2. JIKA BUKAN SUPER ADMIN, terapkan pembatasan rate limit harian
    if (!isSuperAdmin) {
      const today = new Date().toISOString().split("T")[0]; // Format: YYYY-MM-DD

      const { data: usageData, error: fetchError } = await supabase
        .from("ai_usage")
        .select("*")
        .eq("user_identifier", userIdentifier)
        .eq("usage_date", today)
        .maybeSingle();

      if (usageData) {
        if (usageData.message_count >= DAILY_LIMIT) {
          return NextResponse.json(
            {
              error: `Maaf, Anda telah mencapai batas maksimal ${DAILY_LIMIT} pertanyaan gratis dengan Agnes hari ini. Silakan coba lagi besok atau hubungi tim CS kami melalui WhatsApp.`,
              limitExceeded: true,
            },
            { status: 429 } // Too Many Requests
          );
        }

        // Increment jumlah penggunaan
        await supabase
          .from("ai_usage")
          .update({
            message_count: usageData.message_count + 1,
            updated_at: new Date().toISOString(),
          })
          .eq("id", usageData.id);
      } else {
        // Buat record baru untuk hari ini
        await supabase.from("ai_usage").insert({
          user_identifier: userIdentifier,
          usage_date: today,
          message_count: 1,
        });
      }
    }

    // 3. System prompt untuk Agnes AI
    const systemPrompt = `
Kamu adalah Agnes, AI Assistant profesional untuk platform "Inland Property".
ATURAN FORMAT PENULISAN:
1. Jawab dengan struktur paragraf yang jelas, terpisah, dan rapi.
2. Berikan spasi atau baris baru (enter) antar paragraf agar mudah dibaca dan tidak menumpuk menjadi satu teks yang padat.
3. Jangan menggunakan simbol markdown tebal (**) yang berlebihan. Gunakan bahasa Indonesia yang ramah, sopan, informatif, dan profesional.
`;

    const aiResponse = await aiService.generateWithFallback(lastMessage, systemPrompt);

    return NextResponse.json({
      text: aiResponse.text,
      provider: aiResponse.provider,
      isUnlimited: isSuperAdmin,
    });
  } catch (error: any) {
    console.error("AI Chat API Error:", error);
    return NextResponse.json(
      { error: error.message || "Terjadi kesalahan pada sistem AI" },
      { status: 500 }
    );
  }
}