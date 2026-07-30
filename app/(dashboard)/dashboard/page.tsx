// app/(dashboard)/dashboard/page.tsx
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  TrendingUp,
  Building2,
  Users,
  Calendar,
  Plus,
  Sparkles,
  HardHat,
  RefreshCw,
  Activity,
  CalendarCheck,
  ShieldAlert,
  MessageSquare,
  DollarSign,
  UserCheck,
  ShieldCheck,
  Calculator,
  MapPin,
  HelpCircle,
  Clock,
  LogIn,
  UserPlus,
  ArrowRight,
  ChevronRight,
  Search,
  Filter,
  CheckCircle2,
  Layers,
  Power,
} from "lucide-react";

import { supabase } from "@/lib/supabase/client";
import { dashboardService, type DashboardStats } from "@/services/dashboard.service";
import { DashboardPropertySearch } from "@/components/dashboard/DashboardPropertySearch";
import { FeaturedProperties } from "@/components/dashboard/FeaturedProperties";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

type UserRole = "super_admin" | "superadmin" | "admin" | "agent" | "commissioner" | "viewer";

interface ActivityLogItem {
  id: string;
  description: string;
  user_name?: string;
  time: string;
}

interface LeadFollowUpItem {
  id: string;
  name: string;
  property: string;
  phone: string;
}

interface SurveyItem {
  id: string;
  propertyTitle: string;
  date: string;
  agentName: string;
  agentPhone: string;
  location: string;
  status: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  
  // Auth State
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [userRole, setUserRole] = useState<UserRole>("viewer");
  const [userName, setUserName] = useState<string>("Tamu");

  // State Data Real-Time
  const [activityLogs, setActivityLogs] = useState<ActivityLogItem[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const [agentFollowUpLeads, setAgentFollowUpLeads] = useState<LeadFollowUpItem[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);

  const [clientScheduledSurveys, setClientScheduledSurveys] = useState<SurveyItem[]>([]);
  const [loadingSurveys, setLoadingSurveys] = useState(false);

  // State AI Summary & Toggle (Default Sync dari DB)
  const [aiSummary, setAiSummary] = useState<string>("Memuat ringkasan eksekutif...");
  const [loadingAiSummary, setLoadingAiSummary] = useState<boolean>(false);
  const [aiEnabled, setAiEnabled] = useState<boolean>(true);
  const [togglingAi, setTogglingAi] = useState<boolean>(false);

  // 🧮 State Kalkulator KPR
  const [kprPrice, setKprPrice] = useState<number>(1200000000);
  const [kprDpPercent, setKprDpPercent] = useState<number>(20);
  const [kprTenor, setKprTenor] = useState<number>(15);
  const [kprInterestRate, setKprInterestRate] = useState<number>(6.5);

  // DEFINISI ROLE
  const isSuperAdmin = userRole === "super_admin" || userRole === "superadmin";
  const isAdmin = userRole === "admin" || isSuperAdmin;
  const isAgent = userRole === "agent";
  const isExecutive = userRole === "commissioner";
  const isViewer = userRole === "viewer" || !isLoggedIn;

  // Izinkan SuperAdmin, Admin, Agent, dan Executive memuat AI Summary
  const canSeeAiSummary = isSuperAdmin || isAdmin || isAgent || isExecutive;

  // 1. Fetch AI Summary (Dapat dimuat oleh semua role internal)
  const loadAiSummary = useCallback(async () => {
    setLoadingAiSummary(true);
    try {
      const res = await fetch("/api/dashboard/summary");
      if (res.ok) {
        const data = await res.json();
        if (data.disabled || data.enabled === false) {
          setAiEnabled(false);
          setAiSummary("Fitur AI Executive Summary sedang dinonaktifkan (OFF) oleh Super Admin.");
        } else if (data.summary) {
          setAiEnabled(true);
          setAiSummary(data.summary);
        }
      }
    } catch (err) {
      console.error("Gagal memuat AI summary:", err);
    } finally {
      setLoadingAiSummary(false);
    }
  }, []);

  // 2. Fetch Data Dashboard Real-Time dari Supabase
  const loadDashboardData = useCallback(async () => {
    setLoadingLogs(true);
    setLoadingLeads(true);
    setLoadingSurveys(true);

    try {
      // Ambil Statistik Utama
      const data = await dashboardService.getStats();
      setStats(data);

      // A. Ambil Activity Logs dari crm_activities (Fallback ke activity_logs jika crm_activities kosong)
      let logsList: any[] = [];
      const { data: actLogs, error: actErr } = await supabase
        .from("crm_activities")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(6);

      if (!actErr && actLogs && actLogs.length > 0) {
        logsList = actLogs.map((log: any) => ({
          id: log.id,
          description: log.description || log.action || log.activity_type || "Aktivitas CRM",
          user_name: log.user_name || log.agent_name || "Administrator",
          time: log.created_at || new Date().toISOString(),
        }));
      } else {
        // Fallback ke tabel activity_logs jika crm_activities belum berisi data
        const { data: sysLogs } = await supabase
          .from("activity_logs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(6);

        if (sysLogs && sysLogs.length > 0) {
          logsList = sysLogs.map((log: any) => ({
            id: log.id,
            description: log.description || log.action || "Aktivitas Sistem",
            user_name: log.user_name || log.email || "Administrator",
            time: log.created_at || new Date().toISOString(),
          }));
        }
      }
      setActivityLogs(logsList);

      // B. Ambil Leads Real-Time dengan Join ke crm_contacts (Menggunakan `full_name`)
      const { data: leadsData, error: leadsErr } = await supabase
        .from("crm_leads")
        .select(`
          id,
          status,
          interest_type,
          budget,
          created_at,
          crm_contacts (
            full_name,
            phone,
            email
          )
        `)
        .order("created_at", { ascending: false })
        .limit(5);

      if (leadsErr) {
        console.error("Supabase CRM Leads Error:", leadsErr);
      }

      if (!leadsErr && leadsData && leadsData.length > 0) {
        setAgentFollowUpLeads(
          leadsData.map((lead: any) => {
            const contact = Array.isArray(lead.crm_contacts)
              ? lead.crm_contacts[0] || {}
              : (lead.crm_contacts || {});

            return {
              id: lead.id,
              // Mendukung full_name maupun fallback name
              name: contact.full_name || contact.name || "Klien Prospek",
              property: lead.interest_type || "Properti Pilihan",
              phone: contact.phone || "#",
            };
          })
        );
      } else {
        setAgentFollowUpLeads([]);
      }

      // C. Ambil Jadwal Survei / Aktivitas
      const { data: surveysData, error: surveysErr } = await supabase
        .from("crm_activities")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(3);

      if (!surveysErr && surveysData && surveysData.length > 0) {
        setClientScheduledSurveys(
          surveysData.map((surv: any) => ({
            id: surv.id,
            propertyTitle: surv.title || surv.description || surv.activity_type || "Aktivitas CRM",
            date: surv.scheduled_at || surv.created_at || "Jadwal belum ditentukan",
            agentName: surv.agent_name || "Tim Agen Inland",
            agentPhone: surv.phone || "#",
            location: surv.location || "Lokasi Properti",
            status: surv.status || "Terkonfirmasi",
          }))
        );
      } else {
        setClientScheduledSurveys([]);
      }

    } catch (error) {
      console.error("Gagal memuat data dashboard CRM:", error);
    } finally {
      setLoadingLogs(false);
      setLoadingLeads(false);
      setLoadingSurveys(false);
    }
  }, []);

  // 3. Inisialisasi
  useEffect(() => {
    async function initDashboard() {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        let activeRole: UserRole = "viewer";

        if (user) {
          setIsLoggedIn(true);
          const { data: profile } = await supabase
            .from("users")
            .select("role, full_name")
            .eq("id", user.id)
            .maybeSingle();

          if (profile) {
            activeRole = (profile.role || "viewer").toLowerCase() as UserRole;
            setUserRole(activeRole);
            setUserName(profile.full_name || user.email?.split("@")[0] || "Pengguna");
          } else {
            activeRole = (user.user_metadata?.role || "viewer").toLowerCase() as UserRole;
            setUserRole(activeRole);
            setUserName(user.user_metadata?.full_name || user.email?.split("@")[0] || "Pengguna");
          }
        } else {
          setIsLoggedIn(false);
          setUserRole("viewer");
          setUserName("Tamu");
        }

        await loadDashboardData();
        setLoading(false);

        // Muat status & isi AI Summary untuk akun terautentikasi
        if (activeRole !== "viewer") {
          loadAiSummary();
        }

      } catch (err) {
        console.error("Gagal inisialisasi profil:", err);
        setIsLoggedIn(false);
        setLoading(false);
      }
    }

    initDashboard();
  }, [loadDashboardData, loadAiSummary]);

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const kprCalculation = useMemo(() => {
    const dpAmount = (kprPrice * kprDpPercent) / 100;
    const loanAmount = kprPrice - dpAmount;
    const monthlyInterestRate = kprInterestRate / 100 / 12;
    const totalMonths = kprTenor * 12;

    if (loanAmount <= 0 || monthlyInterestRate <= 0) {
      return { dpAmount: 0, loanAmount: 0, monthlyInstallment: 0 };
    }

    const monthlyInstallment =
      (loanAmount *
        (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, totalMonths))) /
      (Math.pow(1 + monthlyInterestRate, totalMonths) - 1);

    return {
      dpAmount,
      loanAmount,
      monthlyInstallment: Math.round(monthlyInstallment),
    };
  }, [kprPrice, kprDpPercent, kprTenor, kprInterestRate]);

  if (loading) {
    return <DashboardLoadingSkeleton />;
  }

  const criticalProjects: any[] = [];

  return (
    <div className="space-y-6 pb-16 max-w-7xl mx-auto px-4 sm:px-6">
      
      {/* 🔴 1. HEADER HERO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card/85 backdrop-blur-md border border-border/70 p-5 rounded-3xl shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
              Selamat Datang, {userName} 👋
            </h1>
            <Badge
              variant="outline"
              className={cn(
                "capitalize text-[10px] font-bold px-2.5 py-0.5 rounded-full border shadow-2xs",
                isSuperAdmin && "bg-rose-500/10 text-rose-600 border-rose-500/30",
                isAdmin && !isSuperAdmin && "bg-purple-500/10 text-purple-600 border-purple-500/30",
                isAgent && "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
                isExecutive && "bg-blue-500/10 text-blue-600 border-blue-500/30",
                isViewer && "bg-amber-500/10 text-amber-600 border-amber-500/30"
              )}
            >
              {isViewer ? (isLoggedIn ? "Client Portal" : "Pengunjung") : userRole.replace("_", " ")}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {isSuperAdmin && "Pusat kendali audit log sistem database, finansial, dan pengawasan operasional."}
            {isAgent && "Kelola janji survei lokasi dan tindak lanjuti calon pembeli hari ini."}
            {isAdmin && !isSuperAdmin && "Manajemen portofolio properti, tim agen, dan pemasaran Inland Property."}
            {isExecutive && "Ringkasan performa bisnis dan perkembangan proyek konstruksi makro."}
            {isViewer && "Temukan properti impian, simulasi KPR, dan atur konsultasi dengan agen resmi."}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto w-full md:w-auto justify-end">
          {!isLoggedIn ? (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/login")}
                className="h-9 text-xs font-semibold rounded-xl gap-1.5 flex-1 sm:flex-initial cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5 text-emerald-600" />
                <span>Masuk</span>
              </Button>
              <Button
                size="sm"
                onClick={() => router.push("/register")}
                className="h-9 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 flex-1 sm:flex-initial shadow-xs cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Daftar Akun</span>
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  loadDashboardData();
                  loadAiSummary();
                }}
                className="h-9 text-xs rounded-xl gap-1.5 border-border/80 cursor-pointer"
              >
                <RefreshCw className={cn("w-3.5 h-3.5 text-muted-foreground", (loadingLogs || loadingAiSummary || loadingLeads) && "animate-spin")} />
                <span className="hidden sm:inline">Refresh Data</span>
              </Button>

              {isAdmin && (
                <Button
                  size="sm"
                  onClick={() => router.push("/properties/new")}
                  className="h-9 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Tambah Properti</span>
                </Button>
              )}

              {isAgent && (
                <Button
                  size="sm"
                  onClick={() => router.push("/surveys")}
                  className="h-9 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Jadwal Survei</span>
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 🟢 2. KPI METRICS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {isAgent && (
          <>
            <Card className="border shadow-2xs rounded-2xl bg-card hover:border-emerald-500/40 transition">
              <CardContent className="p-4 space-y-1">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-xs font-semibold">Leads Hari Ini</span>
                  <Users className="w-4 h-4 text-purple-600" />
                </div>
                <h3 className="text-xl font-bold text-foreground">{stats?.todayLeads || 0} Prospek</h3>
                <p className="text-[10px] text-emerald-600 font-semibold">Membutuhkan respon cepat</p>
              </CardContent>
            </Card>

            <Card className="border shadow-2xs rounded-2xl bg-card hover:border-emerald-500/40 transition">
              <CardContent className="p-4 space-y-1">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-xs font-semibold">Agenda Survei</span>
                  <Calendar className="w-4 h-4 text-amber-600" />
                </div>
                <h3 className="text-xl font-bold text-foreground">{clientScheduledSurveys.length} Lokasi</h3>
                <p className="text-[10px] text-muted-foreground">Terjadwal hari ini</p>
              </CardContent>
            </Card>

            <Card className="border shadow-2xs rounded-2xl bg-card hover:border-emerald-500/40 transition">
              <CardContent className="p-4 space-y-1">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-xs font-semibold">Listing Aktif Saya</span>
                  <Building2 className="w-4 h-4 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-foreground">{stats?.activeListings || 0} Unit</h3>
                <p className="text-[10px] text-muted-foreground">Siap dipasarkan</p>
              </CardContent>
            </Card>

            <Card className="border shadow-2xs rounded-2xl bg-card hover:border-emerald-500/40 transition">
              <CardContent className="p-4 space-y-1">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-xs font-semibold">Est. Komisi Bln Ini</span>
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                </div>
                <h3 className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  {formatIDR(0)}
                </h3>
                <p className="text-[10px] text-muted-foreground">Dari kesepakatan</p>
              </CardContent>
            </Card>
          </>
        )}

        {isAdmin && (
          <>
            <Card className="border shadow-2xs rounded-2xl bg-card hover:border-emerald-500/40 transition">
              <CardContent className="p-4 space-y-1">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-xs font-semibold">Total Revenue</span>
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                </div>
                <h3 className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  {formatIDR(0)}
                </h3>
                <p className="text-[10px] text-emerald-600 font-semibold">Performa finansial</p>
              </CardContent>
            </Card>

            <Card className="border shadow-2xs rounded-2xl bg-card hover:border-emerald-500/40 transition">
              <CardContent className="p-4 space-y-1">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-xs font-semibold">Listing Properti</span>
                  <Building2 className="w-4 h-4 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-foreground">{stats?.activeListings || 0} Unit</h3>
                <p className="text-[10px] text-muted-foreground">Dari {stats?.totalProperties || 0} total</p>
              </CardContent>
            </Card>

            <Card className="border shadow-2xs rounded-2xl bg-card hover:border-emerald-500/40 transition">
              <CardContent className="p-4 space-y-1">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-xs font-semibold">Total Leads CRM</span>
                  <Users className="w-4 h-4 text-purple-600" />
                </div>
                <h3 className="text-xl font-bold text-foreground">{stats?.todayLeads || 0} Prospek</h3>
                <p className="text-[10px] text-muted-foreground">Terdistribusi ke agen</p>
              </CardContent>
            </Card>

            <Card className="border shadow-2xs rounded-2xl bg-card hover:border-emerald-500/40 transition">
              <CardContent className="p-4 space-y-1">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-xs font-semibold">Material Kritis</span>
                  <HardHat className="w-4 h-4 text-amber-600" />
                </div>
                <h3 className="text-xl font-bold text-amber-600">{criticalProjects.length} Proyek</h3>
                <p className="text-[10px] text-rose-600 font-medium">Stok butuh pengadaan</p>
              </CardContent>
            </Card>
          </>
        )}

        {isExecutive && (
          <>
            <Card className="border shadow-2xs rounded-2xl bg-card">
              <CardContent className="p-4 space-y-1">
                <span className="text-xs font-semibold text-muted-foreground">Pendapatan YTD</span>
                <h3 className="text-base font-bold font-mono text-emerald-600">{formatIDR(0)}</h3>
                <p className="text-[10px] text-emerald-600 font-semibold">On-target</p>
              </CardContent>
            </Card>
            <Card className="border shadow-2xs rounded-2xl bg-card">
              <CardContent className="p-4 space-y-1">
                <span className="text-xs font-semibold text-muted-foreground">Portofolio Aset</span>
                <h3 className="text-xl font-bold text-foreground">{stats?.totalProperties || 0} Unit</h3>
                <p className="text-[10px] text-muted-foreground">Aset terdaftar</p>
              </CardContent>
            </Card>
            <Card className="border shadow-2xs rounded-2xl bg-card">
              <CardContent className="p-4 space-y-1">
                <span className="text-xs font-semibold text-muted-foreground">Tingkat Penjualan</span>
                <h3 className="text-xl font-bold text-foreground">0% Occupancy</h3>
                <p className="text-[10px] text-emerald-600 font-medium">Database live</p>
              </CardContent>
            </Card>
            <Card className="border shadow-2xs rounded-2xl bg-card">
              <CardContent className="p-4 space-y-1">
                <span className="text-xs font-semibold text-muted-foreground">Konstruksi Makro</span>
                <h3 className="text-xl font-bold text-foreground">0% Rata-rata</h3>
                <p className="text-[10px] text-muted-foreground">Proyek berjalan</p>
              </CardContent>
            </Card>
          </>
        )}

        {isViewer && (
          <>
            <Card className="border shadow-2xs rounded-2xl bg-card hover:border-emerald-500/40 transition">
              <CardContent className="p-4 space-y-1">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-xs font-semibold">Katalog Properti</span>
                  <Building2 className="w-4 h-4 text-emerald-600" />
                </div>
                <h3 className="text-xl font-bold text-foreground">{stats?.activeListings || 0} Unit</h3>
                <p className="text-[10px] text-emerald-600 font-semibold">Siap huni & investasi</p>
              </CardContent>
            </Card>

            <Card className="border shadow-2xs rounded-2xl bg-card hover:border-emerald-500/40 transition">
              <CardContent className="p-4 space-y-1">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-xs font-semibold">Estimasi Angsuran</span>
                  <Calculator className="w-4 h-4 text-blue-600" />
                </div>
                <h3 className="text-base font-bold font-mono text-blue-600 dark:text-blue-400">
                  {formatIDR(kprCalculation.monthlyInstallment)}
                </h3>
                <p className="text-[10px] text-muted-foreground">Per bulan (Tenor {kprTenor} Thn)</p>
              </CardContent>
            </Card>

            <Card className="border shadow-2xs rounded-2xl bg-card hover:border-emerald-500/40 transition">
              <CardContent className="p-4 space-y-1">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-xs font-semibold">Jadwal Survei</span>
                  <CalendarCheck className="w-4 h-4 text-amber-600" />
                </div>
                <h3 className="text-xl font-bold text-foreground">{clientScheduledSurveys.length} Lokasi</h3>
                <p className="text-[10px] text-amber-600 font-semibold">Terjadwal pekan ini</p>
              </CardContent>
            </Card>

            <Card className="border shadow-2xs rounded-2xl bg-card hover:border-emerald-500/40 transition">
              <CardContent className="p-4 space-y-1">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-xs font-semibold">Konsultasi Agen</span>
                  <MessageSquare className="w-4 h-4 text-purple-600" />
                </div>
                <h3 className="text-xl font-bold text-foreground">Resmi</h3>
                <p className="text-[10px] text-emerald-600 font-semibold">Bantuan KPR & Survei</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* 🟢 3. COMPACT SEARCH BAR */}
      <DashboardPropertySearch />

      {/* 🟢 4. MAIN BENTO GRID (8 : 4) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* KOLOM KIRI (8 KOLOM) */}
        <div className="lg:col-span-8 space-y-6">
          <FeaturedProperties />

          {/* 🌟 WIDGET RINGKASAN SISTEM */}
          <Card className="border shadow-2xs rounded-2xl bg-card">
            <CardHeader className="p-4 border-b bg-muted/10 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-600" /> Ringkasan Sistem & Performa Properti
                </CardTitle>
                <CardDescription className="text-xs">
                  Statistik ketersediaan unit dan status pemasaran terkini.
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono text-emerald-600 border-emerald-500/30">
                Inland PLMS v2.4
              </Badge>
            </CardHeader>
            <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-3 bg-muted/20 rounded-xl border border-border/50 space-y-1">
                <span className="text-muted-foreground">Total Unit Terdaftar</span>
                <p className="text-lg font-bold text-foreground">{stats?.totalProperties || 0} Unit</p>
                <div className="text-[10px] text-emerald-600 font-medium">100% Terindeks di Database</div>
              </div>
              <div className="p-3 bg-muted/20 rounded-xl border border-border/50 space-y-1">
                <span className="text-muted-foreground">Status Pemasaran</span>
                <p className="text-lg font-bold text-emerald-600">Aktif & Ready</p>
                <div className="text-[10px] text-muted-foreground">Verifikasi dokumen tuntas</div>
              </div>
              <div className="p-3 bg-muted/20 rounded-xl border border-border/50 space-y-1">
                <span className="text-muted-foreground">Keamanan Sistem</span>
                <p className="text-lg font-bold text-blue-600">Secure (RLS)</p>
                <div className="text-[10px] text-blue-600 font-medium">Supabase Auth Aktif</div>
              </div>
            </CardContent>
          </Card>

          {/* AUDIT LOG KHUSUS SUPER ADMIN */}
          {isSuperAdmin && (
            <Card className="border shadow-2xs border-emerald-500/30 rounded-2xl overflow-hidden bg-card">
              <CardHeader className="p-4 border-b bg-emerald-50/40 dark:bg-emerald-950/20 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" /> Audit Log System & Aktivitas Tim
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Histori aktivitas real-time langsung dari tabel database <code className="text-emerald-500">crm_activities</code>.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-[10px] bg-emerald-100 text-emerald-800 border-emerald-300">
                  Super Admin Live
                </Badge>
              </CardHeader>
              <CardContent className="p-4 space-y-3 text-xs">
                {loadingLogs ? (
                  <div className="text-center py-6 text-muted-foreground space-y-2">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto text-emerald-600" />
                    <p className="text-xs">Memuat log aktivitas dari database...</p>
                  </div>
                ) : activityLogs.length > 0 ? (
                  <div className="space-y-2">
                    {activityLogs.map((act) => (
                      <div
                        key={act.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-card border border-border/60 hover:border-emerald-500/30 transition shadow-2xs"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-600 shrink-0" />
                          <div>
                            <p className="font-semibold text-foreground">{act.description}</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              Oleh: <span className="font-medium text-foreground">{act.user_name}</span>
                            </p>
                          </div>
                        </div>
                        <span className="text-[11px] font-mono text-muted-foreground shrink-0">
                          {new Date(act.time).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground space-y-1">
                    <Activity className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-xs">Belum ada data aktivitas tercatat.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* AI EXECUTIVE SUMMARY (DAPAT DILIHAT OLEH SUPER ADMIN, ADMIN, AGENT, EXECUTIVE JIKA TOGGLE SAKLAR "ON") */}
          {canSeeAiSummary && (
            <Card className="border shadow-2xs bg-gradient-to-r from-emerald-500/10 via-card to-card rounded-2xl">
              <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-2xs">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold text-foreground">
                      AI Executive Summary
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Ringkasan Operasional & Analisis AI
                    </CardDescription>
                  </div>
                </div>

                {/* SAKLAR TOGGLE KONTROL HANYA MUNCUL UNTUK SUPER ADMIN */}
                {isSuperAdmin && (
                  <div className="flex items-center gap-2.5">
                    <div className="flex items-center gap-1.5 bg-muted/55 px-2.5 py-1 rounded-xl border border-border/70 shadow-2xs">
                      <Power className={cn("w-3 h-3", aiEnabled ? "text-emerald-600" : "text-muted-foreground")} />
                      <span className="text-[10px] font-semibold text-muted-foreground">AI Power:</span>
                      <button
                        type="button"
                        disabled={togglingAi}
                        onClick={async () => {
                          const nextState = !aiEnabled;
                          setTogglingAi(true);
                          
                          setAiEnabled(nextState);
                          if (!nextState) {
                            setAiSummary("Fitur AI Executive Summary sedang dinonaktifkan (OFF) oleh Super Admin.");
                          }

                          try {
                            const res = await fetch("/api/dashboard/summary/toggle", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ enabled: nextState })
                            });
                            
                            const data = await res.json();
                            if (res.ok) {
                              if (nextState) {
                                toast.success("Fitur AI diaktifkan untuk seluruh tim!");
                                loadAiSummary();
                              } else {
                                toast.info("Fitur AI dimatikan.");
                              }
                            } else {
                              setAiEnabled(!nextState);
                              toast.error(data.error || "Gagal mengubah status AI.");
                            }
                          } catch (e) {
                            setAiEnabled(!nextState);
                            toast.error("Terjadi kesalahan koneksi.");
                          } finally {
                            setTogglingAi(false);
                          }
                        }}
                        className={cn(
                          "text-[10px] font-bold px-2.5 py-0.5 rounded-lg transition cursor-pointer shadow-2xs",
                          aiEnabled ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-slate-300 hover:bg-slate-400 text-slate-800 dark:bg-slate-800 dark:text-slate-200"
                        )}
                      >
                        {togglingAi ? "..." : (aiEnabled ? "ON" : "OFF")}
                      </button>
                    </div>
                  </div>
                )}
              </CardHeader>
              <CardContent className="p-4 pt-2 text-xs text-foreground/90 leading-relaxed">
                {loadingAiSummary ? (
                  <div className="flex items-center gap-2 text-muted-foreground animate-pulse py-1">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                    <span>Agnes sedang merangkum laporan analitik bisnis...</span>
                  </div>
                ) : (
                  aiSummary
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* KOLOM KANAN (4 KOLOM) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* WIDGET KALKULATOR KPR (KHUSUS VIEWER) */}
          {isViewer && (
            <Card className="border shadow-2xs rounded-2xl bg-card">
              <CardHeader className="p-4 border-b bg-muted/20">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-blue-600" /> Simulasi Kalkulator KPR
                </CardTitle>
                <CardDescription className="text-xs">Hitung estimasi cicilan rumah Anda</CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-3 text-xs">
                <div>
                  <Label className="text-[11px] font-medium text-muted-foreground">Harga Properti (Rp)</Label>
                  <Input
                    type="number"
                    value={kprPrice}
                    onChange={(e) => setKprPrice(Number(e.target.value) || 0)}
                    className="h-9 text-xs font-mono font-bold mt-1 rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[11px] font-medium text-muted-foreground">DP (%)</Label>
                    <Select value={kprDpPercent.toString()} onValueChange={(v) => setKprDpPercent(Number(v))}>
                      <SelectTrigger className="h-9 text-xs rounded-xl mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="10">10%</SelectItem>
                        <SelectItem value="20">20%</SelectItem>
                        <SelectItem value="30">30%</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[11px] font-medium text-muted-foreground">Tenor</Label>
                    <Select value={kprTenor.toString()} onValueChange={(v) => setKprTenor(Number(v))}>
                      <SelectTrigger className="h-9 text-xs rounded-xl mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="10">10 Thn</SelectItem>
                        <SelectItem value="15">15 Thn</SelectItem>
                        <SelectItem value="20">20 Thn</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl space-y-1">
                  <span className="text-[10px] text-muted-foreground font-medium">Estimasi Cicilan Per Bulan:</span>
                  <p className="text-base font-bold font-mono text-blue-600 dark:text-blue-400">
                    {formatIDR(kprCalculation.monthlyInstallment)}
                  </p>
                </div>

                <Button
                  onClick={() => router.push("/kpr-calculator")}
                  variant="outline"
                  className="w-full text-xs h-8 rounded-xl border-blue-500/30 text-blue-600 hover:bg-blue-500/10 cursor-pointer"
                >
                  Buka Kalkulator KPR Lengkap
                </Button>
              </CardContent>
            </Card>
          )}

          {/* WIDGET LEADS FOLLOW UP (KHUSUS AGEN) */}
          {isAgent && (
            <Card className="border shadow-2xs rounded-2xl bg-card">
              <CardHeader className="p-4 border-b">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-600" /> Leads Perlu Follow-Up
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 space-y-2 text-xs">
                {loadingLeads ? (
                  <p className="text-center py-4 text-muted-foreground">Memuat prospek...</p>
                ) : agentFollowUpLeads.length > 0 ? (
                  agentFollowUpLeads.map((lead) => (
                    <div key={lead.id} className="p-3 border rounded-xl space-y-2 bg-muted/20">
                      <div>
                        <p className="font-bold text-xs text-foreground">{lead.name}</p>
                        <p className="text-[11px] text-muted-foreground">{lead.property}</p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => window.open(`https://wa.me/${lead.phone}`, "_blank")}
                        className="w-full h-7 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg gap-1 cursor-pointer"
                      >
                        <MessageSquare className="w-3 h-3" /> Hubungi WhatsApp
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-muted-foreground space-y-1">
                    <p className="text-xs font-medium">Tidak ada data leads.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* WIDGET AGENDA SURVEI (KHUSUS VIEWER) */}
          {isViewer && (
            <Card className="border shadow-2xs rounded-2xl bg-card">
              <CardHeader className="p-4 border-b">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <CalendarCheck className="w-4 h-4 text-emerald-600" /> Agenda Survei Anda
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3 text-xs">
                {loadingSurveys ? (
                  <p className="text-center py-4 text-muted-foreground">Memuat jadwal...</p>
                ) : clientScheduledSurveys.length > 0 ? (
                  clientScheduledSurveys.map((survey) => (
                    <div key={survey.id} className="p-3 bg-muted/30 border rounded-xl space-y-2">
                      <Badge className="bg-emerald-600 text-[9px] px-2 py-0.5">{survey.status}</Badge>
                      <div>
                        <h4 className="font-bold text-xs text-foreground">{survey.propertyTitle}</h4>
                        <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-600" /> {survey.date}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => window.open(`https://wa.me/${survey.agentPhone}`, "_blank")}
                        className="w-full h-7 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg gap-1 cursor-pointer"
                      >
                        <MessageSquare className="w-3 h-3" /> Chat Agen Resmi
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-muted-foreground space-y-1">
                    <p className="text-xs font-medium">Tidak ada jadwal survei.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* WIDGET STATUS PROYEK KONSTRUKSI (KHUSUS EXECUTIVE) */}
          {isExecutive && (
            <Card className="border shadow-2xs rounded-2xl bg-card">
              <CardHeader className="p-4 border-b">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <HardHat className="w-4 h-4 text-amber-600" /> Progres Proyek Konstruksi
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="text-center py-6 text-muted-foreground text-xs">
                  Tidak ada data proyek konstruksi.
                </div>
              </CardContent>
            </Card>
          )}

          {/* 🌟 PINTASAN BANTUAN */}
          <Card className="border shadow-2xs rounded-2xl bg-card">
            <CardHeader className="p-4 border-b bg-muted/10">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-emerald-600" /> Butuh Bantuan Cepat?
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2 text-xs">
              <p className="text-muted-foreground leading-relaxed">
                Gunakan asisten AI <strong>Agnes</strong> di pojok kanan bawah atau hubungi Admin melalui tombol WhatsApp untuk konsultasi langsung.
              </p>
              <Button
                variant="outline"
                onClick={() => window.open("https://wa.me/6281234567890", "_blank")}
                className="w-full h-9 rounded-xl border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10 cursor-pointer font-semibold gap-1.5"
              >
                <MessageSquare className="w-3.5 h-3.5" /> Chat Admin WhatsApp
              </Button>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}

function DashboardLoadingSkeleton() {
  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto px-4 sm:px-6">
      <Skeleton className="h-20 w-full rounded-3xl" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-14 w-full rounded-2xl" />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Skeleton className="lg:col-span-8 h-96 rounded-2xl" />
        <Skeleton className="lg:col-span-4 h-96 rounded-2xl" />
      </div>
    </div>
  );
}