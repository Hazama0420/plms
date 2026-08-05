// components/leads/AiWriterModal.tsx
"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Sparkles,
  Copy,
  Check,
  MessageSquare,
  RefreshCw,
  Lock,
  Wand2,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

interface AiWriterModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadName: string;
  leadPhone: string;
  propertyTitle: string;
  leadStatus?: string;
  userRole: string;
}

export function AiWriterModal({
  isOpen,
  onClose,
  leadName,
  leadPhone,
  propertyTitle,
  leadStatus = "Perlu Follow-up",
  userRole,
}: AiWriterModalProps) {
  const [generatedText, setGeneratedText] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Kunci Akses Role
  const normalizedRole = (userRole || "").toLowerCase();
  const isAdmin =
    normalizedRole === "super_admin" ||
    normalizedRole === "superadmin" ||
    normalizedRole === "admin";

  const handleGenerate = async () => {
    if (!isAdmin) {
      toast.error("Fitur ini khusus untuk Super Admin dan Admin.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/ai/followup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadName,
          property: propertyTitle,
          status: leadStatus,
          // Role tidak lagi dikirim: server menentukannya sendiri dari sesi.
          // `isAdmin` di atas murni untuk menyembunyikan tombol, bukan penjagaan.
        }),
      });

      const data = await res.json();
      if (res.ok && data.message) {
        setGeneratedText(data.message);
        toast.success("Pesan AI berhasil dibuat!");
      } else {
        toast.error(data.error || "Gagal membuat pesan AI.");
      }
    } catch (err) {
      toast.error("Gagal terhubung ke AI Service.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!generatedText) return;
    navigator.clipboard.writeText(generatedText);
    setCopied(true);
    toast.success("Pesan disalin ke clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendWhatsApp = () => {
    if (!leadPhone || leadPhone === "#") {
      toast.error("Nomor WhatsApp prospek tidak tersedia.");
      return;
    }
    const cleanPhone = leadPhone.replace(/[^0-9]/g, "");
    const formattedPhone = cleanPhone.startsWith("0") ? "62" + cleanPhone.slice(1) : cleanPhone;
    const encodedText = encodeURIComponent(generatedText);
    window.open(`https://wa.me/${formattedPhone}?text=${encodedText}`, "_blank");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border-[#F4EFE6] dark:border-slate-800 rounded-2xl p-5 shadow-xl">
        <DialogHeader className="space-y-1 border-b border-[#F4EFE6] dark:border-slate-800 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-emerald-600 text-white rounded-lg">
                <Sparkles className="w-4 h-4" />
              </div>
              <DialogTitle className="text-xs font-bold text-slate-900 dark:text-slate-100">
                AI Writer Follow-Up
              </DialogTitle>
            </div>
            <Badge
              variant="outline"
              className={
                isAdmin
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]"
                  : "bg-amber-50 text-amber-700 border-amber-200 text-[10px]"
              }
            >
              {isAdmin ? "Admin Access" : "Akses Terkunci"}
            </Badge>
          </div>
          <DialogDescription className="text-[11px] text-slate-500">
            Draf pesan WhatsApp otomatis untuk prospek <span className="font-semibold text-slate-800 dark:text-slate-200">{leadName}</span>.
          </DialogDescription>
        </DialogHeader>

        {/* 🔒 TAMPILAN LOCK UNTUK NON-ADMIN */}
        {!isAdmin ? (
          <div className="py-6 text-center space-y-2.5">
            <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto">
              <Lock className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                Fitur Terkunci
              </h4>
              <p className="text-[11px] text-slate-500 max-w-xs mx-auto leading-relaxed">
                Fitur AI Writer Follow-Up hanya dapat digunakan oleh **Super Admin** dan **Admin**.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>Draf Pesan WhatsApp AI:</span>
                {generatedText && (
                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={loading}
                    className="text-emerald-600 hover:underline flex items-center gap-1 cursor-pointer font-medium"
                  >
                    <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} /> Generate Ulang
                  </button>
                )}
              </div>

              <Textarea
                value={generatedText}
                onChange={(e) => setGeneratedText(e.target.value)}
                placeholder="Klik tombol 'Generate Pesan AI' untuk membuat pesan..."
                className="min-h-[120px] text-xs bg-[#FDFBF7] dark:bg-slate-800 border-[#F4EFE6] dark:border-slate-700 rounded-xl leading-relaxed resize-none focus-visible:ring-emerald-600"
              />
            </div>
          </div>
        )}

        <DialogFooter className="border-t border-[#F4EFE6] dark:border-slate-800 pt-3 flex flex-col sm:flex-row gap-2">
          {isAdmin && !generatedText ? (
            <Button
              onClick={handleGenerate}
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9 rounded-xl gap-1.5 cursor-pointer shadow-2xs"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Menyusun Pesan...
                </>
              ) : (
                <>
                  <Wand2 className="w-3.5 h-3.5" /> Generate Pesan AI
                </>
              )}
            </Button>
          ) : isAdmin && generatedText ? (
            <div className="flex gap-2 w-full">
              <Button
                variant="outline"
                onClick={handleCopy}
                className="flex-1 h-9 text-xs rounded-xl border-[#F4EFE6] gap-1.5 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Tersalin" : "Salin Pesan"}
              </Button>
              <Button
                onClick={handleSendWhatsApp}
                className="flex-1 h-9 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-1.5 cursor-pointer shadow-2xs"
              >
                <MessageSquare className="w-3.5 h-3.5" /> Kirim WA
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              onClick={onClose}
              className="w-full h-9 text-xs rounded-xl border-[#F4EFE6] cursor-pointer"
            >
              Tutup
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}