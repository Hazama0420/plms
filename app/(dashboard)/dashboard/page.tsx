// app/(dashboard)/dashboard/page.tsx
"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Building2,
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
  Heart,
  BadgeCheck,
  User,
  Home,
  TreePine,
} from "lucide-react";

import { supabase } from "@/lib/supabase/client";
import { formatLocationShort } from "@/lib/property-address";
import { dashboardService, type DashboardStats } from "@/services/dashboard.service";
import { DashboardPropertySearch } from "@/components/dashboard/DashboardPropertySearch";
import { WatermarkedImage } from "@/components/ui/WatermarkedImage";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { DashboardAgendaPanel } from "@/components/dashboard/DashboardAgendaPanel";
import type { Survey } from "@/types/survey.types";

type UserRole = "super_admin" | "superadmin" | "admin" | "agent" | "commissioner" | "viewer";
type FeaturedFilter = "semua" | "rumah" | "tanah" | "gudang";

interface LeadFollowUpItem {
  id: string;
  name: string;
  property: string;
  phone: string;
  status: string | null;
  created_at: string | null;
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
  building_area: number | null;
  land_area: number | null;
  thumbnail: string;
  agent_name: string;
  agent_avatar: string | null;
  agent_phone: string | null;
}

interface AgentItem {
  id: string;
  full_name: string;
  avatar_url: string | null;
  role: string;
  bio: string | null;
  arebi_number: string | null;
}

const DEFAULT_FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80";

const capitalizeWords = (str: string) => {
  if (!str) return "";
  return str.toLowerCase().split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
};

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
  const agentFirstName = rawAgentName.trim();
  const agentAvatar = agentObj?.avatar_url || agentObj?.photo_url || agentObj?.avatar || p.agent_avatar || null;
  const agentPhone = agentObj?.phone || agentObj?.whatsapp || p.agent_phone || p.phone || null;

  const rawCategory = p.category || p.property_type || p.type || "Rumah";
  const categoryName = typeof rawCategory === "string" ? capitalizeWords(rawCategory) : "Rumah";

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
    priceVal = priceObj.selling_price || priceObj.rental_price || priceObj.price || priceObj.amount || null;
  }

  const locationText = formatLocationShort(addrObj) || p.location || "Lokasi Terverifikasi";
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
    thumbnail,
    agent_name: agentFirstName,
    agent_avatar: agentAvatar,
    agent_phone: agentPhone,
  };
};

const formatIDR = (val?: number | null) => {
  if (!val) return "Hubungi Agen";
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);
};

// ─── Property Card Component ────────────────────────────────────────────────
function PropertyCard({
  prop,
  featured,
  onClick,
}: {
  prop: PropertyItem;
  featured?: boolean;
  onClick: () => void;
}) {
  const isRent = prop.listing_type === "sewa" || prop.listing_type === "disewa" || prop.listing_type === "rent";

  return (
    <Card
      onClick={onClick}
      className="group border border-slate-200/80 dark:border-slate-700/80 hover:border-emerald-500/60 dark:hover:border-emerald-500/40 bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 cursor-pointer flex flex-col hover:-translate-y-1"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <WatermarkedImage
          src={prop.thumbnail}
          alt={prop.title}
          className="w-full h-full"
          imageClassName="group-hover:scale-[1.04] transition-transform duration-700"
          watermarkOpacity={0.5}
          watermarkSize="w-1/3"
        />

        {/* Badges top-left */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 z-10">
          {featured && (
            <Badge className="bg-amber-500 text-white border-0 text-[9px] font-bold px-2 py-0.5 gap-1 shadow-sm rounded-full">
              <Star className="w-2.5 h-2.5 fill-white" /> Unggulan
            </Badge>
          )}
          <Badge
            className={cn(
              "text-[9px] font-bold px-2 py-0.5 uppercase text-white border-0 rounded-full shadow-sm",
              isRent ? "bg-slate-700 dark:bg-slate-600" : "bg-emerald-600"
            )}
          >
            {isRent ? "Sewa" : "Jual"}
          </Badge>
        </div>

        {/* Favorite button top-right */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); }}
          className="absolute top-2.5 right-2.5 z-10 w-7 h-7 rounded-full bg-white/90 dark:bg-slate-800/90 flex items-center justify-center shadow-sm hover:bg-white dark:hover:bg-slate-700 transition-colors"
          title="Simpan ke favorit"
        >
          <Heart className="w-3.5 h-3.5 text-slate-400 hover:text-rose-500 transition-colors" />
        </button>
      </div>

      {/* Content */}
      <CardContent className="p-3.5 flex flex-col gap-2 flex-1">
        {/* Title */}
        <h3 className="font-semibold text-sm leading-snug text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-2">
          {prop.title}
        </h3>

        {/* Location */}
        <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 truncate">
          <MapPin className="w-3 h-3 text-emerald-500 shrink-0" />
          {prop.location}
        </p>

        {/* Price */}
        <p className="text-base font-bold text-emerald-600 dark:text-emerald-400 leading-none">
          {formatIDR(prop.price)}
        </p>

        {/* Specs */}
        <div className="flex items-center gap-2.5 text-[10px] text-slate-500 dark:text-slate-400 font-medium flex-wrap">
          <span className="flex items-center gap-1">
            <Bed className="w-3 h-3 text-emerald-500 shrink-0" />
            {prop.bedrooms ?? 0} KT
          </span>
          <span className="flex items-center gap-1">
            <Bath className="w-3 h-3 text-emerald-500 shrink-0" />
            {prop.bathrooms ?? 0} KM
          </span>
          <span className="flex items-center gap-1">
            <Maximize2 className="w-3 h-3 text-emerald-500 shrink-0" />
            LB {prop.building_area ?? 0}m²
          </span>
          <span className="flex items-center gap-1">
            <Ruler className="w-3 h-3 text-emerald-500 shrink-0" />
            LT {prop.land_area ?? 0}m²
          </span>
        </div>

        {/* Divider */}
        <div className="border-t border-slate-100 dark:border-slate-800 mt-auto pt-2.5" />

        {/* Agent row */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-full overflow-hidden bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center shrink-0">
            {prop.agent_avatar ? (
              <img src={prop.agent_avatar} alt={prop.agent_name} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLElement).style.display = "none"; }} />
            ) : (
              <User className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            )}
          </div>
          <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300 truncate">
            {prop.agent_name}
          </span>
          <BadgeCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Agent Carousel Component ─────────────────────────────────────────────────
const CAROUSEL_VISIBLE = 5;

function getCarouselSlots(agents: AgentItem[], activeIdx: number) {
  const n = agents.length;
  if (n === 0) return [];
  if (n <= CAROUSEL_VISIBLE) {
    return agents.map((agent, i) => ({
      agent,
      distance: Math.abs(i - activeIdx),
      key: `${agent.id}-${i}`,
    }));
  }
  const half = Math.floor(CAROUSEL_VISIBLE / 2);
  return Array.from({ length: CAROUSEL_VISIBLE }, (_, slot) => {
    const offset = slot - half;
    const idx = ((activeIdx + offset) % n + n) % n;
    return { agent: agents[idx], distance: Math.abs(offset), key: `${agents[idx].id}-${slot}` };
  });
}

function AgentCarousel({ agents, loading }: { agents: AgentItem[]; loading: boolean }) {
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    if (agents.length < 2) return;
    const id = setInterval(() => setActiveIdx((p) => (p + 1) % agents.length), 3500);
    return () => clearInterval(id);
  }, [agents.length]);

  const sectionTitle = (
    <div className="text-center py-1">
      <h2 className="font-serif text-xl font-bold tracking-wide text-slate-900 dark:text-white">
        Our Team
      </h2>
      <div className="mx-auto mt-1.5 flex items-center justify-center gap-2">
        <span className="h-px w-8 bg-emerald-500/50 rounded-full" />
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        <span className="h-px w-8 bg-emerald-500/50 rounded-full" />
      </div>
    </div>
  );

  if (loading) {
    return (
      <section className="space-y-4 fade-in-up-5">
        {sectionTitle}
        <div className="flex items-center justify-center gap-2 py-4">
          {[2, 1, 0, 1, 2].map((d, i) => (
            <div key={i} className={cn(
              "shrink-0 rounded-2xl border animate-pulse",
              d === 0 ? "w-44 h-52 border-emerald-500/30" : d === 1 ? "w-28 h-40 opacity-60 border-slate-200 dark:border-slate-700" : "w-20 h-32 opacity-30 border-slate-100 dark:border-slate-800"
            )} />
          ))}
        </div>
      </section>
    );
  }

  if (agents.length === 0) {
    return (
      <section className="space-y-4 fade-in-up-5">
        {sectionTitle}
        <p className="text-center py-6 text-slate-400 dark:text-slate-500 text-sm">
          Belum ada anggota tim terdaftar.
        </p>
      </section>
    );
  }

  const n = agents.length;
  const slots = getCarouselSlots(agents, activeIdx);

  return (
    <section className="space-y-3 fade-in-up-5">
      {sectionTitle}

      {/* Carousel — fixed spotlight frame in center, cards slide through */}
      <div className="relative">
        {/* Center spotlight frame — always fixed */}
        <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 w-44 h-[calc(100%-8px)] rounded-2xl ring-2 ring-emerald-500/50 shadow-lg shadow-emerald-500/15 z-20" />

        <div className="flex items-center justify-center gap-2 py-3 overflow-hidden px-2">
          {slots.map(({ agent, distance, key }) => {
            const isCenter = distance === 0;
            const isAdmin = agent.role === "admin";
            const subtitle = isAdmin ? "Principal Inland Property" : "Agen Inland Property";
            return (
              <div
                key={key}
                onClick={() => {
                  const realIdx = agents.findIndex((a) => a.id === agent.id);
                  if (realIdx !== -1) setActiveIdx(realIdx);
                }}
                className={cn(
                  "shrink-0 rounded-2xl p-3 text-center cursor-pointer border transition-all duration-500 select-none relative",
                  isCenter
                    ? "w-44 bg-white dark:bg-slate-800 border-emerald-500/50 shadow-xl shadow-emerald-500/15 opacity-100 scale-105 z-10"
                    : distance === 1
                    ? "w-28 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 opacity-65 scale-95 hover:opacity-80"
                    : "w-20 bg-white/70 dark:bg-slate-900/60 border-slate-100 dark:border-slate-800 opacity-30 scale-90 hover:opacity-45"
                )}
              >
                {/* Avatar */}
                <div className={cn(
                  "mx-auto rounded-full overflow-hidden flex items-center justify-center border-2 bg-emerald-50 dark:bg-emerald-950/30",
                  isCenter ? "w-16 h-16 border-emerald-400/60 mb-3" : distance === 1 ? "w-11 h-11 border-slate-200 dark:border-slate-700 mb-2" : "w-9 h-9 border-slate-100 dark:border-slate-800 mb-1.5"
                )}>
                  {agent.avatar_url ? (
                    <img src={agent.avatar_url} alt={agent.full_name} className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLElement).style.display = "none"; }} />
                  ) : (
                    <User className={cn("text-emerald-600 dark:text-emerald-400", isCenter ? "w-7 h-7" : distance === 1 ? "w-5 h-5" : "w-4 h-4")} />
                  )}
                </div>

                {/* Name */}
                <p className={cn(
                  "font-bold leading-tight text-slate-900 dark:text-white",
                  isCenter ? "text-sm" : distance === 1 ? "text-[10px] truncate" : "text-[9px] truncate"
                )}>
                  {agent.full_name}
                </p>

                {/* Subtitle */}
                <p className={cn(
                  "text-slate-500 dark:text-slate-400 mt-0.5 leading-tight",
                  isCenter ? "text-[10px]" : distance === 1 ? "text-[9px] truncate" : "text-[8px] truncate"
                )}>
                  {subtitle}
                </p>

                {/* AREBI — only center, full display */}
                {isCenter && agent.arebi_number && (
                  <p className="mt-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-semibold leading-tight">
                    {agent.arebi_number}
                  </p>
                )}

                {/* Bio — only center */}
                {isCenter && agent.bio && (
                  <p className="mt-1.5 text-[9px] text-slate-400 dark:text-slate-500 line-clamp-2 leading-tight px-1">
                    {agent.bio}
                  </p>
                )}

                {/* Badge — only center */}
                {isCenter && (
                  <div className="mt-2 flex items-center justify-center gap-1">
                    <BadgeCheck className="w-3 h-3 text-emerald-500" />
                    <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold">Terverifikasi</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Dot indicators */}
      <div className="flex items-center justify-center gap-1.5">
        {agents.map((_, i) => (
          <button key={i} type="button" onClick={() => setActiveIdx(i)}
            className={cn("rounded-full transition-all duration-300",
              i === activeIdx ? "w-4 h-1.5 bg-emerald-600" : "w-1.5 h-1.5 bg-slate-300 dark:bg-slate-600 hover:bg-emerald-400"
            )}
          />
        ))}
      </div>
    </section>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [userRole, setUserRole] = useState<UserRole>("viewer");

  const [featuredProperties, setFeaturedProperties] = useState<PropertyItem[]>([]);
  const [loadingFeatured, setLoadingFeatured] = useState<boolean>(true);
  const [featuredFilter, setFeaturedFilter] = useState<FeaturedFilter>("semua");

  const [latestProperties, setLatestProperties] = useState<PropertyItem[]>([]);
  const [loadingLatest, setLoadingLatest] = useState<boolean>(true);

  const [agentFollowUpLeads, setAgentFollowUpLeads] = useState<LeadFollowUpItem[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [upcomingSurveys, setUpcomingSurveys] = useState<Survey[]>([]);
  const [loadingSurveys, setLoadingSurveys] = useState(false);

  const [agents, setAgents] = useState<AgentItem[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(true);

  const isSuperAdmin = userRole === "super_admin" || userRole === "superadmin";
  const isAdmin = userRole === "admin" || isSuperAdmin;
  const isAgent = userRole === "agent";
  const canSeeAdminManagement = isAdmin;
  const canAccessInvoice = isLoggedIn && (isSuperAdmin || isAdmin || isAgent);
  const canSeeAgenda = isLoggedIn && (isAgent || isAdmin);

  const handleProyekInlandClick = () => {
    toast.info("Fitur Proyek Inland Segera Hadir!", {
      description: "Halaman katalog proyek & perumahan eksklusif Inland sedang dikembangkan.",
    });
  };

  const loadDashboardData = useCallback(async (loggedIn: boolean, role: UserRole) => {
    setLoadingLeads(true);
    setLoadingFeatured(true);
    setLoadingLatest(true);
    setLoadingAgents(true);

    try {
      if (loggedIn) {
        const dataStats = await dashboardService.getStats();
        setStats(dataStats);
      }

      const [featuredResult, latestResult, agentsJson] = await Promise.all([
        supabase
          .from("properties")
          .select(`*, address:property_address(*), price:property_price(*), specifications:property_specifications(*), building:property_building(*), land:property_land(*), media:property_media(*), agent:users!assigned_to(full_name, avatar_url)`)
          .eq("status", "published")
          .eq("is_featured", true)
          .order("created_at", { ascending: false })
          .limit(6),
        supabase
          .from("properties")
          .select(`*, address:property_address(*), price:property_price(*), specifications:property_specifications(*), building:property_building(*), land:property_land(*), media:property_media(*), agent:users!assigned_to(full_name, avatar_url)`)
          .eq("status", "published")
          .order("created_at", { ascending: false })
          .limit(6),
        fetch("/api/agents/public")
          .then((r) => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.json();
          })
          .catch((err) => {
            console.error("[dashboard] Gagal memuat data agen:", err);
            return { data: [] };
          }),
      ]);

      if (featuredResult.error) {
        console.error("[dashboard] Gagal memuat properti unggulan:", featuredResult.error);
      } else {
        setFeaturedProperties(featuredResult.data?.map(formatPropertyItem) ?? []);
      }

      if (latestResult.error) {
        console.error("[dashboard] Gagal memuat properti terbaru:", latestResult.error);
      } else {
        setLatestProperties(latestResult.data?.map(formatPropertyItem) ?? []);
      }

      setAgents((agentsJson.data ?? []) as AgentItem[]);
      setLoadingAgents(false);

      const canSeeLeads = loggedIn && ["agent", "admin", "super_admin", "superadmin"].includes(role);
      if (canSeeLeads) {
        const { data: leadsData } = await supabase
          .from("crm_leads")
          .select(`id, status, interest_type, created_at, crm_contacts(full_name, phone)`)
          .order("created_at", { ascending: false })
          .limit(4);

        setAgentFollowUpLeads(
          (leadsData ?? []).map((lead: any) => {
            const contact = Array.isArray(lead.crm_contacts) ? lead.crm_contacts[0] || {} : lead.crm_contacts || {};
            return { id: lead.id, name: contact.full_name || "Calon Pembeli", property: lead.interest_type || "Properti Pilihan", phone: contact.phone || "#", status: lead.status ?? null, created_at: lead.created_at ?? null };
          })
        );

        setLoadingSurveys(true);
        try {
          const res = await fetch("/api/surveys");
          const json = res.ok ? await res.json() : { data: [] };
          const now = Date.now();
          setUpcomingSurveys(((json.data ?? []) as Survey[]).filter((s) => s.status === "scheduled" && new Date(s.scheduled_at).getTime() >= now));
        } catch (surveyError) {
          console.error("Gagal memuat jadwal survei:", surveyError);
          setUpcomingSurveys([]);
        } finally {
          setLoadingSurveys(false);
        }
      } else {
        setAgentFollowUpLeads([]);
        setUpcomingSurveys([]);
      }
    } catch (error) {
      console.error("Gagal memuat data dashboard:", error);
      setFeaturedProperties([]);
      setLatestProperties([]);
      setLoadingAgents(false);
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
          const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).maybeSingle();
          activeRole = ((profile?.role || user.user_metadata?.role || "viewer") as string).toLowerCase() as UserRole;
          if (isMounted) setUserRole(activeRole);
        } else {
          if (isMounted) { setIsLoggedIn(false); setUserRole("viewer"); }
        }
        await loadDashboardData(!!user, activeRole);
        if (isMounted) setLoading(false);
      } catch (err) {
        console.error("Gagal inisialisasi:", err);
        if (isMounted) setLoading(false);
      }
    }
    initDashboard();
    return () => { isMounted = false; };
  }, [loadDashboardData]);

  // Filtered featured properties
  const filteredFeatured = featuredProperties
    .filter((p) => featuredFilter === "semua" || (p.category || "").toLowerCase().includes(featuredFilter));

  if (loading) return <DashboardLoadingSkeleton />;

  return (
    <div className="space-y-5 pb-16 max-w-7xl mx-auto px-3 sm:px-6 bg-[#FDFBF7] dark:bg-slate-950 min-h-screen text-slate-900 dark:text-slate-100 transition-colors">

      {/* 🔍 1. HERO SEARCH */}
      <section className="relative rounded-2xl sm:rounded-3xl overflow-hidden text-white border border-white/20 shadow-xl fade-in-up">
        <div className="absolute inset-0 bg-cover bg-center bg-no-repeat pointer-events-none" style={{ backgroundImage: "url('/bg-header.webp')" }} />
        <div className="relative z-10 p-5 sm:p-8 md:p-10 space-y-3 sm:space-y-4 max-w-2xl text-left">
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight drop-shadow-lg">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-300">
              Langkah Cerdas, Miliki Properti Impian Anda
            </span>
          </h2>
          <div className="pt-2 w-full">
            <Suspense fallback={<div className="h-11 rounded-xl bg-white/10 animate-pulse" />}>
              <DashboardPropertySearch />
            </Suspense>
          </div>
        </div>
      </section>

      {/* 🟢 3. BENTO GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* KOLOM UTAMA */}
        <div className={cn("space-y-6", canSeeAgenda ? "lg:col-span-8" : "lg:col-span-12")}>

          {/* ⭐ PROPERTI UNGGULAN */}
          <section className="space-y-3.5 fade-in-up-1">
            {/* Heading */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="p-1 bg-amber-500/10 border border-amber-500/20 rounded-md">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                </div>
                <h2 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-emerald-950 dark:text-emerald-400">
                  Properti Unggulan (Favorit)
                </h2>
              </div>
              <Button variant="ghost" size="sm" onClick={() => router.push("/properties?featured=true")} className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 hover:bg-emerald-600/10 rounded-lg cursor-pointer h-7">
                Lihat Semua <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>

            {/* Filter tabs */}
            <div className="flex items-center gap-2 flex-wrap">
              {(["semua", "rumah", "tanah"] as FeaturedFilter[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFeaturedFilter(f)}
                  className={cn(
                    "flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all duration-200 cursor-pointer capitalize",
                    featuredFilter === f
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                      : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-500 hover:text-emerald-600"
                  )}
                >
                  {f === "semua" && <span className="w-2 h-2 rounded-full bg-current" />}
                  {f === "rumah" && <Home className="w-3 h-3" />}
                  {f === "tanah" && <TreePine className="w-3 h-3" />}
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>

            {/* Grid */}
            {loadingFeatured ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-72 w-full rounded-2xl bg-[#F4EFE6] dark:bg-slate-800" />)}
              </div>
            ) : filteredFeatured.length === 0 ? (
              <Card className="border border-[#F4EFE6] dark:border-slate-800 bg-white dark:bg-slate-900 p-6 text-center rounded-xl shadow-2xs">
                <Star className="w-7 h-7 text-amber-400 mx-auto mb-2 opacity-50" />
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Belum ada properti unggulan yang sesuai.</p>
              </Card>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {filteredFeatured.map((prop) => (
                  <PropertyCard
                    key={prop.id}
                    prop={prop}
                    featured
                    onClick={() => router.push(`/properties/${prop.id}`)}
                  />
                ))}
              </div>
            )}
          </section>

          {/* 🆕 PROPERTI TERBARU */}
          <section className="space-y-3.5 fade-in-up-2">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="p-1 bg-emerald-600/10 border border-emerald-600/20 rounded-md">
                  <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h2 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-emerald-950 dark:text-emerald-400">
                  Properti Terbaru
                </h2>
              </div>
              <Button variant="ghost" size="sm" onClick={() => router.push("/properties")} className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 hover:bg-emerald-600/10 rounded-lg cursor-pointer h-7">
                Lihat Semua <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>

            {loadingLatest ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-72 w-full rounded-2xl bg-[#F4EFE6] dark:bg-slate-800" />)}
              </div>
            ) : latestProperties.length === 0 ? (
              <Card className="border border-[#F4EFE6] dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center rounded-xl shadow-2xs">
                <Building2 className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Belum ada properti baru yang dipublikasikan.</p>
              </Card>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {latestProperties.map((prop) => (
                    <PropertyCard
                      key={prop.id}
                      prop={prop}
                      onClick={() => router.push(`/properties/${prop.id}`)}
                    />
                  ))}
                </div>
                <Button onClick={() => router.push("/properties")} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9 rounded-xl gap-2 shadow-2xs transition-all cursor-pointer">
                  <span>Lihat Semua Katalog Properti</span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </section>

          {/* 🚧 PROYEK INLAND */}
          <section className="space-y-3 fade-in-up-3">
            <div className="flex items-center justify-between border-b border-[#F4EFE6] dark:border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <FolderKanban className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">Proyek Inland</h2>
                <Badge variant="outline" className="text-[9px] bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 font-semibold gap-1">
                  <Lock className="w-2.5 h-2.5" /> Segera Hadir
                </Badge>
              </div>
              <Button variant="ghost" size="sm" onClick={handleProyekInlandClick} className="text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 gap-1 rounded-lg cursor-pointer h-7">
                Lihat Proyek <Lock className="w-3 h-3" />
              </Button>
            </div>

            <div onClick={handleProyekInlandClick} className="relative rounded-2xl border border-[#F4EFE6] dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-6 overflow-hidden cursor-pointer group shadow-2xs hover:border-emerald-600/40 transition-all duration-300">
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
                  <h3 className="text-sm sm:text-base font-bold text-white tracking-wide">Katalog Proyek Terintegrasi Inland</h3>
                  <p className="text-xs text-slate-200 font-medium leading-relaxed">Fitur manajemen & penawaran proyek perumahan/komersial eksklusif sedang dalam tahap penyelesaian.</p>
                </div>
                <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white border-0 text-[10px] font-semibold uppercase tracking-wider px-3 py-1 shadow-md">
                  Pengembangan Fitur (Coming Soon)
                </Badge>
              </div>
            </div>
          </section>

          {/* 👥 AGEN INLAND PROPERTY */}
          <AgentCarousel agents={agents} loading={loadingAgents} />
        </div>

        {/* KOLOM SAMPING — AGENDA STAFF */}
        {canSeeAgenda && (
          <div className="lg:col-span-4 space-y-6 order-first lg:order-none">
            <DashboardAgendaPanel
              leads={agentFollowUpLeads}
              surveys={upcomingSurveys}
              loadingLeads={loadingLeads}
              loadingSurveys={loadingSurveys}
            />
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
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl bg-[#F4EFE6] dark:bg-slate-800" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Skeleton className="lg:col-span-8 h-80 rounded-xl bg-[#F4EFE6] dark:bg-slate-800" />
        <Skeleton className="lg:col-span-4 h-80 rounded-xl bg-[#F4EFE6] dark:bg-slate-800" />
      </div>
    </div>
  );
}
