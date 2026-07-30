// hooks/use-properties.ts
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import propertyService, { type PropertyFilter } from "@/services/property.service";
import { supabase } from "@/lib/supabase/client";

// ============================================================
// TIPE LOKAL
// ============================================================
interface AdvancedFilter {
  priceMin?: number | null;
  priceMax?: number | null;
  landAreaMin?: number | null;
  landAreaMax?: number | null;
  buildingAreaMin?: number | null;
  buildingAreaMax?: number | null;
  bedroom?: number | null;
  bathroom?: number | null;
  city_id?: string | null;
  property_type?: string | null;
  year_built?: number | null;
  certificate?: string | null;
  furnishing?: string | null;
}

type Property = any;

const DEFAULT_FILTERS: PropertyFilter = {
  page: 1,
  limit: 12,
  sort_by: "created_at",
  sort_order: "desc",
  status: "all",
  listing_type: "all",
  property_type: "all",
  search: "",
  advanced: {},
};

export function useProperties(initialFilters: PropertyFilter = {}) {
  const [filters, setFilters] = useState<PropertyFilter>({
    ...DEFAULT_FILTERS,
    ...initialFilters,
  });

  const [data, setData] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // 🔹 DETEKSI ROLE USER SECARA OTOMATIS UNTUK KEAMANAN DATA VIEWER
  useEffect(() => {
    async function checkUserRoleAndAdjustFilters() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from("users")
            .select("role")
            .eq("id", user.id)
            .maybeSingle();

          const role = (profile?.role || user.user_metadata?.role || "").toLowerCase();
          
          // Jika yang login adalah VIEWER, kunci status default hanya "published" / "available"
          if (role === "viewer") {
            setFilters((prev) => {
              if (prev.status === "all" || !prev.status) {
                return { ...prev, status: "published" };
              }
              return prev;
            });
          }
        }
      } catch (err) {
        console.error("Gagal mendeteksi role di useProperties:", err);
      }
    }
    checkUserRoleAndAdjustFilters();
  }, []);

  // ===== COUNT ACTIVE ADVANCED FILTERS =====
  const activeFilterCount = useMemo(() => {
    const advanced = filters.advanced || {};
    return Object.values(advanced).filter(
      (v) => v !== null && v !== undefined && v !== "" && v !== 0
    ).length;
  }, [filters.advanced]);

  // ===== CHECK IF ANY FILTER IS ACTIVE =====
  const hasActiveFilters = useMemo(() => {
    const { search, status, listing_type, advanced } = filters;
    const hasBasicFilters =
      (search && search.trim() !== "") ||
      (status && status !== "all") ||
      (listing_type && listing_type !== "all");
    const hasAdvancedFilters = Object.values(advanced || {}).some(
      (v) => v !== null && v !== undefined && v !== "" && v !== 0
    );
    return hasBasicFilters || hasAdvancedFilters;
  }, [filters]);

  // ===== FETCH PROPERTIES =====
  const fetchProperties = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await propertyService.getList(filters);
      setData(result.data || []);
      setTotalItems(result.count || 0);
      setTotalPages(result.totalPages || Math.ceil((result.count || 0) / (filters.limit || 12)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengambil data properti");
      setData([]);
      setTotalItems(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // ===== AUTO-FETCH ON FILTER CHANGE =====
  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  // ===== UPDATE FILTERS =====
  const updateFilters = useCallback((newFilters: Partial<PropertyFilter>) => {
    setFilters((prev: PropertyFilter) => {
      const shouldResetPage = !("page" in newFilters);
      return {
        ...prev,
        ...newFilters,
        page: shouldResetPage ? 1 : (newFilters.page ?? prev.page),
      };
    });
  }, []);

  // ===== UPDATE ADVANCED FILTERS =====
  const updateAdvancedFilters = useCallback((advanced: AdvancedFilter) => {
    setFilters((prev: PropertyFilter) => ({
      ...prev,
      advanced,
      page: 1,
    }));
  }, []);

  // ===== GO TO SPECIFIC PAGE =====
  const goToPage = useCallback((page: number) => {
    const targetPage = Math.max(1, Math.min(page, totalPages));
    if (targetPage !== filters.page) {
      setFilters((prev: PropertyFilter) => ({ ...prev, page: targetPage }));
    }
  }, [totalPages, filters.page]);

  // ===== NEXT PAGE =====
  const nextPage = useCallback(() => {
    const currentPage = filters.page ?? 1;
    if (currentPage < totalPages) {
      goToPage(currentPage + 1);
    }
  }, [filters.page, totalPages, goToPage]);

  // ===== PREVIOUS PAGE =====
  const prevPage = useCallback(() => {
    const currentPage = filters.page ?? 1;
    if (currentPage > 1) {
      goToPage(currentPage - 1);
    }
  }, [filters.page, goToPage]);

  // ===== RESET ALL FILTERS =====
  const resetFilters = useCallback(() => {
    setFilters({
      ...DEFAULT_FILTERS,
      limit: filters.limit || 12,
      sort_by: filters.sort_by || "created_at",
      sort_order: filters.sort_order || "desc",
    });
  }, [filters.limit, filters.sort_by, filters.sort_order]);

  // ===== REFETCH =====
  const refetch = useCallback(() => {
    fetchProperties();
  }, [fetchProperties]);

  // ===== RETURN =====
  return {
    data,
    loading,
    error,
    totalItems,
    totalPages,
    filters,
    activeFilterCount,
    hasActiveFilters,
    goToPage,
    nextPage,
    prevPage,
    updateFilters,
    updateAdvancedFilters,
    resetFilters,
    refetch,
  };
}