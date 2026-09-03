"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { formatLocationShort } from "@/lib/property-address";
import { supabase } from "@/lib/supabase/client";
import { useProperties } from "@/hooks/use-properties";
import { NumberedPagination } from "@/components/properties/NumberedPagination";
import type { AdvancedFilter, PropertyFilter } from "@/types/property.types";
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
import { PropertyCard } from "@/components/properties/PropertyCard";

// 📝 IMPORT MODAL INQUIRY BERSAMA
import { LeadCaptureModal } from "@/components/inquiry/LeadCaptureModal";
import { useLeadCapture } from "@/hooks/use-lead-capture";

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
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";

import { PageHeader } from "@/components/dashboard/PageHeader";

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
  slug?: string;
}

const DEFAULT_FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80";

// Label dan warna status listing, disamakan dengan `statusConfig` di halaman
// detail properti. Hanya ditampilkan untuk staf: bagi tamu dan viewer semua
// listing yang terlihat memang sudah "published", jadi badge-nya tidak berguna.
const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  draft: { label: "Draf", className: "bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/30" },
  review: { label: "Peninjauan", className: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30" },
  published: { label: "Tayang", className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30" },
  sold: { label: "Terjual", className: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/30" },
  rented: { label: "Tersewa", className: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30" },
  archived: { label: "Diarsip", className: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30" },
};

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
  const locationStr = formatLocationShort(addressObj) || p.location || "Lokasi Belum Dikonfigurasi";

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
    slug: p.slug || undefined,
  };
};

function PropertiesCatalogContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // PARAMETER URL
  const qParam = searchParams.get("q") || searchParams.get("search") || "";
  const pageParam = searchParams.get("page");
  const listingTypeParam = searchParams.get("listing_type") || searchParams.get("transaction_type") || "all";
  const propertyTypeParam = searchParams.get("property_type") || searchParams.get("type") || searchParams.get("category") || "all";
  const viewParam = searchParams.get("view");
  const scopeParam = searchParams.get("scope");
  const isFeaturedParam = searchParams.get("featured") === "true" || searchParams.get("is_featured") === "true";
  const forYouParam = searchParams.get("for_you") === "true" || searchParams.get("forYou") === "true";

  const provinceNameParam = searchParams.get("province_name") || "";
  // `location` dikirim oleh pencarian di beranda dan isinya nama kota. Dulu
  // nilai itu ditumpuk ke kata kunci `q` yang hanya mencocokkan judul dan kode
  // listing, sehingga pencarian berdasarkan lokasi hampir selalu nihil.
  const cityNameParam = searchParams.get("city_name") || searchParams.get("location") || "";

  // Filter lokasi multi-pilih dari panel filter. Ditulis sebagai parameter
  // berulang (`?district_name=A&district_name=B`), bukan satu string ber-koma,
  // karena `escapePattern` di property.service.ts membuang koma dan akan
  // meleburkan seluruh pilihan menjadi satu kata kunci yang tak pernah cocok.
  //
  // `districtKey` menjadi dependency useMemo menggantikan array-nya: hasil
  // `getAll` adalah array baru pada tiap render, sehingga memakainya langsung
  // membuat `queryFilters` selalu dianggap berubah dan katalog memuat ulang
  // tanpa henti.
  const districtNamesParam = searchParams
    .getAll("district_name")
    .map((value) => value.trim())
    .filter(Boolean);
  const districtKey = districtNamesParam.join("|");

  const minPrice = searchParams.get("priceMin") || searchParams.get("minPrice") || "";
  const maxPrice = searchParams.get("priceMax") || searchParams.get("maxPrice") || "";
  const minBuildingArea = searchParams.get("buildingAreaMin") || "";
  const maxBuildingArea = searchParams.get("buildingAreaMax") || "";
  const minLandArea = searchParams.get("landAreaMin") || "";
  const maxLandArea = searchParams.get("landAreaMax") || "";
  const bedroomParam = searchParams.get("bedroom") || "";
  const bathroomParam = searchParams.get("bathroom") || "";
  const sortParam = searchParams.get("sort") || "";

  // STATE UTAMA & PREFERENSI VIEW MODE TERINTEGRASI
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [currentUser, setCurrentUser] = useState<{ id: string; role: string } | null>(null);
  const [profilesMap, setProfilesMap] = useState<Record<string, { full_name: string; avatar_url: string }>>({});

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (viewParam === "grid" || viewParam === "table") {
      setViewMode(viewParam);
      return;
    }
    const savedDefaultView = localStorage.getItem("default_catalog_view") as "grid" | "table";
    if (savedDefaultView === "grid" || savedDefaultView === "table") {
      setViewMode(savedDefaultView);
    }
  }, [viewParam]);

  const userRole = currentUser?.role?.toLowerCase() || "guest";
  const isGuestOrViewer = !currentUser || userRole === "guest" || userRole === "viewer";
  const isSuperAdmin = userRole === "super_admin" || userRole === "superadmin";
  const canCreateProperty = currentUser && !isGuestOrViewer;
  const isLoggedIn = !!currentUser && currentUser.id !== "";

  // HOOK INQUIRY — menyatukan logic WA di satu tempat
  const { requestContact, modalProps } = useLeadCapture({
    isLoggedIn,
    source: "Katalog Properti",
  });

  // Setiap pencarian bersifat lintas-katalog: menyaring hanya portofolio
  // sendiri akan membuat hasilnya terasa hilang.
  const hasSearchIntent = useMemo(
    () =>
      Boolean(qParam) ||
      Boolean(provinceNameParam) ||
      Boolean(cityNameParam) ||
      Boolean(districtKey) ||
      listingTypeParam !== "all" ||
      propertyTypeParam !== "all" ||
      Boolean(minPrice || maxPrice || minLandArea || maxLandArea || minBuildingArea || maxBuildingArea) ||
      Boolean(bedroomParam || bathroomParam),
    [
      qParam,
      provinceNameParam,
      cityNameParam,
      districtKey,
      listingTypeParam,
      propertyTypeParam,
      minPrice,
      maxPrice,
      minLandArea,
      maxLandArea,
      minBuildingArea,
      maxBuildingArea,
      bedroomParam,
      bathroomParam,
    ]
  );

  const defaultScope = useMemo(() => {
    if (
      viewParam === "global" ||
      scopeParam === "global" ||
      isFeaturedParam ||
      forYouParam ||
      hasSearchIntent
    ) {
      return "global";
    }
    return "my_properties";
  }, [viewParam, scopeParam, isFeaturedParam, forYouParam, hasSearchIntent]);

  const [scopeMode, setScopeMode] = useState<"my_properties" | "global">(defaultScope);

  useEffect(() => {
    if (viewParam === "global" || scopeParam === "global" || isFeaturedParam || forYouParam || hasSearchIntent) {
      setScopeMode("global");
    }
  }, [viewParam, scopeParam, isFeaturedParam, forYouParam, hasSearchIntent]);

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

  // ============================================================
  // FILTER QUERY — dikirim ke basis data, bukan disaring di peramban
  // ============================================================
  //
  // Sebelumnya halaman ini mengambil 12 baris terbaru tanpa filter apa pun,
  // lalu menyaringnya di sisi klien. Akibatnya hasil filter hanya diambil dari
  // 12 properti itu: memilih "Rumah" atau mengisi kota kerap menghasilkan
  // daftar kosong padahal datanya ada. Semua kriteria kini ikut ke query.
  const queryFilters = useMemo<PropertyFilter>(() => {
    const advanced: AdvancedFilter = {};

    if (minPrice) advanced.priceMin = Number(minPrice);
    if (maxPrice) advanced.priceMax = Number(maxPrice);
    if (minLandArea) advanced.landAreaMin = Number(minLandArea);
    if (maxLandArea) advanced.landAreaMax = Number(maxLandArea);
    if (minBuildingArea) advanced.buildingAreaMin = Number(minBuildingArea);
    if (maxBuildingArea) advanced.buildingAreaMax = Number(maxBuildingArea);
    if (bedroomParam) advanced.bedroom = Number(bedroomParam);
    if (bathroomParam) advanced.bathroom = Number(bathroomParam);
    if (provinceNameParam) advanced.province_name = provinceNameParam;
    if (cityNameParam) advanced.city_name = cityNameParam;

    // Diturunkan ulang dari `districtKey`, bukan dari array hasil `getAll`,
    // supaya isi memo ini benar-benar sejalan dengan dependency-nya. Array
    // kosong sengaja tidak ditulis ke `advanced`: `activeFilterCount`
    // menghitung setiap nilai yang bukan kosong, dan `[]` akan terhitung
    // sebagai satu filter aktif padahal tidak ada lokasi yang dipilih.
    const districtNames = districtKey ? districtKey.split("|") : [];
    if (districtNames.length > 0) advanced.district_names = districtNames;

    // Tamu dan viewer hanya boleh melihat listing yang sudah tayang.
    //
    // Nilainya tepat "published" saja. `PropertyStatus` hanya mengenal draft,
    // review, published, sold, rented, archived — dan seluruh jalur penyimpanan
    // (wizard, StepReview, dropdown status di halaman detail) memang hanya
    // menulis nilai-nilai itu. Menyertakan "available" berisiko galat
    // 22P02 (invalid input value for enum) yang akan mengosongkan katalog
    // untuk semua tamu, bukan sekadar melewatkan beberapa baris.
    const status: PropertyFilter["status"] = isGuestOrViewer ? "published" : "all";

    // "Portofolio Saya" dijalankan sebagai filter kepemilikan di query, agar
    // paginasinya menghitung jumlah yang benar.
    const ownerId =
      !isGuestOrViewer && scopeMode === "my_properties" && !isSuperAdmin && currentUser?.id
        ? currentUser.id
        : null;

    const sortByPrice = sortParam === "price_asc" || sortParam === "price_desc";
    const pageNum = pageParam ? parseInt(pageParam, 10) : 1;

    return {
      search: qParam.trim(),
      status,
      listing_type: listingTypeParam,
      property_type: propertyTypeParam,
      is_featured: isFeaturedParam ? true : null,
      owner_id: ownerId,
      sort_by: sortByPrice ? "price" : "created_at",
      sort_order: sortParam === "price_asc" ? "asc" : "desc",
      limit: 12,
      page: isNaN(pageNum) || pageNum < 1 ? 1 : pageNum,
      advanced,
    };
  }, [
    qParam,
    listingTypeParam,
    propertyTypeParam,
    provinceNameParam,
    cityNameParam,
    districtKey,
    minPrice,
    maxPrice,
    minLandArea,
    maxLandArea,
    minBuildingArea,
    maxBuildingArea,
    bedroomParam,
    bathroomParam,
    sortParam,
    isFeaturedParam,
    isGuestOrViewer,
    scopeMode,
    isSuperAdmin,
    currentUser?.id,
    pageParam,
  ]);

  const {
    data: rawProperties = [],
    loading,
    refetch,
    totalItems,
    totalPages,
    page: currentPage,
  } = useProperties(queryFilters);

  // Dihitung dari parameter URL, bukan dari `hasActiveFilters` milik hook:
  // hook menganggap `status !== "all"` sebagai filter aktif, sedangkan untuk
  // tamu status memang selalu dipaksa "published" — bukan pilihan pengguna.
  const activeFilterCount = useMemo(() => {
    const advancedValues = Object.values(queryFilters.advanced || {});
    const basic = [
      qParam.trim(),
      listingTypeParam !== "all" ? listingTypeParam : "",
      propertyTypeParam !== "all" ? propertyTypeParam : "",
      isFeaturedParam ? "featured" : "",
    ];
    return (
      basic.filter(Boolean).length +
      advancedValues.filter((v) => v !== null && v !== undefined && v !== "" && v !== 0).length
    );
  }, [queryFilters.advanced, qParam, listingTypeParam, propertyTypeParam, isFeaturedParam]);

  const hasActiveFilters = activeFilterCount > 0;

  // Filter halaman ini seluruhnya hidup di URL, jadi meresetnya cukup dengan
  // kembali ke rute polos — `resetFilters` milik hook akan langsung tertimpa
  // lagi oleh queryFilters pada render berikutnya.
  const clearAllFilters = () => router.push("/properties");

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

  const goToDetail = (prop: PropertyItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    router.push(`/properties/${prop.slug || prop.id}`);
  };

  const handleWhatsAppClick = (property: PropertyItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    requestContact(property, e);
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

  // Penyaringan dan pengurutan sepenuhnya dikerjakan oleh basis data lewat
  // `queryFilters`; di sini tinggal menampilkan apa yang dikembalikan.
  const filteredProperties = properties;

  return (
    <div className="space-y-4 sm:space-y-6 pb-24 max-w-[1550px] w-full mx-auto px-3 sm:px-8 bg-background/50 min-h-screen overflow-x-hidden pt-4">
      {/* HEADER PAGE DENGAN BACKGROUND GAMBAR */}
      <PageHeader
        title={
          isGuestOrViewer
            ? "Katalog Properti"
            : scopeMode === "my_properties"
            ? "Portofolio Saya"
            : "Katalog Perusahaan"
        }
        subtitle="Kelola dan cari portofolio properti dengan mudah dan cepat."
        badge={
          <Badge variant="outline" className="text-[10px] sm:text-xs font-bold bg-emerald-500/20 text-emerald-100 border-emerald-400/30 px-2.5 py-0.5 backdrop-blur-md">
            {isGuestOrViewer ? "Klien" : scopeMode === "my_properties" ? "Pribadi" : "Perusahaan"}
          </Badge>
        }
      >
        <div className="w-full flex flex-col items-center">
          {/* SEARCH & FILTER COMPONENT */}
          <div className="w-full max-w-4xl">
            <DashboardPropertySearch />
          </div>

          {/* TOGGLE SCOPE & RINGKASAN HASIL */}
          <div className="w-full max-w-4xl mt-6 flex flex-col items-center justify-center gap-4">
            {!isGuestOrViewer && (
              <div className="flex items-center bg-white/10 backdrop-blur-md p-1 rounded-xl border border-white/10 shadow-sm">
                <Button
                  variant={scopeMode === "my_properties" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setScopeMode("my_properties")}
                  className={cn(
                    "text-[10px] sm:text-xs h-8 rounded-lg gap-1.5 cursor-pointer font-bold px-3 transition-colors",
                    scopeMode === "my_properties" ? "bg-emerald-500 text-emerald-950 shadow-sm" : "text-emerald-50 hover:bg-white/20 hover:text-white"
                  )}
                >
                  <User className="w-3.5 h-3.5" /> Portofolio Saya
                </Button>
                <Button
                  variant={scopeMode === "global" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setScopeMode("global")}
                  className={cn(
                    "text-[10px] sm:text-xs h-8 rounded-lg gap-1.5 cursor-pointer font-bold px-3 transition-colors",
                    scopeMode === "global" ? "bg-emerald-500 text-emerald-950 shadow-sm" : "text-emerald-50 hover:bg-white/20 hover:text-white"
                  )}
                >
                  <Globe className="w-3.5 h-3.5" /> Katalog Perusahaan
                </Button>
              </div>
            )}

            {!loading && filteredProperties.length > 0 && (
              <div className="flex items-center gap-3">
                <p className="text-xs text-emerald-100/90 font-medium text-center">
                  Menampilkan <span className="font-bold text-white">{filteredProperties.length}</span> dari <span className="font-bold text-white">{totalItems}</span> properti
                </p>
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllFilters}
                    className="h-8 px-2.5 text-[10px] sm:text-xs font-bold text-emerald-100 hover:text-white hover:bg-white/20 cursor-pointer rounded-lg backdrop-blur-md border border-white/10"
                  >
                    Hapus Filter
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </PageHeader>

      {/* VIEW CONTROLS & ADD BUTTON (Below Header) */}
      <div className="flex items-center justify-between gap-3 mb-2 px-1">
        <div className="flex items-center border border-border/80 rounded-xl p-0.5 bg-card shadow-2xs">
          <Button
            variant={viewMode === "grid" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("grid")}
            className={cn("h-8 px-2.5 text-xs font-semibold gap-1.5 rounded-lg cursor-pointer", viewMode === "grid" ? "bg-emerald-600 text-white hover:bg-emerald-700" : "text-muted-foreground")}
          >
            <LayoutGrid className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Kartu</span>
          </Button>
          <Button
            variant={viewMode === "table" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("table")}
            className={cn("h-8 px-2.5 text-xs font-semibold gap-1.5 rounded-lg cursor-pointer", viewMode === "table" ? "bg-emerald-600 text-white hover:bg-emerald-700" : "text-muted-foreground")}
          >
            <List className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Tabel</span>
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => refetch?.()} className="h-9 w-9 rounded-xl border-border/80 bg-card cursor-pointer shadow-2xs">
            <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
          </Button>

          {canCreateProperty && (
            <Button
              onClick={() => router.push("/properties/create")}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-1.5 h-9 px-3 sm:px-4 rounded-xl cursor-pointer shadow-xs"
            >
              <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Tambah Properti</span><span className="sm:hidden">Tambah</span>
            </Button>
          )}
        </div>
      </div>

      {/* 5. MAIN LIST PROPERTI */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-6 pt-2">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-72 sm:h-80 w-full rounded-2xl bg-muted/60" />
          ))}
        </div>
      ) : filteredProperties.length === 0 ? (
        <Card className="border border-border/80 p-8 sm:p-14 text-center space-y-3 rounded-2xl bg-card shadow-xs">
          <Building2 className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground/60 mx-auto" />
          <h3 className="text-xs sm:text-base font-bold text-foreground">
            {hasActiveFilters
              ? "Tidak ada properti yang cocok"
              : isGuestOrViewer
              ? "Belum ada listing dipublikasikan"
              : "Belum ada properti"}
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
            {hasActiveFilters
              ? "Coba longgarkan kriteria pencarian, atau hapus filter untuk melihat seluruh katalog."
              : isGuestOrViewer
              ? "Listing baru akan muncul di sini begitu dipublikasikan."
              : "Mulai dengan menambahkan properti pertama Anda ke katalog."}
          </p>

          {hasActiveFilters ? (
            <Button
              onClick={clearAllFilters}
              variant="outline"
              className="text-xs font-bold rounded-xl h-9 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Hapus semua filter
            </Button>
          ) : canCreateProperty ? (
            <Button
              onClick={() => router.push("/properties/create")}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl h-9 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Tambah Properti
            </Button>
          ) : null}
        </Card>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-6 pt-2">
          {filteredProperties.map((prop) => (
            <PropertyCard
              key={prop.id}
              prop={prop}
              isSuperAdmin={isSuperAdmin}
              isGuestOrViewer={isGuestOrViewer}
              onToggleFeatured={handleToggleFeatured}
              onDelete={handleDelete}
              onClick={goToDetail}
              onEdit={(id) => router.push(`/properties/edit/${id}`)}
            />
          ))}
        </div>
      ) : (
        /* ================= 📋 TABLE VIEW (DENGAN SCROLL CONTAINER BONGKAR HP) ================= */
        <Card className="rounded-2xl border border-border/80 overflow-hidden shadow-xs bg-card">
          <div className="w-full overflow-x-auto">
            <Table className="min-w-[700px] sm:min-w-full">
              <TableHeader className="bg-muted/50">
                <TableRow className="border-border/60">
                  <TableHead className="text-xs font-bold text-foreground py-3 px-3.5">Properti</TableHead>
                  <TableHead className="text-xs font-bold text-foreground py-3 px-3.5">Tipe</TableHead>
                  <TableHead className="text-xs font-bold text-foreground py-3 px-3.5">Harga</TableHead>
                  <TableHead className="text-xs font-bold text-foreground py-3 px-3.5">Spesifikasi</TableHead>
                  <TableHead className="text-xs font-bold text-foreground py-3 px-3.5">Lokasi</TableHead>
                  <TableHead className="text-xs font-bold text-foreground py-3 px-3.5">Agen</TableHead>
                  <TableHead className="text-right text-xs font-bold text-foreground py-3 px-3.5">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProperties.map((prop) => {
                  const isRent = prop.listing_type === "sewa" || prop.listing_type === "disewa" || prop.listing_type === "rent";
                  const statusBadge = !isGuestOrViewer ? STATUS_BADGE[prop.status] : null;
                  const showNoAgentWarning = !isGuestOrViewer && !prop.assigned_to;

                  return (
                    <TableRow key={prop.id} className="hover:bg-muted/40 border-border/60 cursor-pointer" onClick={() => goToDetail(prop)}>
                      <TableCell className="font-medium py-3 px-3.5">
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
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                              <span className="text-[10px] text-muted-foreground font-mono">{prop.listing_code}</span>
                              {statusBadge && (
                                <Badge variant="outline" className={cn("text-[9px] font-bold px-1.5 py-0 rounded", statusBadge.className)}>
                                  {statusBadge.label}
                                </Badge>
                              )}
                              {showNoAgentWarning && (
                                <Badge
                                  variant="outline"
                                  className="text-[9px] font-bold px-1.5 py-0 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/40"
                                  title="Listing tanpa agen penanggung jawab tidak dapat dipublikasikan"
                                >
                                  Belum ada agen
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-3 px-3.5">
                        <Badge className={cn("text-[10px] font-bold px-2 py-0.5 rounded-md", isRent ? "bg-amber-600 text-white" : "bg-emerald-600 text-white")}>
                          {isRent ? "SEWA" : "JUAL"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-extrabold text-emerald-600 dark:text-emerald-400 text-xs whitespace-nowrap font-mono tabular-nums py-3 px-3.5">
                        {formatCurrency(prop.price)}
                      </TableCell>
                      <TableCell className="py-3 px-3.5">
                        <div className="text-xs text-muted-foreground font-medium flex items-center gap-1.5 flex-wrap">
                          <span>{prop.bedrooms || 0} KT</span> • <span>{prop.bathrooms || 0} KM</span> •
                          <span className="inline-flex items-center gap-0.5"><Building2 className="w-3.5 h-3.5 text-emerald-600" /> LB {prop.building_area || 0}m²</span> •
                          <span className="inline-flex items-center gap-0.5"><Maximize2 className="w-3.5 h-3.5 text-emerald-600" /> LT {prop.land_area || 0}m²</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate py-3 px-3.5">
                        {prop.location}
                      </TableCell>
                      <TableCell className="py-3 px-3.5">
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full overflow-hidden bg-emerald-100 text-emerald-800 font-bold text-[9px] flex items-center justify-center shrink-0">
                            {prop.uploader_name ? prop.uploader_name.slice(0, 2).toUpperCase() : "IP"}
                          </div>
                          <span className="text-xs text-muted-foreground font-semibold truncate max-w-[90px]">
                            {prop.uploader_name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right py-3 px-3.5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={(e) => handleWhatsAppClick(prop, e)}
                            className="h-7 px-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 cursor-pointer"
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
                            <Share2 className="w-3.5 h-3.5" />
                          </Button>

                          {!isGuestOrViewer && (
                            <DropdownMenu>
                              <DropdownMenuTrigger className="h-7 w-7 rounded-lg hover:bg-accent flex items-center justify-center border border-border/80">
                                <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
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
          </div>
        </Card>
      )}

      {/* 6. PAGINASI
          Query hanya mengambil 12 baris per halaman. Tanpa navigasi ini,
          properti selebihnya tidak akan pernah bisa dibuka. */}
      {!loading && totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3">
          <p className="text-xs text-muted-foreground order-2 sm:order-1">
            Menampilkan halaman <span className="font-bold text-foreground">{currentPage}</span> dari{" "}
            <span className="font-bold text-foreground">{totalPages}</span>
          </p>
          <div className="w-full sm:w-auto order-1 sm:order-2 flex justify-center">
            <NumberedPagination currentPage={currentPage} totalPages={totalPages} />
          </div>
        </div>
      )}

      {/* MODAL INQUIRY — hanya muncul untuk tamu dan client berprofil belum lengkap */}
      <LeadCaptureModal {...modalProps} />
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