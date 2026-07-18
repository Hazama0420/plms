// app/(dashboard)/properties/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion } from "framer-motion";

import { useProperties } from "@/hooks/use-properties";
import { supabase } from "@/lib/supabase/client";

import { PropertySearchHeader } from "@/components/properties/PropertySearchHeader";
import { PropertyFilterChips } from "@/components/properties/PropertyFilterChips";
import { StatCard } from "@/components/properties/StatCard";
import { PropertyGrid } from "@/components/properties/PropertyGrid";
import { PropertyCardSkeleton } from "@/components/properties/PropertyCardSkeleton";

import {
  Home,
  FileText,
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

export default function PropertiesPage() {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState("");
  const [selectedChip, setSelectedChip] = useState<string>("all");

  const {
    data: properties,
    loading,
    error,
    totalItems,
    filters,
    updateFilters,
    refetch,
  } = useProperties();

  // ===== STATISTIK =====
  const stats = {
    total: totalItems,
    published: properties.filter((p) => p.status === "published").length,
    draft: properties.filter((p) => p.status === "draft").length,
    sold: properties.filter((p) => p.status === "sold" || p.status === "rented").length,
  };

  // ===== HANDLERS =====
  const handleSearch = useCallback(() => {
    updateFilters({ search: searchInput, page: 1 });
  }, [searchInput, updateFilters]);

  const handleChipClick = (type: string) => {
    setSelectedChip(type);
    if (type === "all") {
      updateFilters({ property_type: undefined, page: 1 });
    } else {
      updateFilters({ property_type: type, page: 1 });
    }
  };

  const handleFilterChange = (filters: any) => {
    updateFilters({ ...filters, page: 1 });
  };

  // ===== STAT CARD CONFIG =====
  const statCards = [
    {
      label: "Total Properti",
      value: stats.total,
      icon: Home,
      color: "emerald" as const,
      trend: "+12%",
      trendUp: true,
    },
    {
      label: "Published",
      value: stats.published,
      icon: CheckCircle,
      color: "blue" as const,
      trend: "+8%",
      trendUp: true,
    },
    {
      label: "Draft",
      value: stats.draft,
      icon: FileText,
      color: "amber" as const,
      trend: "-3%",
      trendUp: false,
    },
    {
      label: "Sold / Rented",
      value: stats.sold,
      icon: XCircle,
      color: "rose" as const,
      trend: "+5%",
      trendUp: true,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950/50">
      <PropertySearchHeader
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        onSearchSubmit={handleSearch}
        onFilterChange={handleFilterChange}
        filters={filters}
      />

      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <PropertyFilterChips
          selectedChip={selectedChip}
          onChipClick={handleChipClick}
        />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          {statCards.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <StatCard {...stat} />
            </motion.div>
          ))}
        </div>

        <div className="mt-6">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <PropertyCardSkeleton key={i} />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-12 text-rose-600 dark:text-rose-400">
              ❌ {error}
            </div>
          ) : properties.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div className="text-6xl mb-4">🏠</div>
              <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300">
                Belum ada properti
              </h3>
              <p className="text-slate-500 dark:text-slate-400 mt-2">
                Mulai dengan menambahkan properti pertama Anda
              </p>
              <button
                onClick={() => router.push("/properties/create")}
                className="mt-4 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md shadow-emerald-600/30 transition"
              >
                + Tambah Properti
              </button>
            </div>
          ) : (
            <PropertyGrid
              properties={properties}
              onRefetch={refetch}
              totalItems={totalItems}
              currentPage={filters.page || 1}
              totalPages={Math.ceil(totalItems / (filters.limit || 12))}
              onPageChange={(page) => updateFilters({ page })}
            />
          )}
        </div>
      </div>
    </div>
  );
}