// hooks/use-properties.ts

"use client";

import { useState, useEffect, useCallback } from "react";
import { propertyService, type PropertyFilter } from "@/services/property.service";
import type { Property } from "@/types/property.types";

export function useProperties(initialFilters: PropertyFilter = {}) {
  const [filters, setFilters] = useState<PropertyFilter>({
    page: 1,
    limit: 10,
    sort_by: "created_at",
    sort_order: "desc",
    status: "all",
    listing_type: "all",
    search: "",
    ...initialFilters,
  });

  const [data, setData] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const fetchProperties = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await propertyService.getList(filters);
      setData(result.data);
      setTotalItems(result.count);
      setTotalPages(result.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengambil data");
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  const updateFilters = useCallback((newFilters: Partial<PropertyFilter>) => {
    setFilters((prev) => ({
      ...prev,
      ...newFilters,
      page: "page" in newFilters ? newFilters.page : 1,
    }));
  }, []);

  const goToPage = useCallback((page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  }, []);

  const refetch = useCallback(() => {
    fetchProperties();
  }, [fetchProperties]);

  return {
    data,
    loading,
    error,
    totalItems,
    totalPages,
    filters,
    updateFilters,
    goToPage,
    refetch,
  };
}