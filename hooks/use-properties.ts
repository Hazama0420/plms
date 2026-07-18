// hooks/use-properties.ts
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import propertyService, { type PropertyFilter } from "@/services/property.service";

// ============================================================
// TIPE LOKAL (menggantikan import dari @/types/property.types)
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

// Gunakan any untuk Property karena import bermasalah
type Property = any;

// ============================================================
// DEFAULT FILTERS
// ============================================================
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

// ============================================================
// HOOK
// ============================================================
export function useProperties(initialFilters: PropertyFilter = {}) {
  // ===== STATE =====
  const [filters, setFilters] = useState<PropertyFilter>({
    ...DEFAULT_FILTERS,
    ...initialFilters,
  });

  const [data, setData] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

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
      setData(result.data);
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
    // ✅ Perbaiki: gunakan nullish coalescing untuk fallback ke 1 jika undefined
    const currentPage = filters.page ?? 1;
    if (currentPage < totalPages) {
      goToPage(currentPage + 1);
    }
  }, [filters.page, totalPages, goToPage]);

  // ===== PREVIOUS PAGE =====
  const prevPage = useCallback(() => {
    // ✅ Perbaiki: gunakan nullish coalescing untuk fallback ke 1 jika undefined
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
    // Data
    data,
    loading,
    error,
    totalItems,
    totalPages,

    // Filters
    filters,
    activeFilterCount,
    hasActiveFilters,

    // Navigation
    goToPage,
    nextPage,
    prevPage,

    // Actions
    updateFilters,
    updateAdvancedFilters,
    resetFilters,
    refetch,
  };
}