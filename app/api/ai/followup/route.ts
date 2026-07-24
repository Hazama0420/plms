import { aiService } from "@/services/ai.service";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { leadName, property, status } = await req.json();

    const prompt = `Buat pesan WhatsApp profesional dalam Bahasa Indonesia untuk agen properti. 
Nama klien: ${leadName}. 
Properti yang diminati: ${property}. 
Status terakhir: ${status}.

Buat pesan yang:
1. Personal dan ramah
2. Menawarkan jadwal survey atau kunjungan
3. Menyebutkan keunggulan properti
4. Maksimal 3 kalimat

Jawaban hanya berupa teks pesan, tanpa tambahan apapun.`;

    const { text } = await aiService.generateWithFallback(prompt);
    return NextResponse.json({ message: text || `Halo ${leadName}, bagaimana minat Anda terhadap ${property}?` });
  } catch (error) {
    return NextResponse.json({ error: "Gagal generate pesan" }, { status: 500 });
  }
}