// components/property-detail/PropertyKprSection.tsx
"use client";

import { useState, useMemo } from "react";
import { Calculator, MessageCircle, ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  calculateKprSimulation,
  formatKprCurrency,
  KPR_TENURE_OPTIONS,
} from "@/lib/kpr";

interface PropertyKprSectionProps {
  propertyPrice: number;
  propertyTitle: string;
  onConsultWhatsApp?: () => void;
}

export function PropertyKprSection({
  propertyPrice,
  onConsultWhatsApp,
}: PropertyKprSectionProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [dpPercentage, setDpPercentage] = useState<number>(20);
  const [tenureYears, setTenureYears] = useState<number>(15);
  const [fixedRate, setFixedRate] = useState<number>(6.5);
  const [fixedYears, setFixedYears] = useState<number>(3);

  const simulation = useMemo(() => {
    return calculateKprSimulation({
      propertyPrice,
      dpPercentage,
      tenureYears,
      fixedRate,
      fixedYears,
      floatingRate: 11.5,
      includeBphtb: true,
    });
  }, [propertyPrice, dpPercentage, tenureYears, fixedRate, fixedYears]);

  if (!propertyPrice || propertyPrice <= 0) {
    return null;
  }

  if (!isExpanded) {
    return (
      <div className="pt-5 border-t border-border/40 mt-5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 mb-1 text-muted-foreground">
               <Calculator className="w-3.5 h-3.5" />
               <span className="text-[10px] font-bold tracking-wider uppercase">Simulasi KPR</span>
            </div>
            <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 tabular-nums truncate leading-none">
               {formatKprCurrency(simulation.installmentFixed)}
               <span className="text-[11px] font-medium text-muted-foreground ml-1">/ bln</span>
            </div>
            <div className="text-[11px] text-muted-foreground mt-1 truncate font-medium">
               DP {dpPercentage}% · {tenureYears} Tahun
            </div>
          </div>
          <Button 
            type="button"
            variant="outline" 
            onClick={() => setIsExpanded(true)} 
            className="h-9 px-3.5 rounded-xl text-xs font-bold shrink-0 border-border/60 hover:bg-muted"
          >
            Atur KPR
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-5 border-t border-border/40 mt-5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-muted-foreground">
           <Calculator className="w-3.5 h-3.5" />
           <span className="text-[10px] font-bold tracking-wider uppercase">Simulasi KPR</span>
        </div>
        <Button 
          type="button"
          variant="ghost" 
          onClick={() => setIsExpanded(false)} 
          className="h-6 px-2 -mr-2 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          Tutup
        </Button>
      </div>

      <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
         <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider">Angsuran / bulan</span>
         <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums mt-0.5">
            {formatKprCurrency(simulation.installmentFixed)}
         </div>
         <p className="text-[10px] text-muted-foreground mt-1.5 font-medium">
            Penghasilan disarankan: {formatKprCurrency(simulation.requiredIncomeFixed)}
         </p>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-1">
         <div className="space-y-1.5">
           <Label className="text-[11px] font-semibold text-muted-foreground">Uang Muka (DP)</Label>
           <Select value={String(dpPercentage)} onValueChange={v => setDpPercentage(Number(v))}>
             <SelectTrigger className="h-9 text-xs rounded-lg font-semibold bg-background">
               <SelectValue />
             </SelectTrigger>
             <SelectContent>
               {[0, 5, 10, 15, 20, 25, 30, 40, 50].map(pct => (
                 <SelectItem key={pct} value={String(pct)} className="text-xs">{pct}%</SelectItem>
               ))}
             </SelectContent>
           </Select>
         </div>

         <div className="space-y-1.5">
           <Label className="text-[11px] font-semibold text-muted-foreground">Tenor</Label>
           <Select value={String(tenureYears)} onValueChange={v => setTenureYears(Number(v))}>
             <SelectTrigger className="h-9 text-xs rounded-lg font-semibold bg-background">
               <SelectValue />
             </SelectTrigger>
             <SelectContent>
               {KPR_TENURE_OPTIONS.map(yr => (
                 <SelectItem key={yr} value={String(yr)} className="text-xs">{yr} Tahun</SelectItem>
               ))}
             </SelectContent>
           </Select>
         </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-[11px] font-semibold text-muted-foreground">Suku Bunga Promo</Label>
        <div className="flex gap-2">
           <div className="bg-muted px-3 rounded-lg text-xs font-bold border border-border/40 shrink-0 flex items-center tabular-nums">
             {fixedRate}% p.a.
           </div>
           <Select value={String(fixedYears)} onValueChange={v => setFixedYears(Number(v))}>
             <SelectTrigger className="h-9 text-xs rounded-lg font-semibold flex-1 bg-background">
               <SelectValue />
             </SelectTrigger>
             <SelectContent>
               <SelectItem value="1" className="text-xs">Fixed 1 Tahun</SelectItem>
               <SelectItem value="2" className="text-xs">Fixed 2 Tahun</SelectItem>
               <SelectItem value="3" className="text-xs">Fixed 3 Tahun</SelectItem>
               <SelectItem value="5" className="text-xs">Fixed 5 Tahun</SelectItem>
               <SelectItem value="10" className="text-xs">Fixed 10 Tahun</SelectItem>
             </SelectContent>
           </Select>
        </div>
      </div>

      <div className="pt-2">
         {onConsultWhatsApp && (
           <Button
             type="button"
             className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center justify-center gap-2"
             onClick={onConsultWhatsApp}
           >
             <MessageCircle className="w-4 h-4 fill-current" />
             <span>Tanya KPR</span>
           </Button>
         )}
      </div>

      <p className="text-[10px] text-muted-foreground leading-relaxed flex items-start gap-1.5 pt-3 border-t border-border/40">
        <ShieldAlert className="w-3 h-3 shrink-0 mt-0.5" />
        <span>Estimasi awal. Suku bunga dan biaya mengikuti kebijakan bank.</span>
      </p>
    </div>
  );
}
