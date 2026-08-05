// app/api/dashboard/summary/route.ts
import { NextResponse } from "next/server";
import { aiService } from "@/services/ai.service";
import { dashboardService } from "@/services/dashboard.service";
import { requireAuth } from "@/lib/api-auth";

export async function GET() {
  try {
    // Ringkasan ini membocorkan metrik bisnis dan memanggil AI berbayar.
    const auth = await requireAuth();
    if (!auth.ok) return auth.response;

    const { supabase } = auth.ctx;

    // 1. Cek apakah fitur AI sedang dinonaktifkan (OFF) oleh Admin/Super Admin
    const { data: settingData } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "ai_summary_enabled")
      .maybeSingle();
    
    if (settingData && settingData.value === "false") {
      return NextResponse.json({ 
        disabled: true, 
        enabled: false,
        summary: "Fitur AI Executive Summary sedang dinonaktifkan (OFF) oleh Admin." 
      });
    }

    // 2. Ambil statistik real-time dari database
    const stats = await dashboardService.getStats();

    const total = stats.totalProperties || 0;
    const active = stats.activeListings || 0;
    const leads = stats.todayLeads || 0;
    
    // Hitung persentase listing aktif vs total properti
    const activePercentage = total > 0 ? ((active / total) * 100).toFixed(1) : "0";
    const draftOrInactive = Math.max(0, total - active);

    // 3. Prompt Cerdas dengan Data Angka & Rasio Presisi
    const prompt = `
Anda adalah Chief Operating Officer (COO) analitis untuk platform properti "Inland Property".
Data metrik operasional real-time saat ini:
- Total Properti Terdaftar: ${total} unit
- Listing Aktif Siap Jual/Sewa: ${active} unit (Tingkat Keaktifan: ${activePercentage}%)
- Properti Belum Aktif/Draft: ${draftOrInactive} unit
- Leads/Calon Pembeli Baru Hari Ini: ${leads} prospek

TUGAS UTAMA:
Buat ringkasan eksekutif sepanjang MAKSIMAL 2 KALIMAT yang padat, berwawasan bisnis tinggi, dan wajib menyertakan angka & persentase nyata dari data di atas.

ATURAN FORMATTING MUTLAK:
- WAJIB menyebutkan angka konkret (misal: ${total} unit, ${active} unit aktif, ${activePercentage}%, atau ${leads} leads).
- DILARANG menggunakan tanda bintang (*), cetak tebal (bold), nomor (1, 2, 3), atau bullet points.
- Kalimat 1: Evaluasi rasio portofolio aktif dan potensi pasar dari leads masuk.
- Kalimat 2: Rekomendasi tindakan operasional taktis & terukur yang harus segera dieksekusi tim agen.
`;

    const aiResponse = await aiService.generateWithFallback(prompt);
    
    // Bersihkan karakter markdown agar teks tampil rapi
    const cleanSummary = aiResponse.text.replace(/\*\*/g, "").replace(/\*/g, "").trim();

    return NextResponse.json({
      enabled: true,
      summary: cleanSummary,
      provider: aiResponse.provider,
    });
  } catch (error: any) {
    console.error("Dashboard AI Summary Error:", error);
    return NextResponse.json({
      enabled: true,
      summary: "Portofolio Inland Property saat ini mencatatkan kinerja stabil; pastikan tim agen memfollow-up seluruh prospek masuk secara responsif.",
      provider: "Fallback",
    });
  }
}