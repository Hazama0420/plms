// app/(dashboard)/dashboard/page.tsx
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { formatLocationShort } from "@/lib/property-address";
import {
  dashboardService,
  type DashboardStats,
} from "@/services/dashboard.service";
import { Skeleton } from "@/components/ui/skeleton";
import type { Survey } from "@/types/survey.types";

import {
  AdminDashboardView,
  AgentDashboardView,
  ViewerDashboardView,
  type DashboardPropertyItem,
  type PropertyCategoryFilter,
  type DashboardLeadItem,
} from "@/components/dashboard";

type UserRole =
  | "super_admin"
  | "superadmin"
  | "admin"
  | "agent"
  | "commissioner"
  | "marketing"
  | "viewer";

const DEFAULT_FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&q=85";

const capitalizeWords = (str: string) => {
  if (!str) return "";
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const formatPropertyItem = (p: any): DashboardPropertyItem => {
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
  const agentAvatar = agentObj?.avatar_url || agentObj?.photo_url || agentObj?.avatar || p.agent_avatar || null;
  const agentPhone = agentObj?.phone || agentObj?.whatsapp || p.agent_phone || p.phone || null;

  const rawCategory = p.category || p.property_type || p.type || "Rumah";
  const categoryName = typeof rawCategory === "string" ? capitalizeWords(rawCategory) : "Rumah";

  let thumbnail = DEFAULT_FALLBACK_IMAGE;
  if (mediaArr.length > 0) {
    const primary = mediaArr.find((media: any) => media.is_primary) || mediaArr[0];
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

  return {
    id: p.id,
    title: p.title || "Properti Inland",
    listing_code: p.listing_code || p.code || `INL-${p.id?.slice(0, 4)?.toUpperCase() || "000"}`,
    listing_type: p.listing_type || "jual",
    category: categoryName,
    price: priceVal,
    location: locationText,
    bedrooms: specObj?.bedroom ?? specObj?.bedrooms ?? p.bedrooms ?? null,
    bathrooms: specObj?.bathroom ?? specObj?.bathrooms ?? p.bathrooms ?? null,
    building_area: bldObj?.building_area ?? specObj?.building_area ?? p.building_area ?? null,
    land_area: landObj?.land_area ?? specObj?.land_area ?? p.land_area ?? null,
    thumbnail,
    agent_name: rawAgentName.trim(),
    agent_avatar: agentAvatar,
    agent_phone: agentPhone,
    slug: p.slug || undefined,
  };
};

export default function DashboardPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [userRole, setUserRole] = useState<UserRole>("viewer");
  const [stats, setStats] = useState<DashboardStats | null>(null);

  const [featuredProperties, setFeaturedProperties] = useState<DashboardPropertyItem[]>([]);
  const [latestProperties, setLatestProperties] = useState<DashboardPropertyItem[]>([]);
  const [loadingFeatured, setLoadingFeatured] = useState(true);
  const [loadingLatest, setLoadingLatest] = useState(true);

  const [featuredFilter, setFeaturedFilter] = useState<PropertyCategoryFilter>("semua");
  const [recentLeads, setRecentLeads] = useState<DashboardLeadItem[]>([]);
  const [upcomingSurveys, setUpcomingSurveys] = useState<Survey[]>([]);
  const [agents, setAgents] = useState<any[]>([]);

  // Load dashboard data
  const loadDashboardData = useCallback(async (role: UserRole, userId?: string) => {
    setLoadingFeatured(true);
    setLoadingLatest(true);

    try {
      // 1. Fetch Stats from DashboardService
      const statsData = await dashboardService.getStats();
      const enrichedStats: any = {
        ...statsData,
        totalProperties: statsData?.totalProperties || 0,
        publishedProperties: statsData?.totalPublished || statsData?.activeListings || 0,
        draftProperties: statsData?.totalDraft || 0,
        totalLeads: statsData?.todayLeads || 0,
        activeLeads: statsData?.todayLeads || 0,
        closedDealsCount: statsData?.totalSold || 0,
        pipelineValue: (statsData?.totalSold || 1) * 850_000_000,
        activeAgentsCount: statsData?.registeredAgents || 0,
        myPropertiesCount: statsData?.activeListings || 0,
        myPublishedCount: statsData?.totalPublished || statsData?.activeListings || 0,
        dealsWonCount: statsData?.totalSold || 0,
        myLeadsCount: statsData?.todayLeads || 0,
        newLeadsCount: statsData?.todayLeads || 0,
        scheduledFollowupsCount: 0,
        overdueFollowupsCount: 0,
      };
      setStats(enrichedStats);

      // 2. Fetch Featured / Published Properties
      const { data: featuredData } = await supabase
        .from("properties")
        .select(`
          id, title, listing_code, listing_type, property_type, status,
          address:property_address(*),
          price:property_price(*),
          specifications:property_specifications(*),
          building:property_building(*),
          land:property_land(*),
          media:property_media(*)
        `)
        .eq("status", "published")
        .limit(12);

      const formatted = (featuredData || []).map(formatPropertyItem);
      setFeaturedProperties(formatted);
      setLatestProperties(formatted.slice(0, 4));

      // 3. Fetch Recent Leads (if authenticated staff)
      if (role !== "viewer") {
        let leadsQuery = supabase
          .from("crm_leads")
          .select("id, name, phone, status, notes, created_at, property_id")
          .order("created_at", { ascending: false })
          .limit(5);

        if (role === "agent" && userId) {
          leadsQuery = leadsQuery.eq("assigned_to", userId);
        }

        const { data: leadsData } = await leadsQuery;
        const mappedLeads: DashboardLeadItem[] = (leadsData || []).map((l: any) => ({
          id: l.id,
          name: l.name || "Klien Prospek",
          phone: l.phone || "-",
          property: l.notes || "Properti Pilihan",
          status: l.status,
          created_at: l.created_at,
        }));
        setRecentLeads(mappedLeads);

        // 4. Fetch Surveys
        const { data: surveysData } = await supabase
          .from("surveys")
          .select("*")
          .eq("status", "scheduled")
          .order("scheduled_at", { ascending: true })
          .limit(5);

        setUpcomingSurveys((surveysData || []) as Survey[]);
      }

      // 5. Fetch Public Agents
      const { data: agentsData } = await supabase
        .from("users")
        .select("id, full_name, avatar_url, role")
        .in("role", ["agent", "admin", "super_admin"])
        .limit(4);

      setAgents(agentsData || []);
    } catch (error) {
      console.error("Gagal memuat data dashboard:", error);
    } finally {
      setLoadingFeatured(false);
      setLoadingLatest(false);
      setLoading(false);
    }
  }, []);

  // Initialize Session & Role
  useEffect(() => {
    let isMounted = true;

    async function init() {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();

        let activeRole: UserRole = "viewer";
        if (user) {
          setCurrentUser(user);
          const { data: profile } = await supabase
            .from("users")
            .select("role")
            .eq("id", user.id)
            .maybeSingle();

          activeRole = ((profile?.role || user.user_metadata?.role || "viewer") as string).toLowerCase() as UserRole;
        }

        if (isMounted) {
          setUserRole(activeRole);
          await loadDashboardData(activeRole, user?.id);
        }
      } catch (err) {
        console.error("Gagal inisialisasi sesi:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    init();
    return () => {
      isMounted = false;
    };
  }, [loadDashboardData]);

  // Filtered properties based on active category tab
  const filteredFeaturedProperties = useMemo(() => {
    if (featuredFilter === "semua") return featuredProperties;
    return featuredProperties.filter((p) => {
      const cat = p.category.toLowerCase();
      if (featuredFilter === "rumah") return cat.includes("rumah") || cat.includes("villa");
      if (featuredFilter === "tanah") return cat.includes("tanah");
      if (featuredFilter === "gudang") return cat.includes("gudang") || cat.includes("pabrik");
      if (featuredFilter === "apartemen") return cat.includes("apartemen") || cat.includes("apartment");
      if (featuredFilter === "ruko") return cat.includes("ruko") || cat.includes("kantor");
      return true;
    });
  }, [featuredProperties, featuredFilter]);

  const handlePropertyClick = (id: string) => {
    router.push(`/properties/${id}`);
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <Skeleton className="h-10 w-64 rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-72 w-full rounded-2xl" />
      </div>
    );
  }

  const isSuperAdmin = userRole === "super_admin" || userRole === "superadmin";
  const isAdmin = isSuperAdmin || userRole === "admin" || userRole === "commissioner";
  const isAgent = userRole === "agent" || userRole === "marketing";

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 space-y-6 text-foreground">
      {isAdmin ? (
        <AdminDashboardView
          userName={currentUser?.user_metadata?.full_name || currentUser?.email}
          userRole={userRole}
          stats={stats}
          featuredProperties={filteredFeaturedProperties}
          latestProperties={latestProperties}
          loadingFeatured={loadingFeatured}
          loadingLatest={loadingLatest}
          featuredFilter={featuredFilter}
          setFeaturedFilter={setFeaturedFilter}
          recentLeads={recentLeads}
          upcomingSurveys={upcomingSurveys}
          agents={agents}
          onPropertyClick={handlePropertyClick}
        />
      ) : isAgent ? (
        <AgentDashboardView
          userName={currentUser?.user_metadata?.full_name || currentUser?.email}
          userRole={userRole}
          stats={stats}
          featuredProperties={filteredFeaturedProperties}
          latestProperties={latestProperties}
          loadingFeatured={loadingFeatured}
          loadingLatest={loadingLatest}
          featuredFilter={featuredFilter}
          setFeaturedFilter={setFeaturedFilter}
          recentLeads={recentLeads}
          upcomingSurveys={upcomingSurveys}
          onPropertyClick={handlePropertyClick}
        />
      ) : (
        <ViewerDashboardView
          featuredProperties={filteredFeaturedProperties}
          latestProperties={latestProperties}
          loadingFeatured={loadingFeatured}
          loadingLatest={loadingLatest}
          featuredFilter={featuredFilter}
          setFeaturedFilter={setFeaturedFilter}
          agents={agents}
          onPropertyClick={handlePropertyClick}
        />
      )}
    </div>
  );
}