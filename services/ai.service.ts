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

  // ===== FALLBACK 3 PROVIDER =====
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
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
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

  // ===== GEMINI =====
  private async generateGemini(prompt: string, systemPrompt?: string) {
    const fullPrompt = systemPrompt
      ? `${systemPrompt}\n\nUser: ${prompt}`
      : prompt;

    const interaction = await this.gemini.interactions.create({
      model: "gemini-2.5-flash",
      input: fullPrompt,
    });

    const result = interaction.output_text;
    if (!result) throw new Error("Gemini returned empty response");
    return result;
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
}

// ===== SINGLETON INSTANCE =====
export const aiService = new AIService();