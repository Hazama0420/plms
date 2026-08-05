// app/(dashboard)/dashboard/page.tsx
"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Building2,
  Users,
  Sparkles,
  RefreshCw,
  ShieldCheck,
  Calculator,
  Handshake,
  FileText,
  CalendarCheck,
  Star,
  Clock,
  FolderKanban,
  Lock,
  MapPin,
  Bed,
  Bath,
  Maximize2,
  Ruler,
  ChevronRight,
  UserCheck,
  MessageSquare,
  Power,
  LogIn,
  UserPlus,
  User,
} from "lucide-react";

import { supabase } from "@/lib/supabase/client";
import { formatLocationShort } from "@/lib/property-address";
import { dashboardService, type DashboardStats } from "@/services/dashboard.service";
import { DashboardPropertySearch } from "@/components/dashboard/DashboardPropertySearch";
import { WatermarkedImage } from "@/components/ui/WatermarkedImage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type UserRole = "super_admin" | "superadmin" | "admin" | "agent" | "commissioner" | "viewer";

interface LeadFollowUpItem {
  id: string;
  name: string;
  property: string;
  phone: string;
}

interface PropertyItem {
  id: string;
  title: string;
  listing_code: string;
  listing_type: string;
  category: string;
  price: number | null;
  location: string;
  bedrooms: number | null;
  bathrooms: number | null;
  building_area: number | null; // LB
  land_area: number | null;     // LT
  thumbnail: string;
  agent_name: string;
  agent_avatar: string | null;
  agent_phone: string | null;
}

const DEFAULT_FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80";

const capitalizeWords = (str: string) => {
  if (!str) return "";
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

// Helper Formatter Data Properti dari Supabase
const formatPropertyItem = (p: any): PropertyItem => {
  const addrObj = Array.isArray(p.address) ? p.address[0] : p.address;
  const priceObj = Array.isArray(p.price) ? p.price[0] : p.price;
  const specObj = Array.isArray(p.specifications)
    ? p.specifications[0]
    : p.specifications || (Array.isArray(p.specs) ? p.specs[0] : p.specs);
  const bldObj = Array.isArray(p.building) ? p.building[0] : p.building;
  const landObj = Array.isArray(p.land) ? p.land[0] : p.land;
  const mediaArr = Array.isArray(p.media) ? p.media : [];

  const agentObj = Array.isArray(p.agent)
    ? p.agent[0]
    : p.agent || (Array.isArray(p.user) ? p.user[0] : p.user) || (Array.isArray(p.users) ? p.users[0] : p.users);
  
  const rawAgentName = agentObj?.full_name || agentObj?.name || p.agent_name || "Agen Inland";
  const agentFirstName = rawAgentName.trim().split(" ")[0] || "Agen";
  const agentAvatar = agentObj?.avatar_url || agentObj?.photo_url || agentObj?.avatar || p.agent_avatar || null;
  const agentPhone = agentObj?.phone || agentObj?.whatsapp || p.agent_phone || p.phone || null;

  const rawCategory = p.category || p.property_type || p.type || "Rumah";
  const categoryName = typeof rawCategory === "string" 
    ? capitalizeWords(rawCategory) 
    : "Rumah";

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

  let locationText = formatLocationShort(addrObj) || p.location || "Lokasi Terverifikasi";

  const bedroom = specObj?.bedroom ?? specObj?.bedrooms ?? p.bedrooms ?? p.bedroom ?? 0;
  const bathroom = specObj?.bathroom ?? specObj?.bathrooms ?? p.bathrooms ?? p.bathroom ?? 0;

  const buildingArea = bldObj?.building_area ?? specObj?.building_area ?? p.building_area ?? p.building_size ?? 0;
  const landArea = landObj?.land_area ?? specObj?.land_area ?? p.land_area ?? p.land_size ?? 0;

  return {
    id: p.id,
    title: p.title || "Properti Inland",
    listing_code: p.listing_code || p.code || `INL-${p.id?.slice(0, 4)?.toUpperCase() || "000"}`,
    listing_type: p.listing_type || "jual",
    category: categoryName,
    price: priceVal,
    location: locationText,
    bedrooms: Number(bedroom),
    bathrooms: Number(bathroom),
    building_area: Number(buildingArea),
    land_area: Number(landArea),
    thumbnail: thumbnail,
    agent_name: agentFirstName,
    agent_avatar: agentAvatar,
    agent_phone: agentPhone,
  };
};

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  // Auth State
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [userRole, setUserRole] = useState<UserRole>("viewer");

  // State Properti Unggulan Real-Time
  const [featuredProperties, setFeaturedProperties] = useState<PropertyItem[]>([]);
  const [loadingFeatured, setLoadingFeatured] = useState<boolean>(true);

  // State Properti Terbaru
  const [latestProperties, setLatestProperties] = useState<PropertyItem[]>([]);
  const [loadingLatest, setLoadingLatest] = useState<boolean>(true);

  // Real-Time Data States
  const [agentFollowUpLeads, setAgentFollowUpLeads] = useState<LeadFollowUpItem[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);

  // AI Summary States
  const [aiSummary, setAiSummary] = useState<string>("Memuat ringkasan eksekutif...");
  const [loadingAiSummary, setLoadingAiSummary] = useState<boolean>(false);
  const [aiEnabled, setAiEnabled] = useState<boolean>(true);
  const [togglingAi, setTogglingAi] = useState<boolean>(false);

  // Definisi Role & Aturan Hak Akses
  const isSuperAdmin = userRole === "super_admin" || userRole === "superadmin";
  const isAdmin = userRole === "admin" || isSuperAdmin;
  const isAgent = userRole === "agent";
  const isExecutive = userRole === "commissioner";

  const canSeeAdminManagement = isAdmin; 
  const canSeeAiSummary = isSuperAdmin || isAdmin || isAgent || isExecutive;
  const canAccessInvoice = isLoggedIn && (isSuperAdmin || isAdmin || isAgent);

  // Handler Tombol WhatsApp + Log Aktivitas CRM
  const handleWhatsAppClick = async (e: React.MouseEvent, prop: PropertyItem) => {
    e.stopPropagation();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("crm_activities").insert({
          user_id: user.id,
          property_id: prop.id,
          activity_type: "whatsapp_contact",
          description: `Menghubungi agen untuk properti: ${prop.title} (${prop.listing_code})`,
          created_at: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error("Gagal mencatat log aktivitas CRM:", err);
    }

    const phoneNum = prop.agent_phone ? prop.agent_phone.replace(/\D/g, "") : "";
    const formattedPhone = phoneNum
      ? (phoneNum.startsWith("0") ? `62${phoneNum.slice(1)}` : phoneNum)
      : "6281234567890";

    const waMsg = encodeURIComponent(
      `Halo, saya berminat dengan properti: *${prop.title}* (${prop.listing_code}). Apakah masih tersedia?`
    );

    toast.success("Membuka WhatsApp...", {
      description: "Aktivitas kontak telah dicatat di log CRM.",
    });

    window.open(`https://wa.me/${formattedPhone}?text=${waMsg}`, "_blank");
  };

  // Fetch AI Summary
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

  // Fetch Data Dashboard
  const loadDashboardData = useCallback(async () => {
    setLoadingLeads(true);
    setLoadingFeatured(true);
    setLoadingLatest(true);

    try {
      const dataStats = await dashboardService.getStats();
      setStats(dataStats);

      // A. Fetch Properti Unggulan
      const { data: featuredData } = await supabase
        .from("properties")
        .select(`
          *,
          address:property_address(*),
          price:property_price(*),
          specifications:property_specifications(*),
          building:property_building(*),
          land:property_land(*),
          media:property_media(*),
          agent:users(full_name, avatar_url, phone)
        `)
        .eq("status", "published")
        .eq("is_featured", true)
        .order("created_at", { ascending: false })
        .limit(4);

      if (featuredData && featuredData.length > 0) {
        setFeaturedProperties(featuredData.map(formatPropertyItem));
      } else {
        setFeaturedProperties([]);
      }

      // B. Fetch Properti Terbaru
      const { data: latestData } = await supabase
        .from("properties")
        .select(`
          *,
          address:property_address(*),
          price:property_price(*),
          specifications:property_specifications(*),
          building:property_building(*),
          land:property_land(*),
          media:property_media(*),
          agent:users(full_name, avatar_url, phone)
        `)
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(4);

      if (latestData && latestData.length > 0) {
        setLatestProperties(latestData.map(formatPropertyItem));
      } else {
        setLatestProperties([]);
      }

      // C. Fetch Leads CRM
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
      setLatestProperties([]);
    } finally {
      setLoadingLeads(false);
      setLoadingFeatured(false);
      setLoadingLatest(false);
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

  const handleProyekInlandClick = () => {
    toast.info("Fitur Proyek Inland Segera Hadir!", {
      description: "Halaman katalog proyek & perumahan eksklusif Inland sedang dikembangkan.",
    });
  };

  if (loading) {
    return <DashboardLoadingSkeleton />;
  }

  return (
    <div className="space-y-5 pb-16 max-w-7xl mx-auto px-3 sm:px-6 bg-[#FDFBF7] dark:bg-slate-950 min-h-screen text-slate-900 dark:text-slate-100 transition-colors">
      
      {/* 🚪 0. BANNER PENGUNJUNG TAMU */}
      {!isLoggedIn && (
        <div className="pt-3">
          <div className="bg-white dark:bg-slate-900 border border-[#F4EFE6] dark:border-slate-800 rounded-xl p-3.5 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
            <div>
              <h1 className="text-xs sm:text-base font-bold text-slate-900 dark:text-white">
                Selamat Datang di <span className="text-emerald-600 dark:text-emerald-400">Inland Property</span>
              </h1>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Masuk atau daftar akun untuk mengakses fitur lengkap CRM dan pencarian properti.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/login")}
                className="flex-1 sm:flex-initial text-xs h-8 sm:h-9 border-[#F4EFE6] dark:border-slate-800 hover:bg-[#F4EFE6] dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold gap-1.5 cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Masuk
              </Button>
              <Button
                size="sm"
                onClick={() => router.push("/register")}
                className="flex-1 sm:flex-initial text-xs h-8 sm:h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5 cursor-pointer shadow-2xs"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Daftar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 🔍 1. HEADER HERO SEARCH */}
      <section className="relative rounded-2xl overflow-hidden shadow-xs border border-emerald-950/10 dark:border-emerald-500/20">
        <div 
          className="absolute inset-0 bg-cover bg-center z-0"
          style={{ backgroundImage: "url('/bg-header.webp')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/85 via-slate-950/65 to-slate-950/30 z-[1]" />
        
        <div className="relative z-10 p-3.5 sm:p-7 space-y-2.5 max-w-2xl text-left">
          <div className="space-y-1">
            <Badge className="bg-emerald-600 text-white border-0 text-[8px] sm:text-[9px] font-semibold uppercase tracking-wider shadow-md px-2 py-0.5">
              Portal Properti Eksklusif
            </Badge>
            
            <h2 className="text-base sm:text-xl md:text-2xl font-extrabold text-white tracking-tight drop-shadow-md leading-tight sm:leading-snug">
              Temukan Hunian Impian Anda Bersama Kami
            </h2>

            <p className="text-[10px] sm:text-xs text-slate-200 max-w-lg font-medium drop-shadow-sm leading-normal sm:leading-relaxed">
              Gunakan pencarian dan filter cepat di bawah untuk menemukan properti terbaik sesuai lokasi, tipe, dan anggaran Anda.
            </p>
          </div>

          <div className="pt-0.5 w-full max-w-full sm:max-w-xl">
            {/* Suspense wajib: komponen ini membaca useSearchParams(), dan tanpa
                batas Suspense Next.js menggagalkan prerender halaman ini. */}
            <Suspense fallback={<div className="h-14 rounded-2xl bg-white/10 animate-pulse" />}>
              <DashboardPropertySearch />
            </Suspense>
          </div>
        </div>
      </section>

      {/* 🔴 2. QUICK ACCESS BULAT */}
      <section className={cn("border-b border-[#F4EFE6] dark:border-slate-800 pb-4", isLoggedIn ? "pt-1" : "pt-0")}>
        <h2 className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5">
          Akses Cepat
        </h2>
        <div className="flex items-center gap-5 sm:gap-6 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => router.push("/kpr")}
            className="group flex flex-col items-center gap-1.5 cursor-pointer focus:outline-none shrink-0"
          >
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shadow-xs transition-all duration-300 group-hover:scale-105 border-2 border-white dark:border-slate-900">
              <Calculator className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <span className="text-[11px] sm:text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              Simulasi KPR
            </span>
          </button>

          <button
            type="button"
            onClick={handleTitipProperti}
            className="group flex flex-col items-center gap-1.5 cursor-pointer focus:outline-none shrink-0"
          >
            <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white dark:bg-slate-900 hover:bg-[#F4EFE6] dark:hover:bg-slate-800 text-emerald-600 dark:text-emerald-400 border-2 border-[#F4EFE6] dark:border-slate-800 flex items-center justify-center shadow-2xs transition-all duration-300 group-hover:scale-105">
              <Handshake className="w-5 h-5 sm:w-6 sm:h-6" />
              <span className="absolute -top-1 -right-1 bg-emerald-600 text-[7px] sm:text-[8px] text-white font-bold px-1.5 py-0.5 rounded-full uppercase shadow-2xs">
                Soon
              </span>
            </div>
            <span className="text-[11px] sm:text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              Titip Properti
            </span>
          </button>

          {canAccessInvoice && (
            <button
              type="button"
              onClick={() => router.push("/invoices")}
              className="group flex flex-col items-center gap-1.5 cursor-pointer focus:outline-none shrink-0"
            >
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white dark:bg-slate-900 hover:bg-[#F4EFE6] dark:hover:bg-slate-800 text-emerald-600 dark:text-emerald-400 border-2 border-[#F4EFE6] dark:border-slate-800 flex items-center justify-center shadow-2xs transition-all duration-300 group-hover:scale-105">
                <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <span className="text-[11px] sm:text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                Invoice
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={() => router.push("/surveys")}
            className="group flex flex-col items-center gap-1.5 cursor-pointer focus:outline-none shrink-0"
          >
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white dark:bg-slate-900 hover:bg-[#F4EFE6] dark:hover:bg-slate-800 text-emerald-600 dark:text-emerald-400 border-2 border-[#F4EFE6] dark:border-slate-800 flex items-center justify-center shadow-2xs transition-all duration-300 group-hover:scale-105">
              <CalendarCheck className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <span className="text-[11px] sm:text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              Jadwal Survey
            </span>
          </button>
        </div>
      </section>

      {/* 🟢 3. KPI RINGKASAN METRIK KHUSUS ADMIN */}
      {canSeeAdminManagement && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="border border-[#F4EFE6] dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs rounded-xl">
            <CardContent className="p-3.5 space-y-1">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span className="text-xs font-medium">Listing Aktif</span>
                <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{stats?.activeListings || 0} Unit</h3>
            </CardContent>
          </Card>

          <Card className="border border-[#F4EFE6] dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs rounded-xl">
            <CardContent className="p-3.5 space-y-1">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span className="text-xs font-medium">Total Properti</span>
                <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{stats?.totalProperties || 0} Unit</h3>
            </CardContent>
          </Card>

          <Card className="border border-[#F4EFE6] dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs rounded-xl">
            <CardContent className="p-3.5 space-y-1">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span className="text-xs font-medium">Total Leads CRM</span>
                <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{stats?.todayLeads || 0} Prospek</h3>
            </CardContent>
          </Card>

          <Card className="border border-[#F4EFE6] dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs rounded-xl">
            <CardContent className="p-3.5 space-y-1">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span className="text-xs font-medium">Status Sistem</span>
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Terverifikasi (Online)</h3>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 🟢 4. MAIN BENTO GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* KOLOM UTAMA */}
        <div className={cn("space-y-6", isAgent ? "lg:col-span-8" : "lg:col-span-12")}>
          
          {/* ⭐ SECTION 1: PROPERTI UNGGULAN */}
          <section className="bg-gradient-to-b from-emerald-950/[0.04] via-emerald-900/[0.02] to-transparent dark:from-emerald-950/20 dark:via-emerald-950/10 dark:to-transparent border border-emerald-700/20 dark:border-emerald-500/20 rounded-2xl p-3.5 sm:p-5 space-y-3.5 shadow-xs">
            <div className="flex items-center justify-between border-b border-emerald-700/15 dark:border-emerald-500/20 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="p-1 bg-amber-500/10 border border-amber-500/20 rounded-md">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                </div>
                <h2 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-emerald-950 dark:text-emerald-400">
                  Properti Unggulan (Favorit)
                </h2>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/properties?featured=true")}
                className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 hover:bg-emerald-600/10 rounded-lg cursor-pointer h-7"
              >
                Lihat Semua <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>

            {loadingFeatured ? (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-56 w-full rounded-xl bg-[#F4EFE6] dark:bg-slate-800" />
                ))}
              </div>
            ) : featuredProperties.length === 0 ? (
              <Card className="border border-[#F4EFE6] dark:border-slate-800 bg-white dark:bg-slate-900 p-6 text-center rounded-xl shadow-2xs">
                <Star className="w-7 h-7 text-amber-400 mx-auto mb-2 opacity-50" />
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Belum ada properti unggulan yang ditandai bintang oleh Admin.</p>
              </Card>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
                {featuredProperties.map((prop) => {
                  const isRent =
                    prop.listing_type === "sewa" ||
                    prop.listing_type === "disewa" ||
                    prop.listing_type === "rent";

                  return (
                    <Card
                      key={prop.id}
                      onClick={() => router.push(`/properties/${prop.id}`)}
                      className="group border border-amber-200/80 dark:border-amber-500/30 hover:border-amber-500/80 bg-white dark:bg-slate-900 rounded-xl overflow-hidden shadow-2xs hover:shadow-md transition-all duration-300 cursor-pointer flex flex-col justify-between"
                    >
                      <div>
                        {/* FOTO PROPERTI DENGAN WATERMARK INLAND PROPERTY */}
                        <div className="relative aspect-[16/10] bg-[#F4EFE6] dark:bg-slate-800 overflow-hidden">
                          <WatermarkedImage
                            src={prop.thumbnail}
                            alt={prop.title}
                            className="w-full h-full"
                            imageClassName="group-hover:scale-105 transition-transform duration-500"
                            watermarkOpacity={0.6}
                            watermarkSize="w-1/3"
                          />

                          {/* Badge Premium Favorit & Tipe Listing */}
                          <div className="absolute top-1.5 left-1.5 flex items-center gap-1 z-10">
                            <Badge className="bg-amber-500 text-white border-0 text-[7.5px] font-bold px-1 py-0.5 gap-0.5 shadow-xs">
                              <Star className="w-2 h-2 fill-white" /> UNGGULAN
                            </Badge>
                            <Badge
                              className={cn(
                                "text-[8px] font-bold px-1.5 py-0.5 uppercase tracking-wide text-white border-0 rounded",
                                isRent ? "bg-slate-800 dark:bg-slate-700" : "bg-emerald-600"
                              )}
                            >
                              {isRent ? "SEWA" : "DIJUAL"}
                            </Badge>
                          </div>

                          {/* Kode Listing */}
                          <div className="absolute bottom-1.5 right-1.5 z-10">
                            <span className="text-[8.5px] font-mono font-medium text-slate-700 dark:text-slate-300 bg-white/95 dark:bg-slate-900/95 px-1 py-0.5 rounded border border-[#F4EFE6] dark:border-slate-800">
                              {prop.listing_code}
                            </span>
                          </div>
                        </div>

                        {/* Informasi Properti */}
                        <CardContent className="p-2.5 space-y-1">
                          <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 leading-none pt-0.5">
                            {formatIDR(prop.price)}
                          </div>

                          <div className="flex items-center justify-between gap-1.5 pt-0.5">
                            <h3 
                              className="font-semibold text-[11px] leading-tight text-slate-900 dark:text-white truncate flex-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors"
                              title={prop.title}
                            >
                              {prop.title}
                            </h3>

                            <Badge variant="outline" className="text-[8px] font-bold px-1.5 py-0.2 shrink-0 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 flex items-center gap-0.5 rounded-md">
                              <Building2 className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                              <span>{prop.category}</span>
                            </Badge>
                          </div>

                          <p className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 truncate">
                            <MapPin className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            {prop.location}
                          </p>

                          {/* SPESIFIKASI: KT/KM (KIRI) vs LB/LT (KANAN) */}
                          <div className="flex items-center justify-between pt-1.5 text-[9px] text-slate-600 dark:text-slate-300 font-medium border-t border-[#F4EFE6] dark:border-slate-800">
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="flex items-center gap-0.5" title="Kamar Tidur">
                                <Bed className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                {prop.bedrooms || 0} KT
                              </span>
                              <span className="flex items-center gap-0.5" title="Kamar Mandi">
                                <Bath className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                {prop.bathrooms || 0} KM
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0 text-slate-500 dark:text-slate-400">
                              <span className="flex items-center gap-0.5" title="Luas Bangunan">
                                <Maximize2 className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                LB {prop.building_area || 0}m²
                              </span>
                              <span className="flex items-center gap-0.5" title="Luas Tanah">
                                <Ruler className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                LT {prop.land_area || 0}m²
                              </span>
                            </div>
                          </div>

                          {/* PROFIL AGEN + WHATSAPP */}
                          <div className="flex items-center justify-between gap-1.5 pt-1.5 border-t border-[#F4EFE6] dark:border-slate-800 mt-0.5">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <div className="w-4 h-4 rounded-full overflow-hidden bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center text-[8px] font-bold text-emerald-700 dark:text-emerald-300 shrink-0">
                                {prop.agent_avatar ? (
                                  <img
                                    src={prop.agent_avatar}
                                    alt={prop.agent_name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      (e.target as HTMLElement).style.display = "none";
                                    }}
                                  />
                                ) : (
                                  <User className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                                )}
                              </div>
                              <span className="text-[9.5px] font-medium text-slate-600 dark:text-slate-300 truncate">
                                {prop.agent_name}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => handleWhatsAppClick(e, prop)}
                              className="w-5 h-5 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs transition-transform hover:scale-110 cursor-pointer"
                              title="Hubungi WhatsApp (Catat ke CRM)"
                            >
                              <svg className="w-2.5 h-2.5 fill-current" viewBox="0 0 24 24">
                                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.285-.143-1.687-.833-1.947-.928-.26-.095-.45-.143-.639.143-.19.286-.736.928-.903 1.118-.167.19-.333.214-.618.071-.285-.143-1.207-.445-2.299-1.419-.85-.759-1.424-1.697-1.591-1.983-.167-.286-.018-.44.125-.582.129-.128.285-.333.428-.5.143-.167.19-.286.285-.476.095-.19.048-.357-.024-.5-.071-.143-.639-1.537-.876-2.106-.23-.554-.464-.479-.639-.488-.165-.008-.356-.01-.547-.01-.19 0-.5.071-.761.357-.26.286-1 .976-1 2.381 0 1.405 1.023 2.762 1.166 2.952.143.19 2.013 3.074 4.877 4.311.681.294 1.213.47 1.627.601.684.217 1.307.186 1.8.113.55-.082 1.687-.69 1.925-1.357.238-.667.238-1.238.167-1.357-.07-.119-.26-.19-.545-.333z"/>
                              </svg>
                            </button>
                          </div>
                        </CardContent>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>

          {/* 🆕 SECTION 2: PROPERTI TERBARU */}
          <section className="bg-gradient-to-b from-emerald-950/[0.04] via-emerald-900/[0.02] to-transparent dark:from-emerald-950/20 dark:via-emerald-950/10 dark:to-transparent border border-emerald-700/20 dark:border-emerald-500/20 rounded-2xl p-3.5 sm:p-5 space-y-3.5 shadow-xs">
            <div className="flex items-center justify-between border-b border-emerald-700/15 dark:border-emerald-500/20 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="p-1 bg-emerald-600/10 border border-emerald-600/20 rounded-md">
                  <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h2 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-emerald-950 dark:text-emerald-400">
                  Properti Terbaru
                </h2>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/properties")}
                className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 hover:bg-emerald-600/10 rounded-lg cursor-pointer h-7"
              >
                Lihat Semua <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>

            {loadingLatest ? (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-56 w-full rounded-xl bg-[#F4EFE6] dark:bg-slate-800" />
                ))}
              </div>
            ) : latestProperties.length === 0 ? (
              <Card className="border border-[#F4EFE6] dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center rounded-xl shadow-2xs">
                <Building2 className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Belum ada properti baru yang dipublikasikan.</p>
              </Card>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
                  {latestProperties.map((prop) => {
                    const isRent =
                      prop.listing_type === "sewa" ||
                      prop.listing_type === "disewa" ||
                      prop.listing_type === "rent";

                    return (
                      <Card
                        key={prop.id}
                        onClick={() => router.push(`/properties/${prop.id}`)}
                        className="group border border-[#F4EFE6] dark:border-slate-800 hover:border-emerald-600/60 dark:hover:border-emerald-500/60 bg-white dark:bg-slate-900 rounded-xl overflow-hidden shadow-2xs hover:shadow-md transition-all duration-300 cursor-pointer flex flex-col justify-between"
                      >
                        <div>
                          {/* FOTO PROPERTI DENGAN WATERMARK INLAND PROPERTY */}
                          <div className="relative aspect-[16/10] bg-[#F4EFE6] dark:bg-slate-800 overflow-hidden">
                            <WatermarkedImage
                              src={prop.thumbnail}
                              alt={prop.title}
                              className="w-full h-full"
                              imageClassName="group-hover:scale-105 transition-transform duration-500"
                              watermarkOpacity={0.6}
                              watermarkSize="w-1/3"
                            />

                            <div className="absolute top-1.5 left-1.5 z-10">
                              <Badge
                                className={cn(
                                  "text-[8px] font-bold px-1.5 py-0.5 uppercase tracking-wide text-white border-0 rounded",
                                  isRent ? "bg-slate-800 dark:bg-slate-700" : "bg-emerald-600"
                                )}
                              >
                                {isRent ? "SEWA" : "DIJUAL"}
                              </Badge>
                            </div>

                            <div className="absolute bottom-1.5 right-1.5 z-10">
                              <span className="text-[8.5px] font-mono font-medium text-slate-700 dark:text-slate-300 bg-white/95 dark:bg-slate-900/95 px-1 py-0.5 rounded border border-[#F4EFE6] dark:border-slate-800">
                                {prop.listing_code}
                              </span>
                            </div>
                          </div>

                          {/* Informasi Properti */}
                          <CardContent className="p-2.5 space-y-1">
                            <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 leading-none pt-0.5">
                              {formatIDR(prop.price)}
                            </div>

                            <div className="flex items-center justify-between gap-1.5 pt-0.5">
                              <h3 
                                className="font-semibold text-[11px] leading-tight text-slate-900 dark:text-white truncate flex-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors"
                                title={prop.title}
                              >
                                {prop.title}
                              </h3>

                              <Badge variant="outline" className="text-[8px] font-bold px-1.5 py-0.2 shrink-0 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 flex items-center gap-0.5 rounded-md">
                                <Building2 className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                                <span>{prop.category}</span>
                              </Badge>
                            </div>

                            <p className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 truncate">
                              <MapPin className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                              {prop.location}
                            </p>

                            {/* SPESIFIKASI: KT/KM (KIRI) vs LB/LT (KANAN) */}
                            <div className="flex items-center justify-between pt-1.5 text-[9px] text-slate-600 dark:text-slate-300 font-medium border-t border-[#F4EFE6] dark:border-slate-800">
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="flex items-center gap-0.5" title="Kamar Tidur">
                                  <Bed className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                  {prop.bedrooms || 0} KT
                                </span>
                                <span className="flex items-center gap-0.5" title="Kamar Mandi">
                                  <Bath className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                  {prop.bathrooms || 0} KM
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0 text-slate-500 dark:text-slate-400">
                                <span className="flex items-center gap-0.5" title="Luas Bangunan">
                                  <Maximize2 className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                  LB {prop.building_area || 0}m²
                                </span>
                                <span className="flex items-center gap-0.5" title="Luas Tanah">
                                  <Ruler className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                  LT {prop.land_area || 0}m²
                                </span>
                              </div>
                            </div>

                            {/* PROFIL AGEN + WHATSAPP */}
                            <div className="flex items-center justify-between gap-1.5 pt-1.5 border-t border-[#F4EFE6] dark:border-slate-800 mt-0.5">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <div className="w-4 h-4 rounded-full overflow-hidden bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center text-[8px] font-bold text-emerald-700 dark:text-emerald-300 shrink-0">
                                  {prop.agent_avatar ? (
                                    <img
                                      src={prop.agent_avatar}
                                      alt={prop.agent_name}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        (e.target as HTMLElement).style.display = "none";
                                      }}
                                    />
                                  ) : (
                                    <User className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                                  )}
                                </div>
                                <span className="text-[9.5px] font-medium text-slate-600 dark:text-slate-300 truncate">
                                  {prop.agent_name}
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={(e) => handleWhatsAppClick(e, prop)}
                                className="w-5 h-5 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs transition-transform hover:scale-110 cursor-pointer"
                                title="Hubungi WhatsApp (Catat ke CRM)"
                              >
                                <svg className="w-2.5 h-2.5 fill-current" viewBox="0 0 24 24">
                                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.285-.143-1.687-.833-1.947-.928-.26-.095-.45-.143-.639.143-.19.286-.736.928-.903 1.118-.167.19-.333.214-.618.071-.285-.143-1.207-.445-2.299-1.419-.85-.759-1.424-1.697-1.591-1.983-.167-.286-.018-.44.125-.582.129-.128.285-.333.428-.5.143-.167.19-.286.285-.476.095-.19.048-.357-.024-.5-.071-.143-.639-1.537-.876-2.106-.23-.554-.464-.479-.639-.488-.165-.008-.356-.01-.547-.01-.19 0-.5.071-.761.357-.26.286-1 .976-1 2.381 0 1.405 1.023 2.762 1.166 2.952.143.19 2.013 3.074 4.877 4.311.681.294 1.213.47 1.627.601.684.217 1.307.186 1.8.113.55-.082 1.687-.69 1.925-1.357.238-.667.238-1.238.167-1.357-.07-.119-.26-.19-.545-.333z"/>
                                </svg>
                              </button>
                            </div>
                          </CardContent>
                        </div>
                      </Card>
                    );
                  })}
                </div>

                <div className="pt-2">
                  <Button
                    onClick={() => router.push("/properties")}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9 rounded-xl gap-2 shadow-2xs transition-all cursor-pointer"
                  >
                    <span>Lihat Semua Katalog Properti</span>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </section>

          {/* 🚧 SECTION 3: PROYEK INLAND (COMING SOON) */}
          <section className="space-y-3">
            <div className="flex items-center justify-between border-b border-[#F4EFE6] dark:border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <FolderKanban className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Proyek Inland
                </h2>
                <Badge variant="outline" className="text-[9px] bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 font-semibold gap-1">
                  <Lock className="w-2.5 h-2.5" /> Segera Hadir
                </Badge>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleProyekInlandClick}
                className="text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 gap-1 rounded-lg cursor-pointer h-7"
              >
                Lihat Proyek <Lock className="w-3 h-3" />
              </Button>
            </div>

            <div 
              onClick={handleProyekInlandClick}
              className="relative rounded-2xl border border-[#F4EFE6] dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-6 overflow-hidden cursor-pointer group shadow-2xs hover:border-emerald-600/40 transition-all duration-300"
            >
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 opacity-40 blur-[2px] pointer-events-none select-none">
                {[...Array(4)].map((_, idx) => (
                  <Card key={idx} className="border border-[#F4EFE6] dark:border-slate-800 bg-slate-50 dark:bg-slate-800 rounded-xl overflow-hidden">
                    <div className="h-20 bg-slate-300 dark:bg-slate-700" />
                    <CardContent className="p-2 space-y-1">
                      <div className="h-2.5 bg-slate-300 dark:bg-slate-700 rounded w-3/4" />
                      <div className="h-2 bg-slate-200 dark:bg-slate-600 rounded w-1/2" />
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/60 to-slate-900/40 flex flex-col items-center justify-center text-center p-6 space-y-3 z-10 backdrop-blur-[1px]">
                <div className="w-12 h-12 rounded-full bg-white/10 border border-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Lock className="w-5 h-5 text-amber-400" />
                </div>
                <div className="space-y-1 max-w-md">
                  <h3 className="text-sm sm:text-base font-bold text-white tracking-wide">
                    Katalog Proyek Terintegrasi Inland
                  </h3>
                  <p className="text-xs text-slate-200 font-medium leading-relaxed">
                    Fitur manajemen & penawaran proyek perumahan/komersial eksklusif sedang dalam tahap penyelesaian.
                  </p>
                </div>
                <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white border-0 text-[10px] font-semibold uppercase tracking-wider px-3 py-1 shadow-md">
                  Pengembangan Fitur (Coming Soon)
                </Badge>
              </div>
            </div>
          </section>

          {/* AI EXECUTIVE SUMMARY */}
          {canSeeAiSummary && (
            <Card className="border border-[#F4EFE6] dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs rounded-xl">
              <CardHeader className="p-3.5 pb-2 flex flex-row items-center justify-between border-b border-[#F4EFE6] dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-emerald-600 text-white rounded-lg">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <CardTitle className="text-xs font-bold text-slate-900 dark:text-white">
                      AI Executive Summary
                    </CardTitle>
                    <CardDescription className="text-[11px] text-slate-500 dark:text-slate-400">
                      Ringkasan Analitik Sistem
                    </CardDescription>
                  </div>
                </div>

                {isSuperAdmin && (
                  <div className="flex items-center gap-1.5 bg-[#F4EFE6]/60 dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-[#F4EFE6] dark:border-slate-700">
                    <Power className={cn("w-3 h-3", aiEnabled ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400")} />
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
                        aiEnabled ? "bg-emerald-600 text-white" : "bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                      )}
                    >
                      {togglingAi ? "..." : (aiEnabled ? "ON" : "OFF")}
                    </button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="p-3.5 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                {loadingAiSummary ? (
                  <div className="flex items-center gap-2 text-slate-400 animate-pulse py-1">
                    <RefreshCw className="w-3 h-3 animate-spin text-emerald-600 dark:text-emerald-400" />
                    <span>Merangkum analisis sistem...</span>
                  </div>
                ) : (
                  aiSummary
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* KOLOM SAMPING (KHUSUS AGEN) */}
        {isAgent && (
          <div className="lg:col-span-4 space-y-6">
            <Card className="border border-[#F4EFE6] dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs rounded-xl">
              <CardHeader className="p-3.5 border-b border-[#F4EFE6] dark:border-slate-800">
                <CardTitle className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Leads Perlu Follow-Up
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 space-y-2 text-xs">
                {loadingLeads ? (
                  <p className="text-center py-4 text-slate-400">Memuat prospek...</p>
                ) : agentFollowUpLeads.length > 0 ? (
                  agentFollowUpLeads.map((lead) => (
                    <div key={lead.id} className="p-2.5 border border-[#F4EFE6] dark:border-slate-800 rounded-lg space-y-1.5 bg-[#FDFBF7] dark:bg-slate-800/50">
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">{lead.name}</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">{lead.property}</p>
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
    <div className="space-y-6 pb-12 max-w-7xl mx-auto px-4 sm:px-6 bg-[#FDFBF7] dark:bg-slate-950 min-h-screen">
      <Skeleton className="h-20 w-full rounded-xl bg-[#F4EFE6] dark:bg-slate-800" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl bg-[#F4EFE6] dark:bg-slate-800" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Skeleton className="lg:col-span-8 h-80 rounded-xl bg-[#F4EFE6] dark:bg-slate-800" />
        <Skeleton className="lg:col-span-4 h-80 rounded-xl bg-[#F4EFE6] dark:bg-slate-800" />
      </div>
    </div>
  );
}