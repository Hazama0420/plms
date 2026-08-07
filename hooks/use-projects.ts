// hooks/use-projects.ts
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import projectService from "@/services/project.service";
import type { Project, ProjectFilter } from "@/types/project.types";

const DEFAULT_FILTERS: Required<
  Pick<ProjectFilter, "page" | "limit" | "search" | "status" | "sort_by" | "sort_order">
> = {
  page: 1,
  limit: 12,
  search: "",
  status: "all",
  sort_by: "created_at",
  sort_order: "desc",
};

export interface ProjectSummary {
  total: number;
  active: number;
  totalBudget: number;
  totalSpent: number;
  overdue: number;
}

const EMPTY_SUMMARY: ProjectSummary = {
  total: 0,
  active: 0,
  totalBudget: 0,
  totalSpent: 0,
  overdue: 0,
};

/** Jeda sebelum ketikan dianggap selesai. */
const SEARCH_DEBOUNCE_MS = 350;

export function useProjects(initialFilters: ProjectFilter = {}) {
  const [filters, setFilters] = useState<ProjectFilter>({
    ...DEFAULT_FILTERS,
    ...initialFilters,
  });

  // Kotak pencarian dikendalikan terpisah dari filter yang dikirim ke basis
  // data. Versi lama menaruh `search` langsung di dependency array fetch,
  // sehingga SETIAP ketukan tombol memicu satu kueri — mengetik "cluster"
  // berarti tujuh permintaan, dan yang terakhir belum tentu yang terakhir
  // sampai.
  const [searchInput, setSearchInput] = useState(initialFilters.search ?? "");

  const [data, setData] = useState<Project[]>([]);
  const [summary, setSummary] = useState<ProjectSummary>(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // ===== DEBOUNCE PENCARIAN =====
  useEffect(() => {
    const current = filters.search ?? "";
    if (searchInput === current) return;

    const timer = setTimeout(() => {
      // Kembali ke halaman 1: hasil pencarian baru hampir pasti punya jumlah
      // halaman berbeda, dan bertahan di halaman 5 akan tampak kosong.
      setFilters((prev) => ({ ...prev, search: searchInput, page: 1 }));
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [searchInput, filters.search]);

  // ===== AMBIL DATA =====
  //
  // Penanda urutan permintaan. Tanpa ini, respons filter lama yang datang
  // terlambat bisa menimpa hasil filter yang baru — daftar menampilkan sesuatu
  // yang tidak cocok dengan filter yang sedang aktif di layar.
  const requestId = useRef(0);

  const fetchProjects = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    setError(null);

    try {
      const [list, ringkasan] = await Promise.all([
        projectService.getList(filters),
        projectService.getSummary(),
      ]);

      if (id !== requestId.current) return;

      setData(list.data);
      setTotalItems(list.count);
      setTotalPages(list.totalPages);
      setSummary(ringkasan);
    } catch (err) {
      if (id !== requestId.current) return;

      setError(
        err instanceof Error ? err.message : "Gagal mengambil data proyek"
      );
      setData([]);
      setTotalItems(0);
      setTotalPages(1);
      setSummary(EMPTY_SUMMARY);
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // ===== UBAH FILTER =====
  const updateFilters = useCallback((next: Partial<ProjectFilter>) => {
    setFilters((prev) => {
      const resetPage = !("page" in next);
      return { ...prev, ...next, page: resetPage ? 1 : next.page ?? prev.page };
    });
  }, []);

  const goToPage = useCallback(
    (page: number) => {
      const target = Math.max(1, Math.min(page, totalPages));
      setFilters((prev) => (target === prev.page ? prev : { ...prev, page: target }));
    },
    [totalPages]
  );

  const resetFilters = useCallback(() => {
    setSearchInput("");
    setFilters({ ...DEFAULT_FILTERS });
  }, []);

  const hasActiveFilters = Boolean(
    (filters.search && filters.search.trim() !== "") || filters.status !== "all"
  );

  return {
    data,
    summary,
    loading,
    error,
    totalItems,
    totalPages,
    filters,
    page: filters.page ?? 1,
    searchInput,
    setSearchInput,
    hasActiveFilters,
    updateFilters,
    goToPage,
    resetFilters,
    refetch: fetchProjects,
  };
}
