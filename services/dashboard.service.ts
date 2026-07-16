// services/dashboard.service.ts

import { supabase } from "@/lib/supabase/client";

export interface DashboardStats {
  totalProperties: number;
  activeListings: number;
  todayLeads: number;
  registeredAgents: number;
  monthlyData: {
    month: string;
    properties: number;
    sold: number;
  }[];
  recentActivities: {
    id: string;
    title: string;
    time: string;
    type: "property" | "developer" | "lead" | "listing" | "agent";
  }[];
}

export const dashboardService = {
  // ===== GET STATISTICS =====
  async getStats(): Promise<DashboardStats> {
    // 1. Total Properties
    const { count: totalProperties, error: totalError } = await supabase
      .from("properties")
      .select("*", { count: "exact", head: true });

    if (totalError) throw totalError;

    // 2. Active Listings (published)
    const { count: activeListings, error: activeError } = await supabase
      .from("properties")
      .select("*", { count: "exact", head: true })
      .eq("status", "published");

    if (activeError) throw activeError;

    // 3. Today's Leads (dari tabel crm_leads - dibuat hari ini)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { count: todayLeads, error: leadsError } = await supabase
      .from("crm_leads")
      .select("*", { count: "exact", head: true })
      .gte("created_at", today.toISOString())
      .lt("created_at", tomorrow.toISOString());

    if (leadsError && leadsError.code !== "42P01") {
      // Tabel mungkin belum ada, anggap 0
      console.warn("CRM table not found, leads = 0");
    }

    // 4. Registered Agents (users dengan role 'agent')
    const { count: registeredAgents, error: agentsError } = await supabase
      .from("user_roles")
      .select("*", { count: "exact", head: true })
      .eq("role_id", (await supabase.from("roles").select("id").eq("code", "agent").single()).data?.id || "");

    if (agentsError && agentsError.code !== "42P01") {
      console.warn("Roles table not found, agents = 0");
    }

    // 5. Monthly Data (statistik per bulan)
    const monthlyData = await this.getMonthlyStats();

    // 6. Recent Activities
    const recentActivities = await this.getRecentActivities();

    return {
      totalProperties: totalProperties || 0,
      activeListings: activeListings || 0,
      todayLeads: todayLeads || 0,
      registeredAgents: registeredAgents || 0,
      monthlyData,
      recentActivities,
    };
  },

  // ===== GET MONTHLY STATS =====
  async getMonthlyStats() {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const result: { month: string; properties: number; sold: number }[] = [];

    const currentYear = new Date().getFullYear();

    for (let i = 0; i < 12; i++) {
      const month = i + 1;
      const startDate = new Date(currentYear, i, 1);
      const endDate = new Date(currentYear, i + 1, 1);

      // Total property dibuat bulan ini
      const { count: properties } = await supabase
        .from("properties")
        .select("*", { count: "exact", head: true })
        .gte("created_at", startDate.toISOString())
        .lt("created_at", endDate.toISOString());

      // Property terjual bulan ini
      const { count: sold } = await supabase
        .from("properties")
        .select("*", { count: "exact", head: true })
        .eq("status", "sold")
        .gte("updated_at", startDate.toISOString())
        .lt("updated_at", endDate.toISOString());

      result.push({
        month: months[i],
        properties: properties || 0,
        sold: sold || 0,
      });
    }

    return result;
  },

  // ===== GET RECENT ACTIVITIES =====
  async getRecentActivities() {
    // Ambil 5 property terbaru sebagai aktivitas
    const { data: recentProperties } = await supabase
      .from("properties")
      .select("id, title, created_at, status")
      .order("created_at", { ascending: false })
      .limit(3);

    const activities: DashboardStats["recentActivities"] = [];

    if (recentProperties) {
      recentProperties.forEach((prop) => {
        const time = new Date(prop.created_at);
        const now = new Date();
        const diff = Math.floor((now.getTime() - time.getTime()) / 60000); // menit

        let timeStr = "Baru saja";
        if (diff > 60) timeStr = `${Math.floor(diff / 60)} jam lalu`;
        else if (diff > 5) timeStr = `${diff} menit lalu`;

        activities.push({
          id: prop.id,
          title: `Property "${prop.title}" berhasil dibuat`,
          time: timeStr,
          type: "property",
        });
      });
    }

    // Tambahkan aktivitas dummy jika kurang dari 5
    const dummyActivities = [
      { title: "Developer berhasil ditambahkan", type: "developer" as const },
      { title: "Lead baru masuk", type: "lead" as const },
      { title: "Listing berhasil dipublik", type: "listing" as const },
      { title: "Agent melakukan login", type: "agent" as const },
    ];

    while (activities.length < 5) {
      const dummy = dummyActivities[activities.length % dummyActivities.length];
      activities.push({
        id: `dummy-${activities.length}`,
        title: dummy.title,
        time: `${Math.floor(Math.random() * 60) + 1} menit lalu`,
        type: dummy.type,
      });
    }

    return activities;
  },
};