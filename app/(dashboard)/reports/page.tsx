// app/(dashboard)/reports/page.tsx

"use client";

import { useState, useEffect } from "react";
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

// Chart components
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
  LineChart,
  Line,
} from "recharts";

const COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#ec4899"];

export default function ReportsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [statusData, setStatusData] = useState<any[]>([]);
  const [typeData, setTypeData] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [agentData, setAgentData] = useState<any[]>([]);
  const [locationData, setLocationData] = useState<any[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // ===== FETCH ALL DATA =====
  useEffect(() => {
    fetchAllData();
  }, [selectedYear]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [
        mainStats,
        statusDist,
        typeDist,
        monthly,
        agents,
        locations,
      ] = await Promise.all([
        reportService.getMainStats(),
        reportService.getStatusDistribution(),
        reportService.getTypeDistribution(),
        reportService.getMonthlyStats(selectedYear),
        reportService.getAgentPerformance(),
        reportService.getTopLocations(6),
      ]);

      setStats(mainStats);
      setStatusData(statusDist);
      setTypeData(typeDist);
      setMonthlyData(monthly);
      setAgentData(agents);
      setLocationData(locations);
    } catch (error: any) {
      console.error("Error fetching reports:", error);
      toast.error("Gagal memuat laporan: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // ===== FORMAT CURRENCY =====
  const formatCurrency = (value: number) => {
    if (value === 0) return "Rp 0";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // ===== FORMAT NUMBER =====
  const formatNumber = (value: number) => {
    return new Intl.NumberFormat("id-ID").format(value);
  };

  // ===== EXPORT REPORT =====
  const handleExport = () => {
    const csvData = [
      ["Metric", "Value"],
      ["Total Properties", stats?.totalProperties || 0],
      ["Active Listings", stats?.totalActive || 0],
      ["Sold Properties", stats?.totalSold || 0],
      ["Rented Properties", stats?.totalRented || 0],
      ["Draft Properties", stats?.totalDraft || 0],
      ["Archived Properties", stats?.totalArchived || 0],
      ["Average Price", stats?.averagePrice || 0],
      ["Total Revenue", stats?.totalRevenue || 0],
    ];

    const csvContent = csvData.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success("Laporan berhasil diekspor!");
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-48" />
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
    <div className="space-y-6">
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
              <p className="text-sm text-white/80">Analisis data property secara lengkap</p>
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
                <SelectItem value="2025">2025</SelectItem>
                <SelectItem value="2026">2026</SelectItem>
                <SelectItem value="2027">2027</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExport}
              className="bg-white/20 text-white hover:bg-white/30"
            >
              <Download size={16} className="mr-2" />
              Export CSV
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={fetchAllData}
              className="bg-white/20 text-white hover:bg-white/30"
            >
              <RefreshCw size={16} className="mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-blue-500 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-slate-500">Total Property</p>
            <p className="text-2xl font-bold text-slate-800">{formatNumber(stats?.totalProperties || 0)}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-emerald-500 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-slate-500">Active Listing</p>
            <p className="text-2xl font-bold text-emerald-600">{formatNumber(stats?.totalActive || 0)}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-amber-500 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-slate-500">Sold / Rented</p>
            <p className="text-2xl font-bold text-amber-600">{formatNumber((stats?.totalSold || 0) + (stats?.totalRented || 0))}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-purple-500 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-slate-500">Total Revenue</p>
            <p className="text-2xl font-bold text-purple-600">{formatCurrency(stats?.totalRevenue || 0)}</p>
          </CardContent>
        </Card>
      </div>

      {/* SECOND ROW STATS */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-slate-500">Average Price</p>
            <p className="text-lg font-bold text-slate-800">{formatCurrency(stats?.averagePrice || 0)}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-slate-500">Draft</p>
            <p className="text-lg font-bold text-slate-800">{formatNumber(stats?.totalDraft || 0)}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-slate-500">Archived</p>
            <p className="text-lg font-bold text-slate-800">{formatNumber(stats?.totalArchived || 0)}</p>
          </CardContent>
        </Card>
      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution - Pie Chart */}
        <Card className="border-0 shadow-md">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-t-xl">
            <CardTitle className="text-base flex items-center gap-2 text-slate-700">
              <FileBarChart size={18} className="text-blue-500" />
              Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
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
                  <Tooltip formatter={(value) => `${value} property`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Type Distribution - Pie Chart */}
        <Card className="border-0 shadow-md">
          <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-t-xl">
            <CardTitle className="text-base flex items-center gap-2 text-slate-700">
              <Building2 size={18} className="text-emerald-500" />
              Property Type
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
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
                  <Tooltip formatter={(value) => `${value} property`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trends */}
      <Card className="border-0 shadow-md">
        <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-t-xl">
          <CardTitle className="text-base flex items-center gap-2 text-slate-700">
            <TrendingUp size={18} className="text-amber-500" />
            Monthly Trends ({selectedYear})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                <YAxis yAxisId="left" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                  }}
                />
                <Bar dataKey="created" fill="#3b82f6" yAxisId="left" radius={[4, 4, 0, 0]} />
                <Bar dataKey="sold" fill="#10b981" yAxisId="left" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="text-center text-xs text-slate-400 mt-2">
            📊 Blue: Created | Green: Sold
          </div>
        </CardContent>
      </Card>

      {/* Agent Performance */}
      <Card className="border-0 shadow-md">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-t-xl">
          <CardTitle className="text-base flex items-center gap-2 text-slate-700">
            <Users size={18} className="text-purple-500" />
            Agent Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {agentData.length === 0 ? (
            <p className="text-center text-slate-400 py-8">Belum ada data agent</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left p-2 font-semibold text-slate-600">Agent</th>
                    <th className="text-center p-2 font-semibold text-slate-600">Total Property</th>
                    <th className="text-center p-2 font-semibold text-slate-600">Sold</th>
                    <th className="text-right p-2 font-semibold text-slate-600">Revenue</th>
                    <th className="text-right p-2 font-semibold text-slate-600">Commission (2.5%)</th>
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

      {/* Top Locations */}
      <Card className="border-0 shadow-md">
        <CardHeader className="bg-gradient-to-r from-cyan-50 to-sky-50 rounded-t-xl">
          <CardTitle className="text-base flex items-center gap-2 text-slate-700">
            <Home size={18} className="text-cyan-500" />
            Top Locations
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
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                >
                  <span className="font-medium text-slate-700">{loc.name}</span>
                  <Badge variant="secondary">{loc.count} property</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}