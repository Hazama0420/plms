// app/(dashboard)/dashboard/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  TrendingUp,
  Building2,
  Users,
  Calendar,
  AlertTriangle,
  Plus,
  ArrowUpRight,
  Sparkles,
  Clock,
  HardHat,
  FileText,
  CheckCircle2,
  ChevronRight,
  RefreshCw,
  Activity,
  CalendarCheck,
  ShieldAlert,
} from "lucide-react";

import { dashboardService, type DashboardStats } from "@/services/dashboard.service";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [warningSheetOpen, setWarningSheetOpen] = useState(false);

  // Fetch Data dari dashboard.service
  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await dashboardService.getStats();
      setStats(data);
    } catch (error) {
      console.error("Gagal memuat statistik dashboard:", error);
      toast.error("Gagal memperbarui data dashboard real-time");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Format IDR Currency
  const formatIDR = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  if (loading) {
    return <DashboardLoadingSkeleton />;
  }

  // Sample data fallback
  const totalRevenue = 145000000;
  const criticalProjects = [
    { id: "1", name: "Cluster Green BSD", material: "Semen Portland", stock: "12 Sak", status: "Kritis" },
    { id: "2", name: "Ruko Sentra Fatmawati", material: "Besi Ulir 12mm", stock: "8 Batang", status: "Menipis" },
  ];

  return (
    <div className="space-y-6 pb-12">
      
      {/* ============================================================ */}
      {/* 📱 TAMPILAN KHUSUS MOBILE (sm:hidden)                        */}
      {/* ============================================================ */}
      <div className="block md:hidden space-y-4">
        
        {/* 1. QUICK ACTION HUB (Mobile Horizontal Micro Scroll) */}
        <div>
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
            ⚡ Akses Cepat
          </p>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <Button
              size="sm"
              onClick={() => router.push("/crm/leads/create")}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 px-3 rounded-xl shrink-0 gap-1 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" /> Lead
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => router.push("/surveys")}
              className="text-xs h-8 px-3 rounded-xl shrink-0 gap-1 border-emerald-200 text-emerald-800 dark:text-emerald-300"
            >
              <CalendarCheck className="w-3.5 h-3.5 text-emerald-600" /> Survey
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => router.push("/invoices/create")}
              className="text-xs h-8 px-3 rounded-xl shrink-0 gap-1"
            >
              <FileText className="w-3.5 h-3.5 text-blue-600" /> Invoice
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => router.push("/projects")}
              className="text-xs h-8 px-3 rounded-xl shrink-0 gap-1"
            >
              <HardHat className="w-3.5 h-3.5 text-amber-600" /> Proyek
            </Button>
          </div>
        </div>

        {/* 2. GRID KPI 2x2 (Mobile Ringkas) */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Revenue */}
          <Card className="border shadow-sm bg-card/80">
            <CardContent className="p-3">
              <div className="flex items-center justify-between text-muted-foreground mb-1">
                <span className="text-[10px] font-semibold">Revenue Bulan Ini</span>
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <h3 className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {formatIDR(totalRevenue)}
              </h3>
              <p className="text-[9px] text-muted-foreground mt-0.5">+12.4% dari bulan lalu</p>
            </CardContent>
          </Card>

          {/* Active Listing */}
          <Card className="border shadow-sm bg-card/80">
            <CardContent className="p-3">
              <div className="flex items-center justify-between text-muted-foreground mb-1">
                <span className="text-[10px] font-semibold">Listing Aktif</span>
                <Building2 className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <h3 className="text-base font-bold text-foreground">
                {stats?.activeListings || 0} <span className="text-[10px] font-normal text-muted-foreground">Unit</span>
              </h3>
              <p className="text-[9px] text-muted-foreground mt-0.5">Dari {stats?.totalProperties || 0} total properti</p>
            </CardContent>
          </Card>

          {/* Leads Baru */}
          <Card className="border shadow-sm bg-card/80">
            <CardContent className="p-3">
              <div className="flex items-center justify-between text-muted-foreground mb-1">
                <span className="text-[10px] font-semibold">Leads Hari Ini</span>
                <Users className="w-3.5 h-3.5 text-purple-600" />
              </div>
              <h3 className="text-base font-bold text-foreground">
                {stats?.todayLeads || 0} <span className="text-[10px] font-normal text-muted-foreground">Prospek</span>
              </h3>
              <p className="text-[9px] text-muted-foreground mt-0.5">Membutuhkan follow-up</p>
            </CardContent>
          </Card>

          {/* Jadwal Hari Ini */}
          <Card className="border shadow-sm bg-card/80">
            <CardContent className="p-3">
              <div className="flex items-center justify-between text-muted-foreground mb-1">
                <span className="text-[10px] font-semibold">Jadwal Survey</span>
                <Calendar className="w-3.5 h-3.5 text-amber-600" />
              </div>
              <h3 className="text-base font-bold text-foreground">
                3 <span className="text-[10px] font-normal text-muted-foreground">Agenda</span>
              </h3>
              <p className="text-[9px] text-muted-foreground mt-0.5">Survei lokasi aktif</p>
            </CardContent>
          </Card>
        </div>

        {/* 3. AI WARNING ALERT CARD (Mobile Single Card -> Triggers Sheet) */}
        <Card
          onClick={() => setWarningSheetOpen(true)}
          className="border-amber-500/30 bg-amber-500/10 dark:bg-amber-950/30 shadow-sm cursor-pointer hover:border-amber-500/50 transition"
        >
          <CardContent className="p-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-500/20 text-amber-600 rounded-xl shrink-0">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-amber-900 dark:text-amber-300">
                  ⚠️ Alert Material Kritis ({criticalProjects.length})
                </p>
                <p className="text-[10px] text-amber-800/80 dark:text-amber-400">
                  Klik untuk memeriksa detail stok proyek & invoice.
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-amber-600 shrink-0" />
          </CardContent>
        </Card>

        {/* 4. AI EXECUTIVE SUMMARY TEXT CARD (Mobile Narasi Komisaris) */}
        <Card className="border shadow-sm bg-gradient-to-br from-emerald-500/5 to-transparent">
          <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> AI Ringkasan Eksekutif
            </CardTitle>
            <Badge variant="outline" className="text-[9px] font-mono border-emerald-500/30 text-emerald-700 dark:text-emerald-300">
              Gemini Flash
            </Badge>
          </CardHeader>
          <CardContent className="p-3 pt-1 text-[11px] text-muted-foreground leading-relaxed">
            Pencapaian revenue bulan ini meningkat +12.4%. Terdapat {stats?.todayLeads || 0} leads baru yang perlu segera ditindaklanjuti oleh agen. Perhatikan stok semen pada proyek Cluster Green BSD yang telah mencapai batas kritis.
          </CardContent>
        </Card>
      </div>

      {/* ============================================================ */}
      {/* 💻 TAMPILAN KHUSUS DESKTOP (hidden md:block)                 */}
      {/* ============================================================ */}
      <div className="hidden md:block space-y-6">
        
        {/* Header Title Bar */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              📊 Pusat Kendali Operasional
            </h1>
            <p className="text-xs text-muted-foreground">
              Ringkasan performa real-time Inland Property untuk Admin & Komisaris.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadDashboardData}
            className="text-xs gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh Data
          </Button>
        </div>

        {/* 1. BENTO GRID KPI 4-KOLOM (Desktop Row 1) */}
        <div className="grid grid-cols-4 gap-4">
          {/* Revenue Card */}
          <Card className="border shadow-sm bg-card/80 hover:border-emerald-500/30 transition">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold">Revenue Bulan Ini</span>
                <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-xl">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <h3 className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {formatIDR(totalRevenue)}
              </h3>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <span className="text-emerald-600 font-semibold">+12.4%</span> dari bulan sebelumnya
              </p>
            </CardContent>
          </Card>

          {/* Active Listings Card */}
          <Card className="border shadow-sm bg-card/80 hover:border-blue-500/30 transition">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold">Listing Properti Aktif</span>
                <div className="p-2 bg-blue-500/10 text-blue-600 rounded-xl">
                  <Building2 className="w-4 h-4" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-foreground">
                {stats?.activeListings || 0} <span className="text-xs font-normal text-muted-foreground">Unit</span>
              </h3>
              <p className="text-xs text-muted-foreground">
                Dari {stats?.totalProperties || 0} total listing terdaftar
              </p>
            </CardContent>
          </Card>

          {/* Leads Baru Card */}
          <Card className="border shadow-sm bg-card/80 hover:border-purple-500/30 transition">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold">Leads Baru Hari Ini</span>
                <div className="p-2 bg-purple-500/10 text-purple-600 rounded-xl">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-foreground">
                {stats?.todayLeads || 0} <span className="text-xs font-normal text-muted-foreground">Prospek</span>
              </h3>
              <p className="text-xs text-muted-foreground">
                Di-assign ke agen penanggung jawab
              </p>
            </CardContent>
          </Card>

          {/* Agenda Survey Card */}
          <Card className="border shadow-sm bg-card/80 hover:border-amber-500/30 transition">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold">Jadwal Survey Lapangan</span>
                <div className="p-2 bg-amber-500/10 text-amber-600 rounded-xl">
                  <Calendar className="w-4 h-4" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-foreground">
                3 <span className="text-xs font-normal text-muted-foreground">Agenda</span>
              </h3>
              <p className="text-xs text-muted-foreground">
                Terjadwal untuk hari ini
              </p>
            </CardContent>
          </Card>
        </div>

        {/* 2. TABEL OPERASIONAL KRITIS & ACTIVITY FEED (Desktop Row 2) */}
        <div className="grid grid-cols-3 gap-6">
          {/* Tabel Konstruksi Kritis */}
          <Card className="col-span-2 border shadow-sm">
            <CardHeader className="p-4 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <HardHat className="w-4 h-4 text-amber-600" /> Proyek & Material Kritis
                </CardTitle>
                <CardDescription className="text-xs">
                  Proyek dengan status persediaan stok material menipis.
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/projects")}
                className="text-xs gap-1 text-emerald-700 dark:text-emerald-400"
              >
                Lihat Proyek <ArrowUpRight className="w-3.5 h-3.5" />
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="text-xs font-semibold">Nama Proyek</TableHead>
                    <TableHead className="text-xs font-semibold">Material Kritis</TableHead>
                    <TableHead className="text-xs font-semibold">Sisa Stok</TableHead>
                    <TableHead className="text-xs font-semibold">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {criticalProjects.map((proj) => (
                    <TableRow key={proj.id} className="hover:bg-muted/30">
                      <TableCell className="p-3 text-xs font-bold text-foreground">
                        {proj.name}
                      </TableCell>
                      <TableCell className="p-3 text-xs text-muted-foreground">
                        {proj.material}
                      </TableCell>
                      <TableCell className="p-3 text-xs font-mono font-semibold">
                        {proj.stock}
                      </TableCell>
                      <TableCell className="p-3">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] px-2 py-0.5",
                            proj.status === "Kritis"
                              ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 border-rose-200"
                              : "bg-amber-100 text-amber-700 dark:bg-amber-950/60 border-amber-200"
                          )}
                        >
                          {proj.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Recent Activity Log Feed */}
          <Card className="border shadow-sm">
            <CardHeader className="p-4 border-b">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-600" /> Log Aktivitas Terakhir
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs">
              {stats?.recentActivities && stats.recentActivities.length > 0 ? (
                stats.recentActivities.slice(0, 4).map((act) => (
                  <div key={act.id} className="flex items-start gap-2.5 pb-2 border-b border-border/40 last:border-0 last:pb-0">
                    <div className="w-2 h-2 rounded-full bg-emerald-600 mt-1.5 shrink-0" />
                    <div>
                      <p className="font-semibold text-foreground">{act.description}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {new Date(act.time).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-4">Belum ada aktivitas baru.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 3. AI EXECUTIVE SUMMARY BOX (Desktop Row 3 Full Card) */}
        <Card className="border shadow-sm bg-gradient-to-r from-emerald-500/10 via-card to-card">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-md shadow-emerald-600/20">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold text-foreground">
                  AI Executive Summary — Laporan Makro Bisnis
                </CardTitle>
                <CardDescription className="text-xs">
                  Dihasilkan otomatis oleh Google Gemini 1.5 Flash untuk Komisaris & Direksi.
                </CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="text-xs font-mono border-emerald-500/30 text-emerald-700 dark:text-emerald-300">
              Live AI Analysis
            </Badge>
          </CardHeader>
          <CardContent className="p-4 pt-2 text-xs text-foreground/90 leading-relaxed">
            Performa operasional perusahaan berjalan stabil dengan pertumbuhan revenue +12.4% pada bulan berjalan. Konversi leads CRM meningkat dengan masuknya {stats?.todayLeads || 0} prospek baru hari ini. Namun, disarankan agar tim lapangan segera melakukan pengadaan semen ulang pada proyek Cluster Green BSD untuk mencegah risiko kelambatan jadwal konstruksi.
          </CardContent>
        </Card>
      </div>

      {/* ============================================================ */}
      {/* 🎯 MOBILE BOTTOM SHEET DRAWER (AI Warning Detail)           */}
      {/* ============================================================ */}
      <Sheet open={warningSheetOpen} onOpenChange={setWarningSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] p-5">
          <SheetHeader className="text-left">
            <Badge variant="outline" className="w-fit text-[10px] border-amber-500/30 text-amber-700 dark:text-amber-400 mb-1">
              Sistem Peringatan Dini
            </Badge>
            <SheetTitle className="text-base font-bold flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-600" /> Detail Material & Invoice Kritis
            </SheetTitle>
            <SheetDescription className="text-xs">
              Aksi cepat untuk menyetujui reorder material atau pelunasan tagihan.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 py-4 text-xs">
            <div className="space-y-2">
              <p className="font-bold text-foreground">📦 Material Proyek Menipis:</p>
              {criticalProjects.map((p) => (
                <div key={p.id} className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="font-bold text-amber-900 dark:text-amber-200">{p.name}</p>
                    <p className="text-[11px] text-amber-800 dark:text-amber-400">{p.material} — Sisa: <span className="font-mono font-bold">{p.stock}</span></p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      setWarningSheetOpen(false);
                      router.push("/projects");
                    }}
                    className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-7 px-2.5"
                  >
                    Reorder
                  </Button>
                </div>
              ))}
            </div>

            <Button
              variant="outline"
              className="w-full text-xs mt-2"
              onClick={() => setWarningSheetOpen(false)}
            >
              Tutup Drawer
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

// Skeleton Loading Layout
function DashboardLoadingSkeleton() {
  return (
    <div className="space-y-6 pb-12">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-48 w-full rounded-2xl" />
    </div>
  );
}