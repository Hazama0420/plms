// app/api/ai/followup/route.ts
import { aiService } from "@/services/ai.service";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(req: Request) {
  try {
    const { leadName, property, status, userRole } = await req.json();

    // 🔒 IDENTIFIKASI ROLE PENGGUNA
    let role = (userRole || "").toLowerCase();

    // Jika userRole tidak dikirim dari frontend, cek via Token Supabase Auth
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

    // 🟢 IZINKAN AGENT, ADMIN, DAN SUPER ADMIN
    const isAllowed =
      role === "agent" ||
      role === "admin" ||
      role === "super_admin" ||
      role === "superadmin";

    if (!isAllowed) {
      return NextResponse.json(
        { error: "Akses Ditolak: Anda tidak memiliki izin menggunakan fitur AI Writer." },
        { status: 403 }
      );
    }

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

    // Menggunakan AI Service bawaan proyek
    const { text } = await aiService.generateWithFallback(prompt);

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