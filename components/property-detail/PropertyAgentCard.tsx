// components/property-detail/PropertyAgentCard.tsx
"use client";

import { User, MessageCircle, Phone, BadgeCheck, Shield, CalendarCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface PropertyAgentCardProps {
  agentName: string;
  agentAvatar?: string | null;
  agentPhone?: string | null;
  agentRole?: string | null;
  onRequestWhatsApp: () => void;
  onRequestInquiry: () => void;
}

export function PropertyAgentCard({
  agentName,
  agentAvatar,
  agentRole = "Konsultan Properti Resmi",
  onRequestWhatsApp,
  onRequestInquiry,
}: PropertyAgentCardProps) {
  const initials = agentName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="border border-border/40 rounded-xl overflow-hidden bg-card/50">
      <div className="bg-muted/30 border-b border-border/40 px-5 py-3 flex items-center justify-between">
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5" />
          Agen Penanggung Jawab
        </span>
        <BadgeCheck className="w-4 h-4 text-emerald-600" />
      </div>

      <div className="p-5 space-y-5">
        {/* Agent Profile Info */}
        <div className="flex items-center gap-4">
          <Avatar className="h-14 w-14 rounded-full border border-border/40">
            <AvatarImage src={agentAvatar || undefined} alt={agentName} className="object-cover" />
            <AvatarFallback className="bg-muted text-muted-foreground font-bold text-base rounded-full">
              {initials || <User className="w-6 h-6" />}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold text-foreground truncate flex items-center gap-1.5">
              <span>{agentName}</span>
              <BadgeCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            </h3>
            <p className="text-xs text-muted-foreground font-medium truncate mt-0.5">
              Inland Property Consultant
            </p>
            <span className="inline-block mt-1 text-[10px] font-semibold text-emerald-600">
              Resmi & Terverifikasi
            </span>
          </div>
        </div>

        {/* Action CTAs */}
        <div className="space-y-2.5 pt-1">
          <Button
            type="button"
            className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-sm cursor-pointer flex items-center justify-center gap-2"
            onClick={onRequestWhatsApp}
          >
            <MessageCircle className="w-4 h-4 shrink-0 fill-current" />
            <span>Chat Agen via WhatsApp</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            className="w-full h-10 border-border/80 hover:bg-muted/80 text-foreground font-semibold text-xs rounded-xl cursor-pointer flex items-center justify-center gap-2"
            onClick={onRequestInquiry}
          >
            <CalendarCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Jadwalkan Kunjungan / Survei</span>
          </Button>
        </div>

        <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
          Tanyakan ketersediaan unit, negosiasi harga, atau pengajuan KPR langsung dengan agen terpercaya.
        </p>
      </div>
    </div>
  );
}
