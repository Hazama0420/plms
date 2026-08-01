// components/AIChatWidget.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, X, Send, Bot, Sparkles } from "lucide-react";

interface Message {
  role: "assistant" | "user";
  text: string;
}

export default function AIChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: "Halo! Selamat datang di Inland Property. Saya Agnes, siap membantu Anda seputar dunia properti, pencarian listing, maupun simulasi KPR.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isLimited, setIsLimited] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading || isLimited) return;

    const userMessage = input.trim();
    setInput("");

    const newMessages: Message[] = [...messages, { role: "user", text: userMessage }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages: newMessages }),
      });

      const data = await response.json();

      if (response.status === 429 || data.limitExceeded) {
        setIsLimited(true);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", text: data.error },
        ]);
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || "Gagal mendapatkan respon dari AI");
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: data.text },
      ]);
    } catch (error: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "Maaf, terjadi gangguan koneksi ke server AI. Silakan coba beberapa saat lagi atau hubungi CS kami melalui WhatsApp.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    /* 🟢 POSISI RESPONGSIF:
       - Mobile: bottom-20 (di atas BottomNav) & right-4
       - Desktop (md:): bottom-6 & right-6 */
    <div className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-40 transition-all duration-300">
      {!isOpen ? (
        <Button
          onClick={() => setIsOpen(true)}
          className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-2xl flex items-center justify-center transition-all cursor-pointer hover:scale-105"
          title="Tanya Agnes AI"
        >
          <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6" />
        </Button>
      ) : (
        <Card className="w-[calc(100vw-2rem)] max-w-[360px] sm:w-96 h-[460px] sm:h-[520px] max-h-[75vh] shadow-2xl rounded-3xl bg-slate-950/90 backdrop-blur-xl border border-white/20 text-white flex flex-col overflow-hidden">
          {/* HEADER */}
          <CardHeader className="bg-emerald-900/40 border-b border-white/10 px-4 py-3 flex flex-row items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                <Bot className="h-4 w-4 text-emerald-400" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                  Agnes AI <Sparkles className="w-3 h-3 text-emerald-400" />
                </CardTitle>
                <p className="text-[10px] text-emerald-400">Online • Inland Property</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white transition cursor-pointer p-1 rounded-lg hover:bg-white/10"
            >
              <X className="h-5 w-5" />
            </button>
          </CardHeader>

          {/* KONTEN PESAN */}
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-2 ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {msg.role === "assistant" && (
                  <div className="w-6 h-6 rounded-full bg-emerald-600/30 flex items-center justify-center shrink-0 mt-1">
                    <Bot className="h-3 w-3 text-emerald-400" />
                  </div>
                )}
                <div
                  className={`p-3 rounded-2xl max-w-[85%] leading-relaxed whitespace-pre-line ${
                    msg.role === "user"
                      ? "bg-emerald-600 text-white rounded-br-none"
                      : "bg-white/10 text-slate-200 rounded-bl-none border border-white/10"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-2 items-center text-slate-400 text-[11px] py-1">
                <Bot className="h-3 w-3 animate-pulse text-emerald-400" /> Agnes sedang mengetik...
              </div>
            )}
            <div ref={messagesEndRef} />
          </CardContent>

          {/* FORM INPUT */}
          <form onSubmit={handleSend} className="p-3 border-t border-white/10 bg-black/20 flex gap-2 shrink-0">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isLimited ? "Batas harian tercapai..." : "Tanya sesuatu ke Agnes..."}
              disabled={isLimited || loading}
              className="h-9 text-xs rounded-xl bg-white/10 border-white/20 text-white placeholder:text-slate-400 focus-visible:ring-emerald-400 disabled:opacity-50"
            />
            <Button
              type="submit"
              size="icon"
              disabled={loading || isLimited}
              className="h-9 w-9 shrink-0 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl cursor-pointer disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}