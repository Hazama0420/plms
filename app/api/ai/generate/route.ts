// app/api/ai/generate/route.ts

import { NextRequest, NextResponse } from "next/server";
import { aiService } from "@/services/ai.service";

export async function POST(request: NextRequest) {
  try {
    const { action, data } = await request.json();

    // ===== ACTION: TITLE =====
    if (action === "title") {
      const prompt = `Buat judul properti untuk ${data.type} di ${data.location}, tipe listing ${data.listingType}. Maks 60 karakter.`;
      const systemPrompt =
        "Buat judul singkat, deskriptif, dan menarik untuk listing properti.";

      const { text, provider } = await aiService.generateWithFallback(
        prompt,
        systemPrompt
      );

      return NextResponse.json({ success: true, data: text, provider });
    }

    // ===== ACTION: DESCRIPTION (GENERATE BARU) =====
    if (action === "description") {
      const prompt = `Buat deskripsi properti ${data.type} di ${data.location}. Harga: Rp${data.price}. Kamar: ${data.bedrooms}, KM: ${data.bathrooms}, LT: ${data.landArea}m², LB: ${data.buildingArea}m².`;
      const systemPrompt =
        "Deskripsi profesional, persuasif, dalam bahasa Indonesia. Sorot keunggulan dan ajak hubungi agen.";

      const { text, provider } = await aiService.generateWithFallback(
        prompt,
        systemPrompt
      );

      return NextResponse.json({ success: true, data: text, provider });
    }

    // ===== ACTION: ENHANCE DESCRIPTION (PERBAIKI DESKRIPSI YANG SUDAH ADA) =====
    if (action === "enhance_description") {
      const { 
        type, 
        location, 
        listingType, 
        price, 
        bedrooms, 
        bathrooms, 
        landArea, 
        buildingArea,
        existingText 
      } = data;

      // Jika tidak ada existingText, fallback ke generate biasa
      if (!existingText || existingText.trim().length === 0) {
        // Generate dari nol
        const prompt = `Buat deskripsi properti ${type} di ${location}. Harga: Rp${price}. Kamar: ${bedrooms}, KM: ${bathrooms}, LT: ${landArea}m², LB: ${buildingArea}m².`;
        const systemPrompt =
          "Deskripsi profesional, persuasif, dalam bahasa Indonesia. Sorot keunggulan dan ajak hubungi agen.";
        const { text, provider } = await aiService.generateWithFallback(
          prompt,
          systemPrompt
        );
        return NextResponse.json({ success: true, data: text, provider });
      }

      // Enhance deskripsi yang sudah ada
      const prompt = `Perbaiki dan lengkapi deskripsi properti berikut. Buat lebih profesional, menarik, dan informatif.

DESKRIPSI YANG SUDAH ADA:
"${existingText}"

DATA PROPERTI:
- Tipe: ${type}
- Lokasi: ${location}
- Tipe Listing: ${listingType}
- Harga: Rp${price?.toLocaleString() || "Tidak disebutkan"}
- Kamar Tidur: ${bedrooms || "Tidak disebutkan"}
- Kamar Mandi: ${bathrooms || "Tidak disebutkan"}
- Luas Tanah: ${landArea || "Tidak disebutkan"} m²
- Luas Bangunan: ${buildingArea || "Tidak disebutkan"} m²

INSTRUKSI:
1. Perbaiki tata bahasa dan ejaan.
2. Tambahkan kalimat pembuka yang menarik.
3. Sorot keunggulan properti.
4. Sertakan ajakan untuk menghubungi agen.
5. Tetap pertahankan informasi penting dari deskripsi asli.
6. Panjang deskripsi sekitar 150-200 kata.
7. Gunakan bahasa Indonesia yang baik dan profesional.

Hanya kembalikan teks deskripsi yang sudah diperbaiki, tanpa format khusus.`;

      const systemPrompt = "Kamu adalah asisten AI untuk agen properti. Tugasmu memperbaiki dan melengkapi deskripsi listing property agar lebih profesional dan menarik.";

      const { text, provider } = await aiService.generateWithFallback(
        prompt,
        systemPrompt
      );

      return NextResponse.json({ success: true, data: text, provider });
    }

    // ===== ACTION: PARSE (EKSTRAK DATA DARI TEKS) =====
    if (action === "parse") {
      const { text, currentType, fieldNames, areaList } = data;

      const systemPrompt = `Anda adalah asisten AI yang sangat cerdas untuk mengisi data properti. 
Tugas Anda: ekstrak semua informasi yang mungkin dari deskripsi berikut dan isi field-field yang tersedia.

DESKRIPSI:
"${text}"

TIPE PROPERTI SAAT INI: ${currentType || "belum ditentukan"}
FIELD YANG HARUS DIISI (deskripsi iklan dan upload gambar TIDAK PERLU diisi): ${fieldNames || "semua field"}

DAFTAR AREA YANG TERSEDIA (nama area, kota, provinsi):
${areaList || "tidak ada data area"}

INSTRUKSI KHUSUS:
1. **Sertifikat**: Jika disebut "SHM", "HGB", "HGU", "HP", "PPJB", "Strata" → isi field sertifikat dengan tepat (termasuk keterangan lengkap).
2. **Lokasi PIK / PIK2**: "PIK" → area = "Pantai Indah Kapuk", "PIK2" → "Pantai Indah Kapuk 2".
3. **Kamar tidur & mandi dengan format "+"**: "KT 5+1" → kamar tidur = 5, "KM 3+1" → kamar mandi = 3 (ambil angka sebelum +).
4. Kenali singkatan: LT=luas tanah, LB=luas bangunan, KT=kamar tidur, KM=kamar mandi.
5. Konversi harga: "2.5M" = 2500000000, "5M" = 5000000000.
6. Untuk judul iklan: buat judul singkat menarik (max 60 karakter).
7. Untuk ID Area: cocokkan dengan daftar area yang diberikan, prioritas nama area, lalu kota.

JANGAN ISI FIELD "deskripsi iklan" dan "upload_gambar".

Kembalikan dalam format JSON dengan field:
- title (string): judul iklan
- property_type (string): tipe properti (rumah, apartemen, tanah, villa, ruko, kantor, pabrik, gudang, hotel, ruang_usaha)
- listing_type (string): jual atau sewa
- property_category (string): second, aset_bank, atau baru
- description (string): deskripsi lengkap (biarkan kosong jika tidak ada)
- selling_point (string): selling point (jika ada)
- address (string): alamat lengkap
- city (string): nama kota
- province (string): nama provinsi
- selling_price (number): harga jual (jika ada)
- rental_price (number): harga sewa per bulan (jika ada)
- rental_period (string): per_hari, per_minggu, per_bulan, per_tahun
- bedroom (number): jumlah kamar tidur
- bathroom (number): jumlah kamar mandi
- garage (number): jumlah garasi
- carport (number): jumlah carport
- floor (number): jumlah lantai
- electricity (number): daya listrik dalam VA
- water_source (string): pdam, sumur, pdam_sumur, air_pegunungan
- certificate (string): SHM, HGB, SHGB, Strata
- facing (string): utara, selatan, timur, barat, timur_laut, barat_laut, tenggara, barat_daya
- condition (string): baru, sangat_baik, baik, cukup, kurang
- furnishing (string): unfurnished, semi_furnished, fully_furnished
- year_built (number): tahun bangun
- land_area (number): luas tanah dalam m²
- land_unit (string): m², are, ha
- land_width (number): lebar tanah dalam meter
- land_length (number): panjang tanah dalam meter
- building_area (number): luas bangunan dalam m²
- building_width (number): lebar bangunan dalam meter
- building_length (number): panjang bangunan dalam meter
- owner_name (string): JANGAN ISI → null
- owner_phone (string): JANGAN ISI → null
- owner_whatsapp (string): JANGAN ISI → null
- owner_email (string): JANGAN ISI → null

Jika ada data yang tidak ditemukan, biarkan null atau kosong.
Hanya kembalikan JSON valid, tanpa teks tambahan.`;

      const { text: result, provider } = await aiService.generateWithFallback(
        text,
        systemPrompt
      );

      // Parse JSON dari hasil AI
      let parsed;
      try {
        parsed = JSON.parse(result);
      } catch {
        const jsonMatch = result.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("AI response is not valid JSON");
        }
      }

      return NextResponse.json({ success: true, data: parsed, provider });
    }

    // ===== ACTION: CHAT (untuk chatbox AI) =====
    if (action === "chat") {
      const { message, context } = data;

      const systemPrompt = `Anda adalah asisten AI untuk agen properti. 
Anda membantu agen menganalisis properti, memberikan rekomendasi harga, strategi pemasaran, dan menjawab pertanyaan tentang properti.

Konteks properti saat ini (jika ada):
${context ? JSON.stringify(context, null, 2) : "Tidak ada properti yang dipilih"}

Berikan jawaban yang profesional, singkat, dan praktis. Fokus pada:
- Analisis harga jual/sewa
- Rekomendasi strategi pemasaran
- Potensi keunggulan properti
- Saran untuk meningkatkan nilai jual

Jawab dalam bahasa Indonesia.`;

      const { text, provider } = await aiService.generateWithFallback(
        message,
        systemPrompt
      );

      return NextResponse.json({ success: true, data: text, provider });
    }

    // ===== DEFAULT =====
    return NextResponse.json(
      { error: "Invalid action. Use: title, description, parse, chat, enhance_description" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("AI API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to generate with AI",
      },
      { status: 500 }
    );
  }
}