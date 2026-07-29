// app/(dashboard)/reports/page.tsx

"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Home,
  Building2,
  Users,
  FileBarChart,
  Download,
  RefreshCw,
  MapPin,
} from "lucide-react";
import { reportService } from "@/services/report.service";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

import {
  Bar,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
} from "recharts";

const COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#ec4899"];

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - 3 + i);

// Formatter dibuat sekali di luar komponen, tidak dibuat ulang setiap render
const currencyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});
const numberFormatter = new Intl.NumberFormat("id-ID");

function formatCurrency(value: number | undefined | null) {
  if (!value) return "Rp 0";
  return currencyFormatter.format(value);
}

function formatNumber(value: number | undefined | null) {
  return numberFormatter.format(value || 0);
}

// Badge kecil untuk menampilkan tren naik/turun dibanding bulan sebelumnya.
// Dihitung dari data yang sudah ada di memori, jadi tidak perlu request tambahan.
function TrendBadge({ change }: { change: number | null }) {
  if (change === null || !isFinite(change)) return null;
  const isUp = change >= 0;
  const Icon = isUp ? TrendingUp : TrendingDown;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium mt-1",
        isUp ? "text-emerald-600" : "text-red-500"
      )}
    >
      <Icon size={12} />
      {Math.abs(change).toFixed(1)}% dari bulan lalu
    </span>
  );
}

export default function ReportsPage() {
  const router = useRouter();

  // Loading dipecah jadi 3 supaya interaksi (ganti tahun / refresh) tidak
  // memblokir seluruh halaman dengan skeleton besar seperti sebelumnya.
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [monthlyLoading, setMonthlyLoading] = useState(false);

  const [stats, setStats] = useState<any>(null);
  const [statusData, setStatusData] = useState<any[]>([]);
  const [typeData, setTypeData] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [agentData, setAgentData] = useState<any[]>([]);
  const [locationData, setLocationData] = useState<any[]>([]);
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);

  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // ===== DATA YANG TIDAK BERGANTUNG PADA TAHUN =====
  // Dulu, SEMUA data (termasuk yang tidak terkait tahun) ditarik ulang
  // setiap kali user ganti dropdown tahun. Itu penyebab utama halaman
  // terasa berat. Sekarang data ini hanya diambil sekali saat halaman dibuka.
  const fetchStaticData = useCallback(async () => {
    const [mainStats, statusDist, typeDist, agents, locations] = await Promise.all([
      reportService.getMainStats(),
      reportService.getStatusDistribution(),
      reportService.getTypeDistribution(),
      reportService.getAgentPerformance(),
      reportService.getTopLocations(6),
    ]);

    if (!isMounted.current) return;
    setStats(mainStats);
    setStatusData(statusDist);
    setTypeData(typeDist);
    setAgentData(agents);
    setLocationData(locations);
  }, []);

  // ===== DATA BULANAN (satu-satunya yang bergantung pada tahun) =====
  const fetchMonthlyData = useCallback(async (year: number) => {
    const monthly = await reportService.getMonthlyStats(year);
    if (!isMounted.current) return;
    setMonthlyData(monthly);
  }, []);

  // Load pertama kali saat halaman dibuka
  useEffect(() => {
    (async () => {
      try {
        await Promise.all([fetchStaticData(), fetchMonthlyData(selectedYear)]);
      } catch (error: any) {
        console.error("Error fetching reports:", error);
        toast.error("Gagal memuat laporan: " + error.message);
      } finally {
        if (isMounted.current) setInitialLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ganti tahun -> hanya tarik ulang grafik bulanan, bukan seluruh halaman
  useEffect(() => {
    if (initialLoading) return; // sudah ditangani di load pertama di atas
    setMonthlyLoading(true);
    fetchMonthlyData(selectedYear)
      .catch((error: any) => {
        console.error("Error fetching monthly stats:", error);
        toast.error("Gagal memuat data bulanan: " + error.message);
      })
      .finally(() => {
        if (isMounted.current) setMonthlyLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear]);

  // Refresh manual: tarik ulang semua data tanpa menutupi halaman dengan skeleton penuh
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([fetchStaticData(), fetchMonthlyData(selectedYear)]);
      toast.success("Data laporan diperbarui");
    } catch (error: any) {
      console.error("Error refreshing reports:", error);
      toast.error("Gagal memperbarui laporan: " + error.message);
    } finally {
      if (isMounted.current) setRefreshing(false);
    }
  };

  // ===== TREN BULANAN, dihitung dari data yang sudah ada (tanpa request baru) =====
  const createdTrend = useMemo(() => {
    if (monthlyData.length < 2) return null;
    const current = monthlyData[monthlyData.length - 1]?.created ?? 0;
    const previous = monthlyData[monthlyData.length - 2]?.created ?? 0;
    if (!previous) return null;
    return ((current - previous) / previous) * 100;
  }, [monthlyData]);

  const soldTrend = useMemo(() => {
    if (monthlyData.length < 2) return null;
    const current = monthlyData[monthlyData.length - 1]?.sold ?? 0;
    const previous = monthlyData[monthlyData.length - 2]?.sold ?? 0;
    if (!previous) return null;
    return ((current - previous) / previous) * 100;
  }, [monthlyData]);

  // ===== EXPORT LAPORAN =====
  const handleExport = () => {
    const csvData = [
      ["Metrik", "Nilai"],
      ["Total Properti", stats?.totalProperties || 0],
      ["Listing Aktif", stats?.totalActive || 0],
      ["Properti Terjual", stats?.totalSold || 0],
      ["Properti Disewa", stats?.totalRented || 0],
      ["Properti Draf", stats?.totalDraft || 0],
      ["Properti Diarsipkan", stats?.totalArchived || 0],
      ["Harga Rata-rata", stats?.averagePrice || 0],
      ["Total Pendapatan", stats?.totalRevenue || 0],
    ];

    const csvContent = csvData.map((row) => row.join(",")).join("\n");
    // Prefix BOM supaya karakter non-ASCII tampil benar saat dibuka di Excel
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `laporan-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success("Laporan berhasil diekspor!");
  };

  if (initialLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
        <Skeleton className="h-80 rounded-xl" />
      </div>
    );
  }

  return (
    <div className={cn("space-y-6 transition-opacity", refreshing && "opacity-60 pointer-events-none")}>
      {/* HEADER */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 p-6 text-white shadow-lg">
        <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="h-10 w-10 text-white hover:bg-white/20"
            >
              <ArrowLeft size={22} />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">📊 Laporan & Statistik</h1>
              <p className="text-sm text-white/80">Analisis data properti secara lengkap</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Select
              value={selectedYear.toString()}
              onValueChange={(val) => setSelectedYear(parseInt(val || "0"))}
            >
              <SelectTrigger className="w-[120px] bg-white/20 text-white border-0">
                <SelectValue placeholder="Tahun" />
              </SelectTrigger>
              <SelectContent>
                {YEAR_OPTIONS.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExport}
              className="bg-white/20 text-white hover:bg-white/30"
            >
              <Download size={16} className="mr-2" />
              Ekspor CSV
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="bg-white/20 text-white hover:bg-white/30"
            >
              <RefreshCw size={16} className={cn("mr-2", refreshing && "animate-spin")} />
              {refreshing ? "Memperbarui..." : "Segarkan"}
            </Button>
          </div>
        </div>
      </div>

      {/* KARTU STATISTIK UTAMA */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm ring-1 ring-slate-100">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">Total Properti</p>
                <p className="text-2xl font-bold text-slate-800">{formatNumber(stats?.totalProperties)}</p>
                <TrendBadge change={createdTrend} />
              </div>
              <div className="rounded-full bg-blue-50 p-2.5 text-blue-500">
                <Home size={18} />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm ring-1 ring-slate-100">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">Listing Aktif</p>
                <p className="text-2xl font-bold text-emerald-600">{formatNumber(stats?.totalActive)}</p>
              </div>
              <div className="rounded-full bg-emerald-50 p-2.5 text-emerald-500">
                <Building2 size={18} />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm ring-1 ring-slate-100">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">Terjual / Disewa</p>
                <p className="text-2xl font-bold text-amber-600">
                  {formatNumber((stats?.totalSold || 0) + (stats?.totalRented || 0))}
                </p>
                <TrendBadge change={soldTrend} />
              </div>
              <div className="rounded-full bg-amber-50 p-2.5 text-amber-500">
                <TrendingUp size={18} />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm ring-1 ring-slate-100">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">Total Pendapatan</p>
                <p className="text-2xl font-bold text-purple-600">{formatCurrency(stats?.totalRevenue)}</p>
              </div>
              <div className="rounded-full bg-purple-50 p-2.5 text-purple-500">
                <DollarSign size={18} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* KARTU STATISTIK SEKUNDER */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="shadow-sm ring-1 ring-slate-100 border-0">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-slate-500">Harga Rata-rata</p>
            <p className="text-lg font-bold text-slate-800">{formatCurrency(stats?.averagePrice)}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm ring-1 ring-slate-100 border-0">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-slate-500">Draf</p>
            <p className="text-lg font-bold text-slate-800">{formatNumber(stats?.totalDraft)}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm ring-1 ring-slate-100 border-0">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-slate-500">Diarsipkan</p>
            <p className="text-lg font-bold text-slate-800">{formatNumber(stats?.totalArchived)}</p>
          </CardContent>
        </Card>
      </div>

      {/* GRAFIK DISTRIBUSI */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-md">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-t-xl">
            <CardTitle className="text-base flex items-center gap-2 text-slate-700">
              <FileBarChart size={18} className="text-blue-500" />
              Distribusi Status
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {statusData.length === 0 ? (
              <p className="text-center text-slate-400 py-16">Belum ada data status</p>
            ) : (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      dataKey="count"
                      nameKey="status"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={entry.status} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `${value} properti`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-t-xl">
            <CardTitle className="text-base flex items-center gap-2 text-slate-700">
              <Building2 size={18} className="text-emerald-500" />
              Tipe Properti
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {typeData.length === 0 ? (
              <p className="text-center text-slate-400 py-16">Belum ada data tipe</p>
            ) : (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={typeData}
                      dataKey="count"
                      nameKey="type"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                    >
                      {typeData.map((entry, index) => (
                        <Cell key={entry.type} fill={COLORS[(index + 2) % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `${value} properti`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* TREN BULANAN */}
      <Card className="border-0 shadow-md">
        <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-t-xl">
          <CardTitle className="text-base flex items-center gap-2 text-slate-700">
            <TrendingUp size={18} className="text-amber-500" />
            Tren Bulanan ({selectedYear})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {monthlyLoading ? (
            <Skeleton className="h-[300px] w-full rounded-lg" />
          ) : (
            <>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="month" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                    <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "12px",
                        border: "1px solid #e2e8f0",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                      }}
                    />
                    <Bar dataKey="created" name="Properti Baru" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={28} />
                    <Line
                      type="monotone"
                      dataKey="sold"
                      name="Terjual"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: "#10b981" }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div className="text-center text-xs text-slate-400 mt-2">
                🔵 Properti Baru &nbsp;|&nbsp; 🟢 Terjual
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* PERFORMA AGEN */}
      <Card className="border-0 shadow-md">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-t-xl">
          <CardTitle className="text-base flex items-center gap-2 text-slate-700">
            <Users size={18} className="text-purple-500" />
            Performa Agen
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {agentData.length === 0 ? (
            <p className="text-center text-slate-400 py-8">Belum ada data agen</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left p-2 font-semibold text-slate-600">Agen</th>
                    <th className="text-center p-2 font-semibold text-slate-600">Total Properti</th>
                    <th className="text-center p-2 font-semibold text-slate-600">Terjual</th>
                    <th className="text-right p-2 font-semibold text-slate-600">Pendapatan</th>
                    <th className="text-right p-2 font-semibold text-slate-600">Komisi (2.5%)</th>
                  </tr>
                </thead>
                <tbody>
                  {agentData.map((agent, index) => (
                    <tr key={agent.agent_id} className={index % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                      <td className="p-2 font-medium text-slate-700">{agent.agent_name}</td>
                      <td className="text-center p-2 text-slate-600">{agent.total_properties}</td>
                      <td className="text-center p-2 text-slate-600">{agent.total_sold}</td>
                      <td className="text-right p-2 text-slate-600">{formatCurrency(agent.total_revenue)}</td>
                      <td className="text-right p-2 font-medium text-emerald-600">{formatCurrency(agent.commission)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* LOKASI TERATAS */}
      <Card className="border-0 shadow-md">
        <CardHeader className="bg-gradient-to-r from-cyan-50 to-sky-50 rounded-t-xl">
          <CardTitle className="text-base flex items-center gap-2 text-slate-700">
            <MapPin size={18} className="text-cyan-500" />
            Lokasi Teratas
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {locationData.length === 0 ? (
            <p className="text-center text-slate-400 py-8">Belum ada data lokasi</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {locationData.map((loc, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <span className="font-medium text-slate-700">{loc.name}</span>
                  <Badge variant="secondary">{loc.count} properti</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}