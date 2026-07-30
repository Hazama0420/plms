import { supabase } from "@/lib/supabase/client";

export interface DashboardStats {
  totalProperties: number;
  activeListings: number;
  todayLeads: number;
  registeredAgents: number;
  totalSold: number;
  totalRented: number;
  totalDraft: number;
  totalPublished: number;
  totalReview: number;
  monthlyData: { month: string; properties: number; sold: number }[];
  recentActivities: { id: string; description: string; time: string; type: string; user_name?: string }[];
  recentProperties: {
    id: string;
    title: string;
    listing_code: string;
    status: string;
    thumbnail?: string | null;
    price?: number | null;
    created_at: string;
  }[];
  statsCards: {
    title: string;
    value: number;
    icon: string;
    trend: number;
    color: "blue" | "green" | "orange" | "purple";
    subtitle: string;
  }[];
}

export const dashboardService = {
  async getStats(): Promise<DashboardStats> {
    // ===== TOTAL PROPERTIES =====
    const { count: totalPropertiesRaw } = await supabase
      .from("properties")
      .select("*", { count: "exact", head: true });
    const totalProperties = totalPropertiesRaw ?? 0;

    // ===== ACTIVE LISTINGS =====
    const { count: activeListingsRaw } = await supabase
      .from("properties")
      .select("*", { count: "exact", head: true })
      .eq("status", "published");
    const activeListings = activeListingsRaw ?? 0;

    // ===== TODAY'S LEADS =====
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { count: todayLeadsRaw } = await supabase
      .from("crm_leads")
      .select("*", { count: "exact", head: true })
      .gte("created_at", today.toISOString());
    const todayLeads = todayLeadsRaw ?? 0;

    // ===== REGISTERED AGENTS =====
    const { count: registeredAgentsRaw } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("role", "agent");
    const registeredAgents = registeredAgentsRaw ?? 0;

    // ===== STATUS COUNTS =====
    const { data: statusData } = await supabase
      .from("properties")
      .select("status");

    const statusCounts = (statusData || []).reduce((acc, curr) => {
      if (curr.status) {
        acc[curr.status] = (acc[curr.status] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const totalSold = statusCounts["sold"] || 0;
    const totalRented = statusCounts["rented"] || 0;
    const totalDraft = statusCounts["draft"] || 0;
    const totalPublished = statusCounts["published"] || 0;
    const totalReview = statusCounts["review"] || 0;

    // ===== MONTHLY DATA =====
    const currentYear = new Date().getFullYear();
    const { data: monthlyRaw } = await supabase
      .from("properties")
      .select("created_at, status")
      .gte("created_at", `${currentYear}-01-01`)
      .lte("created_at", `${currentYear}-12-31`);

    const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
    const monthlyMap: Record<string, { properties: number; sold: number }> = {};
    months.forEach((m) => { monthlyMap[m] = { properties: 0, sold: 0 }; });

    monthlyRaw?.forEach((item) => {
      const date = new Date(item.created_at);
      const monthKey = months[date.getMonth()];
      if (monthKey) {
        monthlyMap[monthKey].properties += 1;
        if (item.status === "sold") {
          monthlyMap[monthKey].sold += 1;
        }
      }
    });

    const monthlyData = months.map((month) => ({
      month,
      properties: monthlyMap[month].properties,
      sold: monthlyMap[month].sold,
    }));

    // ===== RECENT ACTIVITIES (PRIORITAS DARI activity_logs, FALLBACK KE crm_activities) =====
    let recentActivities: { id: string; description: string; time: string; type: string; user_name?: string }[] = [];

    try {
      const { data: logData, error: logErr } = await supabase
        .from("activity_logs")
        .select("id, action, description, created_at, user_name")
        .order("created_at", { ascending: false })
        .limit(6);

      if (!logErr && logData && logData.length > 0) {
        recentActivities = logData.map((act) => ({
          id: act.id,
          description: act.description,
          time: act.created_at,
          type: act.action || "LOG",
          user_name: act.user_name || "Sistem",
        }));
      } else {
        const { data: crmAct } = await supabase
          .from("crm_activities")
          .select("id, activity_type, notes, created_at")
          .order("created_at", { ascending: false })
          .limit(6);

        recentActivities = (crmAct || []).map((act) => ({
          id: act.id,
          description: act.notes || act.activity_type || "Aktivitas CRM",
          time: act.created_at,
          type: act.activity_type || "CRM",
          user_name: "Sistem",
        }));
      }
    } catch {
      recentActivities = [];
    }

    // ===== RECENT PROPERTIES =====
    const { data: recentProps } = await supabase
      .from("properties")
      .select(`
        id,
        title,
        listing_code,
        status,
        created_at,
        price:property_price(selling_price, rental_price),
        media:property_media(public_url, is_primary)
      `)
      .order("created_at", { ascending: false })
      .limit(5);

    const recentProperties = recentProps?.map((p) => {
      const primaryMedia = p.media?.find((m: any) => m.is_primary);
      const priceData = Array.isArray(p.price) ? p.price[0] : p.price;
      return {
        id: p.id,
        title: p.title,
        listing_code: p.listing_code,
        status: p.status,
        thumbnail: primaryMedia?.public_url || null,
        price: priceData?.selling_price || priceData?.rental_price || null,
        created_at: p.created_at,
      };
    }) || [];

    // ===== STATS CARDS WITH TREND =====
    const prevMonthStart = new Date();
    prevMonthStart.setMonth(prevMonthStart.getMonth() - 1);
    prevMonthStart.setDate(1);
    prevMonthStart.setHours(0, 0, 0, 0);
    const currMonthStart = new Date();
    currMonthStart.setDate(1);
    currMonthStart.setHours(0, 0, 0, 0);

    const { count: currTotalRaw } = await supabase
      .from("properties")
      .select("*", { count: "exact", head: true })
      .gte("created_at", currMonthStart.toISOString());
    const currTotal = currTotalRaw ?? 0;

    const { count: prevTotalRaw } = await supabase
      .from("properties")
      .select("*", { count: "exact", head: true })
      .gte("created_at", prevMonthStart.toISOString())
      .lt("created_at", currMonthStart.toISOString());
    const prevTotal = prevTotalRaw ?? 0;

    const totalTrend = prevTotal > 0 ? Math.round(((currTotal - prevTotal) / prevTotal) * 100) : 0;

    const { count: currActiveRaw } = await supabase
      .from("properties")
      .select("*", { count: "exact", head: true })
      .eq("status", "published")
      .gte("created_at", currMonthStart.toISOString());
    const currActive = currActiveRaw ?? 0;

    const { count: prevActiveRaw } = await supabase
      .from("properties")
      .select("*", { count: "exact", head: true })
      .eq("status", "published")
      .gte("created_at", prevMonthStart.toISOString())
      .lt("created_at", currMonthStart.toISOString());
    const prevActive = prevActiveRaw ?? 0;

    const activeTrend = prevActive > 0 ? Math.round(((currActive - prevActive) / prevActive) * 100) : 0;

    const { count: currLeadsRaw } = await supabase
      .from("crm_leads")
      .select("*", { count: "exact", head: true })
      .gte("created_at", currMonthStart.toISOString());
    const currLeads = currLeadsRaw ?? 0;

    const { count: prevLeadsRaw } = await supabase
      .from("crm_leads")
      .select("*", { count: "exact", head: true })
      .gte("created_at", prevMonthStart.toISOString())
      .lt("created_at", currMonthStart.toISOString());
    const prevLeads = prevLeadsRaw ?? 0;

    const leadsTrend = prevLeads > 0 ? Math.round(((currLeads - prevLeads) / prevLeads) * 100) : 0;

    const { count: currAgentsRaw } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("role", "agent")
      .gte("created_at", currMonthStart.toISOString());
    const currAgents = currAgentsRaw ?? 0;

    const { count: prevAgentsRaw } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("role", "agent")
      .gte("created_at", prevMonthStart.toISOString())
      .lt("created_at", currMonthStart.toISOString());
    const prevAgents = prevAgentsRaw ?? 0;

    const agentsTrend = prevAgents > 0 ? Math.round(((currAgents - prevAgents) / prevAgents) * 100) : 0;

    const statsCards = [
      {
        title: "Total Properti",
        value: totalProperties,
        icon: "Home",
        trend: totalTrend,
        color: "blue" as const,
        subtitle: `${activeListings} aktif`,
      },
      {
        title: "Listing Aktif",
        value: activeListings,
        icon: "Building2",
        trend: activeTrend,
        color: "green" as const,
        subtitle: `${totalProperties - activeListings} tidak aktif`,
      },
      {
        title: "Leads Hari Ini",
        value: todayLeads,
        icon: "Users",
        trend: leadsTrend,
        color: "orange" as const,
        subtitle: "Prospek baru masuk",
      },
      {
        title: "Total Agen",
        value: registeredAgents,
        icon: "TrendingUp",
        trend: agentsTrend,
        color: "purple" as const,
        subtitle: "Terdaftar di sistem",
      },
    ];

    return {
      totalProperties,
      activeListings,
      todayLeads,
      registeredAgents,
      totalSold,
      totalRented,
      totalDraft,
      totalPublished,
      totalReview,
      monthlyData,
      recentActivities,
      recentProperties,
      statsCards,
    };
  },
};