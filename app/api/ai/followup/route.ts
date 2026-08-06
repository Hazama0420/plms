// app/api/ai/followup/route.ts
import { aiService } from "@/services/ai.service";
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { enforceAiQuota, estimateTokens } from "@/lib/ai-quota";
import { followupSchema, validate } from "@/lib/validations";

export async function POST(req: Request) {
  try {
    // Role diambil dari sesi terverifikasi di server.
    // Sebelumnya role dibaca dari body request (`userRole`), sehingga siapa pun
    // bisa mengirim {"userRole":"super_admin"} dan melewati pengecekan.
    const auth = await requireRole(["agent", "admin", "super_admin"]);
    if (!auth.ok) return auth.response;

    // Nilai dari body ikut masuk ke prompt AI, jadi tipe dan batas panjangnya
    // dipastikan lebih dulu (lib/validations.ts).
    const parsed = validate(followupSchema, await req.json());
    if (!parsed.ok) return parsed.response;

    const { leadName, property, status } = parsed.data;

    // 🧠 PROMPT AI CERDAS, FORMAL, TANPA SIMBOL MARKDOWN
    const prompt = `Anda adalah seorang konsultan properti profesional dan berdedikasi tinggi dari Inland Property. 
Tugas Anda adalah menyusun draf pesan WhatsApp yang formal, sopan, persuasif, dan elegan untuk follow-up calon pembeli.

Detail Informasi Klien:
- Nama Klien: ${leadName || "Bapak/Ibu"}
- Minat / Catatan Properti: ${property || "Unit Properti Pilihan"}
- Status Tahapan CRM: ${status || "Dalam Diskusi"}

Aturan Penting Penulisan:
1. Gunakan bahasa Indonesia yang baik, benar, formal, namun tetap ramah dan menghormati klien.
2. DILARANG MENGGUNAKAN SIMBOL MARKDOWN APA PUN seperti tanda bintang (*), garis bawah (_), pagar (#), atau tilde (~). Tuliskan teks biasa yang bersih.
3. Sampaikan maksud follow-up secara jelas, ajak berdiskusi mengenai kriteria unit, simulasi pembayaran/KPR, atau penentuan jadwal visit lokasi secara fleksibel.
4. Jangan menyertakan tanda kurung atau placeholder seperti [Nama Anda] atau [Inland Property]. Buat kalimat langsung siap kirim.
5. Panjang pesan maksimal 3 hingga 5 kalimat efektif.

Hasilkan HANYA isi teks pesan tanpa pengantar, tanpa penutup dari AI, dan tanpa simbol formatting.`;

    // Login saja tidak cukup: tanpa kuota, satu akun agen bisa menekan tombol
    // "Generate Pesan" ratusan kali dan menghabiskan kredit provider.
    const quota = await enforceAiQuota({
      feature: "followup",
      req,
      userId: auth.ctx.userId,
      role: auth.ctx.role,
      estimatedTokens: estimateTokens(prompt),
    });
    if (!quota.ok) return quota.response;

    // Menggunakan AI Service bawaan proyek
    const { text } = await aiService.generateWithFallback(prompt);

    await quota.commit(estimateTokens(prompt) + estimateTokens(text));

    // 🧹 Clean-up tambahan untuk memastikan tidak ada simbol markdown (*, _, #, ~) yang terikut
    let cleanText = (text || "")
      .replace(/[\*_#~`]/g, "")
      .trim();

    // Fallback Formal jika AI Service mengembalikan teks kosong
    if (!cleanText) {
      cleanText = `Selamat pagi/siang Bapak/Ibu ${leadName || "Klien"}. Salam hangat dari Inland Property. Menindaklanjuti ketertarikan Anda pada ${property || "properti kami"}, kami ingin menginformasikan rincian unit terbaru serta opsi pembayaran yang fleksibel. Apabila Bapak/Ibu berkenan, apakah ada waktu luang minggu ini untuk agenda peninjauan lokasi atau diskusi simulasi KPR bersama kami? Terima kasih.`;
    }

    return NextResponse.json({ message: cleanText });
  } catch (error: any) {
    console.error("Gagal generate pesan AI:", error);
    return NextResponse.json({ error: "Gagal generate pesan AI" }, { status: 500 });
  }
}