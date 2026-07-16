// services/report.service.ts

import { supabase } from "@/lib/supabase/client";

export interface ReportStats {
  totalProperties: number;
  totalSold: number;
  totalRented: number;
  totalActive: number;
  totalDraft: number;
  totalArchived: number;
  averagePrice: number;
  totalRevenue: number;
}

export interface PropertyStatusCount {
  status: string;
  count: number;
}

export interface PropertyTypeCount {
  type: string;
  count: number;
}

export interface MonthlyStat {
  month: string;
  year: number;
  created: number;
  sold: number;
  revenue: number;
}

export interface AgentPerformance {
  agent_id: string;
  agent_name: string;
  total_properties: number;
  total_sold: number;
  total_revenue: number;
  commission: number;
}

export const reportService = {
  // ===== GET MAIN STATS =====
  async getMainStats(): Promise<ReportStats> {
    // Total property
    const { count: totalProperties } = await supabase
      .from("properties")
      .select("*", { count: "exact", head: true });

    // Total sold
    const { count: totalSold } = await supabase
      .from("properties")
      .select("*", { count: "exact", head: true })
      .eq("status", "sold");

    // Total rented
    const { count: totalRented } = await supabase
      .from("properties")
      .select("*", { count: "exact", head: true })
      .eq("status", "rented");

    // Total active (published)
    const { count: totalActive } = await supabase
      .from("properties")
      .select("*", { count: "exact", head: true })
      .eq("status", "published");

    // Total draft
    const { count: totalDraft } = await supabase
      .from("properties")
      .select("*", { count: "exact", head: true })
      .eq("status", "draft");

    // Total archived
    const { count: totalArchived } = await supabase
      .from("properties")
      .select("*", { count: "exact", head: true })
      .eq("status", "archived");

    // Average price (dari property_price)
    const { data: prices } = await supabase
      .from("property_price")
      .select("selling_price")
      .not("selling_price", "is", null);

    let averagePrice = 0;
    if (prices && prices.length > 0) {
      const total = prices.reduce((sum, p) => sum + (p.selling_price || 0), 0);
      averagePrice = total / prices.length;
    }

    // Total revenue (sum of sold property prices)
    const { data: soldProperties } = await supabase
      .from("properties")
      .select("id")
      .eq("status", "sold");

    let totalRevenue = 0;
    if (soldProperties && soldProperties.length > 0) {
      const ids = soldProperties.map((p) => p.id);
      const { data: soldPrices } = await supabase
        .from("property_price")
        .select("selling_price")
        .in("property_id", ids)
        .not("selling_price", "is", null);

      if (soldPrices) {
        totalRevenue = soldPrices.reduce((sum, p) => sum + (p.selling_price || 0), 0);
      }
    }

    return {
      totalProperties: totalProperties || 0,
      totalSold: totalSold || 0,
      totalRented: totalRented || 0,
      totalActive: totalActive || 0,
      totalDraft: totalDraft || 0,
      totalArchived: totalArchived || 0,
      averagePrice,
      totalRevenue,
    };
  },

  // ===== GET PROPERTY STATUS DISTRIBUTION =====
  async getStatusDistribution(): Promise<PropertyStatusCount[]> {
    const { data, error } = await supabase
      .from("properties")
      .select("status")
      .not("status", "is", null);

    if (error) throw new Error(error.message);

    const counts: Record<string, number> = {};
    data.forEach((item) => {
      counts[item.status] = (counts[item.status] || 0) + 1;
    });

    return Object.entries(counts).map(([status, count]) => ({
      status,
      count,
    }));
  },

  // ===== GET PROPERTY TYPE DISTRIBUTION =====
  async getTypeDistribution(): Promise<PropertyTypeCount[]> {
    const { data, error } = await supabase
      .from("properties")
      .select("property_type")
      .not("property_type", "is", null);

    if (error) throw new Error(error.message);

    const counts: Record<string, number> = {};
    data.forEach((item) => {
      counts[item.property_type] = (counts[item.property_type] || 0) + 1;
    });

    return Object.entries(counts).map(([type, count]) => ({
      type,
      count,
    }));
  },

  // ===== GET MONTHLY STATS =====
  async getMonthlyStats(year?: number): Promise<MonthlyStat[]> {
    const targetYear = year || new Date().getFullYear();
    const result: MonthlyStat[] = [];

    for (let month = 0; month < 12; month++) {
      const startDate = new Date(targetYear, month, 1);
      const endDate = new Date(targetYear, month + 1, 1);

      // Total created
      const { count: created } = await supabase
        .from("properties")
        .select("*", { count: "exact", head: true })
        .gte("created_at", startDate.toISOString())
        .lt("created_at", endDate.toISOString());

      // Total sold
      const { count: sold } = await supabase
        .from("properties")
        .select("*", { count: "exact", head: true })
        .eq("status", "sold")
        .gte("updated_at", startDate.toISOString())
        .lt("updated_at", endDate.toISOString());

      // Revenue
      const { data: soldProperties } = await supabase
        .from("properties")
        .select("id")
        .eq("status", "sold")
        .gte("updated_at", startDate.toISOString())
        .lt("updated_at", endDate.toISOString());

      let revenue = 0;
      if (soldProperties && soldProperties.length > 0) {
        const ids = soldProperties.map((p) => p.id);
        const { data: prices } = await supabase
          .from("property_price")
          .select("selling_price")
          .in("property_id", ids)
          .not("selling_price", "is", null);

        if (prices) {
          revenue = prices.reduce((sum, p) => sum + (p.selling_price || 0), 0);
        }
      }

      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      result.push({
        month: monthNames[month],
        year: targetYear,
        created: created || 0,
        sold: sold || 0,
        revenue,
      });
    }

    return result;
  },

  // ===== GET AGENT PERFORMANCE =====
  async getAgentPerformance(): Promise<AgentPerformance[]> {
    // Ambil semua agent dari user_roles atau users
    const { data: agents } = await supabase
      .from("users")
      .select("id, full_name")
      .limit(100);

    if (!agents) return [];

    const result: AgentPerformance[] = [];

    for (const agent of agents) {
      // Cari property yang di-manage oleh agent ini
      const { data: properties } = await supabase
        .from("property_agents")
        .select("property_id")
        .eq("user_id", agent.id);

      if (!properties || properties.length === 0) continue;

      const propertyIds = properties.map((p) => p.property_id);

      // Total property
      const { count: totalProperties } = await supabase
        .from("properties")
        .select("*", { count: "exact", head: true })
        .in("id", propertyIds);

      // Total sold
      const { count: totalSold } = await supabase
        .from("properties")
        .select("*", { count: "exact", head: true })
        .in("id", propertyIds)
        .eq("status", "sold");

      // Total revenue
      const { data: soldProps } = await supabase
        .from("properties")
        .select("id")
        .in("id", propertyIds)
        .eq("status", "sold");

      let totalRevenue = 0;
      if (soldProps && soldProps.length > 0) {
        const ids = soldProps.map((p) => p.id);
        const { data: prices } = await supabase
          .from("property_price")
          .select("selling_price")
          .in("property_id", ids)
          .not("selling_price", "is", null);

        if (prices) {
          totalRevenue = prices.reduce((sum, p) => sum + (p.selling_price || 0), 0);
        }
      }

      // Commission (2.5% dari revenue)
      const commission = totalRevenue * 0.025;

      result.push({
        agent_id: agent.id,
        agent_name: agent.full_name || "Unknown Agent",
        total_properties: totalProperties || 0,
        total_sold: totalSold || 0,
        total_revenue: totalRevenue,
        commission,
      });
    }

    return result.sort((a, b) => b.total_revenue - a.total_revenue);
  },

  // ===== GET TOP LOCATIONS =====
  async getTopLocations(limit: number = 5) {
    const { data, error } = await supabase
      .from("property_address")
      .select("city_id, cities(name)")
      .not("city_id", "is", null);

    if (error) throw new Error(error.message);

    const counts: Record<string, { name: string; count: number }> = {};
    data.forEach((item) => {
      const cityName = item.cities?.name || "Unknown";
      if (!counts[item.city_id]) {
        counts[item.city_id] = { name: cityName, count: 0 };
      }
      counts[item.city_id].count++;
    });

    return Object.values(counts)
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  },
};