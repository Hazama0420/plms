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

// Helper untuk mengekstrak harga dari objek property_price
function extractPriceValue(priceObjRaw: any): number {
  if (!priceObjRaw) return 0;
  const priceObj = Array.isArray(priceObjRaw) ? priceObjRaw[0] : priceObjRaw;
  if (!priceObj) return 0;

  const sellingPrice = Number(priceObj.selling_price || 0);
  const rentalPrice = Number(priceObj.rental_price || 0);

  return sellingPrice > 0 ? sellingPrice : rentalPrice;
}

export const reportService = {
  // ===== 1. RINGKASAN STATISTIK UTAMA =====
  async getMainStats(): Promise<ReportStats> {
    try {
      const { data: properties, error } = await supabase
        .from("properties")
        .select(`
          id,
          status,
          property_price(selling_price, rental_price)
        `);

      if (error) throw error;

      const totalProperties = properties?.length || 0;
      let totalActive = 0;
      let totalSold = 0;
      let totalRented = 0;
      let totalDraft = 0;
      let totalArchived = 0;
      let totalPriceSum = 0;
      let totalRevenue = 0;

      properties?.forEach((p: any) => {
        const st = (p.status || "").toLowerCase();
        const priceVal = extractPriceValue(p.property_price);

        if (priceVal > 0) totalPriceSum += priceVal;

        if (st === "published" || st === "available" || st === "aktif") {
          totalActive++;
        } else if (st === "sold" || st === "terjual") {
          totalSold++;
          totalRevenue += priceVal;
        } else if (st === "rented" || st === "disewa" || st === "sewa") {
          totalRented++;
          totalRevenue += priceVal;
        } else if (st === "draft") {
          totalDraft++;
        } else if (st === "archived" || st === "diarsipkan") {
          totalArchived++;
        }
      });

      return {
        totalProperties,
        totalActive,
        totalSold,
        totalRented,
        totalDraft,
        totalArchived,
        averagePrice: totalProperties > 0 ? Math.round(totalPriceSum / totalProperties) : 0,
        totalRevenue,
      };
    } catch (err: any) {
      console.error("Error getMainStats:", err?.message || err);
      return {
        totalProperties: 0,
        totalActive: 0,
        totalSold: 0,
        totalRented: 0,
        totalDraft: 0,
        totalArchived: 0,
        averagePrice: 0,
        totalRevenue: 0,
      };
    }
  },

  // ===== 2. DISTRIBUSI STATUS PROPERTI =====
  async getStatusDistribution(): Promise<PropertyStatusCount[]> {
    try {
      const { data, error } = await supabase
        .from("properties")
        .select("status")
        .not("status", "is", null);

      if (error) throw error;

      const counts: Record<string, number> = {};
      data?.forEach((item) => {
        const st = item.status || "draft";
        counts[st] = (counts[st] || 0) + 1;
      });

      return Object.entries(counts).map(([status, count]) => ({ status, count }));
    } catch (err: any) {
      console.error("Error getStatusDistribution:", err?.message || err);
      return [];
    }
  },

  // ===== 3. DISTRIBUSI TIPE & KATEGORI PROPERTI =====
  async getTypeDistribution(): Promise<PropertyTypeCount[]> {
    try {
      const { data, error } = await supabase
        .from("properties")
        .select("property_type, property_category");

      if (error) throw error;

      const counts: Record<string, number> = {};
      data?.forEach((item: any) => {
        let rawType = item.property_category || item.property_type || "Rumah";
        rawType = rawType
          .toLowerCase()
          .split(" ")
          .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");

        counts[rawType] = (counts[rawType] || 0) + 1;
      });

      return Object.entries(counts).map(([type, count]) => ({ type, count }));
    } catch (err: any) {
      console.error("Error getTypeDistribution:", err?.message || err);
      return [];
    }
  },

  // ===== 4. STATISTIK PENJUALAN BULANAN =====
  async getMonthlyStats(year?: number): Promise<MonthlyStat[]> {
    const targetYear = year || new Date().getFullYear();
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
    
    const result: MonthlyStat[] = monthNames.map((m) => ({
      month: m,
      year: targetYear,
      created: 0,
      sold: 0,
      revenue: 0,
    }));

    try {
      const startDate = `${targetYear}-01-01T00:00:00.000Z`;
      const endDate = `${targetYear}-12-31T23:59:59.999Z`;

      const { data: properties, error } = await supabase
        .from("properties")
        .select(`
          id,
          status,
          created_at,
          updated_at,
          property_price(selling_price, rental_price)
        `)
        .gte("created_at", startDate)
        .lte("created_at", endDate);

      if (error) throw error;

      properties?.forEach((p: any) => {
        const createdAt = new Date(p.created_at);
        const updatedAt = new Date(p.updated_at || p.created_at);

        if (createdAt.getFullYear() === targetYear) {
          const monthIdx = createdAt.getMonth();
          if (monthIdx >= 0 && monthIdx < 12) {
            result[monthIdx].created += 1;
          }
        }

        const st = (p.status || "").toLowerCase();
        const isClosed = st === "sold" || st === "terjual" || st === "rented" || st === "disewa";

        if (isClosed && updatedAt.getFullYear() === targetYear) {
          const monthIdx = updatedAt.getMonth();
          if (monthIdx >= 0 && monthIdx < 12) {
            const priceVal = extractPriceValue(p.property_price);

            result[monthIdx].sold += 1;
            result[monthIdx].revenue += priceVal;
          }
        }
      });

      return result;
    } catch (err: any) {
      console.error("Error getMonthlyStats:", err?.message || err);
      return result;
    }
  },

  // ===== 5. PAPAN PERINGKAT & PERFORMA AGEN =====
  async getAgentPerformance(): Promise<AgentPerformance[]> {
    try {
      const { data: usersData } = await supabase
        .from("users")
        .select("id, full_name");

      const userMap = new Map<string, string>();
      usersData?.forEach((u: any) => {
        userMap.set(u.id, u.full_name || "Agen Resmi");
      });

      const { data: properties, error } = await supabase
        .from("properties")
        .select(`
          id,
          status,
          created_by,
          assigned_to,
          property_price(selling_price, rental_price)
        `);

      if (error) throw error;

      const agentStats: Record<string, AgentPerformance> = {};

      usersData?.forEach((u: any) => {
        agentStats[u.id] = {
          agent_id: u.id,
          agent_name: u.full_name || "Agen Resmi",
          total_properties: 0,
          total_sold: 0,
          total_revenue: 0,
          commission: 0,
        };
      });

      properties?.forEach((p: any) => {
        const agentIds = new Set<string>();

        if (p.created_by) agentIds.add(p.created_by);
        if (p.assigned_to) agentIds.add(p.assigned_to);

        if (agentIds.size === 0) return;

        const priceVal = extractPriceValue(p.property_price);
        const st = (p.status || "").toLowerCase();
        const isClosed = st === "sold" || st === "terjual" || st === "rented" || st === "disewa";

        agentIds.forEach((agentId) => {
          if (!agentStats[agentId]) {
            agentStats[agentId] = {
              agent_id: agentId,
              agent_name: userMap.get(agentId) || "Agen Resmi",
              total_properties: 0,
              total_sold: 0,
              total_revenue: 0,
              commission: 0,
            };
          }

          agentStats[agentId].total_properties += 1;

          if (isClosed) {
            agentStats[agentId].total_sold += 1;
            agentStats[agentId].total_revenue += priceVal;
            agentStats[agentId].commission += priceVal * 0.025; // 2.5% Komisi
          }
        });
      });

      return Object.values(agentStats)
        .filter((a) => a.total_properties > 0)
        .sort((a, b) => {
          if (b.total_sold !== a.total_sold) {
            return b.total_sold - a.total_sold;
          }
          return b.total_revenue - a.total_revenue;
        });
    } catch (err: any) {
      console.error("Error getAgentPerformance:", err?.message || err);
      return [];
    }
  },

  // ===== 6. LOKASI TERATAS =====
  async getTopLocations(limit: number = 5) {
    try {
      const { data, error } = await supabase
        .from("property_address")
        .select(`
          city_name,
          district_name,
          address
        `);

      if (error) throw error;

      const counts: Record<string, { name: string; count: number }> = {};

      data?.forEach((item: any) => {
        let locationName = item.city_name || item.district_name || "";

        if (!locationName && item.address) {
          const addressParts = item.address.split(",");
          locationName = addressParts[addressParts.length - 1]?.trim() || addressParts[0]?.trim() || "Lokasi Lainnya";
        }

        if (!locationName || typeof locationName !== "string" || locationName.trim() === "" || locationName.toLowerCase() === "unknown") {
          locationName = "Lokasi Lainnya";
        }

        const formattedName = locationName
          .toLowerCase()
          .split(" ")
          .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");

        const key = item.city_name || formattedName;

        if (!counts[key]) {
          counts[key] = { name: formattedName, count: 0 };
        }
        counts[key].count++;
      });

      return Object.values(counts)
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);
    } catch (err: any) {
      console.error("Error getTopLocations:", err?.message || err);
      return [];
    }
  },
};