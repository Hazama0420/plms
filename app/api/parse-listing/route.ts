// app/api/ai/parse-listing/route.ts

import { NextRequest, NextResponse } from "next/server";
import { aiService } from "@/services/ai.service";

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text || text.trim().length < 10) {
      return NextResponse.json(
        { error: "Teks terlalu pendek. Minimal 10 karakter." },
        { status: 400 }
      );
    }

    // Prompt untuk AI
    const systemPrompt = `Kamu adalah asisten AI untuk agen properti. 
Tugasmu adalah membaca deskripsi listing property dan mengekstrak informasi penting ke dalam format JSON.
Field yang harus diekstrak:
- title (judul property, maksimal 60 karakter)
- description (deskripsi lengkap, gunakan teks yang diberikan)
- property_type (rumah, apartemen, tanah, villa, ruko, kantor, pabrik)
- listing_type (jual atau sewa)
- selling_price (harga jual dalam angka, tanpa titik/koma, contoh: 2500000000)
- rental_price (harga sewa per bulan, jika ada)
- bedroom (jumlah kamar tidur, angka)
- bathroom (jumlah kamar mandi, angka)
- garage (jumlah garasi, angka)
- land_area (luas tanah dalam m², angka)
- building_area (luas bangunan dalam m², angka)
- certificate (SHM, HGB, SHGB, Strata)
- condition (baru, sangat_baik, baik, cukup, kurang)
- furnishing (unfurnished, semi_furnished, fully_furnished)
- year_built (tahun bangun, angka)

Jika informasi tidak ditemukan, berikan null.
Kembalikan hanya JSON valid, tanpa teks tambahan.`;

    const userPrompt = `Ekstrak informasi dari listing property berikut:\n\n${text}`;

    const result = await aiService.generateWithFallback(userPrompt, systemPrompt);

    // Parse JSON dari response AI
    let parsedData;
    try {
      // Coba ambil JSON dari response (mungkin ada teks tambahan)
      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedData = JSON.parse(jsonMatch[0]);
      } else {
        parsedData = JSON.parse(result.text);
      }
    } catch (error) {
      console.error("Failed to parse AI response:", result.text);
      return NextResponse.json(
        { error: "AI menghasilkan format yang tidak valid. Coba lagi." },
        { status: 500 }
      );
    }

    // Validasi field yang wajib ada
    const requiredFields = ['title', 'property_type', 'listing_type'];
    for (const field of requiredFields) {
      if (!parsedData[field]) {
        // Jika field wajib kosong, isi dengan default
        parsedData[field] = field === 'title' ? 'Property Baru' : 
                           field === 'property_type' ? 'rumah' : 
                           field === 'listing_type' ? 'jual' : null;
      }
    }

    return NextResponse.json({
      success: true,
      data: parsedData,
      provider: result.provider,
    });

  } catch (error: any) {
    console.error("AI Parse Error:", error);
    return NextResponse.json(
      { error: error.message || "Gagal memproses listing" },
      { status: 500 }
    );
  }
}