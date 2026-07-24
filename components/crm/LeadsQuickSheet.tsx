"use client";

import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, Calendar, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Lead {
  id: string;
  name: string;
  property: string;
  status: string;
  phone?: string;
}

interface LeadsQuickSheetProps {
  leads: Lead[];
  trigger?: React.ReactNode;
}

export function LeadsQuickSheet({ leads, trigger }: LeadsQuickSheetProps) {
  const [generating, setGenerating] = useState<string | null>(null);

  const handleWhatsApp = (lead: Lead) => {
    // Bisa diintegrasikan dengan AI untuk generate pesan dulu, atau langsung buka WA
    const message = `Halo ${lead.name}, saya dari tim properti. Bagaimana minat Anda terhadap properti ${lead.property}? Apakah ada yang bisa saya bantu?`;
    const url = `https://wa.me/62${lead.phone?.replace(/^0/, "") || "8123456789"}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  const generateAIMessage = async (lead: Lead) => {
    setGenerating(lead.id);
    try {
      const res = await fetch("/api/ai/followup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadName: lead.name,
          property: lead.property,
          status: lead.status,
        }),
      });
      const data = await res.json();
      const url = `https://wa.me/62${lead.phone?.replace(/^0/, "") || "8123456789"}?text=${encodeURIComponent(data.message)}`;
      window.open(url, "_blank");
    } catch (error) {
      toast.error("Gagal generate pesan AI, mencoba pesan default...");
      handleWhatsApp(lead);
    } finally {
      setGenerating(null);
    }
  };

  return (
    <Sheet>
      <SheetTrigger>
        {trigger || <Button variant="outline" className="w-full">Lihat Leads</Button>}
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[65vh] rounded-t-2xl p-0">
        <div className="p-4 border-b">
          <h3 className="font-semibold text-base">Leads Butuh Perhatian</h3>
          <p className="text-xs text-muted-foreground">{leads.length} lead memerlukan follow-up</p>
        </div>
        <div className="overflow-y-auto h-[calc(100%-80px)] p-4 space-y-3">
          {leads.map((lead) => (
            <Card key={lead.id} className="border shadow-sm">
              <CardContent className="p-3 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-sm">{lead.name}</p>
                    <p className="text-xs text-muted-foreground">{lead.property}</p>
                  </div>
                  <Badge variant="outline" className="text-[9px] uppercase">
                    {lead.status}
                  </Badge>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 px-3 text-xs gap-1 flex-1 text-emerald-600 border-emerald-200"
                    onClick={() => handleWhatsApp(lead)}
                  >
                    <Phone className="w-3.5 h-3.5" /> WA
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 px-3 text-xs gap-1 flex-1 text-blue-600 border-blue-200"
                  >
                    <Calendar className="w-3.5 h-3.5" /> Survey
                  </Button>
                  <Button
                    size="sm"
                    variant="default"
                    className="h-8 px-3 text-xs gap-1 flex-1 bg-indigo-600 hover:bg-indigo-700"
                    onClick={() => generateAIMessage(lead)}
                    disabled={generating === lead.id}
                  >
                    {generating === lead.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      "✨ AI WA"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {leads.length === 0 && (
            <div className="text-center text-muted-foreground text-sm py-10">
              Tidak ada leads yang memerlukan follow-up saat ini. Selamat! 🎉
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}