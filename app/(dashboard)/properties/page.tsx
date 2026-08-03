// app/(dashboard)/properties/page.tsx
"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { supabase } from "@/lib/supabase/client";
import { useProperties } from "@/hooks/use-properties";
import { WatermarkedImage } from "@/components/ui/WatermarkedImage";
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

// 🔤 Helper untuk Kapitalisasi Setiap Kata (misal: "rumah susun" -> "Rumah Susun")
const capitalizeWords = (str: string) => {
  if (!str) return "";
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

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

  // Kategori Properti terformat Huruf Kapital di Awal
  const rawType = p.property_type || p.category || p.type || "Rumah";
  const formattedPropertyType = capitalizeWords(rawType);

  return {
    id: p.id,
    title: p.title || "Properti Tanpa Judul",
    listing_code: p.listing_code || p.code || `INL-${p.id?.slice(0, 4)?.toUpperCase() || "000"}`,
    listing_type: p.listing_type || "jual",
    property_type: formattedPropertyType,
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

  // 💬 HANDLER TOMBOL WHATSAPP + CATAT LOG AKTIVITAS CRM
  const handleWhatsAppClick = async (property: PropertyItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("crm_activities").insert({
          user_id: user.id,
          property_id: property.id,
          activity_type: "whatsapp_contact",
          description: `Menghubungi agen/pemilik untuk properti: ${property.title} (${property.listing_code})`,
          created_at: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error("Gagal mencatat log aktivitas CRM:", err);
    }

    const waMsg = encodeURIComponent(
      `Halo, saya berminat dengan properti: *${property.title}* (${property.listing_code}). Apakah masih tersedia?`
    );

    toast.success("Membuka WhatsApp...", {
      description: "Aktivitas kontak telah dicatat di log CRM.",
    });

    window.open(`https://wa.me/?text=${waMsg}`, "_blank");
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
    <div className="space-y-4 sm:space-y-6 pb-20 max-w-7xl mx-auto px-2.5 sm:px-6 bg-background/50 min-h-screen scroll-smooth">
      {/* 1. HEADER PAGE */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 border-b border-border/60 pb-4 pt-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-2xl font-black tracking-tight text-foreground">
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

        <div className="flex items-center gap-2 justify-between sm:justify-end">
          {/* Toggle View Mode */}
          <div className="flex items-center border border-border/80 rounded-xl p-0.5 bg-card shadow-2xs">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className={cn("h-8 px-2.5 text-xs gap-1.5 rounded-lg cursor-pointer", viewMode === "grid" ? "bg-emerald-600 text-white hover:bg-emerald-700" : "text-muted-foreground")}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Grid
            </Button>
            <Button
              variant={viewMode === "table" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("table")}
              className={cn("h-8 px-2.5 text-xs gap-1.5 rounded-lg cursor-pointer", viewMode === "table" ? "bg-emerald-600 text-white hover:bg-emerald-700" : "text-muted-foreground")}
            >
              <List className="w-3.5 h-3.5" /> Tabel
            </Button>
          </div>

          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="icon" onClick={() => refetch?.()} className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl border-border/80 bg-card cursor-pointer">
              <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
            </Button>

            {/* 🔒 TOMBOL TAMBAH HANYA UNTUK AGEN / ADMIN */}
            {canCreateProperty && (
              <Button
                onClick={() => router.push("/properties/create")}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold gap-1.5 h-8 sm:h-9 px-3 sm:px-4 rounded-xl cursor-pointer shadow-xs"
              >
                <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Tambah
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 2. TOGGLE SCOPE (AGEN/ADMIN) */}
      {!isGuestOrViewer && (
        <div className="flex items-center justify-between bg-muted/40 p-1 rounded-xl border border-border/60">
          <div className="flex items-center gap-1 w-full sm:w-auto">
            <Button
              variant={scopeMode === "my_properties" ? "default" : "ghost"}
              size="sm"
              onClick={() => setScopeMode("my_properties")}
              className={cn(
                "text-xs h-7 sm:h-8 flex-1 sm:flex-initial rounded-lg gap-1.5 cursor-pointer font-semibold",
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
                "text-xs h-7 sm:h-8 flex-1 sm:flex-initial rounded-lg gap-1.5 cursor-pointer font-semibold",
                scopeMode === "global" ? "bg-emerald-600 text-white" : "text-muted-foreground hover:bg-background/60"
              )}
            >
              <Globe className="w-3.5 h-3.5" /> Katalog Perusahaan
            </Button>
          </div>
        </div>
      )}

      {/* 3. SEARCH BAR UTAMA */}
      <div className="relative rounded-xl border-2 border-emerald-500/30 bg-card p-0.5 shadow-xs focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600" />
        <Input
          placeholder="Cari nama properti, lokasi, atau kode listing..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="pl-9 h-9 sm:h-10 text-xs border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:outline-none placeholder:text-muted-foreground"
        />
      </div>

      {/* 4. TOMBOL FILTER BESAR: DIJUAL & DISEWA */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <Button
          type="button"
          size="lg"
          variant="outline"
          onClick={() => setListingTypeFilter(listingTypeFilter === "dijual" ? "all" : "dijual")}
          className={cn(
            "h-10 sm:h-12 text-xs sm:text-sm font-bold gap-1.5 sm:gap-2 rounded-xl border transition-all cursor-pointer shadow-xs",
            listingTypeFilter === "dijual"
              ? "bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-600/20 shadow-md"
              : "bg-card border-emerald-500/30 text-foreground hover:bg-emerald-500/10 hover:border-emerald-500"
          )}
        >
          <Tag className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          DIJUAL
        </Button>
        <Button
          type="button"
          size="lg"
          variant="outline"
          onClick={() => setListingTypeFilter(listingTypeFilter === "disewa" ? "all" : "disewa")}
          className={cn(
            "h-10 sm:h-12 text-xs sm:text-sm font-bold gap-1.5 sm:gap-2 rounded-xl border transition-all cursor-pointer shadow-xs",
            listingTypeFilter === "disewa"
              ? "bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-600/20 shadow-md"
              : "bg-card border-emerald-500/30 text-foreground hover:bg-emerald-500/10 hover:border-emerald-500"
          )}
        >
          <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          DISEWA
        </Button>
      </div>

      {/* 5. FILTER DROPDOWN / COLLAPSIBLE */}
      <div className="space-y-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => setIsFilterOpen(!isFilterOpen)}
          className="w-full sm:w-auto h-9 sm:h-10 px-3.5 sm:px-4 text-xs font-semibold gap-2 rounded-xl border-emerald-500/30 bg-card hover:bg-emerald-500/10 text-foreground shadow-2xs cursor-pointer flex items-center justify-between sm:justify-start"
        >
          <div className="flex items-center gap-2">
            <FilterIcon className="w-3.5 h-3.5 text-emerald-600" />
            <span>Filter</span>
            {activeFilterCount > 0 && (
              <Badge className="bg-emerald-600 text-white text-[10px] h-4.5 px-1.5 rounded-full">
                {activeFilterCount}
              </Badge>
            )}
          </div>
          {isFilterOpen ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
        </Button>

        {isFilterOpen && (
          <Card className="border border-emerald-500/20 bg-card shadow-md rounded-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            <CardContent className="p-3.5 sm:p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-border/60 pb-2">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-600" /> Opsi Filter Properti
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetFilters}
                  className="h-6 text-xs text-muted-foreground hover:text-emerald-600 hover:bg-emerald-500/10 gap-1 cursor-pointer rounded-lg"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Kategori Filter */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground">Kategori</label>
                  <Select value={propertyTypeFilter} onValueChange={(val) => setPropertyTypeFilter(val ?? "")}>
                    <SelectTrigger className="h-8 sm:h-9 text-xs rounded-xl border-border bg-background">
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
                      className="h-8 sm:h-9 text-xs rounded-xl border-border bg-background focus-visible:ring-emerald-500"
                    />
                    <span className="text-muted-foreground text-xs">-</span>
                    <Input
                      type="number"
                      placeholder="Max"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                      className="h-8 sm:h-9 text-xs rounded-xl border-border bg-background focus-visible:ring-emerald-500"
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
                      className="h-8 sm:h-9 text-xs rounded-xl border-border bg-background focus-visible:ring-emerald-500"
                    />
                    <span className="text-muted-foreground text-xs">-</span>
                    <Input
                      type="number"
                      placeholder="Max LB"
                      value={maxBuildingArea}
                      onChange={(e) => setMaxBuildingArea(e.target.value)}
                      className="h-8 sm:h-9 text-xs rounded-xl border-border bg-background focus-visible:ring-emerald-500"
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
                      className="h-8 sm:h-9 text-xs rounded-xl border-border bg-background focus-visible:ring-emerald-500"
                    />
                    <span className="text-muted-foreground text-xs">-</span>
                    <Input
                      type="number"
                      placeholder="Max LT"
                      value={maxLandArea}
                      onChange={(e) => setMaxLandArea(e.target.value)}
                      className="h-8 sm:h-9 text-xs rounded-xl border-border bg-background focus-visible:ring-emerald-500"
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
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-64 sm:h-72 w-full rounded-2xl bg-muted/60" />
          ))}
        </div>
      ) : filteredProperties.length === 0 ? (
        <Card className="border border-border/80 p-8 sm:p-10 text-center space-y-3 rounded-2xl bg-card shadow-2xs">
          <Building2 className="w-8 h-8 sm:w-10 sm:h-10 text-muted-foreground mx-auto" />
          <h3 className="text-xs sm:text-sm font-bold text-foreground">Tidak ada properti ditemukan</h3>
          <p className="text-[11px] sm:text-xs text-muted-foreground max-w-xs mx-auto">
            Coba atur ulang kata kunci atau filter pencarian Anda.
          </p>
        </Card>
      ) : viewMode === "grid" ? (
        /* ================= 🔲 GRID VIEW (2 KOLOM DI MOBILE HPs) ================= */
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-4">
          {filteredProperties.map((prop) => {
            const isRent = prop.listing_type === "sewa" || prop.listing_type === "disewa" || prop.listing_type === "rent";

            return (
              <Card
                key={prop.id}
                onClick={() => goToDetail(prop.id)}
                className="group border border-border/70 shadow-2xs hover:shadow-md hover:border-emerald-500/40 transition-all rounded-2xl overflow-hidden cursor-pointer flex flex-col justify-between bg-card"
              >
                <div>
                  {/* Foto Properti dengan Watermark Melayang */}
                  <div className="relative aspect-[4/3] sm:aspect-[16/10] bg-muted overflow-hidden">
                    <WatermarkedImage
                      src={prop.thumbnail}
                      alt={prop.title}
                      className="w-full h-full"
                      imageClassName="group-hover:scale-105 transition-transform duration-500"
                      watermarkSize="w-1/3"
                      watermarkOpacity={0.7}
                    />

                    {/* Super Admin Star */}
                    {isSuperAdmin && (
                      <button
                        type="button"
                        onClick={(e) => handleToggleFeatured(prop, e)}
                        className="absolute top-1.5 right-1.5 p-1 rounded-full bg-slate-950/70 backdrop-blur-md transition shadow-xs z-10 cursor-pointer"
                      >
                        <Star
                          className={cn(
                            "w-3 h-3 sm:w-3.5 sm:h-3.5",
                            prop.is_featured ? "fill-amber-400 text-amber-400" : "text-white/70"
                          )}
                        />
                      </button>
                    )}

                    {/* Badge Tipe Listing */}
                    <div className="absolute top-1.5 left-1.5">
                      <Badge className={cn("text-[8px] sm:text-[9px] font-bold px-1.5 sm:px-2 py-0.5 uppercase tracking-wide text-white border-0 rounded-md", isRent ? "bg-amber-600" : "bg-emerald-600")}>
                        {isRent ? "SEWA" : "JUAL"}
                      </Badge>
                    </div>

                    {/* Kode Listing */}
                    <div className="absolute bottom-1.5 right-1.5">
                      <span className="text-[8px] sm:text-[9px] font-mono font-medium text-white bg-slate-950/80 px-1.5 py-0.5 rounded-md backdrop-blur-xs border border-white/10">
                        {prop.listing_code}
                      </span>
                    </div>
                  </div>

                  {/* Informasi Ringkas Properti */}
                  <CardContent className="p-2.5 sm:p-3.5 space-y-1.5 sm:space-y-2">
                    <div className="text-xs sm:text-base font-extrabold text-emerald-600 dark:text-emerald-400 font-mono truncate">
                      {formatCurrency(prop.price)}
                    </div>

                    {/* 🏠 BARISAN JUDUL (DENGAN TRUNCATE ...) & BADGE KATEGORI DI KANAN */}
                    <div className="flex items-center justify-between gap-1.5 pt-0.5">
                      <h3
                        className="font-bold text-[11px] sm:text-xs text-foreground truncate flex-1 group-hover:text-emerald-600 transition-colors"
                        title={prop.title}
                      >
                        {prop.title}
                      </h3>

                      <Badge variant="outline" className="text-[8px] sm:text-[9px] font-bold px-1.5 py-0.2 shrink-0 bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800 flex items-center gap-0.5 rounded-md">
                        <Building2 className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                        <span>{prop.property_type}</span>
                      </Badge>
                    </div>

                    <p className="text-[10px] sm:text-[11px] text-muted-foreground flex items-center gap-0.5 sm:gap-1 truncate">
                      <MapPin className="w-3 h-3 text-emerald-600 shrink-0" /> {prop.location}
                    </p>

                    {/* 📐 SPESIFIKASI RINGKAS */}
                    <div className="flex items-center justify-between pt-1.5 sm:pt-2 text-[9px] sm:text-[11px] text-muted-foreground font-semibold border-t border-border/60 flex-wrap gap-y-1">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <span className="flex items-center gap-0.5" title="Kamar Tidur">
                          <Bed className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-600 shrink-0" />
                          {prop.bedrooms || 0}
                        </span>
                        <span className="flex items-center gap-0.5" title="Kamar Mandi">
                          <Bath className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-600 shrink-0" />
                          {prop.bathrooms || 0}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <span className="flex items-center gap-0.5" title="Luas Bangunan">
                          <Building2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-600 shrink-0" />
                          LB {prop.building_area || 0}m²
                        </span>
                        <span className="flex items-center gap-0.5" title="Luas Tanah">
                          <Ruler className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-600 shrink-0" />
                          LT {prop.land_area || 0}m²
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </div>

                {/* Footer Kartu: Profil Agen & Tombol WhatsApp */}
                <CardFooter className="p-2 sm:p-2.5 border-t border-border/60 bg-muted/30 flex items-center justify-between gap-1" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-1">
                    {/* 💬 TOMBOL WHATSAPP PENGGANTI DETAIL (LENGKAP DENGAN LOG CRM) */}
                    <button
                      type="button"
                      onClick={(e) => handleWhatsAppClick(prop, e)}
                      className="h-6 sm:h-7 px-2 text-[10px] sm:text-[11px] font-bold rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                      title="Hubungi WhatsApp (Catat ke CRM)"
                    >
                      <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.285-.143-1.687-.833-1.947-.928-.26-.095-.45-.143-.639.143-.19.286-.736.928-.903 1.118-.167.19-.333.214-.618.071-.285-.143-1.207-.445-2.299-1.419-.85-.759-1.424-1.697-1.591-1.983-.167-.286-.018-.44.125-.582.129-.128.285-.333.428-.5.143-.167.19-.286.285-.476.095-.19.048-.357-.024-.5-.071-.143-.639-1.537-.876-2.106-.23-.554-.464-.479-.639-.488-.165-.008-.356-.01-.547-.01-.19 0-.5.071-.761.357-.26.286-1 .976-1 2.381 0 1.405 1.023 2.762 1.166 2.952.143.19 2.013 3.074 4.877 4.311.681.294 1.213.47 1.627.601.684.217 1.307.186 1.8.113.55-.082 1.687-.69 1.925-1.357.238-.667.238-1.238.167-1.357-.07-.119-.26-.19-.545-.333z"/>
                      </svg>
                      <span>WhatsApp</span>
                    </button>

                    <Button variant="ghost" size="icon" onClick={(e) => handleSendWABrochure(prop, e)} className="h-6 w-6 sm:h-7 sm:w-7 text-emerald-600 hover:bg-emerald-500/10 rounded-lg cursor-pointer" title="Kirim Brosur WA">
                      <Share2 className="w-3 h-3" />
                    </Button>
                  </div>

                  {/* Profil Agen */}
                  <div className="flex items-center gap-1 min-w-0 shrink-0" title={`Agen: ${prop.uploader_name}`}>
                    <span className="text-[9px] sm:text-[10px] text-muted-foreground font-semibold truncate max-w-[45px] sm:max-w-[75px] text-right">
                      {prop.uploader_name}
                    </span>
                    <div className="relative w-5 h-5 sm:w-6 sm:h-6 rounded-full overflow-hidden border border-border bg-emerald-100 text-emerald-800 font-bold text-[8px] sm:text-[9px] flex items-center justify-center shrink-0 shadow-2xs">
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
                        <WatermarkedImage
                          src={prop.thumbnail}
                          alt={prop.title}
                          className="w-10 h-10 rounded-xl border border-border/60 shrink-0 bg-muted overflow-hidden"
                          imageClassName="w-full h-full object-cover"
                          watermarkSize="w-1/2"
                          watermarkOpacity={0.6}
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
                        <button
                          type="button"
                          onClick={(e) => handleWhatsAppClick(prop, e)}
                          className="h-7 px-2 text-xs font-bold rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white flex items-center gap-1 cursor-pointer"
                        >
                          <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.285-.143-1.687-.833-1.947-.928-.26-.095-.45-.143-.639.143-.19.286-.736.928-.903 1.118-.167.19-.333.214-.618.071-.285-.143-1.207-.445-2.299-1.419-.85-.759-1.424-1.697-1.591-1.983-.167-.286-.018-.44.125-.582.129-.128.285-.333.428-.5.143-.167.19-.286.285-.476.095-.19.048-.357-.024-.5-.071-.143-.639-1.537-.876-2.106-.23-.554-.464-.479-.639-.488-.165-.008-.356-.01-.547-.01-.19 0-.5.071-.761.357-.26.286-1 .976-1 2.381 0 1.405 1.023 2.762 1.166 2.952.143.19 2.013 3.074 4.877 4.311.681.294 1.213.47 1.627.601.684.217 1.307.186 1.8.113.55-.082 1.687-.69 1.925-1.357.238-.667.238-1.238.167-1.357-.07-.119-.26-.19-.545-.333z"/>
                          </svg>
                          <span>WA</span>
                        </button>
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