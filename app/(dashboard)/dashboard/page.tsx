// app/(dashboard)/dashboard/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Building2,
  Users,
  Calendar,
  Sparkles,
  RefreshCw,
  Activity,
  DollarSign,
  ShieldCheck,
  Calculator,
  Handshake,
  FileText,
  CalendarCheck,
  Star,
  MapPin,
  Bed,
  Bath,
  Maximize2,
  ChevronRight,
  ArrowUpRight,
  UserCheck,
  MessageSquare,
  Power,
  LogIn,
  UserPlus,
} from "lucide-react";

import { supabase } from "@/lib/supabase/client";
import { dashboardService, type DashboardStats } from "@/services/dashboard.service";
import { DashboardPropertySearch } from "@/components/dashboard/DashboardPropertySearch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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

interface FeaturedProperty {
  id: string;
  title: string;
  listing_code: string;
  listing_type: string;
  price: number | null;
  location: string;
  bedrooms: number | null;
  bathrooms: number | null;
  building_area: number | null;
  thumbnail: string;
}

const DEFAULT_FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80";

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  // Auth State
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [userRole, setUserRole] = useState<UserRole>("viewer");

  // State Properti Unggulan Real-Time
  const [featuredProperties, setFeaturedProperties] = useState<FeaturedProperty[]>([]);
  const [loadingFeatured, setLoadingFeatured] = useState<boolean>(true);

  // Real-Time Data States
  const [activityLogs, setActivityLogs] = useState<ActivityLogItem[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const [agentFollowUpLeads, setAgentFollowUpLeads] = useState<LeadFollowUpItem[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);

  // AI Summary States
  const [aiSummary, setAiSummary] = useState<string>("Memuat ringkasan eksekutif...");
  const [loadingAiSummary, setLoadingAiSummary] = useState<boolean>(false);
  const [aiEnabled, setAiEnabled] = useState<boolean>(true);
  const [togglingAi, setTogglingAi] = useState<boolean>(false);

  // Definisi Role
  const isSuperAdmin = userRole === "super_admin" || userRole === "superadmin";
  const isAdmin = userRole === "admin" || isSuperAdmin;
  const isAgent = userRole === "agent";
  const isExecutive = userRole === "commissioner";
  const isViewer = userRole === "viewer" || !isLoggedIn;

  const canSeeAiSummary = isSuperAdmin || isAdmin || isAgent || isExecutive;

  // 1. Fetch AI Summary
  const loadAiSummary = useCallback(async () => {
    setLoadingAiSummary(true);
    try {
      const res = await fetch("/api/dashboard/summary");
      if (res.ok) {
        const data = await res.json();
        if (data.disabled || data.enabled === false) {
          setAiEnabled(false);
          setAiSummary("Fitur AI Executive Summary sedang dinonaktifkan oleh Super Admin.");
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

  // 2. Fetch Data Dashboard & Relasi Properti Nyata
  const loadDashboardData = useCallback(async () => {
    setLoadingLogs(true);
    setLoadingLeads(true);
    setLoadingFeatured(true);

    try {
      const dataStats = await dashboardService.getStats();
      setStats(dataStats);

      // 🔍 Query dengan Relasi Tabel Resmi Supabase Anda
      let { data, error } = await supabase
        .from("properties")
        .select(`
          *,
          address:property_address(*),
          price:property_price(*),
          specifications:property_specifications(*),
          building:property_building(*),
          land:property_land(*),
          media:property_media(*)
        `)
        .eq("status", "published")
        .eq("is_featured", true)
        .order("created_at", { ascending: false })
        .limit(3);

      // 🔄 SMART FALLBACK: Jika properti featured kurang dari 3, ambil properti published terbaru
      if (!error && (!data || data.length < 3)) {
        const needed = 3 - (data?.length || 0);
        const existingIds = data?.map((d) => d.id) || [];

        let fallbackQuery = supabase
          .from("properties")
          .select(`
            *,
            address:property_address(*),
            price:property_price(*),
            specifications:property_specifications(*),
            building:property_building(*),
            land:property_land(*),
            media:property_media(*)
          `)
          .eq("status", "published")
          .order("created_at", { ascending: false })
          .limit(needed);

        if (existingIds.length > 0) {
          fallbackQuery = fallbackQuery.not("id", "in", `(${existingIds.join(",")})`);
        }

        const { data: fallbackData } = await fallbackQuery;
        if (fallbackData) {
          data = [...(data || []), ...fallbackData];
        }
      }

      if (data && data.length > 0) {
        const formatted: FeaturedProperty[] = data.map((p: any) => {
          const addrObj = Array.isArray(p.address) ? p.address[0] : p.address;
          const priceObj = Array.isArray(p.price) ? p.price[0] : p.price;
          const specObj = Array.isArray(p.specifications)
            ? p.specifications[0]
            : p.specifications || (Array.isArray(p.specs) ? p.specs[0] : p.specs);
          const bldObj = Array.isArray(p.building) ? p.building[0] : p.building;
          const mediaArr = Array.isArray(p.media) ? p.media : [];

          // 🖼️ URL Gambar / Foto
          let thumbnail: string = DEFAULT_FALLBACK_IMAGE;
          if (mediaArr.length > 0) {
            const primary = mediaArr.find((m: any) => m.is_primary) || mediaArr[0];
            thumbnail = primary?.public_url || primary?.url || primary?.file_path || DEFAULT_FALLBACK_IMAGE;
          } else if (p.images) {
            if (Array.isArray(p.images) && p.images.length > 0) {
              thumbnail = typeof p.images[0] === "string" ? p.images[0] : DEFAULT_FALLBACK_IMAGE;
            } else if (typeof p.images === "string") {
              try {
                const parsed = JSON.parse(p.images);
                thumbnail = Array.isArray(parsed) ? parsed[0] : p.images;
              } catch {
                thumbnail = p.images;
              }
            }
          } else if (p.thumbnail || p.image_url) {
            thumbnail = p.thumbnail || p.image_url;
          }

          // 💰 Nilai Harga
          let priceVal: number | null = null;
          if (typeof p.price === "number") priceVal = p.price;
          else if (typeof priceObj === "number") priceVal = priceObj;
          else if (priceObj && typeof priceObj === "object") {
            priceVal =
              priceObj.selling_price ||
              priceObj.rental_price ||
              priceObj.price ||
              priceObj.amount ||
              null;
          }

          // 📍 Lokasi
          let locationText = p.location || "";
          let district = addrObj?.district_name || addrObj?.district || "";
          let city = addrObj?.city_name || addrObj?.city || addrObj?.province_name || "";
          if (district || city) {
            locationText = `${district ? district + ", " : ""}${city}`;
          } else if (addrObj?.address) {
            locationText = addrObj.address;
          }
          if (!locationText) locationText = "Lokasi Terverifikasi";

          // 📐 Spesifikasi
          const bedroom = specObj?.bedroom ?? specObj?.bedrooms ?? p.bedrooms ?? p.bedroom ?? 0;
          const bathroom = specObj?.bathroom ?? specObj?.bathrooms ?? p.bathrooms ?? p.bathroom ?? 0;
          const buildingArea = bldObj?.building_area ?? specObj?.building_area ?? p.building_area ?? p.building_size ?? 0;

          return {
            id: p.id,
            title: p.title || "Properti Unggulan",
            listing_code: p.listing_code || p.code || `INL-${p.id?.slice(0, 4)?.toUpperCase() || "000"}`,
            listing_type: p.listing_type || "jual",
            price: priceVal,
            location: locationText,
            bedrooms: Number(bedroom),
            bathrooms: Number(bathroom),
            building_area: Number(buildingArea),
            thumbnail: thumbnail,
          };
        });

        setFeaturedProperties(formatted.slice(0, 3));
      } else {
        setFeaturedProperties([]);
      }

      // Activity Logs Real-Time
      const { data: actLogs } = await supabase
        .from("crm_activities")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);

      if (actLogs && actLogs.length > 0) {
        setActivityLogs(
          actLogs.map((log: any) => ({
            id: log.id,
            description: log.description || log.action || "Aktivitas CRM",
            user_name: log.user_name || "Administrator",
            time: log.created_at || new Date().toISOString(),
          }))
        );
      } else {
        setActivityLogs([]);
      }

      // Leads Data Real-Time
      const { data: leadsData } = await supabase
        .from("crm_leads")
        .select(`
          id,
          status,
          interest_type,
          created_at,
          crm_contacts (
            full_name,
            phone
          )
        `)
        .order("created_at", { ascending: false })
        .limit(4);

      if (leadsData && leadsData.length > 0) {
        setAgentFollowUpLeads(
          leadsData.map((lead: any) => {
            const contact = Array.isArray(lead.crm_contacts)
              ? lead.crm_contacts[0] || {}
              : lead.crm_contacts || {};

            return {
              id: lead.id,
              name: contact.full_name || "Calon Pembeli",
              property: lead.interest_type || "Properti Pilihan",
              phone: contact.phone || "#",
            };
          })
        );
      } else {
        setAgentFollowUpLeads([]);
      }
    } catch (error) {
      console.error("Gagal memuat data dashboard:", error);
      setFeaturedProperties([]);
    } finally {
      setLoadingLogs(false);
      setLoadingLeads(false);
      setLoadingFeatured(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function initDashboard() {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        let activeRole: UserRole = "viewer";

        if (user) {
          if (isMounted) setIsLoggedIn(true);
          const { data: profile } = await supabase
            .from("users")
            .select("role")
            .eq("id", user.id)
            .maybeSingle();

          if (profile) {
            activeRole = (profile.role || "viewer").toLowerCase() as UserRole;
          } else {
            activeRole = (user.user_metadata?.role || "viewer").toLowerCase() as UserRole;
          }
          if (isMounted) setUserRole(activeRole);
        } else {
          if (isMounted) {
            setIsLoggedIn(false);
            setUserRole("viewer");
          }
        }

        await loadDashboardData();
        if (isMounted) setLoading(false);

        if (activeRole !== "viewer") {
          loadAiSummary();
        }
      } catch (err) {
        console.error("Gagal inisialisasi:", err);
        if (isMounted) setLoading(false);
      }
    }

    initDashboard();

    return () => {
      isMounted = false;
    };
  }, [loadDashboardData, loadAiSummary]);

  const formatIDR = (val?: number | null) => {
    if (!val) return "Hubungi Agen";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const handleTitipProperti = () => {
    toast.info("Fitur Titip Properti Segera Hadir!", {
      description: "Fitur ini sedang dalam tahap pengembangan (Coming Soon).",
    });
  };

  if (loading) {
    return <DashboardLoadingSkeleton />;
  }

  return (
    <div className="space-y-6 pb-16 max-w-7xl mx-auto px-4 sm:px-6 bg-[#FDFBF7] min-h-screen">
      
      {/* 🚪 0. HEADER BANNER UNTUK PENGUNJUNG TAMU / BELUM LOGIN */}
      {!isLoggedIn && (
        <div className="pt-4">
          <div className="bg-white border border-[#F4EFE6] rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs">
            <div>
              <h1 className="text-sm sm:text-base font-bold text-slate-900">
                Selamat Datang di <span className="text-emerald-600">Inland Property</span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Masuk atau daftar akun untuk mengakses fitur lengkap CRM, pencarian properti, dan konsultasi.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/login")}
                className="flex-1 sm:flex-initial text-xs h-9 border-[#F4EFE6] hover:bg-[#F4EFE6] text-slate-800 font-semibold gap-1.5 cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5 text-emerald-600" />
                Masuk
              </Button>
              <Button
                size="sm"
                onClick={() => router.push("/register")}
                className="flex-1 sm:flex-initial text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5 cursor-pointer shadow-2xs"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Daftar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 🔴 1. QUICK ACCESS BULAT (KPR, TITIP PROPERTI, INVOICE, JADWAL SURVEY) */}
      <section className={cn("border-b border-[#F4EFE6] pb-5", isLoggedIn ? "pt-4" : "pt-0")}>
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3">
          Akses Cepat
        </h2>
        <div className="flex items-center gap-6 overflow-x-auto pb-1">
          {/* Quick Access 1: KPR */}
          <button
            type="button"
            onClick={() => router.push("/kpr")}
            className="group flex flex-col items-center gap-2 cursor-pointer focus:outline-none shrink-0"
          >
            <div className="w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shadow-xs transition-all duration-300 group-hover:scale-105 border-2 border-white">
              <Calculator className="w-6 h-6" />
            </div>
            <span className="text-xs font-semibold text-slate-800 group-hover:text-emerald-600 transition-colors">
              Simulasi KPR
            </span>
          </button>

          {/* Quick Access 2: Titip Properti (Coming Soon) */}
          <button
            type="button"
            onClick={handleTitipProperti}
            className="group flex flex-col items-center gap-2 cursor-pointer focus:outline-none shrink-0"
          >
            <div className="relative w-14 h-14 rounded-full bg-white hover:bg-[#F4EFE6] text-emerald-600 border-2 border-[#F4EFE6] flex items-center justify-center shadow-2xs transition-all duration-300 group-hover:scale-105">
              <Handshake className="w-6 h-6" />
              <span className="absolute -top-1 -right-1 bg-emerald-600 text-[8px] text-white font-bold px-1.5 py-0.5 rounded-full uppercase shadow-2xs">
                Soon
              </span>
            </div>
            <span className="text-xs font-semibold text-slate-800 group-hover:text-emerald-600 transition-colors">
              Titip Properti
            </span>
          </button>

          {/* Quick Access 3: Invoice */}
          <button
            type="button"
            onClick={() => router.push("/invoices")}
            className="group flex flex-col items-center gap-2 cursor-pointer focus:outline-none shrink-0"
          >
            <div className="w-14 h-14 rounded-full bg-white hover:bg-[#F4EFE6] text-emerald-600 border-2 border-[#F4EFE6] flex items-center justify-center shadow-2xs transition-all duration-300 group-hover:scale-105">
              <FileText className="w-6 h-6" />
            </div>
            <span className="text-xs font-semibold text-slate-800 group-hover:text-emerald-600 transition-colors">
              Invoice
            </span>
          </button>

          {/* Quick Access 4: Jadwal Survey */}
          <button
            type="button"
            onClick={() => router.push("/surveys")}
            className="group flex flex-col items-center gap-2 cursor-pointer focus:outline-none shrink-0"
          >
            <div className="w-14 h-14 rounded-full bg-white hover:bg-[#F4EFE6] text-emerald-600 border-2 border-[#F4EFE6] flex items-center justify-center shadow-2xs transition-all duration-300 group-hover:scale-105">
              <CalendarCheck className="w-6 h-6" />
            </div>
            <span className="text-xs font-semibold text-slate-800 group-hover:text-emerald-600 transition-colors">
              Jadwal Survey
            </span>
          </button>
        </div>
      </section>

      {/* 🟢 2. KPI RINGKASAN METRIK */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {isAgent && (
          <>
            <Card className="border border-[#F4EFE6] bg-white shadow-2xs rounded-xl">
              <CardContent className="p-3.5 space-y-1">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs font-medium">Leads Hari Ini</span>
                  <Users className="w-4 h-4 text-emerald-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">{stats?.todayLeads || 0} Prospek</h3>
              </CardContent>
            </Card>

            <Card className="border border-[#F4EFE6] bg-white shadow-2xs rounded-xl">
              <CardContent className="p-3.5 space-y-1">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs font-medium">Listing Aktif</span>
                  <Building2 className="w-4 h-4 text-emerald-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">{stats?.activeListings || 0} Unit</h3>
              </CardContent>
            </Card>

            <Card className="border border-[#F4EFE6] bg-white shadow-2xs rounded-xl">
              <CardContent className="p-3.5 space-y-1">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs font-medium">Agenda Survei</span>
                  <Calendar className="w-4 h-4 text-emerald-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Terjadwal</h3>
              </CardContent>
            </Card>

            <Card className="border border-[#F4EFE6] bg-white shadow-2xs rounded-xl">
              <CardContent className="p-3.5 space-y-1">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs font-medium">Estimasi Komisi</span>
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                </div>
                <h3 className="text-sm font-bold font-mono text-emerald-600">{formatIDR(0)}</h3>
              </CardContent>
            </Card>
          </>
        )}

        {(isAdmin || isViewer || isExecutive) && (
          <>
            <Card className="border border-[#F4EFE6] bg-white shadow-2xs rounded-xl">
              <CardContent className="p-3.5 space-y-1">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs font-medium">Listing Aktif</span>
                  <Building2 className="w-4 h-4 text-emerald-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">{stats?.activeListings || 0} Unit</h3>
              </CardContent>
            </Card>

            <Card className="border border-[#F4EFE6] bg-white shadow-2xs rounded-xl">
              <CardContent className="p-3.5 space-y-1">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs font-medium">Total Properti</span>
                  <Building2 className="w-4 h-4 text-emerald-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">{stats?.totalProperties || 0} Unit</h3>
              </CardContent>
            </Card>

            <Card className="border border-[#F4EFE6] bg-white shadow-2xs rounded-xl">
              <CardContent className="p-3.5 space-y-1">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs font-medium">Total Leads CRM</span>
                  <Users className="w-4 h-4 text-emerald-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">{stats?.todayLeads || 0} Prospek</h3>
              </CardContent>
            </Card>

            <Card className="border border-[#F4EFE6] bg-white shadow-2xs rounded-xl">
              <CardContent className="p-3.5 space-y-1">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs font-medium">Status Sistem</span>
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                </div>
                <h3 className="text-xs font-bold text-emerald-600">Terverifikasi (Online)</h3>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* 🟢 3. MAIN BENTO GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* KOLOM UTAMA */}
        <div className={cn("space-y-6", isAgent ? "lg:col-span-8" : "lg:col-span-12")}>
          
          {/* 🔍 COMPACT SEARCH BAR */}
          <section className="space-y-2">
            <DashboardPropertySearch />
          </section>

          {/* ⭐ SECTION PROPERTI UNGGULAN (MAKSIMAL 3 UNIT) */}
          <section className="space-y-3">
            <div className="flex items-center justify-between border-b border-[#F4EFE6] pb-2.5">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-emerald-600 fill-emerald-600" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Properti Unggulan
                </h2>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/properties")}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:bg-[#F4EFE6]/50 gap-1 rounded-lg cursor-pointer h-7"
              >
                Lihat Semua <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>

            {loadingFeatured ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-64 w-full rounded-xl bg-[#F4EFE6]" />
                ))}
              </div>
            ) : featuredProperties.length === 0 ? (
              <Card className="border border-[#F4EFE6] bg-white p-8 text-center rounded-xl shadow-2xs">
                <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-500 font-medium">Belum ada properti yang dipublikasikan.</p>
              </Card>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {featuredProperties.map((prop) => {
                    const isRent =
                      prop.listing_type === "sewa" ||
                      prop.listing_type === "disewa" ||
                      prop.listing_type === "rent";

                    return (
                      <Card
                        key={prop.id}
                        onClick={() => router.push(`/properties/${prop.id}`)}
                        className="group border border-[#F4EFE6] hover:border-emerald-600/40 bg-white rounded-xl overflow-hidden shadow-2xs hover:shadow-md transition-all duration-300 cursor-pointer flex flex-col justify-between"
                      >
                        <div>
                          {/* Thumbnail Foto */}
                          <div className="relative aspect-[16/10] bg-[#F4EFE6] overflow-hidden">
                            <img
                              src={prop.thumbnail}
                              alt={prop.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = DEFAULT_FALLBACK_IMAGE;
                              }}
                            />

                            {/* Badge Tipe Listing */}
                            <div className="absolute top-2 left-2">
                              <Badge
                                className={cn(
                                  "text-[9px] font-bold px-2 py-0.5 uppercase tracking-wide text-white border-0 rounded-md",
                                  isRent ? "bg-slate-800" : "bg-emerald-600"
                                )}
                              >
                                {isRent ? "SEWA" : "DIJUAL"}
                              </Badge>
                            </div>

                            {/* Kode Listing */}
                            <div className="absolute bottom-2 right-2">
                              <span className="text-[9px] font-mono font-medium text-slate-700 bg-white/95 px-1.5 py-0.5 rounded border border-[#F4EFE6]">
                                {prop.listing_code}
                              </span>
                            </div>
                          </div>

                          {/* Informasi Properti */}
                          <CardContent className="p-3 space-y-2">
                            <div className="text-sm font-bold text-emerald-600">
                              {formatIDR(prop.price)}
                            </div>

                            <h3 className="font-semibold text-xs text-slate-900 line-clamp-1 group-hover:text-emerald-600 transition-colors">
                              {prop.title}
                            </h3>

                            <p className="text-[11px] text-slate-500 flex items-center gap-1 truncate">
                              <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                              {prop.location}
                            </p>

                            {/* Spesifikasi Ringkas */}
                            <div className="flex items-center gap-3 pt-2 text-[11px] text-slate-600 font-medium border-t border-[#F4EFE6]">
                              <span className="flex items-center gap-1">
                                <Bed className="w-3 h-3 text-emerald-600" />
                                {prop.bedrooms || 0}
                              </span>
                              <span className="flex items-center gap-1">
                                <Bath className="w-3 h-3 text-emerald-600" />
                                {prop.bathrooms || 0}
                              </span>
                              <span className="flex items-center gap-1 truncate">
                                <Maximize2 className="w-3 h-3 text-emerald-600 shrink-0" />
                                {prop.building_area || 0}m²
                              </span>
                            </div>
                          </CardContent>
                        </div>

                        <div className="px-3 pb-3 pt-0 flex items-center justify-between text-[11px] font-semibold text-emerald-600 group-hover:text-emerald-700">
                          <span>Detail Properti</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </div>
                      </Card>
                    );
                  })}
                </div>

                {/* 🎯 TOMBOL "LIHAT SEMUA PROPERTI" UTAMA */}
                <div className="pt-2">
                  <Button
                    onClick={() => router.push("/properties")}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-10 rounded-xl gap-2 shadow-2xs transition-all cursor-pointer"
                  >
                    <span>Lihat Semua Properti</span>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </section>

          {/* AI EXECUTIVE SUMMARY */}
          {canSeeAiSummary && (
            <Card className="border border-[#F4EFE6] bg-white shadow-2xs rounded-xl">
              <CardHeader className="p-3.5 pb-2 flex flex-row items-center justify-between border-b border-[#F4EFE6]">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-emerald-600 text-white rounded-lg">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <CardTitle className="text-xs font-bold text-slate-900">
                      AI Executive Summary
                    </CardTitle>
                    <CardDescription className="text-[11px] text-slate-500">
                      Ringkasan Analitik Sistem
                    </CardDescription>
                  </div>
                </div>

                {isSuperAdmin && (
                  <div className="flex items-center gap-1.5 bg-[#F4EFE6]/60 px-2 py-0.5 rounded-lg border border-[#F4EFE6]">
                    <Power className={cn("w-3 h-3", aiEnabled ? "text-emerald-600" : "text-slate-400")} />
                    <button
                      type="button"
                      disabled={togglingAi}
                      onClick={async () => {
                        const nextState = !aiEnabled;
                        setTogglingAi(true);
                        setAiEnabled(nextState);
                        if (!nextState) {
                          setAiSummary("Fitur AI Executive Summary sedang dinonaktifkan oleh Super Admin.");
                        }

                        try {
                          const res = await fetch("/api/dashboard/summary/toggle", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ enabled: nextState })
                          });
                          
                          if (res.ok && nextState) loadAiSummary();
                        } catch (e) {
                          setAiEnabled(!nextState);
                        } finally {
                          setTogglingAi(false);
                        }
                      }}
                      className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded transition cursor-pointer",
                        aiEnabled ? "bg-emerald-600 text-white" : "bg-slate-300 text-slate-700"
                      )}
                    >
                      {togglingAi ? "..." : (aiEnabled ? "ON" : "OFF")}
                    </button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="p-3.5 text-xs text-slate-700 leading-relaxed">
                {loadingAiSummary ? (
                  <div className="flex items-center gap-2 text-slate-400 animate-pulse py-1">
                    <RefreshCw className="w-3 h-3 animate-spin text-emerald-600" />
                    <span>Merangkum analisis sistem...</span>
                  </div>
                ) : (
                  aiSummary
                )}
              </CardContent>
            </Card>
          )}

          {/* AUDIT LOG UNTUK SUPER ADMIN */}
          {isSuperAdmin && (
            <Card className="border border-[#F4EFE6] bg-white shadow-2xs rounded-xl">
              <CardHeader className="p-3.5 border-b border-[#F4EFE6] flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-bold text-slate-900 flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-emerald-600" /> Audit Log System
                </CardTitle>
                <Badge variant="outline" className="text-[10px] bg-[#F4EFE6] text-emerald-800 border-emerald-200">
                  Live DB
                </Badge>
              </CardHeader>
              <CardContent className="p-3.5 space-y-2 text-xs">
                {loadingLogs ? (
                  <div className="text-center py-4 text-slate-400">
                    <RefreshCw className="w-4 h-4 animate-spin mx-auto text-emerald-600 mb-1" />
                    <p className="text-[11px]">Memuat log aktivitas...</p>
                  </div>
                ) : activityLogs.length > 0 ? (
                  activityLogs.map((act) => (
                    <div
                      key={act.id}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-[#FDFBF7] border border-[#F4EFE6]"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
                        <div>
                          <p className="font-medium text-slate-900">{act.description}</p>
                          <p className="text-[10px] text-slate-500">Oleh: {act.user_name}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 shrink-0">
                        {new Date(act.time).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-center py-3 text-slate-400 text-xs">Belum ada aktivitas tercatat.</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* KOLOM SAMPING (HANYA TAMPIL JIKA KHUSUS AGEN) */}
        {isAgent && (
          <div className="lg:col-span-4 space-y-6">
            {/* WIDGET LEADS FOLLOW-UP (KHUSUS AGEN) */}
            <Card className="border border-[#F4EFE6] bg-white shadow-2xs rounded-xl">
              <CardHeader className="p-3.5 border-b border-[#F4EFE6]">
                <CardTitle className="text-xs font-bold text-slate-900 flex items-center gap-2">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-600" /> Leads Perlu Follow-Up
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 space-y-2 text-xs">
                {loadingLeads ? (
                  <p className="text-center py-4 text-slate-400">Memuat prospek...</p>
                ) : agentFollowUpLeads.length > 0 ? (
                  agentFollowUpLeads.map((lead) => (
                    <div key={lead.id} className="p-2.5 border border-[#F4EFE6] rounded-lg space-y-1.5 bg-[#FDFBF7]">
                      <div>
                        <p className="font-semibold text-slate-900">{lead.name}</p>
                        <p className="text-[10px] text-slate-500">{lead.property}</p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => window.open(`https://wa.me/${lead.phone}`, "_blank")}
                        className="w-full h-7 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white rounded-md cursor-pointer"
                      >
                        <MessageSquare className="w-3 h-3 mr-1" /> WhatsApp
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="text-center py-4 text-slate-400 text-xs">Tidak ada leads baru.</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

function DashboardLoadingSkeleton() {
  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto px-4 sm:px-6 bg-[#FDFBF7]">
      <Skeleton className="h-20 w-full rounded-xl bg-[#F4EFE6]" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl bg-[#F4EFE6]" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Skeleton className="lg:col-span-8 h-80 rounded-xl bg-[#F4EFE6]" />
        <Skeleton className="lg:col-span-4 h-80 rounded-xl bg-[#F4EFE6]" />
      </div>
    </div>
  );
}