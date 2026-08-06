// app/api/ai/scan-invoice/route.ts
import { NextRequest, NextResponse } from "next/server";
import { aiService } from "@/services/ai.service";
import { requireAuth } from "@/lib/api-auth";
import { enforceAiQuota, estimateImageTokens } from "@/lib/ai-quota";

// Batas ukuran unggahan agar Gemini Vision tidak dibanjiri berkas besar.
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/heic"];

export async function POST(req: NextRequest) {
  try {
    // Endpoint ini memanggil Gemini Vision berbayar — wajib login.
    const auth = await requireAuth();
    if (!auth.ok) return auth.response;

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "File gambar tidak ditemukan." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: "Ukuran file melebihi batas 10 MB." },
        { status: 413 }
      );
    }

    const mimeType = file.type || "image/jpeg";
    if (!ALLOWED_MIME.includes(mimeType)) {
      return NextResponse.json(
        { error: `Tipe file "${mimeType}" tidak didukung. Gunakan JPG, PNG, atau WEBP.` },
        { status: 415 }
      );
    }

    // Ubah File objek ke Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Kuota dihitung dari ukuran berkas: pemindaian gambar jauh lebih mahal
    // daripada permintaan teks, dan biayanya sebanding dengan resolusinya.
    const quota = await enforceAiQuota({
      feature: "scan_invoice",
      req,
      userId: auth.ctx.userId,
      role: auth.ctx.role,
      estimatedTokens: estimateImageTokens(buffer.byteLength),
    });
    if (!quota.ok) return quota.response;

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