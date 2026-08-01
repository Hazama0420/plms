// app/(dashboard)/properties/page.tsx
"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { supabase } from "@/lib/supabase/client";
import { useProperties } from "@/hooks/use-properties";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { cn } from "@/lib/utils";

import {
  Plus,
  Search,
  Building2,
  MapPin,
  Eye,
  Share2,
  User,
  RefreshCw,
  LayoutGrid,
  List,
  Filter as FilterIcon,
  Globe,
  Star,
  Bed,
  Bath,
  Maximize2,
  SlidersHorizontal,
  RotateCcw,
  Tag,
  Edit,
  Trash2,
  MoreVertical,
  Ruler,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export interface PropertyItem {
  id: string;
  title: string;
  listing_code: string;
  listing_type: "jual" | "sewa" | "sale" | "rent" | string;
  property_type: string;
  status: string;
  price: number;
  location: string;
  land_area: number;
  building_area: number;
  bedrooms: number;
  bathrooms: number;
  thumbnail: string;
  certificate_status: string;
  description: string;
  created_by?: string;
  assigned_to?: string;
  is_featured?: boolean;
  uploader_name: string;
  uploader_avatar: string;
}

const DEFAULT_FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80";

const mapPropertyItem = (
  p: any,
  profilesMap: Record<string, { full_name: string; avatar_url: string }>
): PropertyItem => {
  if (!p) return {} as PropertyItem;

  let thumbnail = DEFAULT_FALLBACK_IMAGE;
  const mediaArr = Array.isArray(p.media) ? p.media : [];

  if (mediaArr.length > 0) {
    const primary = mediaArr.find((m: any) => m.is_primary) || mediaArr[0];
    const url = primary?.public_url || primary?.url || primary?.file_path;
    if (url && typeof url === "string" && url.trim() !== "") {
      thumbnail = url;
    }
  }

  if (thumbnail === DEFAULT_FALLBACK_IMAGE && p.images) {
    if (Array.isArray(p.images) && p.images.length > 0) {
      const img = p.images[0];
      if (typeof img === "string" && img.trim() !== "") thumbnail = img;
    } else if (typeof p.images === "string" && p.images.trim() !== "") {
      try {
        const parsed = JSON.parse(p.images);
        if (Array.isArray(parsed) && parsed.length > 0) {
          thumbnail = parsed[0];
        } else {
          thumbnail = p.images;
        }
      } catch {
        thumbnail = p.images;
      }
    }
  }

  if (thumbnail === DEFAULT_FALLBACK_IMAGE) {
    if (p.image_url && typeof p.image_url === "string" && p.image_url.trim() !== "") {
      thumbnail = p.image_url;
    } else if (p.thumbnail && typeof p.thumbnail === "string" && p.thumbnail.trim() !== "") {
      thumbnail = p.thumbnail;
    }
  }

  const priceObj = Array.isArray(p.price) ? p.price[0] : p.price;
  let priceVal = 0;
  if (typeof p.price === "number") {
    priceVal = p.price;
  } else if (typeof priceObj === "number") {
    priceVal = priceObj;
  } else if (priceObj && typeof priceObj === "object") {
    priceVal = Number(priceObj.selling_price || priceObj.rental_price || priceObj.price || priceObj.amount || 0);
  }

  const specObj = Array.isArray(p.specifications)
    ? p.specifications[0]
    : p.specifications || (Array.isArray(p.specs) ? p.specs[0] : p.specs);

  const bedrooms = Number(specObj?.bedroom ?? specObj?.bedrooms ?? p.bedrooms ?? p.bedroom ?? 0);
  const bathrooms = Number(specObj?.bathroom ?? specObj?.bathrooms ?? p.bathrooms ?? p.bathroom ?? 0);

  const landObj = Array.isArray(p.land) ? p.land[0] : p.land;
  const buildingObj = Array.isArray(p.building) ? p.building[0] : p.building;

  const landArea = Number(landObj?.land_area ?? specObj?.land_area ?? p.land_area ?? p.land_size ?? 0);
  const buildingArea = Number(buildingObj?.building_area ?? specObj?.building_area ?? p.building_area ?? p.building_size ?? 0);

  const addressObj = Array.isArray(p.address) ? p.address[0] : p.address;
  let locationStr = "Lokasi Belum Dikonfigurasi";
  if (addressObj) {
    if (typeof addressObj === "string") {
      locationStr = addressObj;
    } else {
      const parts = [
        addressObj.address,
        addressObj.district_name || addressObj.district,
        addressObj.city_name || addressObj.city,
      ].filter(Boolean);
      locationStr = parts.length > 0 ? parts.join(", ") : "Lokasi Terverifikasi";
    }
  } else if (p.location) {
    locationStr = p.location;
  }

  const legalObj = Array.isArray(p.legalities) ? p.legalities[0] : p.legalities;

  const uploaderId = p.created_by || p.user_id || "";
  const profileFromJoin = Array.isArray(p.user_profiles) ? p.user_profiles[0] : p.user_profiles;
  const profileFromMap = uploaderId ? profilesMap[uploaderId] : null;

  const uploaderName =
    profileFromJoin?.full_name ||
    profileFromMap?.full_name ||
    p.users?.full_name ||
    p.uploader_name ||
    "Agen Resmi";

  const uploaderAvatar =
    profileFromJoin?.avatar_url ||
    profileFromMap?.avatar_url ||
    p.users?.avatar_url ||
    p.uploader_avatar ||
    "";

  return {
    id: p.id,
    title: p.title || "Properti Tanpa Judul",
    listing_code: p.listing_code || p.code || `INL-${p.id?.slice(0, 4)?.toUpperCase() || "000"}`,
    listing_type: p.listing_type || "jual",
    property_type: p.property_type || "Rumah",
    status: p.status || "published",
    price: priceVal,
    location: locationStr,
    land_area: landArea,
    building_area: buildingArea,
    bedrooms: bedrooms,
    bathrooms: bathrooms,
    thumbnail: thumbnail,
    certificate_status: specObj?.certificate || legalObj?.certificate_type || p.certificate_status || "SHM",
    description: p.description || "",
    created_by: uploaderId,
    assigned_to: p.assigned_to || "",
    is_featured: p.is_featured || false,
    uploader_name: uploaderName,
    uploader_avatar: uploaderAvatar,
  };
};

function PropertiesCatalogContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL Params
  const qParam = searchParams.get("q") || searchParams.get("search") || "";
  const initialListingType = searchParams.get("listing_type") || "all";
  const initialPropertyType = searchParams.get("property_type") || "all";

  // Filter States
  const [searchInput, setSearchInput] = useState(qParam);
  const [listingTypeFilter, setListingTypeFilter] = useState<string>(initialListingType);
  const [propertyTypeFilter, setPropertyTypeFilter] = useState<string>(initialPropertyType);

  // Toggle Dropdown Filter
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Advanced Filter States
  const [minPrice, setMinPrice] = useState(searchParams.get("priceMin") || "");
  const [maxPrice, setMaxPrice] = useState(searchParams.get("priceMax") || "");
  const [minBuildingArea, setMinBuildingArea] = useState(searchParams.get("buildingAreaMin") || "");
  const [maxBuildingArea, setMaxBuildingArea] = useState(searchParams.get("buildingAreaMax") || "");
  const [minLandArea, setMinLandArea] = useState(searchParams.get("landAreaMin") || "");
  const [maxLandArea, setMaxLandArea] = useState(searchParams.get("landAreaMax") || "");

  // View mode & user states
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [currentUser, setCurrentUser] = useState<{ id: string; role: string } | null>(null);
  const [profilesMap, setProfilesMap] = useState<Record<string, { full_name: string; avatar_url: string }>>({});

  const viewParam = searchParams.get("view");
  const [scopeMode, setScopeMode] = useState<"my_properties" | "global">(
    viewParam === "global" ? "global" : "my_properties"
  );

  useEffect(() => {
    async function fetchUser() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from("users")
            .select("id, role")
            .eq("id", user.id)
            .maybeSingle();

          const role = (profile?.role || user.user_metadata?.role || "agent").toLowerCase();
          setCurrentUser({ id: user.id, role });

          if (role === "viewer" || role === "guest") {
            setScopeMode("global");
          }
        } else {
          setCurrentUser({ id: "", role: "guest" });
          setScopeMode("global");
        }
      } catch (err) {
        console.error("Gagal memuat pengguna:", err);
        setCurrentUser({ id: "", role: "guest" });
        setScopeMode("global");
      }
    }
    fetchUser();
  }, []);

  // 🔒 PENGECEKAN HAK AKSES KETAT
  const userRole = currentUser?.role?.toLowerCase() || "guest";
  const isGuestOrViewer = !currentUser || userRole === "guest" || userRole === "viewer";
  const isSuperAdmin = userRole === "super_admin" || userRole === "superadmin";
  const canCreateProperty = currentUser && !isGuestOrViewer;

  const {
    data: rawProperties = [],
    loading,
    refetch,
  } = useProperties({
    search: searchInput,
    listing_type: listingTypeFilter as any,
    property_type: propertyTypeFilter as any,
  });

  useEffect(() => {
    async function fetchProfiles() {
      if (!rawProperties || rawProperties.length === 0) return;

      const userIds = Array.from(
        new Set(
          rawProperties
            .map((p: any) => p.created_by || p.user_id)
            .filter(Boolean)
        )
      );

      if (userIds.length === 0) return;

      try {
        const { data } = await supabase
          .from("users")
          .select("id, full_name, avatar_url")
          .in("id", userIds);

        if (data) {
          const map: Record<string, { full_name: string; avatar_url: string }> = {};
          data.forEach((prof: any) => {
            map[prof.id] = {
              full_name: prof.full_name || "Agen Resmi",
              avatar_url: prof.avatar_url || "",
            };
          });
          setProfilesMap(map);
        }
      } catch (err) {
        console.error("Error fetching users:", err);
      }
    }

    fetchProfiles();
  }, [rawProperties]);

  const properties: PropertyItem[] = useMemo(() => {
    return (rawProperties || []).map((p) => mapPropertyItem(p, profilesMap));
  }, [rawProperties, profilesMap]);

  const handleToggleFeatured = async (property: PropertyItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!isSuperAdmin) return;

    try {
      const nextVal = !property.is_featured;
      const { error: updateErr } = await supabase
        .from("properties")
        .update({ is_featured: nextVal })
        .eq("id", property.id);

      if (updateErr) throw updateErr;

      toast.success(nextVal ? "Diatur sebagai Unggulan" : "Status Unggulan dicabut");
      refetch?.();
    } catch (err: any) {
      toast.error("Gagal update unggulan");
    }
  };

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm("Hapus properti ini?")) return;
    try {
      const { error } = await supabase.from("properties").delete().eq("id", id);
      if (error) throw error;
      toast.success("Properti berhasil dihapus");
      refetch?.();
    } catch (err: any) {
      toast.error("Gagal menghapus properti");
    }
  };

  const formatCurrency = (val?: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const goToDetail = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    router.push(`/properties/${id}`);
  };

  const handleSendWABrochure = (property: PropertyItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const text = encodeURIComponent(
      `🏠 *PROPERTI: ${property.title.toUpperCase()}*\n\n` +
      `📍 *Lokasi*: ${property.location}\n` +
      `💰 *Harga*: ${formatCurrency(property.price)}\n` +
      `📐 *Spesifikasi*: LB ${property.building_area || 0} m² | LT ${property.land_area || 0} m² | ${property.bedrooms || 0} KT | ${property.bathrooms || 0} KM\n` +
      `🔖 *Kode*: ${property.listing_code}\n`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const handleResetFilters = () => {
    setSearchInput("");
    setListingTypeFilter("all");
    setPropertyTypeFilter("all");
    setMinPrice("");
    setMaxPrice("");
    setMinBuildingArea("");
    setMaxBuildingArea("");
    setMinLandArea("");
    setMaxLandArea("");
    router.push("/properties");
  };

  // Menghitung jumlah filter aktif
  const activeFilterCount = [
    propertyTypeFilter !== "all",
    Boolean(minPrice || maxPrice),
    Boolean(minBuildingArea || maxBuildingArea),
    Boolean(minLandArea || maxLandArea),
  ].filter(Boolean).length;

  const filteredProperties = useMemo(() => {
    return properties.filter((item) => {
      // Untuk Tamu / Viewer: hanya tampilkan properti status 'published' / 'available'
      if (isGuestOrViewer && item.status !== "published" && item.status !== "available") return false;

      // Untuk Agen: jika dalam mode "my_properties", saring hanya milik sendiri
      if (!isGuestOrViewer && scopeMode === "my_properties" && currentUser?.id && !isSuperAdmin) {
        const isOwner = item.created_by === currentUser.id || item.assigned_to === currentUser.id;
        if (!isOwner) return false;
      }

      const query = searchInput.trim().toLowerCase();
      const matchSearch =
        !query ||
        item.title.toLowerCase().includes(query) ||
        item.location.toLowerCase().includes(query) ||
        item.listing_code.toLowerCase().includes(query);

      let matchListingType = true;
      if (listingTypeFilter && listingTypeFilter !== "all") {
        const typeNorm = item.listing_type.toLowerCase();
        if (listingTypeFilter === "dijual") {
          matchListingType = typeNorm === "jual" || typeNorm === "dijual" || typeNorm === "sale";
        } else if (listingTypeFilter === "disewa") {
          matchListingType = typeNorm === "sewa" || typeNorm === "disewa" || typeNorm === "rent";
        }
      }

      let matchPropertyType = true;
      if (propertyTypeFilter && propertyTypeFilter !== "all") {
        matchPropertyType = item.property_type.toLowerCase() === propertyTypeFilter.toLowerCase();
      }

      const itemPrice = item.price || 0;
      const matchMinPrice = !minPrice || itemPrice >= Number(minPrice);
      const matchMaxPrice = !maxPrice || itemPrice <= Number(maxPrice);

      const itemLB = item.building_area || 0;
      const matchMinLB = !minBuildingArea || itemLB >= Number(minBuildingArea);
      const matchMaxLB = !maxBuildingArea || itemLB <= Number(maxBuildingArea);

      const itemLT = item.land_area || 0;
      const matchMinLT = !minLandArea || itemLT >= Number(minLandArea);
      const matchMaxLT = !maxLandArea || itemLT <= Number(maxLandArea);

      return (
        matchSearch &&
        matchListingType &&
        matchPropertyType &&
        matchMinPrice &&
        matchMaxPrice &&
        matchMinLB &&
        matchMaxLB &&
        matchMinLT &&
        matchMaxLT
      );
    });
  }, [
    properties,
    searchInput,
    scopeMode,
    currentUser,
    isGuestOrViewer,
    isSuperAdmin,
    listingTypeFilter,
    propertyTypeFilter,
    minPrice,
    maxPrice,
    minBuildingArea,
    maxBuildingArea,
    minLandArea,
    maxLandArea,
  ]);

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto px-3 sm:px-6 bg-background/50 min-h-screen">
      {/* 1. HEADER PAGE */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-5 pt-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
              {isGuestOrViewer
                ? "Katalog Properti"
                : scopeMode === "my_properties"
                ? "Portofolio Saya"
                : "Katalog Perusahaan"}
            </h1>
            <Badge variant="outline" className="text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
              {isGuestOrViewer ? "Klien" : scopeMode === "my_properties" ? "Pribadi" : "Perusahaan"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Kelola dan cari portofolio properti dengan mudah dan cepat.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle View Mode */}
          <div className="flex items-center border border-border/80 rounded-xl p-1 bg-card shadow-2xs">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className={cn("h-8 px-3 text-xs gap-1.5 rounded-lg cursor-pointer", viewMode === "grid" ? "bg-emerald-600 text-white hover:bg-emerald-700" : "text-muted-foreground")}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Grid
            </Button>
            <Button
              variant={viewMode === "table" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("table")}
              className={cn("h-8 px-3 text-xs gap-1.5 rounded-lg cursor-pointer", viewMode === "table" ? "bg-emerald-600 text-white hover:bg-emerald-700" : "text-muted-foreground")}
            >
              <List className="w-3.5 h-3.5" /> Tabel
            </Button>
          </div>

          <Button variant="outline" size="icon" onClick={() => refetch?.()} className="h-9 w-9 rounded-xl border-border/80 bg-card cursor-pointer">
            <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
          </Button>

          {/* 🔒 TOMBOL TAMBAH HANYA UNTUK AGEN / ADMIN (SEMBUNYI DARI TAMU & VIEWER) */}
          {canCreateProperty && (
            <Button
              onClick={() => router.push("/properties/create")}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold gap-1.5 h-9 px-4 rounded-xl cursor-pointer shadow-xs"
            >
              <Plus className="h-4 w-4" /> Tambah
            </Button>
          )}
        </div>
      </div>

      {/* 2. TOGGLE SCOPE (HANYA MUNCUL UNTUK AGEN/ADMIN, SEMBUNYI UNTUK TAMU & VIEWER) */}
      {!isGuestOrViewer && (
        <div className="flex items-center justify-between bg-muted/40 p-1.5 rounded-xl border border-border/60">
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <Button
              variant={scopeMode === "my_properties" ? "default" : "ghost"}
              size="sm"
              onClick={() => setScopeMode("my_properties")}
              className={cn(
                "text-xs h-8 rounded-lg gap-1.5 cursor-pointer font-semibold",
                scopeMode === "my_properties" ? "bg-emerald-600 text-white" : "text-muted-foreground hover:bg-background/60"
              )}
            >
              <User className="w-3.5 h-3.5" /> Portofolio Saya
            </Button>
            <Button
              variant={scopeMode === "global" ? "default" : "ghost"}
              size="sm"
              onClick={() => setScopeMode("global")}
              className={cn(
                "text-xs h-8 rounded-lg gap-1.5 cursor-pointer font-semibold",
                scopeMode === "global" ? "bg-emerald-600 text-white" : "text-muted-foreground hover:bg-background/60"
              )}
            >
              <Globe className="w-3.5 h-3.5" /> Katalog Perusahaan
            </Button>
          </div>
        </div>
      )}

      {/* 3. SEARCH BAR UTAMA DENGAN AKSEN EMERALD GREEN */}
      <div className="relative rounded-xl border-2 border-emerald-500/30 bg-card p-0.5 shadow-xs focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600" />
        <Input
          placeholder="Cari nama properti, lokasi, atau kode listing..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="pl-10 h-10 text-xs border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:outline-none placeholder:text-muted-foreground"
        />
      </div>

      {/* 4. TOMBOL FILTER BESAR: DIJUAL & DISEWA */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          type="button"
          size="lg"
          variant="outline"
          onClick={() => setListingTypeFilter(listingTypeFilter === "dijual" ? "all" : "dijual")}
          className={cn(
            "h-12 text-xs sm:text-sm font-bold gap-2 rounded-xl border transition-all cursor-pointer shadow-xs",
            listingTypeFilter === "dijual"
              ? "bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-600/20 shadow-md"
              : "bg-card border-emerald-500/30 text-foreground hover:bg-emerald-500/10 hover:border-emerald-500"
          )}
        >
          <Tag className="w-4 h-4" />
          DIJUAL
        </Button>
        <Button
          type="button"
          size="lg"
          variant="outline"
          onClick={() => setListingTypeFilter(listingTypeFilter === "disewa" ? "all" : "disewa")}
          className={cn(
            "h-12 text-xs sm:text-sm font-bold gap-2 rounded-xl border transition-all cursor-pointer shadow-xs",
            listingTypeFilter === "disewa"
              ? "bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-600/20 shadow-md"
              : "bg-card border-emerald-500/30 text-foreground hover:bg-emerald-500/10 hover:border-emerald-500"
          )}
        >
          <Building2 className="w-4 h-4" />
          DISEWA
        </Button>
      </div>

      {/* 5. FILTER DROPDOWN / COLLAPSIBLE */}
      <div className="space-y-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => setIsFilterOpen(!isFilterOpen)}
          className="w-full sm:w-auto h-10 px-4 text-xs font-semibold gap-2 rounded-xl border-emerald-500/30 bg-card hover:bg-emerald-500/10 text-foreground shadow-2xs cursor-pointer flex items-center justify-between sm:justify-start"
        >
          <div className="flex items-center gap-2">
            <FilterIcon className="w-3.5 h-3.5 text-emerald-600" />
            <span>Filter</span>
            {activeFilterCount > 0 && (
              <Badge className="bg-emerald-600 text-white text-[10px] h-5 px-1.5 rounded-full">
                {activeFilterCount}
              </Badge>
            )}
          </div>
          {isFilterOpen ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
        </Button>

        {isFilterOpen && (
          <Card className="border border-emerald-500/20 bg-card shadow-md rounded-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-600" /> Opsi Filter Properti
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetFilters}
                  className="h-7 text-xs text-muted-foreground hover:text-emerald-600 hover:bg-emerald-500/10 gap-1 cursor-pointer rounded-lg"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {/* Kategori Filter (FONT KAPITAL) */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground">Kategori</label>
                  <Select value={propertyTypeFilter} onValueChange={(val) => setPropertyTypeFilter(val ?? "")}>
                    <SelectTrigger className="h-9 text-xs rounded-xl border-border bg-background">
                      <SelectValue placeholder="SEMUA KATEGORI" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="all" className="text-xs font-semibold">SEMUA KATEGORI</SelectItem>
                      <SelectItem value="rumah" className="text-xs font-semibold">RUMAH</SelectItem>
                      <SelectItem value="apartemen" className="text-xs font-semibold">APARTEMEN</SelectItem>
                      <SelectItem value="tanah" className="text-xs font-semibold">TANAH</SelectItem>
                      <SelectItem value="ruko" className="text-xs font-semibold">RUKO</SelectItem>
                      <SelectItem value="kost" className="text-xs font-semibold">KOST</SelectItem>
                      <SelectItem value="villa" className="text-xs font-semibold">VILLA</SelectItem>
                      <SelectItem value="hotel" className="text-xs font-semibold">HOTEL</SelectItem>
                      <SelectItem value="pabrik" className="text-xs font-semibold">PABRIK</SelectItem>
                      <SelectItem value="gudang" className="text-xs font-semibold">GUDANG</SelectItem>
                      <SelectItem value="perkantoran" className="text-xs font-semibold">PERKANTORAN</SelectItem>
                      <SelectItem value="ruang usaha" className="text-xs font-semibold">RUANG USAHA</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Harga Filter */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground">Harga (IDR)</label>
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="number"
                      placeholder="Min"
                      value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value)}
                      className="h-9 text-xs rounded-xl border-border bg-background focus-visible:ring-emerald-500"
                    />
                    <span className="text-muted-foreground text-xs">-</span>
                    <Input
                      type="number"
                      placeholder="Max"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                      className="h-9 text-xs rounded-xl border-border bg-background focus-visible:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Luas Bangunan Filter */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground">Luas Bangunan (LB m²)</label>
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="number"
                      placeholder="Min LB"
                      value={minBuildingArea}
                      onChange={(e) => setMinBuildingArea(e.target.value)}
                      className="h-9 text-xs rounded-xl border-border bg-background focus-visible:ring-emerald-500"
                    />
                    <span className="text-muted-foreground text-xs">-</span>
                    <Input
                      type="number"
                      placeholder="Max LB"
                      value={maxBuildingArea}
                      onChange={(e) => setMaxBuildingArea(e.target.value)}
                      className="h-9 text-xs rounded-xl border-border bg-background focus-visible:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Luas Tanah Filter */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground">Luas Tanah (LT m²)</label>
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="number"
                      placeholder="Min LT"
                      value={minLandArea}
                      onChange={(e) => setMinLandArea(e.target.value)}
                      className="h-9 text-xs rounded-xl border-border bg-background focus-visible:ring-emerald-500"
                    />
                    <span className="text-muted-foreground text-xs">-</span>
                    <Input
                      type="number"
                      placeholder="Max LT"
                      value={maxLandArea}
                      onChange={(e) => setMaxLandArea(e.target.value)}
                      className="h-9 text-xs rounded-xl border-border bg-background focus-visible:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 6. MAIN LIST PROPERTI */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-72 w-full rounded-2xl bg-muted/60" />
          ))}
        </div>
      ) : filteredProperties.length === 0 ? (
        <Card className="border border-border/80 p-10 text-center space-y-3 rounded-2xl bg-card shadow-2xs">
          <Building2 className="w-10 h-10 text-muted-foreground mx-auto" />
          <h3 className="text-sm font-bold text-foreground">Tidak ada properti ditemukan</h3>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto">
            Coba atur ulang kata kunci atau filter pencarian Anda.
          </p>
        </Card>
      ) : viewMode === "grid" ? (
        /* ================= 🔲 GRID VIEW ================= */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProperties.map((prop) => {
            const isRent = prop.listing_type === "sewa" || prop.listing_type === "disewa" || prop.listing_type === "rent";

            return (
              <Card
                key={prop.id}
                onClick={() => goToDetail(prop.id)}
                className="group border border-border/70 shadow-2xs hover:shadow-md hover:border-emerald-500/40 transition-all rounded-2xl overflow-hidden cursor-pointer flex flex-col justify-between bg-card"
              >
                <div>
                  {/* Foto Properti */}
                  <div className="relative aspect-[16/10] bg-muted overflow-hidden">
                    <img
                      src={prop.thumbnail}
                      alt={prop.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = DEFAULT_FALLBACK_IMAGE;
                      }}
                    />

                    {/* Super Admin Star */}
                    {isSuperAdmin && (
                      <button
                        type="button"
                        onClick={(e) => handleToggleFeatured(prop, e)}
                        className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-950/70 backdrop-blur-md transition shadow-xs z-10 cursor-pointer"
                      >
                        <Star
                          className={cn(
                            "w-3.5 h-3.5",
                            prop.is_featured ? "fill-amber-400 text-amber-400" : "text-white/70"
                          )}
                        />
                      </button>
                    )}

                    {/* Badge Tipe Listing */}
                    <div className="absolute top-2 left-2">
                      <Badge className={cn("text-[9px] font-bold px-2 py-0.5 uppercase tracking-wide text-white border-0 rounded-md", isRent ? "bg-amber-600" : "bg-emerald-600")}>
                        {isRent ? "SEWA" : "JUAL"}
                      </Badge>
                    </div>

                    {/* Kode Listing */}
                    <div className="absolute bottom-2 right-2">
                      <span className="text-[9px] font-mono font-medium text-white bg-slate-950/80 px-2 py-0.5 rounded-md backdrop-blur-xs border border-white/10">
                        {prop.listing_code}
                      </span>
                    </div>
                  </div>

                  {/* Informasi Ringkas Properti */}
                  <CardContent className="p-3.5 space-y-2">
                    <div className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                      {formatCurrency(prop.price)}
                    </div>

                    <h3 className="font-bold text-xs text-foreground line-clamp-1 group-hover:text-emerald-600 transition-colors">
                      {prop.title}
                    </h3>

                    <p className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
                      <MapPin className="w-3 h-3 text-emerald-600 shrink-0" /> {prop.location}
                    </p>

                    {/* 📐 SPESIFIKASI RINGKAS (KT, KM, LB, LT) */}
                    <div className="flex items-center justify-between pt-2.5 text-[11px] text-muted-foreground font-semibold border-t border-border/60 flex-wrap gap-y-1">
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-0.5" title="Kamar Tidur">
                          <Bed className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          {prop.bedrooms || 0}
                        </span>
                        <span className="flex items-center gap-0.5" title="Kamar Mandi">
                          <Bath className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          {prop.bathrooms || 0}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-0.5" title="Luas Bangunan">
                          <Building2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          LB {prop.building_area || 0}m²
                        </span>
                        <span className="flex items-center gap-0.5" title="Luas Tanah">
                          <Ruler className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          LT {prop.land_area || 0}m²
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </div>

                {/* Footer Kartu: Profil Agen Pengunggah */}
                <CardFooter className="p-2.5 border-t border-border/60 bg-muted/30 flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" onClick={(e) => goToDetail(prop.id, e)} className="h-7 text-[11px] font-semibold gap-1 px-2 rounded-lg border-border/80 bg-background text-foreground">
                      <Eye className="w-3 h-3 text-emerald-600" /> Detail
                    </Button>
                    <Button variant="ghost" size="icon" onClick={(e) => handleSendWABrochure(prop, e)} className="h-7 w-7 text-emerald-600 hover:bg-emerald-500/10 rounded-lg cursor-pointer" title="Kirim Brosur WA">
                      <Share2 className="w-3 h-3" />
                    </Button>
                  </div>

                  {/* Profil Agen */}
                  <div className="flex items-center gap-1.5 min-w-0 shrink-0" title={`Agen: ${prop.uploader_name}`}>
                    <span className="text-[10px] text-muted-foreground font-semibold truncate max-w-[75px] text-right">
                      {prop.uploader_name}
                    </span>
                    <div className="relative w-6 h-6 rounded-full overflow-hidden border border-border bg-emerald-100 text-emerald-800 font-bold text-[9px] flex items-center justify-center shrink-0 shadow-2xs">
                      {prop.uploader_name ? prop.uploader_name.slice(0, 2).toUpperCase() : "IP"}
                      {prop.uploader_avatar && (
                        <img
                          src={prop.uploader_avatar}
                          alt={prop.uploader_name}
                          className="absolute inset-0 w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      )}
                    </div>
                  </div>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      ) : (
        /* ================= 📋 TABLE VIEW ================= */
        <Card className="rounded-2xl border border-border/70 overflow-hidden shadow-2xs bg-card">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="border-border/60">
                <TableHead className="text-xs font-bold text-foreground">Properti</TableHead>
                <TableHead className="text-xs font-bold text-foreground">Tipe</TableHead>
                <TableHead className="text-xs font-bold text-foreground">Harga</TableHead>
                <TableHead className="text-xs font-bold text-foreground">Spesifikasi</TableHead>
                <TableHead className="text-xs font-bold text-foreground">Lokasi</TableHead>
                <TableHead className="text-xs font-bold text-foreground">Agen</TableHead>
                <TableHead className="text-right text-xs font-bold text-foreground">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProperties.map((prop) => {
                const isRent = prop.listing_type === "sewa" || prop.listing_type === "disewa" || prop.listing_type === "rent";

                return (
                  <TableRow key={prop.id} className="hover:bg-muted/30 border-border/60 cursor-pointer" onClick={() => goToDetail(prop.id)}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={prop.thumbnail}
                          alt={prop.title}
                          className="w-10 h-10 rounded-xl object-cover border border-border/60 shrink-0 bg-muted"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = DEFAULT_FALLBACK_IMAGE;
                          }}
                        />
                        <div>
                          <div className="font-bold text-xs text-foreground line-clamp-1">{prop.title}</div>
                          <div className="text-[10px] text-muted-foreground font-mono">{prop.listing_code}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded", isRent ? "bg-amber-600 text-white" : "bg-emerald-600 text-white")}>
                        {isRent ? "SEWA" : "JUAL"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-extrabold text-emerald-600 dark:text-emerald-400 text-xs whitespace-nowrap font-mono">
                      {formatCurrency(prop.price)}
                    </TableCell>
                    <TableCell>
                      <div className="text-[11px] text-muted-foreground font-medium flex items-center gap-1.5 flex-wrap">
                        <span>{prop.bedrooms || 0} KT</span> • <span>{prop.bathrooms || 0} KM</span> •
                        <span className="inline-flex items-center gap-0.5"><Building2 className="w-3 h-3 text-emerald-600" /> LB {prop.building_area || 0}m²</span> •
                        <span className="inline-flex items-center gap-0.5"><Ruler className="w-3 h-3 text-emerald-600" /> LT {prop.land_area || 0}m²</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[160px] truncate">
                      {prop.location}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full overflow-hidden bg-emerald-100 text-emerald-800 font-bold text-[8px] flex items-center justify-center shrink-0">
                          {prop.uploader_name ? prop.uploader_name.slice(0, 2).toUpperCase() : "IP"}
                        </div>
                        <span className="text-xs text-muted-foreground font-semibold truncate max-w-[80px]">
                          {prop.uploader_name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs font-semibold rounded-lg border-border/80"
                          onClick={(e) => goToDetail(prop.id, e)}
                        >
                          Detail
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-emerald-600 hover:bg-emerald-500/10 rounded-lg"
                          onClick={(e) => handleSendWABrochure(prop, e)}
                        >
                          <Share2 className="w-3 h-3" />
                        </Button>

                        {/* 🔒 MENU EDIT/HAPUS HANYA UNTUK AGEN / ADMIN */}
                        {!isGuestOrViewer && (
                          <DropdownMenu>
                            <DropdownMenuTrigger className="h-7 w-7 rounded-lg hover:bg-accent flex items-center justify-center border border-border/80">
                              <MoreVertical className="h-4 w-4 text-muted-foreground" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-xl">
                              <DropdownMenuItem onClick={() => router.push(`/properties/edit/${prop.id}`)}>
                                <Edit className="w-3.5 h-3.5 mr-2" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-rose-600" onClick={(e) => handleDelete(prop.id, e)}>
                                <Trash2 className="w-3.5 h-3.5 mr-2" /> Hapus
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

export default function PropertiesPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full rounded-2xl bg-muted/60" />}>
      <PropertiesCatalogContent />
    </Suspense>
  );
}