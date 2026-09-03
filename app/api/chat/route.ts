// app/api/chat/route.ts
//
// Endpoint ini SENGAJA publik: AIChatWidget dipasang di root layout sehingga
// pengunjung yang belum login pun bisa bertanya. Karena memanggil AI berbayar,
// penjagaannya berupa rate limit berlapis, bukan wajib login.
import { NextResponse } from "next/server";
import { aiService } from "@/services/ai.service";
import { getAuthContext } from "@/lib/api-auth";
import { authorizeAI } from "@/lib/ai/policy";
import { estimateTokens } from "@/lib/ai-quota";
import { chatMessageSchema, validate } from "@/lib/validations";

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

    // Sebelumnya bagian ini memakai klien Supabase versi browser, yang di server
    // tidak pernah membaca cookie sesi. Akibatnya getUser() selalu null: kuota
    // dihitung per-IP untuk semua orang dan Super Admin tak pernah dikenali.
    const auth = await getAuthContext();
    const isSuperAdmin = auth?.role === "super_admin";

    // Batas harian, rem burst, dan anggaran token kini ditegakkan lib/ai-quota.
    // Versi lama membaca lalu menulis ai_usage sebagai dua operasi terpisah,
    // sehingga sepuluh permintaan paralel sama-sama lolos batas 15/hari.
    // Perilaku yang terlihat pengguna tidak berubah: tetap 15/hari, Super Admin
    // tetap tanpa batas.
    const guard = await authorizeAI({
      featureKey: "support.chat",
      req,
    });
    if (!guard.ok) return guard.response;

    // 3. System prompt untuk Agnes AI
    const systemPrompt = `
Kamu adalah Agnes, AI Assistant profesional untuk platform "Inland Property".
ATURAN FORMAT PENULISAN:
1. Jawab dengan struktur paragraf yang jelas, terpisah, dan rapi.
2. Berikan spasi atau baris baru (enter) antar paragraf agar mudah dibaca dan tidak menumpuk menjadi satu teks yang padat.
3. Jangan menggunakan simbol markdown tebal (**) yang berlebihan. Gunakan bahasa Indonesia yang ramah, sopan, informatif, dan profesional.
`;

    let aiResponse;
    try {
      aiResponse = await aiService.generateWithFallback(lastMessage, systemPrompt);
    } catch (err) {
      await guard.rollback();
      throw err;
    }

    await guard.commit(
      estimateTokens(lastMessage) + estimateTokens(aiResponse.text)
    );

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