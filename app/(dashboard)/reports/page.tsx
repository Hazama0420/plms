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
  Download,
  RefreshCw,
  MapPin,
  Trophy,
  PieChart as PieIcon,
  Award,
  BarChart3,
  CheckCircle2,
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

const COLORS = ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#ec4899", "#06b6d4"];

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - 3 + i);

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

function TrendBadge({ change }: { change: number | null }) {
  if (change === null || !isFinite(change)) return null;
  const isUp = change >= 0;
  const Icon = isUp ? TrendingUp : TrendingDown;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[11px] font-semibold mt-1 px-1.5 py-0.5 rounded-md",
        isUp ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-600"
      )}
    >
      <Icon size={12} />
      {Math.abs(change).toFixed(1)}% dari bulan lalu
    </span>
  );
}

export default function ReportsPage() {
  const router = useRouter();

  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [monthlyLoading, setMonthlyLoading] = useState(false);

  const [stats, setStats] = useState<any>(null);
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

  // Fetch Static Data (Main Stats, Agent Performance, Top Locations, Type Dist)
  const fetchStaticData = useCallback(async () => {
    const [mainStats, typeDist, agents, locations] = await Promise.all([
      reportService.getMainStats(),
      reportService.getTypeDistribution(),
      reportService.getAgentPerformance(),
      reportService.getTopLocations(6),
    ]);

    if (!isMounted.current) return;
    setStats(mainStats);
    setTypeData(typeDist);
    setAgentData(agents);
    setLocationData(locations);
  }, []);

  // Fetch Monthly Data
  const fetchMonthlyData = useCallback(async (year: number) => {
    const monthly = await reportService.getMonthlyStats(year);
    if (!isMounted.current) return;
    setMonthlyData(monthly);
  }, []);

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
  }, [fetchStaticData, fetchMonthlyData, selectedYear]);

  useEffect(() => {
    if (initialLoading) return;
    setMonthlyLoading(true);
    fetchMonthlyData(selectedYear)
      .catch((error: any) => {
        console.error("Error fetching monthly stats:", error);
        toast.error("Gagal memuat data bulanan: " + error.message);
      })
      .finally(() => {
        if (isMounted.current) setMonthlyLoading(false);
      });
  }, [selectedYear, initialLoading, fetchMonthlyData]);

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

  // Total Nilai Properti di Lokasi Teratas
  const totalLocationProperties = useMemo(() => {
    return locationData.reduce((acc, curr) => acc + (curr.count || 0), 0);
  }, [locationData]);

  const handleExport = () => {
    const csvData = [
      ["Metrik Laporan Eksekutif", "Nilai"],
      ["Total Portofolio Properti", stats?.totalProperties || 0],
      ["Listing Aktif", stats?.totalActive || 0],
      ["Properti Terjual", stats?.totalSold || 0],
      ["Properti Disewa", stats?.totalRented || 0],
      ["Harga Rata-rata Properti", stats?.averagePrice || 0],
      ["Total Omset Transaksi", stats?.totalRevenue || 0],
      ["Estimasi Komisi Kantor (2.5%)", (stats?.totalRevenue || 0) * 0.025],
    ];

    const csvContent = csvData.map((row) => row.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `laporan-kinerja-inland-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success("Laporan berhasil diekspor!");
  };

  if (initialLoading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-4 pb-16 transition-opacity", refreshing && "opacity-60 pointer-events-none")}>
      
      {/* 1. HEADER HALAMAN */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-700 via-teal-700 to-slate-900 p-6 text-white shadow-md border border-emerald-600/30">
        <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="h-9 w-9 text-white hover:bg-white/20 rounded-xl cursor-pointer"
            >
              <ArrowLeft size={20} />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight">📊 Analitik & Laporan Performa</h1>
                <Badge className="bg-emerald-500/30 text-white border-0 text-[10px] font-semibold">
                  Real-Time
                </Badge>
              </div>
              <p className="text-xs text-emerald-100/80 mt-0.5">
                Ringkasan performa penjualan, persebaran lokasi, dan efektivitas agen
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Select
              value={selectedYear.toString()}
              onValueChange={(val) => setSelectedYear(parseInt(val || "0"))}
            >
              <SelectTrigger className="w-[110px] bg-white/15 text-white border-white/20 h-9 text-xs rounded-xl focus:ring-0">
                <SelectValue placeholder="Tahun" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {YEAR_OPTIONS.map((year) => (
                  <SelectItem key={year} value={year.toString()} className="text-xs font-semibold">
                    Tahun {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="secondary"
              size="sm"
              onClick={handleExport}
              className="bg-white/15 text-white hover:bg-white/25 h-9 text-xs font-semibold rounded-xl border border-white/20 gap-1.5 cursor-pointer"
            >
              <Download size={14} />
              Ekspor CSV
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="bg-white/15 text-white hover:bg-white/25 h-9 text-xs font-semibold rounded-xl border border-white/20 gap-1.5 cursor-pointer"
            >
              <RefreshCw size={14} className={cn(refreshing && "animate-spin")} />
              {refreshing ? "Memuat..." : "Segarkan"}
            </Button>
          </div>
        </div>
      </div>

      {/* 2. RINGKASAN METRIK UTAMA (KPI CARDS) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Card className="border border-[#F4EFE6] bg-white shadow-2xs rounded-2xl">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold">Total Portofolio</span>
              <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
                <Home size={16} />
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-slate-900">{formatNumber(stats?.totalProperties)} Unit</p>
            <TrendBadge change={createdTrend} />
          </CardContent>
        </Card>

        <Card className="border border-[#F4EFE6] bg-white shadow-2xs rounded-2xl">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold">Listing Aktif</span>
              <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
                <Building2 size={16} />
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-blue-600">{formatNumber(stats?.totalActive)} Unit</p>
            <p className="text-[10px] text-slate-400 font-medium pt-1">Siap dipasarkan</p>
          </CardContent>
        </Card>

        <Card className="border border-[#F4EFE6] bg-white shadow-2xs rounded-2xl">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold">Terjual & Disewa</span>
              <div className="p-2 bg-amber-50 rounded-xl text-amber-600">
                <CheckCircle2 size={16} />
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-amber-600">
              {formatNumber((stats?.totalSold || 0) + (stats?.totalRented || 0))} Unit
            </p>
            <TrendBadge change={soldTrend} />
          </CardContent>
        </Card>

        <Card className="border border-[#F4EFE6] bg-white shadow-2xs rounded-2xl">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold">Gross Sales Revenue</span>
              <div className="p-2 bg-purple-50 rounded-xl text-purple-600">
                <DollarSign size={16} />
              </div>
            </div>
            <p className="text-lg sm:text-xl font-extrabold text-purple-700 truncate">
              {formatCurrency(stats?.totalRevenue)}
            </p>
            <p className="text-[10px] text-emerald-600 font-bold">
              Est. Komisi (2.5%): {formatCurrency((stats?.totalRevenue || 0) * 0.025)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 3. TREN PENJUALAN BULANAN */}
      <Card className="border border-[#F4EFE6] bg-white shadow-2xs rounded-2xl overflow-hidden">
        <CardHeader className="p-4 border-b border-[#F4EFE6] bg-slate-50/50 flex flex-row items-center justify-between">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
            <BarChart3 size={16} className="text-emerald-600" />
            Tren Aktivitas Penjualan vs Listing Baru ({selectedYear})
          </CardTitle>
          <Badge variant="outline" className="text-[10px] bg-white border-[#F4EFE6] text-slate-600">
            Bulanan
          </Badge>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {monthlyLoading ? (
            <Skeleton className="h-[280px] w-full rounded-xl bg-[#F4EFE6]" />
          ) : (
            <div className="space-y-3">
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="month" tick={{ fill: "#64748b", fontSize: 11 }} />
                    <YAxis tick={{ fill: "#64748b", fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "12px",
                        border: "1px solid #f4efe6",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                        fontSize: "12px",
                      }}
                    />
                    <Bar dataKey="created" name="Listing Baru" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={24} />
                    <Line
                      type="monotone"
                      dataKey="sold"
                      name="Terjual / Disewa"
                      stroke="#10b981"
                      strokeWidth={3}
                      dot={{ r: 4, fill: "#10b981" }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-center gap-6 text-xs text-slate-500 font-medium pt-2">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-xs bg-blue-500 inline-block" /> Listing Baru Ditambahkan
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" /> Unit Closing (Terjual/Sewa)
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 4. GRID DUA KOLOM: LOKASI TERATAS & TIPE PROPERTI */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* 📍 LOKASI TERATAS (HOTSPOT WILAYAH) */}
        <Card className="lg:col-span-7 border border-[#F4EFE6] bg-white shadow-2xs rounded-2xl flex flex-col justify-between">
          <div>
            <CardHeader className="p-4 border-b border-[#F4EFE6] bg-slate-50/50 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <MapPin size={16} className="text-emerald-600" />
                Lokasi Teratas (Hotspot Wilayah)
              </CardTitle>
              <Badge variant="outline" className="text-[9px] bg-emerald-50 text-emerald-700 border-emerald-200">
                Pusat Inventory
              </Badge>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 space-y-3.5">
              {locationData.length === 0 ? (
                <p className="text-center text-slate-400 py-10 text-xs">Belum ada data lokasi terdaftar.</p>
              ) : (
                locationData.map((loc, index) => {
                  const percentage = totalLocationProperties > 0 
                    ? Math.round((loc.count / totalLocationProperties) * 100) 
                    : 0;

                  return (
                    <div key={index} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-medium">
                        <span className="text-slate-800 font-bold flex items-center gap-1.5">
                          <span className="w-4 text-slate-400 text-[10px]">#{index + 1}</span>
                          {loc.name || "Lokasi Lainnya"}
                        </span>
                        <div className="flex items-center gap-2 text-slate-600 text-[11px]">
                          <span className="font-bold text-emerald-600">{loc.count} Unit</span>
                          <span className="text-slate-400 text-[10px]">({percentage}%)</span>
                        </div>
                      </div>
                      
                      {/* Visual Progress Bar */}
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(percentage, 5)}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </div>
          <div className="p-3.5 bg-slate-50/80 border-t border-[#F4EFE6] rounded-b-2xl">
            <p className="text-[10px] text-slate-500 font-medium text-center">
              💡 Wilayah dengan persentase tertinggi merupakan prioritas pemasaran dan kampanye iklan.
            </p>
          </div>
        </Card>

        {/* 🏢 DISTRIBUSI TIPE PROPERTI */}
        <Card className="lg:col-span-5 border border-[#F4EFE6] bg-white shadow-2xs rounded-2xl flex flex-col justify-between">
          <div>
            <CardHeader className="p-4 border-b border-[#F4EFE6] bg-slate-50/50 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <PieIcon size={16} className="text-emerald-600" />
                Komposisi Tipe Properti
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-5">
              {typeData.length === 0 ? (
                <p className="text-center text-slate-400 py-10 text-xs">Belum ada data tipe properti.</p>
              ) : (
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={typeData}
                        dataKey="count"
                        nameKey="type"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={3}
                      >
                        {typeData.map((entry, index) => (
                          <Cell key={entry.type} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val) => [`${val} Unit`, "Jumlah"]} />
                      <Legend
                        verticalAlign="bottom"
                        height={36}
                        formatter={(value) => <span className="text-[11px] font-semibold text-slate-700">{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </div>
        </Card>
      </div>

      {/* 5. LEADERBOARD & PERFORMA AGEN AKTIF */}
      <Card className="border border-[#F4EFE6] bg-white shadow-2xs rounded-2xl overflow-hidden">
        <CardHeader className="p-4 border-b border-[#F4EFE6] bg-slate-50/50 flex flex-row items-center justify-between">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
            <Trophy size={16} className="text-amber-500" />
            Papan Peringkat & Performa Agen Aktif
          </CardTitle>
          <Badge className="bg-amber-500 text-white border-0 text-[9px] font-bold gap-1">
            <Award size={12} /> Top Achievers
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          {agentData.length === 0 ? (
            <p className="text-center text-slate-400 py-12 text-xs">Belum ada data pencapaian agen.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-100/70 border-b border-[#F4EFE6] text-slate-600 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-3 text-center w-12">Rank</th>
                    <th className="p-3">Nama Agen</th>
                    <th className="p-3 text-center">Total Listing</th>
                    <th className="p-3 text-center">Terjual / Sewa</th>
                    <th className="p-3 text-center">Closing Rate</th>
                    <th className="p-3 text-right">Gross Revenue</th>
                    <th className="p-3 text-right">Est. Komisi (2.5%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F4EFE6]">
                  {agentData.map((agent, index) => {
                    const totalProp = agent.total_properties || 0;
                    const totalSold = agent.total_sold || 0;
                    const closingRate = totalProp > 0 ? ((totalSold / totalProp) * 100).toFixed(1) : "0.0";

                    return (
                      <tr key={agent.agent_id || index} className="hover:bg-slate-50/60 transition-colors">
                        <td className="p-3 text-center font-bold">
                          {index === 0 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-700 font-bold text-[11px]">
                              🥇
                            </span>
                          ) : index === 1 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-bold text-[11px]">
                              🥈
                            </span>
                          ) : index === 2 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-800/20 text-amber-900 font-bold text-[11px]">
                              🥉
                            </span>
                          ) : (
                            <span className="text-slate-400 font-semibold">#{index + 1}</span>
                          )}
                        </td>
                        <td className="p-3 font-bold text-slate-900">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[10px]">
                              {agent.agent_name?.slice(0, 2)?.toUpperCase() || "AG"}
                            </div>
                            <span>{agent.agent_name || "Agen Inland"}</span>
                          </div>
                        </td>
                        <td className="p-3 text-center font-semibold text-slate-700">{totalProp} Unit</td>
                        <td className="p-3 text-center font-extrabold text-emerald-600">{totalSold} Unit</td>
                        <td className="p-3 text-center">
                          <Badge variant="outline" className="text-[10px] font-bold bg-slate-50 text-slate-700 border-slate-200">
                            {closingRate}%
                          </Badge>
                        </td>
                        <td className="p-3 text-right font-extrabold text-slate-900">
                          {formatCurrency(agent.total_revenue)}
                        </td>
                        <td className="p-3 text-right font-bold text-emerald-600">
                          {formatCurrency(agent.commission || (agent.total_revenue || 0) * 0.025)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}