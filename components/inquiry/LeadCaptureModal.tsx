// components/inquiry/LeadCaptureModal.tsx
//
// Form inquiry properti. Dipakai di tiga tempat lewat `useLeadCapture`: halaman
// detail properti, katalog properti, dan dasbor. Sebelumnya form ini hanya ada
// sebagai markup inline di halaman detail, sehingga dua halaman lain membuka
// WhatsApp tanpa jejak apa pun di CRM.
//
// KAPAN MUNCUL
// ============
// Hanya untuk pengunjung yang identitasnya belum diketahui server:
// - tamu yang belum login, dan
// - client terdaftar yang profilnya belum memuat nama/nomor yang lengkap
//   (server menjawab 422 + `prefill`, lalu hook membuka modal ini).
//
// Client yang profilnya sudah lengkap TIDAK pernah melihat form ini — hook
// mengirim permintaannya langsung dan server mengambil identitas dari akunnya.
// Karena itu komponen ini tidak melakukan pemeriksaan sesi sendiri: satu-satunya
// yang memutuskan adalah `useLeadCapture` dan server.

"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MessageCircle, Loader2 } from "lucide-react";

export interface LeadCaptureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** UUID atau kode listing. Null bila tombol WA diklik tanpa konteks properti. */
  propertyId?: string | null;
  /** Judul properti — dipakai label form dan pesan WhatsApp. */
  propertyTitle?: string | null;
  /** Kode listing — dipakai pesan WhatsApp. */
  listingCode?: string | null;
  /** Label sumber lead yang disimpan di CRM. */
  source?: string;
  /** Isian awal bila server sudah tahu sebagian data (profil belum lengkap). */
  prefillName?: string;
  prefillPhone?: string;
  /** Nomor WA cadangan bila server tidak mengembalikan nomor agen. */
  fallbackWhatsapp?: string | null;
}

export function LeadCaptureModal({
  open,
  onOpenChange,
  propertyId = null,
  propertyTitle = "Properti Pilihan",
  listingCode = null,
  source,
  prefillName,
  prefillPhone,
  fallbackWhatsapp = null,
}: LeadCaptureModalProps) {
  const [leadName, setLeadName] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [leadMessage, setLeadMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Isian awal disalin saat modal dibuka, bukan saat komponen dipasang: satu
  // instans modal dipakai berulang untuk properti yang berbeda-beda.
  useEffect(() => {
    if (!open) return;
    setLeadName(prefillName || "");
    setLeadPhone(prefillPhone || "");
    setLeadMessage("");
  }, [open, prefillName, prefillPhone]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!leadName.trim() || !leadPhone.trim()) {
      toast.error("Mohon lengkapi Nama dan No WhatsApp Anda.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: leadName,
          phone: leadPhone,
          property_id: propertyId ?? undefined,
          source: source || "Website Property Detail",
          notes:
            leadMessage ||
            `Tertarik dengan properti: ${propertyTitle}${listingCode ? ` (${listingCode})` : ""}`,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (res.status === 422 && json.prefill) {
        // Server masih menganggap datanya belum layak; tampilkan apa yang ia
        // kirimkan supaya pengguna tahu bagian mana yang perlu diperbaiki.
        setLeadName(json.prefill.name || leadName);
        setLeadPhone(json.prefill.phone || leadPhone);
      }

      if (!res.ok) throw new Error(json.error || "Gagal menyimpan data lead");

      toast.success("Berhasil! Data Anda tercatat dan agen kami telah dinotifikasi.");

      // Nomor tujuan datang dari server, bukan dari peramban — sehingga tamu
      // tidak perlu (dan tidak boleh) menerima direktori nomor staf.
      const agentWa: string | null = json.agent?.whatsapp ?? fallbackWhatsapp ?? null;
      const senderName: string = json.inquirer?.name || leadName;

      // Nilai form disimpan dulu: state dikosongkan sebelum tab dibuka.
      const pesan = leadMessage;

      onOpenChange(false);
      setLeadName("");
      setLeadPhone("");
      setLeadMessage("");

      if (!agentWa) {
        toast.error("Nomor WhatsApp agen belum tersedia", {
          description: "Data Anda sudah tersimpan; agen akan menghubungi Anda.",
        });
        return;
      }

      const kode = listingCode ? ` (${listingCode})` : "";
      const text = encodeURIComponent(
        `Halo, saya *${senderName}* tertarik dengan properti *${propertyTitle}*${kode}. ${
          pesan ? `Pesan: "${pesan}"` : "Mohon informasi lebih lanjut."
        }`
      );

      window.open(`https://wa.me/${agentWa}?text=${text}`, "_blank");
    } catch (err: any) {
      console.error("Gagal menyimpan data lead:", err);
      toast.error("Gagal menyimpan data lead", {
        description: err?.message || "Terjadi kesalahan. Coba lagi.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl bg-card border border-border p-5 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold flex items-center gap-1.5 text-foreground">
            <MessageCircle className="w-4 h-4 text-emerald-600" /> Konsultasi & Tanya Properti
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Lengkapi data Anda agar agent kami dapat segera merespons ketertarikan Anda pada{" "}
            <span className="font-semibold text-emerald-600">{propertyTitle}</span>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="inquiry-lead-name" className="text-xs font-semibold text-foreground">
              Nama Lengkap <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="inquiry-lead-name"
              type="text"
              required
              placeholder="Contoh: Budi Santoso"
              value={leadName}
              onChange={(e) => setLeadName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="inquiry-lead-phone" className="text-xs font-semibold text-foreground">
              Nomor WhatsApp / HP <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="inquiry-lead-phone"
              type="tel"
              required
              placeholder="Contoh: 081234567890"
              value={leadPhone}
              onChange={(e) => setLeadPhone(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="inquiry-lead-message" className="text-xs font-semibold text-foreground">
              Pesan / Catatan Khusus <span className="text-muted-foreground font-normal">(Opsional)</span>
            </Label>
            <Textarea
              id="inquiry-lead-message"
              placeholder="Contoh: Apakah bisa survei lokasi minggu ini?"
              value={leadMessage}
              onChange={(e) => setLeadMessage(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          <DialogFooter className="gap-2 pt-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              className="cursor-pointer"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="cursor-pointer gap-1.5 font-bold"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Kirim & Buka WhatsApp
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
