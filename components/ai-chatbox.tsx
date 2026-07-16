// components/ai-chatbox.tsx

"use client";

import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { MessageCircle, X, Send, Minimize2, Maximize2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface AIChatboxProps {
  propertyContext?: any;
  className?: string;
}

export function AIChatbox({ propertyContext, className }: AIChatboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "👋 Halo! Saya asisten AI PLMS. Tanyakan apa saja tentang properti ini, saya siap membantu analisis dan rekomendasi!",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto scroll ke pesan terbaru
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + "px";
    }
  }, [input]);

  // Send message
  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "chat",
          data: {
            message: input.trim(),
            context: propertyContext || null,
          },
        }),
      });

      const result = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: result.success
          ? result.data
          : "Maaf, saya tidak bisa memproses pertanyaan Anda. Silakan coba lagi.",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (!result.success) {
        toast.error("Gagal mendapat respon dari AI");
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Maaf, terjadi kesalahan. Silakan coba lagi nanti.",
          timestamp: new Date(),
        },
      ]);
      toast.error("Gagal terhubung ke AI service");
    } finally {
      setLoading(false);
    }
  };

  // Handle Enter key (Shift+Enter untuk new line)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Format waktu
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed bottom-6 right-6 z-50 p-4 rounded-full shadow-lg transition-all duration-300",
          isOpen
            ? "bg-rose-500 hover:bg-rose-600 scale-110"
            : "bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 scale-100 hover:scale-110",
          "text-white"
        )}
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div
          className={cn(
            "fixed z-50 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 transition-all duration-300",
            isMinimized
              ? "bottom-20 right-6 w-80 h-14 overflow-hidden"
              : "bottom-20 right-6 w-[400px] h-[500px] flex flex-col",
            className
          )}
        >
          {/* Header */}
          <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-t-2xl p-4 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={18} />
              <CardTitle className="text-sm font-semibold">AI Assistant</CardTitle>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1 hover:bg-white/20 rounded transition"
              >
                {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-white/20 rounded transition"
              >
                <X size={16} />
              </button>
            </div>
          </CardHeader>

          {/* Chat Content */}
          {!isMinimized && (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex items-start gap-2 max-w-[85%]",
                      msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                    )}
                  >
                    <div
                      className={cn(
                        "p-3 rounded-2xl text-sm",
                        msg.role === "user"
                          ? "bg-blue-500 text-white rounded-br-none"
                          : "bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-bl-none"
                      )}
                    >
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                      <div
                        className={cn(
                          "text-[10px] mt-1",
                          msg.role === "user" ? "text-blue-200" : "text-slate-400"
                        )}
                      >
                        {formatTime(msg.timestamp)}
                      </div>
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex items-center gap-2 text-slate-400 text-sm p-2">
                    <span className="animate-pulse">●</span>
                    <span className="animate-pulse delay-100">●</span>
                    <span className="animate-pulse delay-200">●</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="border-t border-slate-200 dark:border-slate-700 p-4">
                <div className="flex items-end gap-2">
                  <Textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Tanyakan tentang properti..."
                    className="flex-1 resize-none min-h-[44px] max-h-[120px] border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                    rows={1}
                    disabled={loading}
                  />
                  <Button
                    onClick={handleSend}
                    disabled={!input.trim() || loading}
                    className="shrink-0 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white"
                  >
                    <Send size={18} />
                  </Button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Tekan Enter untuk kirim, Shift+Enter untuk new line
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}