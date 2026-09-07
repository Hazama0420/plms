// app/api/ai/generate/route.ts

import { NextRequest, NextResponse } from "next/server";
import { aiService } from "@/services/ai.service";
import { requireAuth } from "@/lib/api-auth";
import { authorizeAI } from "@/lib/ai/policy";
import { estimateTokens } from "@/lib/ai-quota";

/**
 * Normalisasi dan ekstraksi semantik data properti Indonesia.
 * Menjamin angka (LT, LB, Listrik, KT, KM, Lantai, Carport), legalitas (SHM/HGB),
 * fasilitas, kondisi, dan kandidat lokasi diekstrak secara akurat tanpa kehilangan data.
 */
function normalizePropertyExtraction(parsed: any, rawText: string) {
  const result: Record<string, any> = typeof parsed === "object" && parsed !== null ? { ...parsed } : {};
  const lowerText = rawText.toLowerCase();

  // Helper untuk parsing angka bersih dari string/number
  const parseCleanNumber = (val: any): number | null => {
    if (val === undefined || val === null) return null;
    if (typeof val === "number" && !isNaN(val) && val > 0) return val;
    if (typeof val === "string") {
      const cleaned = val.replace(/,/g, ".").replace(/[^0-9.]/g, "");
      const num = parseFloat(cleaned);
      return !isNaN(num) && num > 0 ? num : null;
    }
    return null;
  };

  // 1. Luas Tanah (LT)
  let landArea = parseCleanNumber(result.land_area);
  if (!landArea) {
    const ltMatch = rawText.match(/(?:lt|luas\s*tanah|luas\s*lahan|luas|tanah|land\s*area)\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*(?:m2|m²|m"|m\b|meter)?/i);
    if (ltMatch) {
      landArea = parseFloat(ltMatch[1].replace(/,/g, "."));
    }
  }
  result.land_area = landArea || null;

  // 2. Luas Bangunan (LB)
  let buildingArea = parseCleanNumber(result.building_area);
  if (!buildingArea) {
    const lbMatch = rawText.match(/(?:lb|luas\s*bangunan|bangunan|building\s*area)\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*(?:m2|m²|m"|m\b|meter)?/i);
    if (lbMatch) {
      buildingArea = parseFloat(lbMatch[1].replace(/,/g, "."));
    }
  }
  result.building_area = buildingArea || null;

  // 3. Daya Listrik (Electricity)
  let electricity = parseCleanNumber(result.electricity);
  if (!electricity) {
    const listMatch = rawText.match(/(?:listrik|daya(?:\s*listrik)?)\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*(?:w\b|watt\b|va\b)?/i) ||
                      rawText.match(/\b(\d{3,5})\s*(?:watt|w|va)\b/i);
    if (listMatch) {
      electricity = parseInt(listMatch[1].replace(/[^0-9]/g, ""), 10);
    }
  }
  result.electricity = electricity || null;

  // 4. Sertifikat / Legalitas (Certificate)
  const certRaw = String(result.certificate || "").toLowerCase();
  let cert = "";
  if (certRaw.includes("shm") || certRaw.includes("hak milik") || lowerText.includes("shm") || lowerText.includes("hak milik") || /surat["\s]*shm/i.test(rawText)) {
    cert = "SHM";
  } else if (certRaw.includes("hgb") || certRaw.includes("shgb") || certRaw.includes("guna bangunan") || lowerText.includes("hgb") || lowerText.includes("shgb")) {
    cert = "HGB";
  } else if (certRaw.includes("hak pakai") || certRaw.includes("hp") || lowerText.includes("hak pakai")) {
    cert = "Hak Pakai";
  } else if (certRaw.includes("hak sewa") || lowerText.includes("hak sewa")) {
    cert = "Hak Sewa";
  } else if (certRaw.includes("hgu") || lowerText.includes("hgu")) {
    cert = "HGU";
  } else if (certRaw.includes("girik") || certRaw.includes("letter c") || lowerText.includes("girik") || lowerText.includes("letter c")) {
    cert = "Girik";
  } else if (certRaw.includes("ppjb") || lowerText.includes("ppjb")) {
    cert = "PPJB";
  } else if (certRaw.includes("strata") || lowerText.includes("strata")) {
    cert = "Strata";
  } else if (certRaw.includes("adat") || lowerText.includes("adat")) {
    cert = "Adat";
  }
  result.certificate = cert || null;

  // 5. Kamar Tidur (Bedrooms)
  let bedroom = parseCleanNumber(result.bedroom);
  if (!bedroom) {
    const ktMatch = rawText.match(/\b(?:kamar\s*tidur|kt)\s*[:=]?\s*(\d+)/i) ||
                    rawText.match(/\b(\d+)\s*(?:kt|kamar\s*tidur|kamar)\b/i);
    if (ktMatch) bedroom = parseInt(ktMatch[1], 10);
  }
  result.bedroom = bedroom || null;

  // 6. Kamar Mandi (Bathrooms)
  let bathroom = parseCleanNumber(result.bathroom);
  if (!bathroom) {
    const kmMatch = rawText.match(/\b(?:kamar\s*mandi|km)\s*[:=]?\s*(\d+)/i) ||
                    rawText.match(/\b(\d+)\s*(?:km|kamar\s*mandi)\b/i);
    if (kmMatch) bathroom = parseInt(kmMatch[1], 10);
  }
  result.bathroom = bathroom || null;

  // 7. Jumlah Lantai (Floor)
  let floor = parseCleanNumber(result.floor);
  if (!floor) {
    const floorMatch = rawText.match(/\b(\d+)\s*(?:lantai|lt\.)\b/i) || rawText.match(/\b(?:lantai|tingkat)\s*(\d+)\b/i);
    if (floorMatch) floor = parseInt(floorMatch[1], 10);
  }
  result.floor = floor || null;

  // 8. Carport & Garasi
  let carport = parseCleanNumber(result.carport);
  if (!carport) {
    const cpMatch = rawText.match(/\bcarport\s*[:=]?\s*(\d+)\b/i) || rawText.match(/\bcarport\s*(\d+)\s*mobil\b/i);
    if (cpMatch) carport = parseInt(cpMatch[1], 10);
  }
  result.carport = carport || null;

  let garage = parseCleanNumber(result.garage);
  if (!garage) {
    const grMatch = rawText.match(/\bgarasi\s*[:=]?\s*(\d+)\b/i) || rawText.match(/\bgarasi\s*(\d+)\s*mobil\b/i);
    if (grMatch) garage = parseInt(grMatch[1], 10);
  }
  result.garage = garage || null;

  // 9. Fasilitas (Facilities)
  const facilitiesList: string[] = Array.isArray(result.facilities) ? [...result.facilities] : [];
  const addFacility = (fac: string) => {
    if (!facilitiesList.includes(fac)) facilitiesList.push(fac);
  };

  if (lowerText.includes("kolam renang") || lowerText.includes("swimming pool") || lowerText.includes("pool")) addFacility("Kolam Renang");
  if (lowerText.includes("cctv")) addFacility("CCTV System");
  if (lowerText.includes("one gate") || lowerText.includes("one-gate") || lowerText.includes("onegate")) addFacility("One Gate System");
  if (lowerText.includes("keamanan 24 jam") || lowerText.includes("security 24 jam") || lowerText.includes("satpam 24 jam") || lowerText.includes("security 24jam")) addFacility("Keamanan 24 Jam");
  if (lowerText.includes("taman") || lowerText.includes("garden")) addFacility("Taman / Garden");
  if (/\bac\b|air conditioner|pendingin/i.test(rawText)) addFacility("AC");
  if (lowerText.includes("wifi") || lowerText.includes("internet")) addFacility("WiFi / Internet");
  if (lowerText.includes("water heater") || lowerText.includes("pemanas air")) addFacility("Water Heater");
  if (lowerText.includes("gym") || lowerText.includes("fitness")) addFacility("Gym / Fitness Center");
  if (lowerText.includes("balkon") || lowerText.includes("balcony")) addFacility("Balkon");
  if (lowerText.includes("musholla") || lowerText.includes("masjid")) addFacility("Musholla / Tempat Ibadah");
  if (lowerText.includes("playground") || lowerText.includes("area bermain")) addFacility("Playground");
  if (lowerText.includes("kulkas") || lowerText.includes("refrigerator")) addFacility("Kulkas");
  if (lowerText.includes("mesin cuci")) addFacility("Mesin Cuci");
  if (lowerText.includes("akses kartu") || lowerText.includes("access card")) addFacility("Akses Kartu / Access Card");

  result.facilities = facilitiesList;

  // 10. Perabotan (Furnishing)
  if (!result.furnishing) {
    if (lowerText.includes("full furnished") || lowerText.includes("fully furnished") || lowerText.includes("full furnish")) {
      result.furnishing = "Furnished";
    } else if (lowerText.includes("semi furnished") || lowerText.includes("semi furnish")) {
      result.furnishing = "Semi Furnished";
    } else if (lowerText.includes("unfurnished") || lowerText.includes("kosong") || lowerText.includes("non furnished")) {
      result.furnishing = "Unfurnished";
    }
  }

  // 11. Kondisi (Condition)
  if (!result.condition) {
    if (lowerText.includes("siap huni") || lowerText.includes("brand new") || lowerText.includes("sangat baik") || lowerText.includes("bagus")) {
      result.condition = "Bagus";
    } else if (lowerText.includes("renovasi ringan") || lowerText.includes("minim renovasi")) {
      result.condition = "Butuh Minim Renovasi";
    } else if (lowerText.includes("renovasi total") || lowerText.includes("hitung tanah") || lowerText.includes("butuh renovasi")) {
      result.condition = "Butuh Renovasi Total";
    } else if (lowerText.includes("terenovasi") || lowerText.includes("baru renovasi")) {
      result.condition = "Terenovasi";
    }
  }

  // 12. Kandidat Lokasi (location_candidate)
  if (typeof result.location_candidate !== "string" || !result.location_candidate.trim()) {
    result.location_candidate = (typeof result.city === "string" && result.city.trim()) ? result.city.trim() : null;
  } else {
    result.location_candidate = result.location_candidate.trim();
  }

  return result;
}

export async function POST(request: NextRequest) {
  try {
    // Endpoint ini memanggil Gemini/Groq berbayar — wajib login.
    const auth = await requireAuth();
    if (!auth.ok) return auth.response;

    const { action, data } = await request.json();

    if (!data || typeof data !== "object") {
      return NextResponse.json(
        { success: false, error: "Parameter 'data' wajib berupa objek." },
        { status: 400 }
      );
    }

    let featureKey = "property.description";
    if (action === "title") featureKey = "property.title";
    else if (action === "description" || action === "enhance_description") featureKey = "property.description";
    else if (action === "parse") featureKey = "property.parse";
    else if (action === "features") featureKey = "property.features";
    else if (action === "chat") featureKey = "property.description"; // Fallback for agent chat

    const guard = await authorizeAI({
      featureKey,
      req: request,
    });
    if (!guard.ok) return guard.response;

    // Pembungkus tipis agar setiap cabang otomatis mencatat pemakaiannya.
    const generate = async (prompt: string, systemPrompt?: string) => {
      try {
        const result = await aiService.generateWithFallback(prompt, systemPrompt);
        await guard.commit(
          estimateTokens(prompt) +
            estimateTokens(systemPrompt) +
            estimateTokens(result.text)
        );
        return result;
      } catch (err) {
        await guard.rollback();
        throw err;
      }
    };

    // ===== ACTION: TITLE =====
    if (action === "title") {
      const prompt = `Buat judul properti untuk ${data.type} di ${data.location}, tipe listing ${data.listingType}. Maks 60 karakter.`;
      const systemPrompt =
        "Buat judul singkat, deskriptif, dan menarik untuk listing properti.";

      const { text, provider } = await generate(prompt, systemPrompt);

      return NextResponse.json({ success: true, data: text, provider });
    }

    // ===== ACTION: DESCRIPTION (GENERATE BARU) =====
    if (action === "description") {
      const prompt = `Buat deskripsi properti ${data.type} di ${data.location}. Harga: Rp${data.price}. Kamar: ${data.bedrooms}, KM: ${data.bathrooms}, LT: ${data.landArea}m², LB: ${data.buildingArea}m².`;
      const systemPrompt =
        "Deskripsi profesional, persuasif, dalam bahasa Indonesia. Sorot keunggulan dan ajak hubungi agen.";

      const { text, provider } = await generate(prompt, systemPrompt);

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
        const { text, provider } = await generate(prompt, systemPrompt);
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

      const { text, provider } = await generate(prompt, systemPrompt);

      return NextResponse.json({ success: true, data: text, provider });
    }

    // ===== ACTION: PARSE (EKSTRAK DATA DARI TEKS PROPERTI INDONESIA) =====
    if (action === "parse") {
      const { text, currentType, fieldNames, areaList } = data;

      const systemPrompt = `Anda adalah asisten AI spesialis ekstraksi data properti Indonesia (Real-Estate AI Specialist).
Tugas Anda: Analisis dan ekstrak semua informasi secara kontekstual dari teks deskripsi listing berikut ke dalam field-field yang tersedia.

DESKRIPSI LISTING:
"${text}"

TIPE PROPERTI SAAT INI: ${currentType || "belum ditentukan"}
FIELD YANG TERSEDIA: ${fieldNames || "semua field"}

PANDUAN & TERMINOLOGI PROPERTI INDONESIA:
1. **Luas Tanah (LT) & Luas Bangunan (LB)**:
   - "LT 350m\"", "LT 350m2", "LT: 350", "luas tanah 350 meter", "tanah 350" → land_area = 350
   - "LB 550m\" (kurleb)", "LB 550m2", "luas bangunan 550" → building_area = 550
   - Angka perkiraan seperti "(kurleb)", "kurang lebih", "±", "sekitar" HARUS TETAP DIEKSTRAK angkanya (jangan jadi null atau 0).
2. **Daya Listrik (Electricity)**:
   - "LISTRIK 5500W", "listrik 5500 watt", "5500 VA", "listrik: 5500", "daya 2200" → electricity = 5500 (number dalam VA/Watt).
3. **Sertifikat & Legalitas (Certificate)**:
   - "Surat\" SHM", "Surat SHM", "Sertifikat Hak Milik", "SHM" → certificate = "SHM"
   - "HGB", "SHGB", "Hak Guna Bangunan" → certificate = "HGB"
   - "AJB", "Girik", "Letter C", "PPJB", "Strata", "Hak Pakai", "Hak Sewa", "HGU" → petakan ke jenis sertifikat yang sesuai.
4. **Kamar & Sanitasi**:
   - "KT 5+1", "5KT", "5 kamar tidur" → bedroom = 5
   - "KM 3+1", "3KM", "3 kamar mandi" → bathroom = 3
5. **Kapasitas Kendaraan & Lantai**:
   - "carport 2 mobil", "carport 2" → carport = 2
   - "garasi 1 mobil", "garasi 1" → garage = 1
   - "2 lantai", "rumah 2 tingkat", "lantai 2" → floor = 2
6. **Kondisi & Perabot**:
   - "siap huni", "brand new", "bagus" → condition = "Bagus"
   - "full furnished", "fully furnished" → furnishing = "Furnished"
   - "semi furnished" → furnishing = "Semi Furnished"
   - "unfurnished", "kosong" → furnishing = "Unfurnished"
7. **Fasilitas Properti**:
   - "ada kolam renang", "pool" → sertakan "Kolam Renang"
   - "CCTV" → sertakan "CCTV System"
   - "one gate system", "keamanan 24 jam", "satpam 24 jam" → sertakan "Keamanan 24 Jam"
   - "AC", "taman", "water heater", "gym", "wifi", "balkon", "musholla", "playground" → masukkan ke array facilities.
8. **Kandidat Lokasi (location_candidate)**:
   - Ekstrak nama area/kecamatan/kota spesifik dari teks (contoh: "Cipondoh", "Gunung Sindur", "Bintaro Sektor 9", "Kebayoran Baru", "BSD City"). Jika tidak ada nama geografis spesifik, isi null. JANGAN MENEBAK.
9. **Konversi Harga**:
   - "2.5M", "2,5 Miliar" → 2500000000; "500jt", "500 Juta" → 500000000.

JANGAN ISI FIELD "upload_gambar".
JANGAN MENGARANG DATA YANG TIDAK DISEBUTKAN DI TEKS.

Kembalikan format JSON murni:
{
  "title": string (judul ringkas menarik max 60 karakter),
  "property_type": "rumah" | "apartemen" | "tanah" | "villa" | "ruko" | "kantor" | "pabrik" | "gudang" | "hotel" | "ruang_usaha",
  "listing_type": "jual" | "sewa",
  "property_category": "second" | "aset_bank" | "baru",
  "description": string (deskripsi terstruktur),
  "selling_point": string (keunggulan properti),
  "address": string (alamat jalan bila ada),
  "location_candidate": string | null,
  "city": string | null,
  "province": string | null,
  "selling_price": number | null,
  "rental_price": number | null,
  "rental_period": "per_hari" | "per_minggu" | "per_bulan" | "per_tahun" | null,
  "bedroom": number | null,
  "bathroom": number | null,
  "garage": number | null,
  "carport": number | null,
  "floor": number | null,
  "electricity": number | null,
  "water_source": string | null,
  "certificate": string | null,
  "facing": string | null,
  "condition": string | null,
  "furnishing": string | null,
  "year_built": number | null,
  "land_area": number | null,
  "land_unit": "m²",
  "land_width": number | null,
  "land_length": number | null,
  "building_area": number | null,
  "building_width": number | null,
  "building_length": number | null,
  "facilities": string[],
  "owner_name": null,
  "owner_phone": null,
  "owner_whatsapp": null,
  "owner_email": null
}`;

      const { text: result, provider } = await generate(text, systemPrompt);

      // Parse JSON dari hasil AI
      let parsed: any;
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

      // Normalisasi & Fallback Semantik Real-Estate Indonesia
      const normalized = normalizePropertyExtraction(parsed, text);

      return NextResponse.json({ success: true, data: normalized, provider });
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

      const { text, provider } = await generate(message, systemPrompt);

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