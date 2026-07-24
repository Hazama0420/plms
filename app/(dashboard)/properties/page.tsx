// app/(dashboard)/properties/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { motion } from "framer-motion";

import { useProperties } from "@/hooks/use-properties";
import { supabase } from "@/lib/supabase/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import {
  Home,
  FileText,
  CheckCircle,
  XCircle,
  Plus,
  Search,
  Building2,
  MapPin,
  MoreHorizontal,
  Pencil,
  Eye,
  Share2,
  ShieldCheck,
  User,
  MessageCircle,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Bed,
  Bath,
  Maximize2,
  LayoutGrid,
  List,
  ChevronRight,
  Sparkles,
  Tag,
} from "lucide-react";

// ============================================================
// TIPE DATA & STATUS CONFIG
// ============================================================
export interface PropertyItem {
  id: string;
  title: string;
  listing_code: string;
  listing_type?: "sale" | "rent" | string;
  property_type?: string;
  status: "published" | "draft" | "sold" | "rented" | string;
  price?: number;
  location?: string;
  land_area?: number;
  building_area?: number;
  bedrooms?: number;
  bathrooms?: number;
  thumbnail?: string | null;
  certificate_status?: string;
  owner_name?: string;
  owner_phone?: string;
  description?: string;
}

const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
  published: { label: "Published", bg: "bg-emerald-100 dark:bg-emerald-950/60 border-emerald-200", text: "text-emerald-700 dark:text-emerald-300" },
  draft: { label: "Draft", bg: "bg-amber-100 dark:bg-amber-950/60 border-amber-200", text: "text-amber-700 dark:text-amber-300" },
  sold: { label: "Terjual", bg: "bg-blue-100 dark:bg-blue-950/60 border-blue-200", text: "text-blue-700 dark:text-blue-300" },
  rented: { label: "Tersewa", bg: "bg-purple-100 dark:bg-purple-950/60 border-purple-200", text: "text-purple-700 dark:text-purple-300" },
};

export default function PropertiesPage() {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState("");
  const [activeTab, setActiveTab] = useState<string>("all");
  const [selectedProperty, setSelectedProperty] = useState<PropertyItem | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid"); // Mode tampilan: Grid Foto vs Tabel Rinci

  // Core Supabase Hook
  const {
    data: rawProperties = [],
    loading,
    error,
    totalItems,
    filters,
    updateFilters,
    refetch,
  } = useProperties();

  // Mapping data dari Supabase Hook ke format siap pakai (Menggunakan Foto Real dari Supabase)
  const properties: PropertyItem[] = (rawProperties || []).map((p: any) => {
    const primaryMedia = p.media?.find((m: any) => m.is_primary) || p.media?.[0];
    const priceObj = Array.isArray(p.price) ? p.price[0] : p.price;
    const specObj = Array.isArray(p.specs) ? p.specs[0] : p.specs;
    const legalObj = Array.isArray(p.legalities) ? p.legalities[0] : p.legalities;
    const ownerObj = Array.isArray(p.owner) ? p.owner[0] : p.owner;

    return {
      id: p.id,
      title: p.title || "Properti Tanpa Judul",
      listing_code: p.listing_code || "INL-000",
      listing_type: p.listing_type || "sale",
      property_type: p.property_type || "Rumah",
      status: p.status || "published",
      price: priceObj?.selling_price || priceObj?.rental_price || p.price || 0,
      location: p.address ? `${p.address}${p.city ? `, ${p.city}` : ""}` : p.location || "Lokasi Belum Diatur",
      land_area: specObj?.land_area || p.land_area,
      building_area: specObj?.building_area || p.building_area,
      bedrooms: specObj?.bedrooms || p.bedrooms,
      bathrooms: specObj?.bathrooms || p.bathrooms,
      thumbnail: primaryMedia?.public_url || p.thumbnail || "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=800&q=80",
      certificate_status: legalObj?.certificate_type || p.certificate_status || "SHM",
      owner_name: ownerObj?.owner_name || p.owner_name || "Internal Company",
      owner_phone: ownerObj?.owner_phone || p.owner_phone || "",
      description: p.description || "",
    };
  });

  // ===== STATISTIK CARDS =====
  const stats = {
    total: totalItems || properties.length,
    published: properties.filter((p) => p.status === "published").length,
    draft: properties.filter((p) => p.status === "draft").length,
    sold: properties.filter((p) => p.status === "sold" || p.status === "rented").length,
  };

  const statCards = [
    { label: "Total Properti", value: stats.total, icon: Home, color: "emerald", trend: "+12%", trendUp: true },
    { label: "Published", value: stats.published, icon: CheckCircle, color: "blue", trend: "+8%", trendUp: true },
    { label: "Draft", value: stats.draft, icon: FileText, color: "amber", trend: "-3%", trendUp: false },
    { label: "Sold / Rented", value: stats.sold, icon: XCircle, color: "rose", trend: "+5%", trendUp: true },
  ];

  // ===== HANDLERS =====
  const handleSearchSubmit = useCallback(() => {
    updateFilters?.({ search: searchInput, page: 1 });
  }, [searchInput, updateFilters]);

  const formatIDR = (val?: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  // Direct Route Navigation
  const goToDetail = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    router.push(`/properties/${id}`);
  };

  // Kirim Brosur WA Workflow
  const handleSendWABrochure = (property: PropertyItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const text = encodeURIComponent(
      `🏠 *BROSUR PROPERTI: ${property.title.toUpperCase()}*\n\n` +
      `📍 *Lokasi*: ${property.location}\n` +
      `💰 *Harga*: ${formatIDR(property.price)}\n` +
      `📐 *Spesifikasi*: LT ${property.land_area || "-"}m² | LB ${property.building_area || "-"}m² | ${property.bedrooms || 0} KT | ${property.bathrooms || 0} KM\n` +
      `📋 *Legalitas*: ${property.certificate_status || "SHM Lengkap"}\n` +
      `🔖 *Kode Listing*: ${property.listing_code}\n\n` +
      `Informasi lebih lanjut & penjadwalan survei hubungi Tim Inland Property.`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  // Filter Tab Client Side
  const filteredProperties = properties.filter((item) => {
    const matchSearch =
      item.title.toLowerCase().includes(searchInput.toLowerCase()) ||
      (item.location && item.location.toLowerCase().includes(searchInput.toLowerCase())) ||
      item.listing_code.toLowerCase().includes(searchInput.toLowerCase());

    if (activeTab === "all") return matchSearch;
    if (activeTab === "published") return matchSearch && item.status === "published";
    if (activeTab === "draft") return matchSearch && item.status === "draft";
    if (activeTab === "sold_rented") return matchSearch && (item.status === "sold" || item.status === "rented");
    return matchSearch;
  });

  return (
    <div className="space-y-6 pb-16">
      {/* 1. HEADER PAGE */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            🏠 Katalog Aset Properti
          </h1>
          <p className="text-sm text-muted-foreground">
            Kelola inventaris properti, status penerbitan, brosur digital, dan data legalitas pemilik.
          </p>
        </div>

        <Button
          onClick={() => router.push("/properties/create")}
          className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 gap-2 shrink-0"
        >
          <Plus className="h-4 w-4" /> Tambah Properti Baru
        </Button>
      </div>

      {/* 2. STAT CARDS BENTO */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {statCards.map((stat, index) => {
          const IconComp = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="border shadow-xs bg-card/80 hover:border-emerald-500/40 transition">
                <CardContent className="p-3 md:p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">{stat.label}</p>
                    <h3 className="text-lg md:text-xl font-bold text-foreground mt-0.5">{stat.value}</h3>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-0.5 mt-0.5">
                      {stat.trendUp ? (
                        <span className="text-emerald-600 font-bold flex items-center">{stat.trend} <TrendingUp className="w-2.5 h-2.5 ml-0.5" /></span>
                      ) : (
                        <span className="text-rose-600 font-bold flex items-center">{stat.trend} <TrendingDown className="w-2.5 h-2.5 ml-0.5" /></span>
                      )}
                      <span>vs bulan lalu</span>
                    </p>
                  </div>
                  <div className="p-2.5 bg-muted rounded-xl text-emerald-600 shrink-0">
                    <IconComp className="w-4 h-4 md:w-5 md:h-5" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* 3. SEARCH, TAB FILTER, & TOGGLE VIEW MODE */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Input Search */}
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari judul, lokasi, atau kode listing..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearchSubmit()}
              className="pl-9 h-9 text-xs"
            />
          </div>

          {/* DESKTOP FILTER TABS */}
          <div className="hidden md:block">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
              <TabsList className="bg-muted p-1 h-9">
                <TabsTrigger value="all" className="text-xs px-3">Semua ({stats.total})</TabsTrigger>
                <TabsTrigger value="published" className="text-xs px-3">Published ({stats.published})</TabsTrigger>
                <TabsTrigger value="draft" className="text-xs px-3">Draft ({stats.draft})</TabsTrigger>
                <TabsTrigger value="sold_rented" className="text-xs px-3">Sold / Rented ({stats.sold})</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Action Buttons & View Toggle */}
          <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
            <Button
              variant="outline"
              size="icon"
              onClick={() => refetch?.()}
              className="h-9 w-9 shrink-0"
              title="Refresh Data Supabase"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>

            <div className="flex items-center border rounded-xl p-0.5 bg-muted/60">
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className="h-8 px-2.5 text-xs gap-1"
                title="Tampilan Grid Foto (Brighton Style)"
              >
                <LayoutGrid className="w-3.5 h-3.5" /> Grid
              </Button>
              <Button
                variant={viewMode === "table" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("table")}
                className="h-8 px-2.5 text-xs gap-1"
                title="Tampilan Tabel Rinci"
              >
                <List className="w-3.5 h-3.5" /> Tabel
              </Button>
            </div>
          </div>
        </div>

        {/* MOBILE HORIZONTAL SCROLL BADGES */}
        <div className="block md:hidden overflow-x-auto scrollbar-none pb-1">
          <div className="flex items-center gap-1.5 min-w-max">
            {[
              { id: "all", label: `Semua (${stats.total})` },
              { id: "published", label: `Published (${stats.published})` },
              { id: "draft", label: `Draft (${stats.draft})` },
              { id: "sold_rented", label: `Sold/Rented (${stats.sold})` },
            ].map((tab) => (
              <Badge
                key={tab.id}
                variant={activeTab === tab.id ? "default" : "outline"}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "cursor-pointer px-3 py-1 text-xs transition-all",
                  activeTab === tab.id
                    ? "bg-emerald-600 text-white font-semibold"
                    : "bg-background text-muted-foreground hover:bg-muted"
                )}
              >
                {tab.label}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {/* 4. MAIN CATALOG CONTENT */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-72 w-full rounded-2xl" />
          ))}
        </div>
      ) : error ? (
        <Card className="border border-rose-200 bg-rose-50/50 p-6 text-center text-xs text-rose-600">
          ❌ Gagal memuat data dari Supabase: {error}
        </Card>
      ) : filteredProperties.length === 0 ? (
        <Card className="border shadow-sm p-12 text-center space-y-3">
          <Building2 className="w-12 h-12 text-muted-foreground/40 mx-auto stroke-[1.2]" />
          <h3 className="text-sm font-semibold text-foreground">Tidak Ada Properti Ditemukan</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Belum ada listing properti sesuai pencarian. Klik "Tambah Properti Baru" untuk mengisi katalog.
          </p>
        </Card>
      ) : (
        <>
          {/* ============================================================ */}
          {/* 🖼️ MODE 1: GRID PHOTO CARDS (FOTO DARI SUPABASE REAL)       */}
          {/* ============================================================ */}
          {viewMode === "grid" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProperties.map((prop) => {
                const st = statusConfig[prop.status] || statusConfig.published;

                return (
                  <Card
                    key={prop.id}
                    onClick={() => goToDetail(prop.id)}
                    className="group overflow-hidden border shadow-xs hover:shadow-xl hover:border-emerald-500/50 transition-all duration-300 flex flex-col justify-between bg-card cursor-pointer"
                  >
                    <div>
                      {/* Image Thumbnail Header */}
                      <div className="relative aspect-[16/10] overflow-hidden bg-muted">
                        <img
                          src={prop.thumbnail || "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=800&q=80"}
                          alt={prop.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80" />

                        {/* Top Badges */}
                        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between">
                          <Badge
                            className={cn(
                              "text-[10px] uppercase font-bold px-2 py-0.5 border-0 shadow-sm",
                              prop.listing_type === "sale" || prop.listing_type === "jual"
                                ? "bg-emerald-600 text-white"
                                : "bg-blue-600 text-white"
                            )}
                          >
                            {prop.listing_type === "sale" || prop.listing_type === "jual" ? "DIJUAL" : "DISEWA"}
                          </Badge>
                          <Badge variant="outline" className={cn("text-[10px] font-semibold border px-2 py-0.5 backdrop-blur-md", st.bg, st.text)}>
                            {st.label}
                          </Badge>
                        </div>

                        {/* Bottom Overlay Price & Code */}
                        <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-end justify-between">
                          <div>
                            <span className="text-[10px] text-white/80 block">Harga Penawaran:</span>
                            <span className="text-base font-extrabold font-mono text-white drop-shadow-md">
                              {formatIDR(prop.price)}
                            </span>
                          </div>
                          <Badge variant="outline" className="font-mono text-[9px] bg-black/60 text-white border-0 backdrop-blur-md">
                            {prop.listing_code}
                          </Badge>
                        </div>
                      </div>

                      {/* Content Body */}
                      <CardContent className="p-3.5 space-y-2">
                        <h3 className="font-bold text-xs text-foreground line-clamp-1 group-hover:text-emerald-600 transition">
                          {prop.title}
                        </h3>

                        <p className="text-[11px] text-muted-foreground flex items-center gap-1 line-clamp-1">
                          <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          {prop.location}
                        </p>

                        {/* Specs Pills */}
                        <div className="grid grid-cols-4 gap-1 pt-2 border-t border-border/50 text-[10px] text-muted-foreground text-center">
                          <div className="bg-muted/50 py-1 rounded">
                            <span className="block font-bold text-foreground font-mono">{prop.land_area || "-"}</span>
                            <span>LT (m²)</span>
                          </div>
                          <div className="bg-muted/50 py-1 rounded">
                            <span className="block font-bold text-foreground font-mono">{prop.building_area || "-"}</span>
                            <span>LB (m²)</span>
                          </div>
                          <div className="bg-muted/50 py-1 rounded">
                            <span className="block font-bold text-foreground font-mono">{prop.bedrooms || 0}</span>
                            <span>KT</span>
                          </div>
                          <div className="bg-muted/50 py-1 rounded">
                            <span className="block font-bold text-foreground font-mono">{prop.bathrooms || 0}</span>
                            <span>KM</span>
                          </div>
                        </div>
                      </CardContent>
                    </div>

                    {/* Footer Actions */}
                    <CardFooter className="p-2.5 bg-muted/30 border-t border-border/50 flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => goToDetail(prop.id, e)}
                        className="h-7 text-[11px] gap-1"
                      >
                        <Eye className="w-3.5 h-3.5 text-emerald-600" /> Detail
                      </Button>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => handleSendWABrochure(prop, e)}
                          title="Kirim Brosur WA"
                          className="h-7 w-7 text-emerald-600 hover:bg-emerald-50"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </Button>

                       <DropdownMenu>
  <DropdownMenuTrigger className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus:outline-hidden">
    <MoreHorizontal className="w-3.5 h-3.5" />
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem onClick={() => router.push(`/properties/${prop.id}`)}>
                              <Eye className="w-3.5 h-3.5 mr-2 text-emerald-600" /> Detail Full
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push(`/properties/${prop.id}/edit`)}>
                              <Pencil className="w-3.5 h-3.5 mr-2" /> Edit Listing
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}

          {/* ============================================================ */}
          {/* 📋 MODE 2: TABLE VIEW WITH REAL SUPABASE THUMBNAILS          */}
          {/* ============================================================ */}
          {viewMode === "table" && (
            <Card className="border shadow-xs overflow-hidden">
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="text-xs font-semibold">Foto</TableHead>
                      <TableHead className="text-xs font-semibold">Properti & Kode</TableHead>
                      <TableHead className="text-xs font-semibold">Tipe</TableHead>
                      <TableHead className="text-xs font-semibold">Spesifikasi</TableHead>
                      <TableHead className="text-xs font-semibold">Harga Penawaran</TableHead>
                      <TableHead className="text-xs font-semibold">Lokasi</TableHead>
                      <TableHead className="text-xs font-semibold text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProperties.map((prop) => {
                      const st = statusConfig[prop.status] || statusConfig.published;

                      return (
                        <TableRow
                          key={prop.id}
                          onClick={() => goToDetail(prop.id)}
                          className="hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 cursor-pointer transition-colors"
                        >
                          {/* Thumbnail Column */}
                          <TableCell className="p-2.5">
                            <div className="w-14 h-10 rounded-lg overflow-hidden bg-muted shrink-0 border">
                              <img src={prop.thumbnail || "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=800&q=80"} alt={prop.title} className="w-full h-full object-cover" />
                            </div>
                          </TableCell>

                          {/* Title & Code */}
                          <TableCell className="p-3">
                            <Link
                              href={`/properties/${prop.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="font-bold text-xs text-foreground hover:text-emerald-600 transition hover:underline line-clamp-1 block"
                            >
                              {prop.title}
                            </Link>
                            <span className="font-mono text-[10px] text-muted-foreground">
                              Kode: {prop.listing_code}
                            </span>
                          </TableCell>

                          {/* Type & Status */}
                          <TableCell className="p-3">
                            <div className="flex flex-col gap-1">
                              <Badge className={cn("text-[9px] uppercase font-bold w-fit px-1.5 py-0", prop.listing_type === "sale" || prop.listing_type === "jual" ? "bg-emerald-600" : "bg-blue-600")}>
                                {prop.listing_type === "sale" || prop.listing_type === "jual" ? "DIJUAL" : "DISEWA"}
                              </Badge>
                              <Badge variant="outline" className={cn("text-[9px] font-semibold w-fit px-1.5 py-0 border", st.bg, st.text)}>
                                {st.label}
                              </Badge>
                            </div>
                          </TableCell>

                          {/* Specs */}
                          <TableCell className="p-3 text-xs">
                            <div className="flex items-center gap-3 text-muted-foreground font-mono">
                              <span className="flex items-center gap-1"><Bed className="w-3.5 h-3.5 text-emerald-600" /> {prop.bedrooms || 0}</span>
                              <span className="flex items-center gap-1"><Bath className="w-3.5 h-3.5 text-blue-600" /> {prop.bathrooms || 0}</span>
                              <span className="flex items-center gap-1"><Maximize2 className="w-3.5 h-3.5 text-amber-600" /> {prop.land_area || 0} m²</span>
                            </div>
                          </TableCell>

                          {/* Price */}
                          <TableCell className="p-3 font-mono font-bold text-xs text-emerald-600">
                            {formatIDR(prop.price)}
                          </TableCell>

                          {/* Location */}
                          <TableCell className="p-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1 truncate max-w-[180px]">
                              <MapPin className="w-3 h-3 text-rose-500 shrink-0" /> {prop.location}
                            </span>
                          </TableCell>

                          {/* Actions */}
                          <TableCell className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => goToDetail(prop.id, e)}
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50"
                                title="Lihat Detail Properti"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>

                              <DropdownMenu>
  <DropdownMenuTrigger className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus:outline-hidden">
    <MoreHorizontal className="w-3.5 h-3.5" />
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end" className="w-40">
                                  <DropdownMenuItem onClick={() => router.push(`/properties/${prop.id}`)}>
                                    <Eye className="w-3.5 h-3.5 mr-2 text-emerald-600" /> Detail Full
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => router.push(`/properties/${prop.id}/edit`)}>
                                    <Pencil className="w-3.5 h-3.5 mr-2" /> Edit Listing
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
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* 5. MOBILE WORKFLOW BOTTOM SHEET */}
      <Sheet open={!!selectedProperty} onOpenChange={() => setSelectedProperty(null)}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[88vh] p-5">
          <SheetHeader className="text-left">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-[10px] uppercase font-mono">
                {selectedProperty?.listing_code}
              </Badge>
              {selectedProperty && (
                <Badge variant="outline" className={cn("text-[10px]", statusConfig[selectedProperty.status]?.bg, statusConfig[selectedProperty.status]?.text)}>
                  {statusConfig[selectedProperty.status]?.label}
                </Badge>
              )}
            </div>
            <SheetTitle className="text-base font-bold mt-1 line-clamp-2">
              {selectedProperty?.title}
            </SheetTitle>
            <SheetDescription className="text-xs flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" /> {selectedProperty?.location}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 py-4 text-xs">
            {/* Price Box */}
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 rounded-xl flex items-center justify-between">
              <span className="text-muted-foreground">Harga Penawaran:</span>
              <span className="text-base font-bold text-emerald-700 dark:text-emerald-300 font-mono">
                {formatIDR(selectedProperty?.price)}
              </span>
            </div>

            {/* Legalitas & Owner Details */}
            <div className="p-3 bg-muted/60 rounded-xl space-y-2">
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-muted-foreground flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Dokumen Legalitas:
                </span>
                <span className="font-semibold text-foreground">{selectedProperty?.certificate_status || "SHM"}</span>
              </div>
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-muted-foreground flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-muted-foreground" /> Nama Pemilik Asal:
                </span>
                <span className="font-semibold text-foreground">{selectedProperty?.owner_name || "Internal Company"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Spesifikasi Luas:</span>
                <span className="font-mono">LT {selectedProperty?.land_area || "-"}m² / LB {selectedProperty?.building_area || "-"}m²</span>
              </div>
            </div>

            {/* Primary Actions */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <Button
                variant="outline"
                className="w-full text-xs gap-1"
                onClick={() => {
                  if (selectedProperty) {
                    router.push(`/properties/${selectedProperty.id}`);
                    setSelectedProperty(null);
                  }
                }}
              >
                <Eye className="w-3.5 h-3.5" /> Detail Lengkap
              </Button>

              <Button
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1 shadow-md shadow-emerald-600/20"
                onClick={() => {
                  if (selectedProperty) handleSendWABrochure(selectedProperty);
                }}
              >
                <MessageCircle className="w-3.5 h-3.5" /> Kirim Brosur WA
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}