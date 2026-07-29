// app/(dashboard)/kpr-calculator/page.tsx
"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";

import {
  Calculator,
  Percent,
  Calendar,
  MessageCircle,
  FileText,
  BadgeCheck,
  TrendingUp,
  Wallet,
  Building2,
  RefreshCw,
  Loader2,
  ArrowLeft,
  Share2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";

interface PropertyOption {
  id: string;
  title: string;
  price: number;
  listing_code?: string;
  address?: any;
}

function KprCalculatorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const paramPropertyId = searchParams.get("property_id");
  const paramClientName = searchParams.get("client_name");

  const [propertyPrice, setPropertyPrice] = useState<number>(1000000000);
  const [dpPercentage, setDpPercentage] = useState<number>(10);
  const [tenureYears, setTenureYears] = useState<number>(15);
  const [clientName, setClientName] = useState<string>("");

  const [fixedRate, setFixedRate] = useState<number>(6.5);
  const [fixedYears, setFixedYears] = useState<number>(3);
  const [floatingRate, setFloatingRate] = useState<number>(11.5);
  const [includeBphtb, setIncludeBphtb] = useState<boolean>(true);

  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("custom");
  const [loadingProperties, setLoadingProperties] = useState(true);

  useEffect(() => {
    if (paramClientName) {
      setClientName(decodeURIComponent(paramClientName));
    }
  }, [paramClientName]);

  useEffect(() => {
    async function fetchProperties() {
      setLoadingProperties(true);
      try {
        const { data, error } = await supabase
          .from("properties")
          .select("id, title, price, listing_code, address")
          .order("created_at", { ascending: false });

        if (!error && data) {
          setProperties(data);
          if (paramPropertyId) {
            const targetProp = data.find((p) => p.id === paramPropertyId);
            if (targetProp) {
              setSelectedPropertyId(targetProp.id);
              if (targetProp.price) {
                setPropertyPrice(targetProp.price);
              }
            }
          }
        }
      } catch (err) {
        console.error("Gagal mengambil listing properti:", err);
      } finally {
        setLoadingProperties(false);
      }
    }
    fetchProperties();
  }, [paramPropertyId]);

  // ✅ FIX: handler menerima string | null
  const handleSelectProperty = (value: string | null) => {
    const id = value || "custom";
    setSelectedPropertyId(id);
    if (id === "custom") return;
    const prop = properties.find((p) => p.id === id);
    if (prop && prop.price) {
      setPropertyPrice(prop.price);
      toast.success(`Harga disesuaikan dengan: ${prop.title}`);
    }
  };

  const calculations = useMemo(() => {
    const dpNominal = Math.round((propertyPrice * dpPercentage) / 100);
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
    const requiredIncomeFloating = Math.round(installmentFloating / 0.35);

    const provisiFee = Math.round(loanPrincipal * 0.01);
    const adminFee = 1500000;
    const appraisalFee = selectedPropertyId === "custom" ? 1250000 : 0;
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
      requiredIncomeFloating,
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
    fixedRate,
    fixedYears,
    floatingRate,
    tenureYears,
    includeBphtb,
    selectedPropertyId,
  ]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const handleShareWhatsApp = () => {
    const selectedProp = properties.find((p) => p.id === selectedPropertyId);
    const propTitle = selectedProp ? selectedProp.title : "Properti Pilihan";

    const text = encodeURIComponent(
      `🏡 *SIMULASI ANGSURAN KPR - INLAND PROPERTY*\n` +
      `-----------------------------------------\n` +
      (clientName ? `Yth. Bpk/Ibu *${clientName}*,\n\n` : "") +
      `Berikut rincian simulasi KPR Perbankan untuk *${propTitle}*:\n\n` +
      `💰 *Harga Properti*: ${formatCurrency(propertyPrice)}\n` +
      `💵 *Uang Muka (DP ${dpPercentage}%)*: ${formatCurrency(calculations.dpNominal)}\n` +
      `🏦 *Plafon KPR*: ${formatCurrency(calculations.loanPrincipal)}\n\n` +
      `📊 *SKEMA ANGSURAN PERBANKAN*\n` +
      `• *Bunga Fixed (${fixedYears} Thn Pertama - ${fixedRate}%)*: *${formatCurrency(calculations.installmentFixed)}/bln*\n` +
      `• *Bunga Floating (Thn Ke-${fixedYears + 1} dst - ${floatingRate}%)*: *${formatCurrency(calculations.installmentFloating)}/bln*\n` +
      `• Tenor KPR: ${tenureYears} Tahun (${calculations.totalMonths} Bulan)\n\n` +
      `💡 *ESTIMASI GAJI MINIMUM (DSR 35%)*\n` +
      `• Penghasilan Bulanan Diperlukan: *${formatCurrency(calculations.requiredIncomeFixed)}/bln*\n\n` +
      `📑 *ESTIMASI DANA AWAL (DP + AKAD & PAJAK)*\n` +
      `• DP Properti: ${formatCurrency(calculations.dpNominal)}\n` +
      `• Biaya Akad Bank & Legalitas: ${formatCurrency(calculations.totalBiayaAkad - calculations.bphtbTax)}\n` +
      (includeBphtb ? `• Est. Pajak BPHTB (5%): ${formatCurrency(calculations.bphtbTax)}\n` : "") +
      `👉 *TOTAL DANA AWAL DISIAPKAN*: *${formatCurrency(calculations.totalUangAwal)}*\n\n` +
      `Hubungi Tim Agen *Inland Property* untuk bantuan proses pengajuan KPR!`
    );

    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            🧮 Kalkulator KPR Perbankan Indonesia
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Perhitungan akurat Bunga Fixed/Floating, DSR kelayakan gaji pembeli, dan rincian biaya akad
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.back()}
            className="text-xs h-9 gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Kembali
          </Button>

          <Button
            onClick={handleShareWhatsApp}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 gap-1.5 shadow-md shadow-emerald-600/20"
          >
            <MessageCircle className="w-4 h-4" /> Kirim Simulasi WA
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* FORM PARAMETER */}
        <Card className="lg:col-span-5 border shadow-xs bg-card">
          <CardHeader className="p-4 pb-3 border-b">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Calculator className="w-4 h-4 text-emerald-600" /> Parameter Kredit Properti
            </CardTitle>
            <CardDescription className="text-xs">
              Ubah harga, skema bunga fixed & floating, serta jangka waktu KPR
            </CardDescription>
          </CardHeader>

          <CardContent className="p-4 space-y-4 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Nama Calon Pembeli (Opsional)</Label>
              <Input
                placeholder="Contoh: Bpk. Handy Kurniawan"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="h-9 text-xs focus-visible:ring-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <Label className="text-xs font-semibold">Listing Properti</Label>
                {loadingProperties && <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />}
              </div>
              {/* ✅ FIX: onValueChange langsung ke handler */}
              <Select value={selectedPropertyId} onValueChange={handleSelectProperty}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Pilih dari database..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom" className="text-xs font-medium">
                    -- Input Harga Manual --
                  </SelectItem>
                  {properties.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-xs">
                      {p.title} ({formatCurrency(p.price)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <Label className="text-xs font-semibold">Harga Properti (Rp)</Label>
                <span className="font-mono font-bold text-emerald-600 text-xs">
                  {formatCurrency(propertyPrice)}
                </span>
              </div>
              <Input
                type="number"
                value={propertyPrice}
                onChange={(e) => setPropertyPrice(Number(e.target.value))}
                className="h-9 text-xs font-mono"
                step={25000000}
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <Label className="text-xs font-semibold">Uang Muka / DP ({dpPercentage}%)</Label>
                <span className="font-mono text-muted-foreground text-xs">
                  {formatCurrency(calculations.dpNominal)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={0}
                  max={50}
                  step={5}
                  value={dpPercentage}
                  onChange={(e) => setDpPercentage(Number(e.target.value))}
                  className="w-full accent-emerald-600 h-2 bg-slate-200 dark:bg-slate-800 rounded-lg cursor-pointer"
                />
                <span className="font-mono font-bold w-10 text-right text-xs">{dpPercentage}%</span>
              </div>
            </div>

            <div className="p-3 bg-muted/50 rounded-xl space-y-3 border border-border/50">
              <div className="flex items-center justify-between border-b pb-1.5">
                <span className="font-bold text-[11px] text-foreground flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600" /> Skema Suku Bunga Bank
                </span>
                <Badge variant="outline" className="text-[9px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                  Fixed & Floating
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[10px]">Bunga Fixed Promo (% p.a)</Label>
                  <Input
                    type="number"
                    step={0.1}
                    value={fixedRate}
                    onChange={(e) => setFixedRate(Number(e.target.value))}
                    className="h-8 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px]">Masa Fixed (Tahun)</Label>
                  <Select
                    value={String(fixedYears)}
                    onValueChange={(v) => setFixedYears(Number(v || 3))}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Masa Fixed" />
                    </SelectTrigger>
                    <SelectContent>
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
                    className="h-8 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px]">Tenor KPR (Tahun)</Label>
                  <Select
                    value={String(tenureYears)}
                    onValueChange={(v) => setTenureYears(Number(v || 15))}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Tenor" />
                    </SelectTrigger>
                    <SelectContent>
                      {[5, 10, 15, 20, 25, 30].map((yr) => (
                        <SelectItem key={yr} value={String(yr)} className="text-xs">
                          {yr} Tahun
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-muted/40 rounded-lg border">
              <div className="space-y-0.5">
                <Label className="text-xs font-semibold cursor-pointer">Sertakan Pajak BPHTB (5%)</Label>
                <p className="text-[10px] text-muted-foreground">Pajak resmi negara saat serah terima properti</p>
              </div>
              <Switch checked={includeBphtb} onCheckedChange={setIncludeBphtb} />
            </div>
          </CardContent>
        </Card>

        {/* HASIL SIMULASI */}
        <div className="lg:col-span-7 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Card className="border-2 border-emerald-500/40 bg-card p-4 space-y-1 relative overflow-hidden">
              <Badge className="bg-emerald-600 text-white text-[10px] absolute right-3 top-3">
                {fixedYears} Tahun Pertama
              </Badge>
              <span className="text-[11px] text-muted-foreground block font-medium">
                Angsuran Bunga Fixed ({fixedRate}%):
              </span>
              <h3 className="text-xl sm:text-2xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                {formatCurrency(calculations.installmentFixed)}
                <span className="text-xs font-normal text-muted-foreground"> /bln</span>
              </h3>
              <p className="text-[10px] text-muted-foreground pt-1">
                Cicilan pasti & stabil selama {fixedYears} tahun promo
              </p>
            </Card>

            <Card className="border border-slate-200 dark:border-slate-800 bg-card p-4 space-y-1 relative overflow-hidden">
              <Badge variant="outline" className="text-[10px] absolute right-3 top-3 border-amber-500 text-amber-600">
                Tahun Ke-{fixedYears + 1} dst
              </Badge>
              <span className="text-[11px] text-muted-foreground block font-medium">
                Angsuran Floating Est. ({floatingRate}%):
              </span>
              <h3 className="text-xl sm:text-2xl font-extrabold font-mono text-amber-600 dark:text-amber-400">
                {formatCurrency(calculations.installmentFloating)}
                <span className="text-xs font-normal text-muted-foreground"> /bln</span>
              </h3>
              <p className="text-[10px] text-muted-foreground pt-1">
                Mengikuti suku bunga pasar perbankan
              </p>
            </Card>
          </div>

          <Card className="border bg-slate-50 dark:bg-slate-900/50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <BadgeCheck className="w-4 h-4 text-emerald-600" /> Analisis Kelayakan Gaji Pembeli (DSR 35%)
              </span>
              <p className="text-[11px] text-muted-foreground">
                Sesuai standar Bank Indonesia, cicilan maksimal 35% penghasilan bulanan.
              </p>
            </div>

            <div className="bg-background p-2.5 rounded-xl border text-right shrink-0">
              <span className="text-[10px] text-muted-foreground block">Minimum Penghasilan Pembeli:</span>
              <span className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {formatCurrency(calculations.requiredIncomeFixed)}
                <span className="text-[10px] font-normal text-muted-foreground"> /bln</span>
              </span>
            </div>
          </Card>

          <Tabs defaultValue="fees" className="w-full">
            <TabsList className="grid grid-cols-2 h-9 text-xs">
              <TabsTrigger value="fees" className="text-xs">Rincian Total Uang Awal (Akad + BPHTB)</TabsTrigger>
              <TabsTrigger value="amortization" className="text-xs">Tabel Amortisasi Tahunan</TabsTrigger>
            </TabsList>

            <TabsContent value="fees" className="space-y-3 pt-2">
              <Card className="border shadow-xs">
                <CardHeader className="p-3.5 pb-2">
                  <CardTitle className="text-xs font-bold flex items-center gap-1.5">
                    <Wallet className="w-3.5 h-3.5 text-emerald-600" /> Rincian Pengeluaran Uang Muka & Biaya Legalitas
                  </CardTitle>
                </CardHeader>

                <CardContent className="p-3.5 pt-0 text-xs">
                  <div className="divide-y divide-border/40">
                    <div className="py-2 flex justify-between font-medium">
                      <span className="text-muted-foreground">Uang Muka / DP ({dpPercentage}%):</span>
                      <span className="font-mono text-foreground font-bold">
                        {formatCurrency(calculations.dpNominal)}
                      </span>
                    </div>

                    <div className="py-2 flex justify-between">
                      <span className="text-muted-foreground">Provisi Bank (1% Plafon):</span>
                      <span className="font-mono text-foreground">
                        {formatCurrency(calculations.provisiFee)}
                      </span>
                    </div>

                    <div className="py-2 flex justify-between">
                      <span className="text-muted-foreground">Biaya Administrasi Bank:</span>
                      <span className="font-mono text-foreground">
                        {formatCurrency(calculations.adminFee)}
                      </span>
                    </div>

                    {calculations.appraisalFee > 0 && (
                      <div className="py-2 flex justify-between">
                        <span className="text-muted-foreground">Biaya Appraisal (Penilaian):</span>
                        <span className="font-mono text-foreground">
                          {formatCurrency(calculations.appraisalFee)}
                        </span>
                      </div>
                    )}

                    <div className="py-2 flex justify-between">
                      <span className="text-muted-foreground">Estimasi Notaris & APHT (1%):</span>
                      <span className="font-mono text-foreground">
                        {formatCurrency(calculations.notaryFee)}
                      </span>
                    </div>

                    <div className="py-2 flex justify-between">
                      <span className="text-muted-foreground">Estimasi Asuransi Jiwa & Kebakaran (~1.2%):</span>
                      <span className="font-mono text-foreground">
                        {formatCurrency(calculations.insuranceFee)}
                      </span>
                    </div>

                    {includeBphtb && (
                      <div className="py-2 flex justify-between text-amber-700 dark:text-amber-400">
                        <span className="font-medium">Estimasi Pajak Pembeli BPHTB (5%):</span>
                        <span className="font-mono font-bold">
                          {formatCurrency(calculations.bphtbTax)}
                        </span>
                      </div>
                    )}

                    <div className="py-2.5 flex justify-between font-bold bg-emerald-50 dark:bg-emerald-950/40 px-3 rounded-lg mt-2 text-emerald-800 dark:text-emerald-300">
                      <span>TOTAL DANA AWAL DISIAPKAN (DP + AKAD + PAJAK):</span>
                      <span className="font-mono font-bold text-sm">
                        {formatCurrency(calculations.totalUangAwal)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="amortization" className="space-y-3 pt-2">
              <Card className="border shadow-xs">
                <CardHeader className="p-3.5 pb-2">
                  <CardTitle className="text-xs font-bold flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-emerald-600" /> Ringkasan Pokok & Bunga Tahunan
                  </CardTitle>
                </CardHeader>

                <CardContent className="p-0">
                  <div className="max-h-[280px] overflow-y-auto">
                    <Table>
                      <TableHeader className="bg-muted/50 sticky top-0">
                        <TableRow>
                          <TableHead className="text-[11px] font-bold">Tahun</TableHead>
                          <TableHead className="text-[11px] font-bold">Skema</TableHead>
                          <TableHead className="text-[11px] font-bold">Pokok</TableHead>
                          <TableHead className="text-[11px] font-bold">Bunga</TableHead>
                          <TableHead className="text-[11px] font-bold text-right">Sisa Plafon</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {calculations.amortizationSchedule.map((row) => (
                          <TableRow key={row.year} className="text-xs hover:bg-muted/30">
                            <TableCell className="py-2 font-mono font-bold">Ke-{row.year}</TableCell>
                            <TableCell className="py-2">
                              <Badge
                                variant="outline"
                                className={
                                  row.isFixed
                                    ? "text-[9px] bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : "text-[9px] bg-amber-50 text-amber-700 border-amber-200"
                                }
                              >
                                {row.isFixed ? "Fixed" : "Floating"}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-2 font-mono text-emerald-600 dark:text-emerald-400">
                              {formatCurrency(row.yearlyPrincipal)}
                            </TableCell>
                            <TableCell className="py-2 font-mono text-amber-600">
                              {formatCurrency(row.yearlyInterest)}
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
        </div>
      </div>
    </div>
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