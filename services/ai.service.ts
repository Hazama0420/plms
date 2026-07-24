// services/ai.service.ts
import { GoogleGenAI } from "@google/genai";
import Groq from "groq-sdk";

export class AIService {
  private groq: Groq;
  private gemini: GoogleGenAI;
  private agnesApiKey: string;
  private agnesApiUrl: string;

  constructor() {
    this.groq = new Groq({
      apiKey: process.env.GROQ_API_KEY!,
    });

    this.gemini = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY!,
    });

    this.agnesApiKey = process.env.AGNES_API_KEY!;
    this.agnesApiUrl = process.env.AGNES_API_URL!;
  }

  // ===== FALLBACK 3 PROVIDER (Teks) =====
  /**
   * Generate teks dengan fallback 3 provider: Agnes → Groq → Gemini.
   */
  async generateWithFallback(prompt: string, systemPrompt?: string) {
    const providers = [
      { name: "Agnes AI", fn: () => this.generateAgnes(prompt, systemPrompt) },
      { name: "Groq", fn: () => this.generateGroq(prompt, systemPrompt) },
      { name: "Gemini", fn: () => this.generateGemini(prompt, systemPrompt) },
    ];

    let lastError: Error | null = null;

    for (const provider of providers) {
      try {
        const text = await provider.fn();
        return { text, provider: provider.name };
      } catch (error) {
        console.error(`${provider.name} failed:`, error);
        lastError = error as Error;
      }
    }

    throw new Error(
      `All AI providers failed. Last error: ${lastError?.message || "Unknown"}`
    );
  }

  // ===== GROQ =====
  private async generateGroq(prompt: string, systemPrompt?: string) {
    const messages: Groq.Chat.ChatCompletionMessageParam[] = [];

    if (systemPrompt) {
      messages.push({ role: "system", content: systemPrompt });
    }

    messages.push({ role: "user", content: prompt });

    const completion = await this.groq.chat.completions.create({
      model: "meta-llama/llama-3.3-70b-versatile",
      messages,
      temperature: 0.7,
      max_tokens: 1024,
      top_p: 1,
      stream: false,
    });

    const result = completion.choices[0]?.message?.content;
    if (!result) throw new Error("Groq returned empty response");
    return result;
  }

  // ===== GEMINI (Teks dengan Model Fallback: 3.5-flash-lite -> 2.5-flash) =====
  private async generateGemini(prompt: string, systemPrompt?: string) {
    const fullPrompt = systemPrompt
      ? `${systemPrompt}\n\nUser: ${prompt}`
      : prompt;

    const modelsToTry = ["gemini-3.5-flash-lite", "gemini-2.5-flash"];
    let lastError: any = null;

    for (const model of modelsToTry) {
      try {
        const response = await this.gemini.models.generateContent({
          model,
          contents: fullPrompt,
        });

        const result = response.text;
        if (result) return result;
      } catch (error) {
        console.warn(`Gemini model [${model}] failed, trying next...`, error);
        lastError = error;
      }
    }

    throw new Error(`All Gemini models failed. Last error: ${lastError?.message || "Unknown"}`);
  }

  // ===== AGNES AI =====
  private async generateAgnes(prompt: string, systemPrompt?: string) {
    const messages: Array<{ role: string; content: string }> = [];

    if (systemPrompt) {
      messages.push({ role: "system", content: systemPrompt });
    }

    messages.push({ role: "user", content: prompt });

    const response = await fetch(this.agnesApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.agnesApiKey}`,
      },
      body: JSON.stringify({
        model: "agnes-2.0-flash",
        messages,
        temperature: 0.7,
        max_tokens: 1024,
        top_p: 1,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Agnes AI error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const result = data.choices?.[0]?.message?.content;
    if (!result) throw new Error("Agnes AI returned empty response");
    return result;
  }

  // ===== FITUR AI LAINNYA =====

  async generateFollowup(leadName: string, property: string, status: string) {
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

    const { text } = await this.generateWithFallback(prompt);
    return text;
  }

  async summarizeProject(projectData: {
    name: string;
    progress: number;
    status: string;
    materials: Array<{ material_name: string; stock: number; status: string }>;
  }) {
    const prompt = `Buat ringkasan eksekutif 2 kalimat untuk proyek konstruksi.
Nama Proyek: ${projectData.name}
Progres: ${projectData.progress}%
Status: ${projectData.status}
Material terakhir: ${JSON.stringify(projectData.materials || [])}

Buat dalam Bahasa Indonesia, fokus pada rekomendasi tindakan jika ada kendala (misal: material menipis, perlu approve invoice). Jangan berikan saran teknis berlebihan, cukup ringkas dan actionable.`;

    const { text } = await this.generateWithFallback(prompt);
    return text;
  }

  /**
   * Scan invoice dari gambar (Gemini Vision dengan Model Fallback: 3.5-flash-lite -> 2.5-flash)
   */
  async scanInvoice(imageBuffer: Buffer, mimeType: string = "image/jpeg") {
    const base64 = imageBuffer.toString("base64");
    const modelsToTry = ["gemini-3.5-flash-lite", "gemini-2.5-flash"];
    let lastError: any = null;

    for (const model of modelsToTry) {
      try {
        const response = await this.gemini.models.generateContent({
          model,
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: "Ekstrak informasi dari invoice ini. Berikan dalam format JSON murni dengan field: invoice_number, vendor, date, total, items (array of {description, qty, price}).",
                },
                {
                  inlineData: {
                    mimeType: mimeType,
                    data: base64,
                  },
                },
              ],
            },
          ],
        });

        const rawText = response.text || "{}";
        const cleaned = rawText.replace(/```json|```/g, "").trim();
        return JSON.parse(cleaned);
      } catch (error) {
        console.warn(`Gemini model [${model}] failed for invoice scan, trying next...`, error);
        lastError = error;
      }
    }

    throw new Error(`Failed to scan invoice across all Gemini models. Last error: ${lastError?.message || "Unknown"}`);
  }

  async generateTitle(propertyData: any) {
    const prompt = `Buat judul properti yang menarik untuk listing properti dengan data: 
${JSON.stringify(propertyData, null, 2)}. 
Judul harus singkat, maksimal 10 kata, dalam Bahasa Indonesia.`;
    const { text } = await this.generateWithFallback(prompt);
    return text;
  }

  async generateDescription(propertyData: any) {
    const prompt = `Buat deskripsi properti yang profesional dan persuasif untuk listing properti dengan data: 
${JSON.stringify(propertyData, null, 2)}. 
Deskripsi harus dalam Bahasa Indonesia, mencakup keunggulan, lokasi, spesifikasi, dan ajakan bertindak. Maksimal 150 kata.`;
    const { text } = await this.generateWithFallback(prompt);
    return text;
  }

  async enhanceDescription(userDescription: string, propertyData: any) {
    const prompt = `Perbaiki dan lengkapi deskripsi properti berikut berdasarkan data properti.
Deskripsi user: "${userDescription}"
Data properti: ${JSON.stringify(propertyData, null, 2)}

Hasilkan deskripsi yang lebih profesional, informatif, dan persuasif. Dalam Bahasa Indonesia. Maksimal 150 kata.`;
    const { text } = await this.generateWithFallback(prompt);
    return text;
  }

  async parseListingText(text: string) {
    const prompt = `Ekstrak informasi properti dari teks listing berikut dan ubah ke format JSON dengan field: 
title, listing_type (jual/sewa), property_type (rumah/apartemen/ruko/dll), price, land_area, building_area, bedroom, bathroom, address, description.
Teks: "${text}"

Jawaban hanya berupa JSON valid, tanpa tambahan apapun.`;
    const { text: result } = await this.generateWithFallback(prompt);
    try {
      const cleaned = result.replace(/```json|```/g, "").trim();
      return JSON.parse(cleaned);
    } catch {
      throw new Error("Failed to parse listing text");
    }
  }
}

// ===== SINGLETON INSTANCE =====
export const aiService = new AIService();