// app/(dashboard)/properties/page.tsx

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  RefreshCw,
  Eye,
  Pencil,
  Trash2,
  Copy,
  Home,
  MapPin,
  MoreHorizontal,
} from "lucide-react";
import { useProperties } from "@/hooks/use-properties";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent } from "@/components/ui/card";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { propertyService } from "@/services/property.service";
import { cn } from "@/lib/utils";

// ============================================================
// KONFIGURASI STATUS
// ============================================================

const statusConfig: Record<
  string,
  { label: string; color: string; bg: string; darkColor: string; darkBg: string }
> = {
  draft: {
    label: "Draft",
    color: "text-slate-600",
    bg: "bg-slate-100",
    darkColor: "dark:text-slate-300",
    darkBg: "dark:bg-slate-800",
  },
  review: {
    label: "Review",
    color: "text-amber-600",
    bg: "bg-amber-100",
    darkColor: "dark:text-amber-400",
    darkBg: "dark:bg-amber-900/30",
  },
  published: {
    label: "Published",
    color: "text-emerald-600",
    bg: "bg-emerald-100",
    darkColor: "dark:text-emerald-400",
    darkBg: "dark:bg-emerald-900/30",
  },
  sold: {
    label: "Sold",
    color: "text-blue-600",
    bg: "bg-blue-100",
    darkColor: "dark:text-blue-400",
    darkBg: "dark:bg-blue-900/30",
  },
  rented: {
    label: "Rented",
    color: "text-purple-600",
    bg: "bg-purple-100",
    darkColor: "dark:text-purple-400",
    darkBg: "dark:bg-purple-900/30",
  },
  archived: {
    label: "Archived",
    color: "text-rose-600",
    bg: "bg-rose-100",
    darkColor: "dark:text-rose-400",
    darkBg: "dark:bg-rose-900/30",
  },
};

const typeLabels: Record<string, string> = {
  jual: "Jual",
  sewa: "Sewa",
};

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function PropertiesPage() {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState("");
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  const {
    data: properties,
    loading,
    error,
    totalItems,
    totalPages,
    filters,
    updateFilters,
    goToPage,
    refetch,
  } = useProperties();

  // ===== HANDLERS =====
  const handleSearch = () => updateFilters({ search: searchInput });
  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  const handleStatusChange = (status: string) =>
    updateFilters({ status: status as any });

  const handleTypeChange = (type: string) =>
    updateFilters({ listing_type: type as any });

  const handleSortChange = (sort: string) => {
    const [sort_by, sort_order] = sort.split("-") as [
      "created_at" | "title" | "listing_code",
      "asc" | "desc"
    ];
    updateFilters({ sort_by, sort_order });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin hapus property ini?")) return;
    try {
      await propertyService.delete(id);
      refetch();
    } catch {
      alert("Gagal hapus");
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      await propertyService.duplicate(id);
      refetch();
    } catch {
      alert("Gagal duplicate");
    }
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      await propertyService.updateStatus(id, status as any);
      refetch();
    } catch {
      alert("Gagal update status");
    }
  };

  // ===== FORMAT HARGA =====
  const formatPrice = (price: number | null) => {
    if (!price) return "-";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  // ===== STATISTIK =====
  const stats = {
    total: totalItems,
    published: properties.filter((p) => p.status === "published").length,
    draft: properties.filter((p) => p.status === "draft").length,
    sold: properties.filter((p) => p.status === "sold").length,
  };

  // ===== HANDLE IMAGE ERROR =====
  const handleImageError = (propertyId: string) => {
    setImageErrors((prev) => ({ ...prev, [propertyId]: true }));
  };

  return (
    <div className="space-y-6">
      {/* ===== HEADER ===== */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
            🏠 Daftar Property
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Kelola semua listing property Anda di satu tempat
          </p>
        </div>
        <Button
          onClick={() => router.push("/properties/create")}
          className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 shadow-sm"
        >
          <Plus size={18} className="mr-2" />
          Tambah Property
        </Button>
      </div>

      {/* ===== STATISTIK CARD ===== */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="border-l-4 border-blue-500 shadow-sm dark:bg-slate-800 dark:border-slate-700">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total</p>
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-emerald-500 shadow-sm dark:bg-slate-800 dark:border-slate-700">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Published</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {stats.published}
            </p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-amber-500 shadow-sm dark:bg-slate-800 dark:border-slate-700">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Draft</p>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.draft}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-blue-500 shadow-sm dark:bg-slate-800 dark:border-slate-700">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Sold</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.sold}</p>
          </CardContent>
        </Card>
      </div>

      {/* ===== FILTERS ===== */}
      <Card className="shadow-sm dark:bg-slate-800 dark:border-slate-700">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
            {/* Search */}
            <div className="flex flex-1 min-w-[200px] gap-2">
              <Input
                placeholder="Cari judul atau kode..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="flex-1 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200 dark:placeholder:text-slate-500"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleSearch}
                className="dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                <Search size={18} />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => refetch()}
                className="dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                <RefreshCw size={18} />
              </Button>
            </div>

            {/* Status Filter */}
            <Select
              value={filters.status || "all"}
              onValueChange={handleStatusChange}
            >
              <SelectTrigger className="w-[140px] dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                <SelectItem value="all" className="dark:text-slate-200 dark:hover:bg-slate-700">Semua Status</SelectItem>
                <SelectItem value="draft" className="dark:text-slate-200 dark:hover:bg-slate-700">Draft</SelectItem>
                <SelectItem value="review" className="dark:text-slate-200 dark:hover:bg-slate-700">Review</SelectItem>
                <SelectItem value="published" className="dark:text-slate-200 dark:hover:bg-slate-700">Published</SelectItem>
                <SelectItem value="sold" className="dark:text-slate-200 dark:hover:bg-slate-700">Sold</SelectItem>
                <SelectItem value="rented" className="dark:text-slate-200 dark:hover:bg-slate-700">Rented</SelectItem>
                <SelectItem value="archived" className="dark:text-slate-200 dark:hover:bg-slate-700">Archived</SelectItem>
              </SelectContent>
            </Select>

            {/* Type Filter */}
            <Select
              value={filters.listing_type || "all"}
              onValueChange={handleTypeChange}
            >
              <SelectTrigger className="w-[130px] dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200">
                <SelectValue placeholder="Tipe" />
              </SelectTrigger>
              <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                <SelectItem value="all" className="dark:text-slate-200 dark:hover:bg-slate-700">Semua Tipe</SelectItem>
                <SelectItem value="jual" className="dark:text-slate-200 dark:hover:bg-slate-700">Jual</SelectItem>
                <SelectItem value="sewa" className="dark:text-slate-200 dark:hover:bg-slate-700">Sewa</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort */}
            <Select
              value={`${filters.sort_by}-${filters.sort_order}`}
              onValueChange={handleSortChange}
            >
              <SelectTrigger className="w-[160px] dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200">
                <SelectValue placeholder="Urutkan" />
              </SelectTrigger>
              <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                <SelectItem value="created_at-desc" className="dark:text-slate-200 dark:hover:bg-slate-700">Terbaru</SelectItem>
                <SelectItem value="created_at-asc" className="dark:text-slate-200 dark:hover:bg-slate-700">Terlama</SelectItem>
                <SelectItem value="title-asc" className="dark:text-slate-200 dark:hover:bg-slate-700">Judul (A-Z)</SelectItem>
                <SelectItem value="title-desc" className="dark:text-slate-200 dark:hover:bg-slate-700">Judul (Z-A)</SelectItem>
                <SelectItem value="listing_code-asc" className="dark:text-slate-200 dark:hover:bg-slate-700">Kode (A-Z)</SelectItem>
                <SelectItem value="listing_code-desc" className="dark:text-slate-200 dark:hover:bg-slate-700">Kode (Z-A)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* ===== TABLE ===== */}
      <Card className="shadow-sm overflow-hidden dark:bg-slate-800 dark:border-slate-700">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent" />
            </div>
          ) : error ? (
            <div className="flex h-64 items-center justify-center text-rose-600 dark:text-rose-400">
              ❌ {error}
            </div>
          ) : properties.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center gap-3 text-slate-400 dark:text-slate-500">
              <div className="text-6xl">🏠</div>
              <p className="text-lg font-medium">Belum ada property</p>
              <p className="text-sm">Klik &quot;Tambah Property&quot; untuk mulai</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-slate-700 border-b dark:border-slate-600">
                  <TableRow>
                    <TableHead className="font-semibold text-slate-600 dark:text-slate-300">
                      Kode
                    </TableHead>
                    <TableHead className="font-semibold text-slate-600 dark:text-slate-300">
                      Judul & Alamat
                    </TableHead>
                    <TableHead className="font-semibold text-slate-600 dark:text-slate-300">
                      Tipe
                    </TableHead>
                    <TableHead className="font-semibold text-slate-600 dark:text-slate-300">
                      Status
                    </TableHead>
                    <TableHead className="font-semibold text-slate-600 dark:text-slate-300 text-right">
                      Harga
                    </TableHead>
                    <TableHead className="font-semibold text-slate-600 dark:text-slate-300 text-center">
                      Kamar
                    </TableHead>
                    <TableHead className="font-semibold text-slate-600 dark:text-slate-300 text-right">
                      Aksi
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {properties.map((property, index) => {
                    const primaryImage = property.media?.find(
                      (m) => m.is_primary
                    )?.public_url;
                    const hasImageError = imageErrors[property.id];

                    return (
                      <TableRow
                        key={property.id}
                        className={cn(
                          "cursor-pointer transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-700/80",
                          index % 2 === 0
                            ? "bg-white dark:bg-slate-900"
                            : "bg-slate-50/40 dark:bg-slate-800/40"
                        )}
                        onClick={() => router.push(`/properties/${property.id}`)}
                      >
                        {/* Kode */}
                        <TableCell className="font-mono text-sm font-medium text-slate-600 dark:text-slate-300">
                          {property.listing_code}
                        </TableCell>

                        {/* Judul + Alamat */}
                        <TableCell>
                          <div className="flex items-start gap-3">
                            {primaryImage && !hasImageError ? (
                              <img
                                src={primaryImage}
                                alt={property.title}
                                className="h-12 w-12 rounded-lg object-cover border border-slate-200 dark:border-slate-700"
                                onError={() => handleImageError(property.id)}
                              />
                            ) : (
                              <div className="h-12 w-12 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700">
                                <Home size={20} />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="font-medium text-slate-800 dark:text-slate-100 line-clamp-1">
                                {property.title}
                              </p>
                              <div className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                                <MapPin size={12} />
                                <span className="line-clamp-1">
                                  {property.address?.address ||
                                    "Alamat belum diisi"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        {/* Tipe */}
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="text-xs font-medium dark:border-slate-600 dark:text-slate-300"
                          >
                            {typeLabels[property.listing_type] ||
                              property.listing_type}
                          </Badge>
                        </TableCell>

                        {/* Status */}
                        <TableCell>
                          <Badge
                            className={cn(
                              "text-xs font-medium border-0",
                              statusConfig[property.status]?.bg,
                              statusConfig[property.status]?.color,
                              statusConfig[property.status]?.darkBg,
                              statusConfig[property.status]?.darkColor
                            )}
                          >
                            {statusConfig[property.status]?.label ||
                              property.status}
                          </Badge>
                        </TableCell>

                        {/* Harga */}
                        <TableCell className="text-right font-medium text-slate-700 dark:text-slate-300">
                          {property.listing_type === "jual"
                            ? formatPrice(property.price?.selling_price ?? null)
                            : formatPrice(property.price?.rental_price ?? null)}
                        </TableCell>

                        {/* Kamar */}
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                            <span>
                              🛏️ {property.specifications?.bedroom ?? "-"}
                            </span>
                            <span className="text-slate-300 dark:text-slate-600">|</span>
                            <span>
                              🛁 {property.specifications?.bathroom ?? "-"}
                            </span>
                          </div>
                        </TableCell>

                        {/* Aksi */}
                        <TableCell>
                          <div
                            className="flex items-center justify-end gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-400 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400"
                              onClick={() =>
                                router.push(`/properties/${property.id}`)
                              }
                            >
                              <Eye size={16} />
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-400 hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-400"
                              onClick={() =>
                                router.push(`/properties/${property.id}/edit`)
                              }
                            >
                              <Pencil size={16} />
                            </Button>

                            <DropdownMenu>
                              <DropdownMenuTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-300 dark:hover:bg-slate-700">
                                <MoreHorizontal size={16} />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                className="w-44 dark:bg-slate-800 dark:border-slate-700"
                              >
                                <DropdownMenuItem
                                  onClick={() => handleDuplicate(property.id)}
                                  className="dark:text-slate-200 dark:hover:bg-slate-700"
                                >
                                  <Copy size={14} className="mr-2" />
                                  Duplicate
                                </DropdownMenuItem>

                                {property.status !== "published" && (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleStatusUpdate(property.id, "published")
                                    }
                                    className="text-emerald-600 dark:text-emerald-400 dark:hover:bg-slate-700"
                                  >
                                    📌 Publish
                                  </DropdownMenuItem>
                                )}

                                {property.status !== "archived" && (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleStatusUpdate(property.id, "archived")
                                    }
                                    className="text-amber-600 dark:text-amber-400 dark:hover:bg-slate-700"
                                  >
                                    📦 Archive
                                  </DropdownMenuItem>
                                )}

                                <DropdownMenuItem
                                  onClick={() => handleDelete(property.id)}
                                  className="text-rose-600 dark:text-rose-400 dark:hover:bg-slate-700"
                                >
                                  <Trash2 size={14} className="mr-2" />
                                  Hapus
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ===== PAGINATION ===== */}
      {totalPages > 1 && (
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Menampilkan {properties.length} dari {totalItems} data
          </p>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() =>
                    goToPage(Math.max(1, filters.page! - 1))
                  }
                  className={cn(
                    "dark:text-slate-300 dark:hover:bg-slate-700",
                    filters.page === 1 && "pointer-events-none opacity-50"
                  )}
                />
              </PaginationItem>

              {Array.from(
                { length: Math.min(5, totalPages) },
                (_, i) => {
                  const pageNum = i + 1;
                  return (
                    <PaginationItem key={pageNum}>
                      <PaginationLink
                        onClick={() => goToPage(pageNum)}
                        isActive={filters.page === pageNum}
                        className="dark:text-slate-300 dark:hover:bg-slate-700 dark:data-[state=active]:bg-blue-600 dark:data-[state=active]:text-white"
                      >
                        {pageNum}
                      </PaginationLink>
                    </PaginationItem>
                  );
                }
              )}

              {totalPages > 5 && (
                <PaginationItem>
                  <PaginationEllipsis className="dark:text-slate-400" />
                </PaginationItem>
              )}

              <PaginationItem>
                <PaginationNext
                  onClick={() =>
                    goToPage(Math.min(totalPages, filters.page! + 1))
                  }
                  className={cn(
                    "dark:text-slate-300 dark:hover:bg-slate-700",
                    filters.page === totalPages &&
                      "pointer-events-none opacity-50"
                  )}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}