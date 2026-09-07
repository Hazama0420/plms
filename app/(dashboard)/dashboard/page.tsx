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
  type DashboardFollowupSummary,
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

const formatPropertyItem = (
  p: any,
  profilesMap: Record<string, { full_name: string; avatar_url: string; phone?: string; whatsapp?: string }> = {}
): DashboardPropertyItem => {
  const addrObj = Array.isArray(p.address) ? p.address[0] : p.address;
  const priceObj = Array.isArray(p.price) ? p.price[0] : p.price;
  const specObj = Array.isArray(p.specifications)
    ? p.specifications[0]
    : p.specifications || (Array.isArray(p.specs) ? p.specs[0] : p.specs);
  const bldObj = Array.isArray(p.building) ? p.building[0] : p.building;
  const landObj = Array.isArray(p.land) ? p.land[0] : p.land;
  const mediaArr = Array.isArray(p.media) ? p.media : [];

  const uploaderId = p.assigned_to || p.created_by || "";
  const profileFromJoin = Array.isArray(p.user_profiles) ? p.user_profiles[0] : p.user_profiles;
  const agentObj = Array.isArray(p.agent) ? p.agent[0] : p.agent;
  const profileFromMap = uploaderId ? profilesMap[uploaderId] : null;

  const rawAgentName =
    profileFromMap?.full_name ||
    profileFromJoin?.full_name ||
    agentObj?.full_name ||
    p.users?.full_name ||
    p.uploader_name ||
    p.agent_name ||
    "Agen Resmi";

  const agentAvatar =
    profileFromMap?.avatar_url ||
    profileFromJoin?.avatar_url ||
    agentObj?.avatar_url ||
    p.users?.avatar_url ||
    p.uploader_avatar ||
    p.agent_avatar ||
    null;

  const agentPhone =
    profileFromMap?.phone ||
    profileFromMap?.whatsapp ||
    p.agent_phone ||
    p.phone ||
    null;

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

  const bedrooms = Number(specObj?.bedroom ?? specObj?.bedrooms ?? p.bedrooms ?? p.bedroom ?? 0);
  const bathrooms = Number(specObj?.bathroom ?? specObj?.bathrooms ?? p.bathrooms ?? p.bathroom ?? 0);
  const buildingArea = Number(bldObj?.building_area ?? specObj?.building_area ?? p.building_area ?? p.building_size ?? 0);
  const landArea = Number(landObj?.land_area ?? specObj?.land_area ?? p.land_area ?? p.land_size ?? 0);

  return {
    id: p.id,
    title: p.title || "Properti Inland",
    listing_code: p.listing_code || p.code || `INL-${p.id?.slice(0, 4)?.toUpperCase() || "000"}`,
    listing_type: p.listing_type || "jual",
    category: categoryName,
    price: priceVal,
    location: locationText,
    bedrooms,
    bathrooms,
    building_area: buildingArea,
    land_area: landArea,
    thumbnail,
    agent_name: rawAgentName.trim(),
    agent_avatar: agentAvatar,
    agent_phone: agentPhone,
    uploader_name: rawAgentName.trim(),
    uploader_avatar: agentAvatar,
    is_featured: Boolean(p.is_featured),
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
  const [recentFollowups, setRecentFollowups] = useState<DashboardFollowupSummary[]>([]);
  const [upcomingSurveys, setUpcomingSurveys] = useState<Survey[]>([]);
  const [agents, setAgents] = useState<any[]>([]);

  // Load dashboard data
  const loadDashboardData = useCallback(async (role: UserRole, userId?: string) => {
    setLoadingFeatured(true);
    setLoadingLatest(true);

    try {
      // 1. Fetch Stats from DashboardService
      const statsData = await dashboardService.getStats(role, userId);
      const enrichedStats: any = {
        ...statsData,
        totalProperties: statsData?.totalProperties || 0,
        publishedProperties: statsData?.totalPublished || statsData?.activeListings || 0,
        draftProperties: statsData?.totalDraft || 0,
        totalLeads: statsData?.totalLeads || 0,
        activeLeads: statsData?.activeLeads || 0,
        closedDealsCount: statsData?.dealsWonCount || statsData?.totalSold || 0,
        pipelineValue: statsData?.pipelineValue || 0,
        activeAgentsCount: statsData?.registeredAgents || 0,
        myPropertiesCount: statsData?.myPropertiesCount || statsData?.activeListings || 0,
        myPublishedCount: statsData?.myPublishedCount || statsData?.totalPublished || statsData?.activeListings || 0,
        dealsWonCount: statsData?.dealsWonCount || statsData?.totalSold || 0,
        myLeadsCount: statsData?.totalLeads || 0,
        newLeadsCount: statsData?.newLeadsCount || 0,
        scheduledFollowupsCount: statsData?.scheduledFollowupsCount || 0,
        overdueFollowupsCount: statsData?.overdueFollowupsCount || 0,
      };
      setStats(enrichedStats);

      // 2. Fetch Featured / Published Properties
      const { data: featuredData, error: featuredError } = await supabase
        .from("properties")
        .select(`
          id, title, listing_code, listing_type, property_type, status, slug,
          created_by, assigned_to, is_featured,
          agent:users!assigned_to(full_name, avatar_url),
          address:property_address(*),
          price:property_price(*),
          specifications:property_specifications(*),
          building:property_building(*),
          land:property_land(*),
          media:property_media(*)
        `)
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(12);

      if (featuredError) {
        console.error("Gagal memuat properti dashboard:", featuredError);
      }

      const userIds = Array.from(
        new Set(
          (featuredData || [])
            .map((p: any) => p.assigned_to || p.created_by)
            .filter(Boolean)
        )
      );

      let profilesMap: Record<string, { full_name: string; avatar_url: string; phone?: string; whatsapp?: string }> = {};

      if (userIds.length > 0) {
        try {
          const { data: userData, error: userError } = await supabase
            .from("users")
            .select("id, full_name, avatar_url, phone, whatsapp")
            .in("id", userIds);

          if (!userError && userData && Array.isArray(userData)) {
            userData.forEach((prof: any) => {
              profilesMap[prof.id] = {
                full_name: prof.full_name || "Agen Resmi",
                avatar_url: prof.avatar_url || "",
                phone: prof.phone || "",
                whatsapp: prof.whatsapp || "",
              };
            });
          }
        } catch (err) {
          console.error("Error fetching agent profiles in dashboard:", err);
        }
      }

      const formatted = (featuredData || []).map((p) => formatPropertyItem(p, profilesMap));
      setFeaturedProperties(formatted);
      setLatestProperties(formatted.slice(0, 4));

      // 3. Fetch Recent Leads (if authenticated staff)
      if (role !== "viewer") {
        let leadsQuery = supabase
          .from("crm_leads")
          .select("id, status, notes, created_at, property_id, contact:crm_contacts(full_name, phone)")
          .order("created_at", { ascending: false })
          .limit(5);

        if (role === "agent" && userId) {
          leadsQuery = leadsQuery.eq("assigned_to", userId);
        }

        const { data: leadsData } = await leadsQuery;
        const mappedLeads: DashboardLeadItem[] = (leadsData || []).map((l: any) => {
          const contactObj = l.contact || l.crm_contacts || {};
          return {
            id: l.id,
            name: contactObj.full_name || "Klien Prospek",
            phone: contactObj.phone || "-",
            property: l.notes || "Properti Pilihan",
            status: l.status,
            created_at: l.created_at,
          };
        });
        setRecentLeads(mappedLeads);

        // 4. Fetch Surveys
        const { data: surveysData } = await supabase
          .from("surveys")
          .select("*")
          .eq("status", "scheduled")
          .order("scheduled_at", { ascending: true })
          .limit(5);

        setUpcomingSurveys((surveysData || []) as Survey[]);

        // 4b. Fetch Prioritized Follow-ups
        let folQuery = supabase
          .from("crm_followups")
          .select(`
            id,
            lead_id,
            followup_date,
            status,
            notes,
            assigned_to,
            lead:crm_leads (
              id,
              notes,
              interest_type,
              contact:crm_contacts (
                full_name,
                phone
              )
            )
          `)
          .in("status", ["pending", "overdue"])
          .order("followup_date", { ascending: true })
          .limit(8);

        if (role === "agent" && userId) {
          folQuery = folQuery.eq("assigned_to", userId);
        }

        const { data: followupsRaw } = await folQuery;
        const nowTime = new Date().getTime();
        const mappedFollowups: DashboardFollowupSummary[] = (followupsRaw || []).map((f: any) => {
          const leadObj = f.lead || {};
          const contactObj = leadObj.contact || {};
          const clientName = contactObj.full_name || "Klien Prospek";
          const d = f.followup_date ? new Date(f.followup_date) : null;
          const isOverdue = f.status === "overdue" || (d ? d.getTime() < nowTime : false);
          const isToday = d ? new Date().toDateString() === d.toDateString() : false;
          const priority = isOverdue ? "overdue" : isToday ? "today" : "upcoming";

          const scheduledStr = d
            ? d.toLocaleDateString("id-ID", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })
            : "-";

          return {
            id: f.id,
            name: clientName,
            scheduled_at: scheduledStr,
            status: isOverdue ? "Terlambat" : isToday ? "Hari Ini" : "Terjadwal",
            priority,
            lead_id: f.lead_id,
            property_title: leadObj.interest_type || leadObj.notes || null,
          };
        });
        setRecentFollowups(mappedFollowups);
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
    const prop = featuredProperties.find((p) => p.id === id);
    router.push(`/properties/${prop?.slug || id}`);
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
          followups={recentFollowups}
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
          followups={recentFollowups}
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