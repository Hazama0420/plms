"use client";

import { MessageSquare, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { SUPPORT_MESSAGE_MAX, SUPPORT_MESSAGE_MIN } from "@/lib/support-config";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface ChatAdminModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  profile: any;
  userEmail: string;
  adminMessage: string;
  setAdminMessage: (msg: string) => void;
  sendingMessage: boolean;
  handleSendAdminMessage: () => void;
}

export function ChatAdminModal({
  isOpen,
  onOpenChange,
  profile,
  userEmail,
  adminMessage,
  setAdminMessage,
  sendingMessage,
  handleSendAdminMessage,
}: ChatAdminModalProps) {
  // Server memvalidasi hasil trim, jadi panjang yang dihitung di sini harus
  // ikut di-trim — kalau tidak, sepuluh spasi akan terlihat memenuhi syarat.
  const trimmedLength = adminMessage.trim().length;
  const tooShort = trimmedLength < SUPPORT_MESSAGE_MIN;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-emerald-600" /> Kirim Pesan ke Admin Kantor
          </DialogTitle>
          <DialogDescription className="text-xs">
            Sampaikan kendala, pertanyaan, atau permintaan bantuan Anda ke Admin CRM.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2 text-xs">
          <div>
            <Label className="text-xs font-bold">Pengirim</Label>
            <Input
              value={`${profile.full_name || "Agen"} (${userEmail})`}
              disabled
              className="h-8 text-xs bg-muted/50 mt-1"
            />
          </div>

          <div>
            <Label className="text-xs font-bold">Pesan Bantuan / Pertanyaan *</Label>
            <Textarea
              placeholder="Tuliskan kendala atau pertanyaan Anda di sini..."
              value={adminMessage}
              onChange={(e) => setAdminMessage(e.target.value)}
              rows={4}
              maxLength={SUPPORT_MESSAGE_MAX}
              className="text-xs mt-1"
            />
            {/* Batas minimum ditampilkan sejak awal, bukan hanya saat gagal:
                tombol yang mati tanpa penjelasan terbaca seperti fitur rusak. */}
            <div className="flex items-center justify-between gap-2 mt-1.5">
              <p
                className={cn(
                  "text-[11px]",
                  tooShort ? "text-amber-600 dark:text-amber-500" : "text-muted-foreground"
                )}
              >
                {tooShort
                  ? `Minimal ${SUPPORT_MESSAGE_MIN} karakter (kurang ${SUPPORT_MESSAGE_MIN - trimmedLength} lagi).`
                  : "Siap dikirim ke seluruh admin kantor."}
              </p>
              <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">
                {trimmedLength}/{SUPPORT_MESSAGE_MAX}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs cursor-pointer"
          >
            Batal
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={sendingMessage || tooShort}
            onClick={handleSendAdminMessage}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 cursor-pointer"
          >
            {sendingMessage ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            Kirim Pesan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}