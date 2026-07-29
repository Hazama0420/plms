// app/api/ai/scan-invoice/route.ts
import { NextRequest, NextResponse } from "next/server";
import { aiService } from "@/services/ai.service";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "File gambar tidak ditemukan." },
        { status: 400 }
      );
    }

    // Ubah File objek ke Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = file.type || "image/jpeg";

    // Panggil Gemini Vision dari AI Service
    const extractedData = await aiService.scanInvoice(buffer, mimeType);

    return NextResponse.json({
      success: true,
      data: extractedData,
    });
  } catch (error: any) {
    console.error("API Scan Invoice Error:", error);
    return NextResponse.json(
      { error: error?.message || "Gagal mengekstrak data dari kuitansi/invoice." },
      { status: 500 }
    );
  }
}