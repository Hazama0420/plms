// app/(dashboard)/kpr-calculator/page.tsx
"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

import {
  Calculator,
  MessageCircle,
  Wallet,
  Loader2,
  ArrowLeft,
  BadgeCheck,
  Sparkles,
  Info,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  HelpCircle,
  FileCheck2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

function KprCalculatorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const paramClientName = searchParams.get("client_name");
  const paramPrice = searchParams.get("price");

  // State Utama KPR
  const [propertyPrice, setPropertyPrice] = useState<number>(
    paramPrice ? Number(paramPrice) || 1000000000 : 1000000000
  );
  const [dpPercentage, setDpPercentage] = useState<number>(10);
  const [dpNominalInput, setDpNominalInput] = useState<number>(100000000);
  const [isCustomDpNominal, setIsCustomDpNominal] = useState<boolean>(false);
  
  const [tenureYears, setTenureYears] = useState<number>(15);
  const [clientName, setClientName] = useState<string>("");

  // State Bunga & Akad
  const [fixedRate, setFixedRate] = useState<number>(6.5);
  const [fixedYears, setFixedYears] = useState<number>(3);
  const [floatingRate, setFloatingRate] = useState<number>(11.5);
  const [includeBphtb, setIncludeBphtb] = useState<boolean>(true);

  // Toggle Opsi Lanjutan
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  useEffect(() => {
    if (paramClientName) {
      setClientName(decodeURIComponent(paramClientName));
    }
  }, [paramClientName]);

  // Sync DP Nominal ketika Harga Properti / DP Persen Berubah
  useEffect(() => {
    if (!isCustomDpNominal) {
      setDpNominalInput(Math.round((propertyPrice * dpPercentage) / 100));
    }
  }, [propertyPrice, dpPercentage, isCustomDpNominal]);

  // Handler Custom Input Nominal DP (Rp)
  const handleDpNominalChange = (val: number) => {
    setDpNominalInput(val);
    setIsCustomDpNominal(true);
    if (propertyPrice > 0) {
      const pct = (val / propertyPrice) * 100;
      setDpPercentage(Number(pct.toFixed(1)));
    }
  };

  // Handler Custom Input Persen DP (%)
  const handleDpPercentageChange = (pct: number) => {
    setDpPercentage(pct);
    setIsCustomDpNominal(false);
    setDpNominalInput(Math.round((propertyPrice * pct) / 100));
  };

  // Kalkulasi Simulasi KPR
  const calculations = useMemo(() => {
    const dpNominal = isCustomDpNominal 
      ? dpNominalInput 
      : Math.round((propertyPrice * dpPercentage) / 100);

    const loanPrincipal = Math.max(0, propertyPrice - dpNominal);

    const monthlyRateFixed = fixedRate / 100 / 12;
    const totalMonths = tenureYears * 12;

    let installmentFixed = 0;
    if (monthlyRateFixed > 0 && totalMonths > 0 && loanPrincipal > 0) {
      const factorFixed = Math.pow(1 + monthlyRateFixed, totalMonths);
      installmentFixed = Math.round(
        loanPrincipal * ((monthlyRateFixed * factorFixed) / (factorFixed - 1))
      );
    }

    const fixedMonths = Math.min(fixedYears * 12, totalMonths);
    const remainingMonthsFloating = Math.max(0, totalMonths - fixedMonths);

    let balanceAfterFixed = loanPrincipal;
    for (let m = 1; m <= fixedMonths; m++) {
      const interestPayment = balanceAfterFixed * monthlyRateFixed;
      const principalPayment = installmentFixed - interestPayment;
      balanceAfterFixed -= principalPayment;
    }

    const monthlyRateFloating = floatingRate / 100 / 12;
    let installmentFloating = installmentFixed;

    if (remainingMonthsFloating > 0 && monthlyRateFloating > 0 && balanceAfterFixed > 0) {
      const factorFloating = Math.pow(1 + monthlyRateFloating, remainingMonthsFloating);
      installmentFloating = Math.round(
        balanceAfterFixed * ((monthlyRateFloating * factorFloating) / (factorFloating - 1))
      );
    }

    const requiredIncomeFixed = Math.round(installmentFixed / 0.35);

    const provisiFee = Math.round(loanPrincipal * 0.01);
    const adminFee = 1500000;
    const appraisalFee = 1250000;
    const notaryFee = Math.round(propertyPrice * 0.01);
    const insuranceFee = Math.round(loanPrincipal * 0.012);

    const bphtbTax = includeBphtb
      ? Math.max(0, Math.round((propertyPrice - 60000000) * 0.05))
      : 0;

    const totalBiayaAkad = provisiFee + adminFee + appraisalFee + notaryFee + insuranceFee + bphtbTax;
    const totalUangAwal = dpNominal + totalBiayaAkad;

    const amortizationSchedule = [];
    let curBalance = loanPrincipal;

    for (let yr = 1; yr <= tenureYears; yr++) {
      let yrInterest = 0;
      let yrPrincipal = 0;
      const isFixedYear = yr <= fixedYears;
      const currentRate = isFixedYear ? monthlyRateFixed : monthlyRateFloating;
      const currentInstallment = isFixedYear ? installmentFixed : installmentFloating;

      for (let m = 1; m <= 12; m++) {
        const interestM = curBalance * currentRate;
        const principalM = currentInstallment - interestM;
        yrInterest += interestM;
        yrPrincipal += principalM;
        curBalance -= principalM;
      }

      amortizationSchedule.push({
        year: yr,
        isFixed: isFixedYear,
        yearlyPrincipal: Math.round(yrPrincipal),
        yearlyInterest: Math.round(yrInterest),
        remainingBalance: Math.max(0, Math.round(curBalance)),
      });
    }

    return {
      dpNominal,
      loanPrincipal,
      installmentFixed,
      installmentFloating,
      requiredIncomeFixed,
      totalMonths,
      provisiFee,
      adminFee,
      appraisalFee,
      notaryFee,
      insuranceFee,
      bphtbTax,
      totalBiayaAkad,
      totalUangAwal,
      amortizationSchedule,
    };
  }, [
    propertyPrice,
    dpPercentage,
    dpNominalInput,
    isCustomDpNominal,
    fixedRate,
    fixedYears,
    floatingRate,
    tenureYears,
    includeBphtb,
  ]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `🏡 *SIMULASI KPR INLAND PROPERTY*\n` +
      `-----------------------------------------\n` +
      (clientName ? `Yth. Bpk/Ibu *${clientName}*,\n\n` : "") +
      `Rincian simulasi KPR Properti:\n\n` +
      `💵 *Harga Properti*: ${formatCurrency(propertyPrice)}\n` +
      `💳 *Uang Muka (DP ${dpPercentage}%)*: ${formatCurrency(calculations.dpNominal)}\n` +
      `🏦 *Plafon Pinjaman KPR*: ${formatCurrency(calculations.loanPrincipal)}\n\n` +
      `📌 *ESTIMASI ANGSURAN*\n` +
      `• *Cicilan Promo (${fixedYears} Thn Pertama)*: *${formatCurrency(calculations.installmentFixed)}/bulan*\n` +
      `• *Cicilan Setelah Promo (Est. Floating)*: *${formatCurrency(calculations.installmentFloating)}/bulan*\n` +
      `• Jangka Waktu (Tenor): ${tenureYears} Tahun\n\n` +
      `💡 *REKOMENDASI GAJI MINIMUM*: *${formatCurrency(calculations.requiredIncomeFixed)}/bulan*\n` +
      `📑 *ESTIMASI DANA AWAL (DP + AKAD & PAJAK)*: *${formatCurrency(calculations.totalUangAwal)}*\n\n` +
      `*Catatan:* Hasil dari perhitungan simulasi KPR ini hanya merupakan perkiraan saja. Untuk perhitungan tepatnya, pihak bank akan memberikan ilustrasi angsuran Anda.\n\n` +
      `Hubungi Tim Agen *Inland Property* untuk pendampingan pengajuan KPR!`
    );

    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  return (
    <TooltipProvider>
      <div className="space-y-6 pb-20 max-w-6xl mx-auto">
        {/* HEADER BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Calculator className="w-5 h-5" />
              </span>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
                Kalkulator KPR
              </h1>
              <Badge className="bg-emerald-600/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 text-[10px] font-semibold">
                Simulasi Instan
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Hitung estimasi cicilan bulanan, syarat gaji, dan persediaan modal awal secara cepat & transparan.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.back()}
              className="text-xs h-9 rounded-xl border-border/80 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Kembali
            </Button>

            <Button
              onClick={handleShareWhatsApp}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 rounded-xl px-4 gap-1.5 shadow-md shadow-emerald-600/20 font-bold cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 fill-white text-emerald-600" /> Share via WA
            </Button>
          </div>
        </div>

        {/* UTAMA GRID 2 KOLOM */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* KOLOM KIRI: INPUT PARAMETER */}
          <div className="lg:col-span-5 space-y-4">
            <Card className="border border-border/70 shadow-xs rounded-2xl bg-card overflow-hidden">
              <CardHeader className="p-4 pb-3 border-b border-border/50 bg-gradient-to-r from-emerald-500/5 to-transparent">
                <CardTitle className="text-xs font-extrabold text-foreground flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <SlidersHorizontal className="w-4 h-4 text-emerald-600" /> Input Data KPR
                  </span>
                  <span className="text-[10px] font-normal text-muted-foreground">Parameter Kredit</span>
                </CardTitle>
              </CardHeader>

              <CardContent className="p-4 space-y-4 text-xs">
                {/* Nama Pembeli */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Nama Calon Pembeli (Opsional)</Label>
                  <Input
                    placeholder="Contoh: Bpk. Handy"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="h-9 text-xs rounded-xl focus-visible:ring-emerald-500"
                  />
                </div>

                {/* Harga Properti */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs font-semibold">Harga Rumah / Properti (Rp)</Label>
                    <span className="font-mono font-extrabold text-emerald-600 dark:text-emerald-400 text-xs">
                      {formatCurrency(propertyPrice)}
                    </span>
                  </div>
                  <Input
                    type="number"
                    value={propertyPrice}
                    onChange={(e) => setPropertyPrice(Number(e.target.value))}
                    className="h-9 text-xs font-mono rounded-xl"
                    step={10000000}
                  />
                  {/* Preset Tombol Cepat */}
                  <div className="flex gap-1.5 pt-1 overflow-x-auto scrollbar-none">
                    {[500000000, 800000000, 1200000000, 2000000000].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          setPropertyPrice(preset);
                          setIsCustomDpNominal(false);
                        }}
                        className={`text-[10px] px-2 py-0.5 rounded-lg border font-mono transition-all cursor-pointer ${
                          propertyPrice === preset
                            ? "bg-emerald-600 text-white border-emerald-600 font-bold"
                            : "bg-muted/50 hover:bg-muted text-muted-foreground border-border/60"
                        }`}
                      >
                        {preset >= 1000000000 ? `${preset / 1000000000} M` : `${preset / 1000000} Jt`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* UANG MUKA (DP) CUSTOMISABLE */}
                <div className="space-y-2 bg-amber-500/5 dark:bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs font-semibold flex items-center gap-1">
                      Uang Muka / DP
                      <Tooltip>
                        <TooltipTrigger className="inline-flex items-center cursor-pointer">
                          <HelpCircle className="w-3 h-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent className="text-[11px] max-w-xs">
                          Pembayaran awal dari total harga rumah yang dibayarkan langsung ke penjual/developer.
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                    <Badge variant="outline" className="text-[9px] font-mono border-amber-500/30 text-amber-700 dark:text-amber-400 bg-amber-500/10">
                      {dpPercentage}% dari Harga
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-muted-foreground">Persen DP (%)</span>
                      <Input
                        type="number"
                        min={0}
                        max={90}
                        step={0.5}
                        value={dpPercentage}
                        onChange={(e) => handleDpPercentageChange(Number(e.target.value))}
                        className="h-8 text-xs font-mono rounded-lg"
                      />
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-muted-foreground">Nominal DP (Rp)</span>
                      <Input
                        type="number"
                        step={5000000}
                        value={calculations.dpNominal}
                        onChange={(e) => handleDpNominalChange(Number(e.target.value))}
                        className="h-8 text-xs font-mono rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="pt-1">
                    <input
                      type="range"
                      min={0}
                      max={50}
                      step={1}
                      value={dpPercentage}
                      onChange={(e) => handleDpPercentageChange(Number(e.target.value))}
                      className="w-full accent-emerald-600 h-2 bg-muted rounded-lg cursor-pointer"
                    />
                  </div>
                </div>

                {/* TENOR / JANGKA WAKTU KREDIT */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs font-semibold">Lama Pinjaman (Tenor)</Label>
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        min={1}
                        max={35}
                        value={tenureYears}
                        onChange={(e) => setTenureYears(Math.max(1, Number(e.target.value)))}
                        className="h-7 w-16 text-center text-xs font-mono rounded-lg p-1"
                      />
                      <span className="text-xs font-semibold text-muted-foreground">Tahun</span>
                    </div>
                  </div>

                  {/* Lima kolom di 375px menyisakan ~65px per tombol — di bawah
                      target sentuh yang nyaman. Turun ke dua kolom di ponsel. */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-1.5">
                    {[5, 10, 15, 20, 25].map((yr) => (
                      <button
                        key={yr}
                        type="button"
                        onClick={() => setTenureYears(yr)}
                        className={`py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                          tenureYears === yr
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                            : "bg-background hover:bg-muted text-foreground border-border/70"
                        }`}
                      >
                        {yr} Thn
                      </button>
                    ))}
                  </div>
                </div>

                {/* PANELS OPTIONAL / ADVANCED BANKING SETTINGS */}
                <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced} className="...">
  <CollapsibleTrigger className="w-full">
    <div className="w-full py-2 px-3 text-xs text-muted-foreground hover:bg-muted/60 hover:text-foreground rounded-xl flex items-center justify-center gap-1 font-medium transition-colors cursor-pointer">
      ⚙️ Pengaturan Suku Bunga & Akad Bank
    </div>
  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-3 pt-3">
                    <div className="p-3 bg-muted/40 rounded-xl space-y-3 border border-border/50">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-[10px]">Bunga Fixed Promo (% p.a)</Label>
                          <Input
                            type="number"
                            step={0.1}
                            value={fixedRate}
                            onChange={(e) => setFixedRate(Number(e.target.value))}
                            className="h-8 text-xs font-mono rounded-lg"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px]">Masa Promo (Tahun)</Label>
                          <Select value={String(fixedYears)} onValueChange={(v) => setFixedYears(Number(v || 3))}>
                            <SelectTrigger className="h-8 text-xs rounded-lg">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              {[1, 2, 3, 5, 8, 10].map((y) => (
                                <SelectItem key={y} value={String(y)} className="text-xs">
                                  {y} Tahun
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/30">
                        <div className="space-y-1">
                          <Label className="text-[10px]">Bunga Floating Est. (% p.a)</Label>
                          <Input
                            type="number"
                            step={0.1}
                            value={floatingRate}
                            onChange={(e) => setFloatingRate(Number(e.target.value))}
                            className="h-8 text-xs font-mono rounded-lg"
                          />
                        </div>
                        <div className="space-y-1 flex items-end">
                          <div className="flex items-center justify-between w-full h-8 bg-background px-2.5 rounded-lg border text-[10px]">
                            <span>Pajak BPHTB (5%)</span>
                            <Switch checked={includeBphtb} onCheckedChange={setIncludeBphtb} className="scale-75" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </CardContent>
            </Card>
          </div>

          {/* KOLOM KANAN: HASIL RINGKASAN BESAR */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* HERO CARD CICILAN BULANAN */}
            <Card className="border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 via-amber-500/5 to-background shadow-md rounded-2xl overflow-hidden relative">
              <div className="p-5 sm:p-6 space-y-4">
                
                {/* BADGE STATS */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <Badge className="bg-emerald-600 text-white font-bold text-[10px] px-3 py-1 rounded-full shadow-xs">
                    💡 Masa Promo {fixedYears} Tahun Pertama
                  </Badge>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    Plafon KPR: <strong className="text-foreground">{formatCurrency(calculations.loanPrincipal)}</strong>
                  </span>
                </div>

                {/* ANGKA CICILAN UTAMA */}
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-muted-foreground block">
                    Estimasi Angsuran Per Bulan:
                  </span>
                  <div className="flex items-baseline gap-2">
                    <h2 className="text-3xl sm:text-4xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400 tracking-tight">
                      {formatCurrency(calculations.installmentFixed)}
                    </h2>
                    <span className="text-sm font-semibold text-muted-foreground">/ bulan</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground pt-1 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    Bunga promo <strong>{fixedRate}%</strong> ({fixedYears} thn). Suku bunga floating selanjutnya est. {formatCurrency(calculations.installmentFloating)}/bln.
                  </p>
                </div>

                {/* KETERANGAN KELAYAKAN GAJI & MODAL AWAL */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {/* CARD GAJI MINIMAL */}
                  <div className="bg-card/80 backdrop-blur-sm p-3.5 rounded-xl border border-emerald-500/20 space-y-1">
                    <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                      <BadgeCheck className="w-3.5 h-3.5 text-emerald-600" /> Syarat Minimal Gaji
                    </span>
                    <p className="text-sm font-extrabold font-mono text-foreground">
                      {formatCurrency(calculations.requiredIncomeFixed)} <span className="text-[10px] font-normal text-muted-foreground">/bln</span>
                    </p>
                    <p className="text-[9px] text-muted-foreground leading-tight">
                      Aturan Bank: Cicilan maks. 35% dari gaji bersih gabungan.
                    </p>
                  </div>

                  {/* CARD DANA AWAL */}
                  <div className="bg-card/80 backdrop-blur-sm p-3.5 rounded-xl border border-amber-500/20 space-y-1">
                    <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                      <Wallet className="w-3.5 h-3.5 text-amber-600" /> Total Modal Awal
                    </span>
                    <p className="text-sm font-extrabold font-mono text-amber-700 dark:text-amber-400">
                      {formatCurrency(calculations.totalUangAwal)}
                    </p>
                    <p className="text-[9px] text-muted-foreground leading-tight">
                      Termasuk DP ({dpPercentage}%) + Estimasi Biaya Akad & Legalitas.
                    </p>
                  </div>
                </div>

              </div>
            </Card>

            {/* TAB RINCIAN LENGKAP */}
            <Tabs defaultValue="fees" className="w-full">
              <TabsList className="grid grid-cols-2 h-9 text-xs rounded-xl bg-muted p-1">
                <TabsTrigger value="fees" className="text-xs rounded-lg font-semibold cursor-pointer">Rincian Biaya Akad & Legalitas</TabsTrigger>
                <TabsTrigger value="amortization" className="text-xs rounded-lg font-semibold cursor-pointer">Tabel Sisa Pinjaman Tahunan</TabsTrigger>
              </TabsList>

              {/* RINCIAN BIAYA AKAD */}
              <TabsContent value="fees" className="pt-2">
                <Card className="border border-border/70 shadow-2xs rounded-2xl">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-xs font-bold flex items-center gap-1.5">
                      <FileCheck2 className="w-3.5 h-3.5 text-emerald-600" /> Estimasi Pengeluaran Awal (DP + Legalitas)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-1 text-xs space-y-2">
                    <div className="divide-y divide-border/40">
                      <div className="py-2 flex justify-between">
                        <span className="text-muted-foreground">Uang Muka (DP {dpPercentage}%):</span>
                        <span className="font-mono text-foreground font-bold">{formatCurrency(calculations.dpNominal)}</span>
                      </div>
                      <div className="py-2 flex justify-between">
                        <span className="text-muted-foreground">Provisi & Administrasi Bank:</span>
                        <span className="font-mono text-foreground">{formatCurrency(calculations.provisiFee + calculations.adminFee)}</span>
                      </div>
                      <div className="py-2 flex justify-between">
                        <span className="text-muted-foreground">Notaris, Sertifikat & APHT (Est.):</span>
                        <span className="font-mono text-foreground">{formatCurrency(calculations.notaryFee)}</span>
                      </div>
                      <div className="py-2 flex justify-between">
                        <span className="text-muted-foreground">Asuransi Jiwa & Kebakaran (Est.):</span>
                        <span className="font-mono text-foreground">{formatCurrency(calculations.insuranceFee)}</span>
                      </div>
                      {includeBphtb && (
                        <div className="py-2 flex justify-between text-amber-700 dark:text-amber-400">
                          <span>Pajak Pembeli / BPHTB (5%):</span>
                          <span className="font-mono font-bold">{formatCurrency(calculations.bphtbTax)}</span>
                        </div>
                      )}
                      <div className="py-3 flex justify-between font-bold bg-emerald-500/10 px-3 rounded-xl mt-2 text-emerald-950 dark:text-emerald-200">
                        <span>TOTAL MODAL AWAL DISIAPKAN:</span>
                        <span className="font-mono text-sm">{formatCurrency(calculations.totalUangAwal)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* TABEL AMORTISASI TAHUNAN */}
              <TabsContent value="amortization" className="pt-2">
                <Card className="border border-border/70 shadow-2xs rounded-2xl overflow-hidden">
                  <CardContent className="p-0">
                    {/* overflow-x-auto: empat kolom nominal tidak muat di 375px.
                        Tanpa ini tabel melebar melewati Card dan memaksa
                        seluruh halaman ikut scroll ke samping. */}
                    <div className="max-h-[260px] overflow-y-auto overflow-x-auto scrollbar-thin">
                      <Table>
                        <TableHeader className="bg-muted/60 sticky top-0 backdrop-blur-md">
                          <TableRow>
                            <TableHead className="text-[10px] font-bold">Tahun</TableHead>
                            <TableHead className="text-[10px] font-bold">Skema Bunga</TableHead>
                            <TableHead className="text-[10px] font-bold">Angsuran Pokok</TableHead>
                            <TableHead className="text-[10px] font-bold text-right">Sisa Pinjaman</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {calculations.amortizationSchedule.map((row) => (
                            <TableRow key={row.year} className="text-xs hover:bg-muted/30">
                              <TableCell className="py-2 font-mono font-bold">Thn Ke-{row.year}</TableCell>
                              <TableCell className="py-2">
                                <Badge
                                  variant="outline"
                                  className={
                                    row.isFixed
                                      ? "text-[9px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                                      : "text-[9px] bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30"
                                  }
                                >
                                  {row.isFixed ? "Fixed Promo" : "Floating"}
                                </Badge>
                              </TableCell>
                              <TableCell className="py-2 font-mono text-emerald-600 dark:text-emerald-400">
                                {formatCurrency(row.yearlyPrincipal)}
                              </TableCell>
                              <TableCell className="py-2 font-mono text-right text-muted-foreground">
                                {formatCurrency(row.remainingBalance)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* KETERANGAN WAJIB (DISCLAIMER) PERHITUNGAN BANK */}
            <div className="p-4 bg-amber-500/10 border border-amber-500/25 rounded-2xl flex items-start gap-3 text-amber-900 dark:text-amber-200">
              <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed space-y-0.5">
                <p className="font-bold text-amber-800 dark:text-amber-300">Catatan Penting / Penafian:</p>
                <p className="italic text-[11px] font-medium">
                  "Hasil dari perhitungan simulasi KPR ini hanya merupakan perkiraan saja. Untuk perhitungan tepatnya, pihak bank akan memberikan ilustrasi angsuran Anda."
                </p>
              </div>
            </div>

          </div>

        </div>
      </div>
    </TooltipProvider>
  );
}

export default function KprCalculatorPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        </div>
      }
    >
      <KprCalculatorContent />
    </Suspense>
  );
}