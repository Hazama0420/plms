"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { supabase } from "@/lib/supabase/client";
import { useProperties } from "@/hooks/use-properties";
import { WatermarkedImage } from "@/components/ui/WatermarkedImage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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

// 🔍 IMPORT KOMPONEN PENCARIAN DASHBOARD
import { DashboardPropertySearch } from "@/components/dashboard/DashboardPropertySearch";

import {
  Plus,
  Building2,
  MapPin,
  Share2,
  User,
  RefreshCw,
  LayoutGrid,
  List,
  Globe,
  Star,
  Bed,
  Bath,
  Edit,
  Trash2,
  MoreVertical,
  Ruler,
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

// 🔤 Helper untuk Kapitalisasi Setiap Kata
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

  // 1. BACA PARAMETER DARI URL
  const qParam =
    searchParams.get("q") ||
    searchParams.get("search") ||
    searchParams.get("location") ||
    "";

  const listingTypeParam =
    searchParams.get("listing_type") ||
    searchParams.get("transaction_type") ||
    "all";

  const propertyTypeParam =
    searchParams.get("property_type") ||
    searchParams.get("type") ||
    searchParams.get("category") ||
    "all";

  const viewParam = searchParams.get("view");
  const scopeParam = searchParams.get("scope");
  const isFeaturedParam =
    searchParams.get("featured") === "true" ||
    searchParams.get("is_featured") === "true";
  const forYouParam =
    searchParams.get("for_you") === "true" ||
    searchParams.get("forYou") === "true";

  // Min & Max Filters
  const minPrice = searchParams.get("priceMin") || searchParams.get("minPrice") || "";
  const maxPrice = searchParams.get("priceMax") || searchParams.get("maxPrice") || "";
  const minBuildingArea = searchParams.get("buildingAreaMin") || "";
  const maxBuildingArea = searchParams.get("buildingAreaMax") || "";
  const minLandArea = searchParams.get("landAreaMin") || "";
  const maxLandArea = searchParams.get("landAreaMax") || "";
  const sortParam = searchParams.get("sort") || "";

  // 2. STATE UTAMA
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [currentUser, setCurrentUser] = useState<{ id: string; role: string } | null>(null);
  const [profilesMap, setProfilesMap] = useState<Record<string, { full_name: string; avatar_url: string }>>({});

  // 🔒 3. DEKLARASI STATUS USER & HAK AKSES (WAJIB DI ATAS USEMEMO)
  const userRole = currentUser?.role?.toLowerCase() || "guest";
  const isGuestOrViewer = !currentUser || userRole === "guest" || userRole === "viewer";
  const isSuperAdmin = userRole === "super_admin" || userRole === "superadmin";
  const canCreateProperty = currentUser && !isGuestOrViewer;

  // 4. DETEKSI MODE TAMPILAN (MY PROPERTIES / GLOBAL)
  const defaultScope = useMemo(() => {
    if (
      viewParam === "global" ||
      scopeParam === "global" ||
      isFeaturedParam ||
      forYouParam ||
      Boolean(qParam) ||
      listingTypeParam !== "all" ||
      propertyTypeParam !== "all"
    ) {
      return "global";
    }
    return "my_properties";
  }, [viewParam, scopeParam, isFeaturedParam, forYouParam, qParam, listingTypeParam, propertyTypeParam]);

  const [scopeMode, setScopeMode] = useState<"my_properties" | "global">(defaultScope);

  useEffect(() => {
    if (viewParam === "global" || scopeParam === "global" || isFeaturedParam || forYouParam || Boolean(qParam)) {
      setScopeMode("global");
    }
  }, [viewParam, scopeParam, isFeaturedParam, forYouParam, qParam]);

  // 5. FETCH USER AUTH
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

  // 6. AMBIL DATA PROPERTI DARI SUPABASE
  const {
    data: rawProperties = [],
    loading,
    refetch,
  } = useProperties();

  // 7. FETCH PROFIL UPLOADER
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

  // 8. MAPPING DATA PROPERTI
  const properties: PropertyItem[] = useMemo(() => {
    return (rawProperties || []).map((p) => mapPropertyItem(p, profilesMap));
  }, [rawProperties, profilesMap]);

  // 9. HANDLER PEMBANTU
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
    } catch {
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
    } catch {
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

  // 10. FILTER & SORTING CLIENT-SIDE (MENANGANINI SEARCH DENGAN FLEKSIBEL)
  const filteredProperties = useMemo(() => {
    const list = properties.filter((item) => {
      // Tamu / Viewer: hanya tampilkan status 'published' / 'available'
      if (isGuestOrViewer && item.status !== "published" && item.status !== "available") return false;

      // Agen: mode "my_properties" saring milik sendiri
      if (!isGuestOrViewer && scopeMode === "my_properties" && currentUser?.id && !isSuperAdmin) {
        const isOwner = item.created_by === currentUser.id || item.assigned_to === currentUser.id;
        if (!isOwner) return false;
      }

      // Filter Query Pencarian
      const query = qParam.trim().toLowerCase();
      const matchSearch =
        !query ||
        item.title.toLowerCase().includes(query) ||
        item.location.toLowerCase().includes(query) ||
        item.listing_code.toLowerCase().includes(query);

      // Filter Tipe Listing (Jual / Sewa)
      let matchListingType = true;
      if (listingTypeParam && listingTypeParam !== "all") {
        const typeNorm = item.listing_type.toLowerCase();
        if (listingTypeParam === "dijual" || listingTypeParam === "jual" || listingTypeParam === "sale") {
          matchListingType = typeNorm === "jual" || typeNorm === "dijual" || typeNorm === "sale";
        } else if (listingTypeParam === "disewa" || listingTypeParam === "sewa" || listingTypeParam === "rent") {
          matchListingType = typeNorm === "sewa" || typeNorm === "disewa" || typeNorm === "rent";
        }
      }

      // Filter Kategori Properti
      let matchPropertyType = true;
      if (propertyTypeParam && propertyTypeParam !== "all") {
        matchPropertyType = item.property_type.toLowerCase() === propertyTypeParam.toLowerCase();
      }

      // Rentang Harga
      const itemPrice = item.price || 0;
      const matchMinPrice = !minPrice || itemPrice >= Number(minPrice);
      const matchMaxPrice = !maxPrice || itemPrice <= Number(maxPrice);

      // Luas Bangunan
      const itemLB = item.building_area || 0;
      const matchMinLB = !minBuildingArea || itemLB >= Number(minBuildingArea);
      const matchMaxLB = !maxBuildingArea || itemLB <= Number(maxBuildingArea);

      // Luas Tanah
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

    // Pengurutan Harga
    if (sortParam === "price_asc") {
      list.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sortParam === "price_desc") {
      list.sort((a, b) => (b.price || 0) - (a.price || 0));
    }

    return list;
  }, [
    properties,
    qParam,
    scopeMode,
    currentUser,
    isGuestOrViewer,
    isSuperAdmin,
    listingTypeParam,
    propertyTypeParam,
    isFeaturedParam,
    forYouParam,
    minPrice,
    maxPrice,
    minBuildingArea,
    maxBuildingArea,
    minLandArea,
    maxLandArea,
    sortParam,
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

            {/* 🔒 TOMBOL TAMBAH UNTUK AGEN / ADMIN */}
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

      {/* 3. HERO SEARCH BANNER DENGAN BACKGROUND /bg-header.webp & DASHBOARD PROPERTY SEARCH */}
      <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden bg-slate-950 text-white border border-border/40 shadow-xl">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-40 transition-transform duration-700 hover:scale-105 pointer-events-none"
          style={{ backgroundImage: "url('/bg-header.webp')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent pointer-events-none" />

        <div className="relative z-10 p-4 sm:p-6 md:p-8 space-y-3 sm:space-y-4">
          <div className="max-w-xl">
            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px] font-bold uppercase tracking-wider mb-1.5">
              Pencarian Properti
            </Badge>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-white leading-tight">
              Temukan Properti Impian Anda
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Gunakan filter presisi untuk menemukan hunian, tanah, atau ruang usaha terbaik.
            </p>
          </div>

          {/* INTEGRASI DASHBOARD PROPERTY SEARCH */}
          <div className="pt-2">
            <DashboardPropertySearch />
          </div>
        </div>
      </div>

     {/* 4. MAIN LIST PROPERTI */}
{loading ? (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
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
  /* ================= 🔲 GRID VIEW ================= */
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
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
                  <div className="relative aspect-[4/3] sm:aspect-[16/10] bg-muted overflow-hidden">
                    <WatermarkedImage
                      src={prop.thumbnail}
                      alt={prop.title}
                      className="absolute inset-0 w-full h-full"
                      imageClassName="group-hover:scale-105 transition-transform duration-500 object-cover w-full h-full"
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
                    <div className="absolute top-1.5 left-1.5 z-10">
                      <Badge className={cn("text-[8px] sm:text-[9px] font-bold px-1.5 sm:px-2 py-0.5 uppercase tracking-wide text-white border-0 rounded-md", isRent ? "bg-amber-600" : "bg-emerald-600")}>
                        {isRent ? "SEWA" : "JUAL"}
                      </Badge>
                    </div>

                    {/* Kode Listing */}
                    <div className="absolute bottom-1.5 right-1.5 z-10">
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

                {/* Footer Kartu */}
                <CardFooter className="p-2 sm:p-2.5 border-t border-border/60 bg-muted/30 flex items-center justify-between gap-1" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-1">
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
                          className="w-10 h-10 rounded-xl border border-border/60 shrink-0 bg-muted overflow-hidden relative"
                          imageClassName="absolute inset-0 w-full h-full object-cover"
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