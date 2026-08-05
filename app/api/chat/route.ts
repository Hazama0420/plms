// app/api/chat/route.ts
//
// Endpoint ini SENGAJA publik: AIChatWidget dipasang di root layout sehingga
// pengunjung yang belum login pun bisa bertanya. Karena memanggil AI berbayar,
// penjagaannya berupa rate limit berlapis, bukan wajib login.
import { NextResponse } from "next/server";
import { aiService } from "@/services/ai.service";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext } from "@/lib/api-auth";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { chatMessageSchema, validate } from "@/lib/validations";

const DAILY_LIMIT = 15; // Batas maksimal pesan per hari untuk non-superadmin

// Rem cepat per IP: menahan banjir permintaan sebelum menyentuh database.
const BURST_LIMIT = 10;
const BURST_WINDOW_MS = 60_000;

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Bentuk payload dan batas panjang pesan diperiksa skema
    // (lib/validations.ts). Sebelumnya pesan terlalu panjang dijawab 413;
    // sekarang seragam 400 seperti galat validasi lain.
    const parsed = validate(chatMessageSchema, body);
    if (!parsed.ok) return parsed.response;

    const { messages } = parsed.data;

    // Route hanya memakai pesan terakhir sebagai prompt. Entri riwayat boleh
    // kosong, tapi prompt yang benar-benar dikirim ke AI tidak.
    const lastMessage = messages[messages.length - 1]?.text?.trim();
    if (!lastMessage) {
      return NextResponse.json({ error: "Pesan kosong" }, { status: 400 });
    }

    const clientIp = getClientIp(req);

    const burst = rateLimit(`chat:${clientIp}`, BURST_LIMIT, BURST_WINDOW_MS);
    if (!burst.allowed) {
      return NextResponse.json(
        {
          error: "Terlalu banyak permintaan. Mohon tunggu sebentar.",
          limitExceeded: true,
        },
        { status: 429, headers: { "Retry-After": String(burst.retryAfterSeconds) } }
      );
    }

    // 1. Identifikasi Pengguna & Cek Role di Database.
    //
    // Sebelumnya bagian ini memakai klien Supabase versi browser, yang di server
    // tidak pernah membaca cookie sesi. Akibatnya getUser() selalu null: kuota
    // dihitung per-IP untuk semua orang dan Super Admin tak pernah dikenali.
    const auth = await getAuthContext();

    const userRole = auth?.role ?? "viewer";
    const userIdentifier = auth?.userId ?? clientIp;

    // Penghitung kuota memakai service role: tabel ai_usage harus tetap
    // tertutup dari klien anonim lewat RLS.
    const supabase = createAdminClient();

    // Cek apakah user adalah Super Admin
    const isSuperAdmin = userRole === "super_admin";

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