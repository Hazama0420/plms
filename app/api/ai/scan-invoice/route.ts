// app/api/ai/scan-invoice/route.ts
import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const image = formData.get("image") as File;

    if (!image) {
      return NextResponse.json({ error: "File gambar invoice tidak ditemukan" }, { status: 400 });
    }

    // Ubah file gambar menjadi buffer -> base64
    const bytes = await image.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = buffer.toString("base64");

    // Panggil Gemini API dengan struktur 'contents' yang benar
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", // atau model stabil yang digunakan
      contents: [
        {
          role: "user",
          parts: [
            {
              text: "Ekstrak informasi dari invoice ini. Berikan dalam format JSON murni dengan field: invoice_number, vendor_name, issue_date, due_date, total_amount, items (array of {description, quantity, price}).",
            },
            {
              inlineData: {
                mimeType: image.type || "image/jpeg",
                data: base64Image,
              },
            },
          ],
        },
      ],
    });

    let rawText = response.text || "{}";
    // Bersihkan format markdown block jika ada
    rawText = rawText.replace(/```json/g, "").replace(/```/g, "").trim();

    const parsedData = JSON.parse(rawText);

    return NextResponse.json({ success: true, data: parsedData });
  } catch (error: any) {
    console.error("Scan Invoice AI Error:", error);
    return NextResponse.json({ error: error.message || "Gagal memindai invoice" }, { status: 500 });
  }
}