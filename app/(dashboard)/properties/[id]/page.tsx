// app/(dashboard)/properties/[id]/page.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  MapPin,
  User,
  Image as ImageIcon,
  Pencil,
  Trash2,
  Copy,
  Clock,
  Loader2,
  Users,
  Calculator,
  MoreVertical,
  ShieldAlert,
  MessageCircle,
  Phone,
  Maximize2,
  Lock,
  X,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";

import { supabase } from "@/lib/supabase/client";
import propertyService from "@/services/property.service";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

// ============================================================
// TIPE LOKAL & CONFIG STATUS
// ============================================================
type PropertyStatus = "draft" | "review" | "published" | "sold" | "rented" | "archived";

interface PropertyDetail {
  id: string;
  listing_code: string;
  title: string;
  slug: string;
  property_type: string;
  listing_type: "jual" | "sewa";
  property_category?: string | null;
  status: PropertyStatus;
  description?: string | null;
  selling_point?: string | null;
  rental_period?: string | null;
  owner_id?: string | null;
  created_by: string;
  user_id?: string | null;
  published_at?: string | null;
  created_at: string;
  updated_at: string;
  assigned_to?: string | null;
  owner?: any;
  address?: any;
  price?: any;
  specifications?: any;
  land?: any;
  building?: any;
  media?: any[];
  images?: any;
  image_url?: string | null;
  assigned_user?: any;
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: "Draft", color: "text-slate-600 dark:text-slate-400", bg: "bg-slate-100 dark:bg-slate-800" },
  review: { label: "Review", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-100 dark:bg-amber-950/60" },
  published: { label: "Published", color: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-100 dark:bg-emerald-950/60" },
  sold: { label: "Sold", color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-100 dark:bg-rose-950/60" },
  rented: { label: "Rented", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-100 dark:bg-blue-950/60" },
  archived: { label: "Archived", color: "text-slate-500", bg: "bg-slate-100 dark:bg-slate-800" },
};

interface LocationData {
  countries: { id: string; name: string }[];
  provinces: { id: string; name: string }[];
  cities: { id: string; name: string }[];
  districts: { id: string; name: string }[];
  villages: { id: string; name: string }[];
}

const DEFAULT_FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&q=80";

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function PropertyDetailPage() {
  const router = useRouter();
  const params = useParams();
  const propertyId = params.id as string;

  const [property, setProperty] = useState<PropertyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [newStatus, setNewStatus] = useState<PropertyStatus>("draft");
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  const [activeImage, setActiveImage] = useState<string>("");

  // Fullscreen Preview Lightbox State
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<string>("");

  // User & Auth Role states
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>("agent");

  // Agent states
  const [agents, setAgents] = useState<any[]>([]);
  const [fetchedAssignedAgent, setFetchedAssignedAgent] = useState<any>(null);
  const [assignLoading, setAssignLoading] = useState(false);

  // Location data
  const [locationData, setLocationData] = useState<LocationData>({
    countries: [],
    provinces: [],
    cities: [],
    districts: [],
    villages: [],
  });

  // HELPER: Normalisasi Ekstrak Semua URL Gambar
  const getImagesList = (data: PropertyDetail | null): string[] => {
    if (!data) return [];
    let list: string[] = [];

    if (Array.isArray(data.media) && data.media.length > 0) {
      list = data.media
        .map((m: any) => m.public_url || m.url || m.file_path)
        .filter((url: any) => typeof url === "string" && url.trim() !== "");
    }

    if (list.length === 0 && data.images) {
      if (Array.isArray(data.images)) {
        list = data.images.filter((img: any) => typeof img === "string" && img.trim() !== "");
      } else if (typeof data.images === "string" && data.images.trim() !== "") {
        try {
          const parsed = JSON.parse(data.images);
          if (Array.isArray(parsed)) {
            list = parsed.filter((img: any) => typeof img === "string" && img.trim() !== "");
          } else {
            list = [data.images];
          }
        } catch {
          list = [data.images];
        }
      }
    }

    if (list.length === 0 && data.image_url) {
      list = [data.image_url];
    }

    return list;
  };

  // HELPER: Format Link WhatsApp Agen
  const getWaLink = (phone?: string, title?: string) => {
    if (!phone) return "#";
    let cleanPhone = phone.replace(/[^0-9]/g, "");
    if (cleanPhone.startsWith("0")) {
      cleanPhone = "62" + cleanPhone.slice(1);
    }
    const text = encodeURIComponent(
      `Halo Agen Inland Property, saya berminat dan ingin bertanya lebih lanjut mengenai properti: *${title || "Properti"}*`
    );
    return `https://wa.me/${cleanPhone}?text=${text}`;
  };

  // ===== FETCH AUTH USER & ROLE =====
  useEffect(() => {
    const fetchUserAndRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setCurrentUser(user);

          const { data: userData } = await supabase
            .from("users")
            .select("role")
            .eq("id", user.id)
            .maybeSingle();

          const role = userData?.role || user.user_metadata?.role || "agent";
          setUserRole(role.toLowerCase());
        }
      } catch (err) {
        console.error("Error fetching user role:", err);
      }
    };

    fetchUserAndRole();
  }, []);

  // ===== FETCH AGENTS =====
  useEffect(() => {
    const fetchAgents = async () => {
      const { data, error } = await supabase
        .from("users")
        .select("id, full_name, email, avatar_url, phone, whatsapp")
        .order("full_name");
      if (!error) setAgents(data || []);
    };
    fetchAgents();
  }, []);

  // ===== FETCH PROPERTY & LOCATION DATA =====
  useEffect(() => {
    const fetchProperty = async () => {
      setLoading(true);
      try {
        const data = await propertyService.getById(propertyId);
        setProperty(data);

        const imgs = getImagesList(data);
        if (imgs.length > 0) {
          setActiveImage(imgs[0]);
        } else {
          setActiveImage(DEFAULT_FALLBACK_IMAGE);
        }
      } catch (error) {
        console.error("Error fetching property:", error);
        toast.error("Gagal memuat data property");
        router.push("/properties");
      } finally {
        setLoading(false);
      }
    };

    const fetchLocationData = async () => {
      try {
        const [countries, provinces, cities, districts, villages] = await Promise.all([
          supabase.from("countries").select("id, name").order("name"),
          supabase.from("provinces").select("id, name").order("name"),
          supabase.from("cities").select("id, name").order("name"),
          supabase.from("districts").select("id, name").order("name"),
          supabase.from("villages").select("id, name").order("name"),
        ]);

        setLocationData({
          countries: countries.data || [],
          provinces: provinces.data || [],
          cities: cities.data || [],
          districts: districts.data || [],
          villages: villages.data || [],
        });
      } catch (error) {
        console.error("Error fetching location data:", error);
      }
    };

    if (propertyId) {
      fetchProperty();
      fetchLocationData();
    }
  }, [propertyId, router]);

  // ===== FETCH DIRECT AGENT IF NOT IN LIST =====
  useEffect(() => {
    async function fetchDirectAgent() {
      if (property?.assigned_to) {
        const found = agents.find((a) => a.id === property.assigned_to);
        if (!found) {
          const { data } = await supabase
            .from("users")
            .select("id, full_name, email, avatar_url, phone, whatsapp")
            .eq("id", property.assigned_to)
            .maybeSingle();
          if (data) setFetchedAssignedAgent(data);
        }
      }
    }
    fetchDirectAgent();
  }, [property?.assigned_to, agents]);

  // COMPUTED: Agen Penanggung Jawab Terhubung (Pemberantasan UID Random)
  const assignedAgent = useMemo(() => {
    if (!property) return null;

    if (property.assigned_to) {
      const foundInList = agents.find((a) => a.id === property.assigned_to);
      if (foundInList) return foundInList;
      if (fetchedAssignedAgent) return fetchedAssignedAgent;
    }

    if (property.assigned_user && typeof property.assigned_user === "object") {
      return property.assigned_user;
    }

    return null;
  }, [property, agents, fetchedAssignedAgent]);

  // 🔒 HAK AKSES PERMISSION COMPUTATION
  const isSuperAdmin = userRole === "super_admin" || userRole === "superadmin";
  const isAdmin = isSuperAdmin || userRole === "admin";
  const isOwner = !!currentUser && !!property && (property.user_id === currentUser.id || property.created_by === currentUser.id);
  const isReviewer = userRole === "reviewer";

  const canEdit = !isReviewer && (isAdmin || isOwner);

  // ===== HANDLE ASSIGN AGENT (KHUSUS SUPER ADMIN) =====
  const handleAssignAgent = async (agentId: string | null) => {
    if (!property) return;

    if (!isSuperAdmin) {
      toast.error("Akses Ditolak!", {
        description: "Agen penanggung jawab hanya dapat diubah atau dilepas dengan persetujuan Super Admin.",
      });
      return;
    }

    setAssignLoading(true);
    try {
      const updated = await propertyService.updateAssignedTo(
        property.id,
        agentId || null
      );
      setProperty(updated);
      toast.success(agentId ? "Agen berhasil ditugaskan!" : "Penugasan agen berhasil dilepas!");
    } catch (error: any) {
      console.error("Error assigning agent:", error);
      toast.error("Gagal menugaskan agen", { description: error.message });
    } finally {
      setAssignLoading(false);
    }
  };

  // ===== HANDLE STATUS UPDATE =====
  const handleUpdateStatus = async () => {
    if (!property) return;
    if (!canEdit) {
      toast.error("Anda tidak memiliki izin untuk mengubah status properti ini.");
      return;
    }

    setUpdating(true);
    try {
      await propertyService.updateStatus(property.id, newStatus);
      toast.success(`Status berhasil diubah menjadi ${statusConfig[newStatus]?.label || newStatus}`);
      const updated = await propertyService.getById(property.id);
      setProperty(updated);
      setShowStatusDialog(false);
    } catch (error: any) {
      console.error("Error updating status:", error);
      toast.error("Gagal mengubah status", {
        description: error.message || "Silakan coba lagi.",
      });
    } finally {
      setUpdating(false);
    }
  };

  // ===== HANDLE DELETE =====
  const handleDelete = async () => {
    if (!property) return;
    if (!canEdit) {
      toast.error("Anda tidak memiliki izin untuk menghapus properti ini.");
      return;
    }

    setDeleting(true);
    try {
      await propertyService.delete(property.id);
      toast.success("Property berhasil dihapus");
      router.push("/properties");
    } catch (error: any) {
      console.error("Error deleting property:", error);
      toast.error("Gagal menghapus property", {
        description: error.message || "Silakan coba lagi.",
      });
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  // ===== HANDLE DUPLICATE =====
  const handleDuplicate = async () => {
    if (!property) return;
    if (!canEdit) {
      toast.error("Anda tidak memiliki izin untuk menduplikasi properti ini.");
      return;
    }

    try {
      const duplicated = await propertyService.duplicate(property.id);
      toast.success("Property berhasil diduplikasi!");
      router.push(`/properties/${duplicated.id}`);
    } catch (error: any) {
      console.error("Error duplicating property:", error);
      toast.error("Gagal menduplikasi property", {
        description: error.message || "Silakan coba lagi.",
      });
    }
  };

  // ===== HELPERS =====
  const formatRelativeTime = (date: string) => {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true, locale: id });
    } catch {
      return date;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const getLocationName = (id: string, list: { id: string; name: string }[]) => {
    return list.find((item) => item.id === id)?.name || "-";
  };

  const getInitials = (name: string) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const openLightbox = (url: string) => {
    setPreviewImage(url);
    setPreviewOpen(true);
  };

  // ============================================================
  // LOADING STATE
  // ============================================================
  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-48" />
        <Skeleton className="h-[250px] sm:h-[350px] w-full rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
          <div className="lg:col-span-1">
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center">
        <div className="text-6xl mb-4">🏠</div>
        <h2 className="text-2xl font-bold text-slate-700 dark:text-slate-200">Property Tidak Ditemukan</h2>
        <p className="text-slate-500 mt-2">Property yang Anda cari mungkin telah dihapus.</p>
        <Button onClick={() => router.back()} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Kembali
        </Button>
      </div>
    );
  }

  const allImages = getImagesList(property);

  // ============================================================
  // RENDER MAIN
  // ============================================================
  return (
    <div className="space-y-6 pb-12">
      {/* HEADER BAR RESPONSIVE */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2.5 flex-wrap">
              <span>{property.title}</span>
              <Badge
                className={cn(
                  "text-xs font-medium border-0 px-2.5 py-0.5",
                  statusConfig[property.status]?.color,
                  statusConfig[property.status]?.bg
                )}
              >
                {statusConfig[property.status]?.label || property.status}
              </Badge>
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {property.listing_code} • {property.property_type}
            </p>
          </div>
        </div>

        {/* HEADER ACTIONS */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/kpr-calculator?property_id=${property.id}`)}
            className="border-emerald-500/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-xs h-9 gap-1.5"
          >
            <Calculator className="h-4 w-4 text-emerald-600" />
            <span className="hidden sm:inline">Simulasi KPR</span>
            <span className="sm:hidden">KPR</span>
          </Button>

          {canEdit && (
            <div className="hidden sm:flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => router.push(`/properties/${property.id}/edit`)} className="text-xs h-9">
                <Pencil className="h-4 w-4 mr-1.5" /> Edit
              </Button>
              <Button variant="outline" size="sm" onClick={handleDuplicate} className="text-xs h-9">
                <Copy className="h-4 w-4 mr-1.5" /> Duplikasi
              </Button>
              <Button variant="default" size="sm" onClick={() => setShowStatusDialog(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9">
                <Clock className="h-4 w-4 mr-1.5" /> Status
              </Button>
              <Button variant="destructive" size="sm" onClick={() => setShowDeleteDialog(true)} className="text-xs h-9">
                <Trash2 className="h-4 w-4 mr-1.5" /> Hapus
              </Button>
            </div>
          )}

          {canEdit && (
            <div className="sm:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md border p-2 hover:bg-accent focus:outline-none">
                  <MoreVertical className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem onClick={() => router.push(`/properties/${property.id}/edit`)} className="text-xs gap-2">
                    <Pencil className="h-3.5 w-3.5" /> Edit Properti
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDuplicate} className="text-xs gap-2">
                    <Copy className="h-3.5 w-3.5" /> Duplikasi
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowStatusDialog(true)} className="text-xs gap-2">
                    <Clock className="h-3.5 w-3.5 text-emerald-600" /> Ubah Status
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setShowDeleteDialog(true)} className="text-xs gap-2 text-rose-600 dark:text-rose-400">
                    <Trash2 className="h-3.5 w-3.5" /> Hapus Properti
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>

      {!canEdit && (
        <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl flex items-center gap-2.5 text-amber-800 dark:text-amber-300 text-xs">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            {isReviewer
              ? "Akun Anda bertindak sebagai Reviewer. Anda dapat melihat detail properti ini tanpa akses edit."
              : "Anda melihat properti milik agen lain dalam mode baca saja (Read-Only)."}
          </span>
        </div>
      )}

      {/* GALERI FOTO & BANNER UTAMA DENGAN DUKUNGAN PREVIEW FULLSCREEN */}
      <div className="space-y-3">
        <div className="relative group w-full h-[260px] sm:h-[380px] lg:h-[450px] rounded-2xl overflow-hidden border bg-slate-950 shadow-sm">
          <img
            src={activeImage || DEFAULT_FALLBACK_IMAGE}
            alt={property.title}
            className="w-full h-full object-cover transition-all duration-300 group-hover:scale-102 cursor-pointer"
            onClick={() => openLightbox(activeImage || DEFAULT_FALLBACK_IMAGE)}
            onError={(e) => {
              (e.target as HTMLImageElement).src = DEFAULT_FALLBACK_IMAGE;
            }}
          />

          <div className="absolute top-3 left-3 flex gap-2">
            <Badge className="bg-emerald-600 text-white text-xs px-2.5 py-1 font-semibold uppercase shadow">
              {property.listing_type === "jual" ? "Dijual" : "Disewakan"}
            </Badge>
            <Badge variant="secondary" className="text-xs px-2.5 py-1 font-semibold backdrop-blur-md bg-white/80 dark:bg-slate-950/80">
              {property.property_type}
            </Badge>
          </div>

          {/* Tombol Perbesar Foto Fullscreen */}
          <Button
            size="sm"
            onClick={() => openLightbox(activeImage || DEFAULT_FALLBACK_IMAGE)}
            className="absolute top-3 right-3 bg-black/60 hover:bg-black/80 backdrop-blur-md text-white text-xs gap-1.5 border border-white/20"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Perbesar Foto</span>
          </Button>

          <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-md text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5">
            <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
            <span>{allImages.length > 0 ? `${allImages.length} Foto` : "1 Foto"}</span>
          </div>
        </div>

        {allImages.length > 1 && (
          <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-thin">
            {allImages.map((imgUrl, idx) => (
              <button
                key={idx}
                onClick={() => setActiveImage(imgUrl)}
                className={cn(
                  "relative w-20 h-14 sm:w-24 sm:h-16 rounded-xl overflow-hidden shrink-0 border-2 transition-all cursor-pointer",
                  activeImage === imgUrl
                    ? "border-emerald-600 ring-2 ring-emerald-600/30 scale-105"
                    : "border-transparent opacity-70 hover:opacity-100"
                )}
              >
                <img
                  src={imgUrl}
                  alt={`Foto ${idx + 1}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = DEFAULT_FALLBACK_IMAGE;
                  }}
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* MAIN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN - Details & Tabs */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 h-10">
              <TabsTrigger value="details" className="text-xs font-medium">📋 Detail</TabsTrigger>
              <TabsTrigger value="location" className="text-xs font-medium">📍 Lokasi</TabsTrigger>
              <TabsTrigger value="media" className="text-xs font-medium">🖼️ Foto ({allImages.length})</TabsTrigger>
            </TabsList>

            {/* DETAILS TAB */}
            <TabsContent value="details" className="mt-4">
              <Card className="border shadow-xs">
                <CardHeader className="p-4 pb-2 border-b">
                  <CardTitle className="text-sm font-bold">Informasi Spesifikasi Properti</CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-4 text-xs">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-muted-foreground text-[11px]">Kode Listing</Label>
                      <p className="font-mono font-bold text-foreground mt-0.5">{property.listing_code}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-[11px]">Tipe Properti</Label>
                      <p className="font-semibold text-foreground mt-0.5">{property.property_type}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-[11px]">Tipe Listing</Label>
                      <p className="font-semibold text-foreground mt-0.5">{property.listing_type === "jual" ? "Jual" : "Sewa"}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-[11px]">Kategori</Label>
                      <p className="font-semibold text-foreground mt-0.5">{property.property_category || "-"}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-[11px]">Status</Label>
                      <div className="mt-0.5">
                        <Badge
                          className={cn(
                            "text-[10px] font-semibold border-0 px-2 py-0.5",
                            statusConfig[property.status]?.color,
                            statusConfig[property.status]?.bg
                          )}
                        >
                          {statusConfig[property.status]?.label || property.status}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-[11px]">Dibuat Pada</Label>
                      <p className="font-medium text-foreground mt-0.5">{formatRelativeTime(property.created_at)}</p>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <Label className="text-muted-foreground text-[11px]">Deskripsi Properti</Label>
                    <p className="text-xs text-foreground mt-1 whitespace-pre-wrap leading-relaxed">
                      {property.description || "Tidak ada deskripsi"}
                    </p>
                  </div>

                  {property.selling_point && (
                    <div>
                      <Label className="text-muted-foreground text-[11px]">💎 Selling Point Utama</Label>
                      <p className="text-xs text-foreground font-medium mt-1 p-2.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200/50">
                        {property.selling_point}
                      </p>
                    </div>
                  )}

                  <Separator />

                  <div>
                    <Label className="text-muted-foreground text-[11px] mb-2 block">Harga & Ketentuan Penjualan</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {property.listing_type === "jual" && property.price?.selling_price && (
                        <div>
                          <span className="text-muted-foreground text-[10px] block">Harga Jual</span>
                          <p className="font-mono font-extrabold text-base text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(property.price.selling_price)}
                          </p>
                        </div>
                      )}
                      {property.listing_type === "sewa" && property.price?.rental_price && (
                        <div>
                          <span className="text-muted-foreground text-[10px] block">Harga Sewa / Bulan</span>
                          <p className="font-mono font-extrabold text-base text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(property.price.rental_price)}
                          </p>
                        </div>
                      )}
                      {property.price?.service_charge && (
                        <div>
                          <span className="text-muted-foreground text-[10px] block">Service Charge</span>
                          <p className="font-mono font-semibold">{formatCurrency(property.price.service_charge)}</p>
                        </div>
                      )}
                      {property.price?.maintenance_fee && (
                        <div>
                          <span className="text-muted-foreground text-[10px] block">Maintenance Fee</span>
                          <p className="font-mono font-semibold">{formatCurrency(property.price.maintenance_fee)}</p>
                        </div>
                      )}
                      {property.price?.negotiable && (
                        <div>
                          <span className="text-muted-foreground text-[10px] block">Status Harga</span>
                          <p className="font-semibold text-emerald-600 dark:text-emerald-400">✅ BISA NEGO</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <Label className="text-muted-foreground text-[11px] mb-2 block">Fasilitas & Spesifikasi Utama</Label>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                      {property.specifications?.bedroom && (
                        <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded-lg text-center border">
                          <p className="text-xs font-bold">{property.specifications.bedroom}</p>
                          <p className="text-[10px] text-muted-foreground">🛏️ Kamar</p>
                        </div>
                      )}
                      {property.specifications?.bathroom && (
                        <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded-lg text-center border">
                          <p className="text-xs font-bold">{property.specifications.bathroom}</p>
                          <p className="text-[10px] text-muted-foreground">🛁 K. Mandi</p>
                        </div>
                      )}
                      {property.specifications?.garage && (
                        <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded-lg text-center border">
                          <p className="text-xs font-bold">{property.specifications.garage}</p>
                          <p className="text-[10px] text-muted-foreground">🚗 Garasi</p>
                        </div>
                      )}
                      {property.specifications?.carport && (
                        <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded-lg text-center border">
                          <p className="text-xs font-bold">{property.specifications.carport}</p>
                          <p className="text-[10px] text-muted-foreground">🏎️ Carport</p>
                        </div>
                      )}
                      {property.specifications?.floor && (
                        <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded-lg text-center border">
                          <p className="text-xs font-bold">{property.specifications.floor}</p>
                          <p className="text-[10px] text-muted-foreground">🏗️ Lantai</p>
                        </div>
                      )}
                      {property.specifications?.electricity && (
                        <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded-lg text-center border">
                          <p className="text-xs font-bold">{property.specifications.electricity} VA</p>
                          <p className="text-[10px] text-muted-foreground">⚡ Listrik</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {property.land?.land_area && (
                      <div>
                        <Label className="text-muted-foreground text-[10px]">Luas Tanah</Label>
                        <p className="font-mono font-bold text-xs">{property.land.land_area} {property.land.land_unit || "m²"}</p>
                      </div>
                    )}
                    {property.building?.building_area && (
                      <div>
                        <Label className="text-muted-foreground text-[10px]">Luas Bangunan</Label>
                        <p className="font-mono font-bold text-xs">{property.building.building_area} m²</p>
                      </div>
                    )}
                    {property.land?.land_width && property.land?.land_length && (
                      <div>
                        <Label className="text-muted-foreground text-[10px]">Dimensi Tanah</Label>
                        <p className="font-mono font-bold text-xs">{property.land.land_width} x {property.land.land_length} m</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* LOCATION TAB */}
            <TabsContent value="location" className="mt-4">
              <Card className="border shadow-xs">
                <CardHeader className="p-4 pb-2 border-b">
                  <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-emerald-600" /> Alamat & Wilayah Properti
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-4 text-xs">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-muted-foreground text-[10px]">Negara</Label>
                      <p className="font-medium">{getLocationName(property.address?.country_id || "", locationData.countries)}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-[10px]">Provinsi</Label>
                      <p className="font-medium">{getLocationName(property.address?.province_id || "", locationData.provinces)}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-[10px]">Kota / Kabupaten</Label>
                      <p className="font-medium">{getLocationName(property.address?.city_id || "", locationData.cities)}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-[10px]">Kecamatan</Label>
                      <p className="font-medium">{getLocationName(property.address?.district_id || "", locationData.districts)}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-[10px]">Kelurahan / Desa</Label>
                      <p className="font-medium">{getLocationName(property.address?.village_id || "", locationData.villages)}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-[10px]">Kode Pos</Label>
                      <p className="font-mono font-medium">{property.address?.postal_code || "-"}</p>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <Label className="text-muted-foreground text-[10px]">Alamat Lengkap</Label>
                    <p className="font-medium text-foreground mt-1 leading-relaxed">{property.address?.address || "Tidak ada alamat"}</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* MEDIA TAB */}
            <TabsContent value="media" className="mt-4">
              <Card className="border shadow-xs">
                <CardHeader className="p-4 pb-2 border-b flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-emerald-600" /> Galeri Foto & Media
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  {allImages.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {allImages.map((imageUrl, idx) => (
                        <div
                          key={idx}
                          onClick={() => openLightbox(imageUrl)}
                          className="relative group aspect-square rounded-xl border overflow-hidden bg-slate-100 dark:bg-slate-900 cursor-pointer"
                        >
                          <img
                            src={imageUrl}
                            alt={`Foto Properti ${idx + 1}`}
                            className="w-full h-full object-cover transition transform group-hover:scale-105"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = DEFAULT_FALLBACK_IMAGE;
                            }}
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-semibold gap-1">
                            <Maximize2 className="w-4 h-4" /> Lihat Foto
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8 text-xs">Belum ada foto properti yang diunggah.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* RIGHT COLUMN - Sidebar Controls */}
        <div className="lg:col-span-1 space-y-6">
          {/* CARD AGEN PENANGGUNG JAWAB & WHATSAPP */}
          <Card className="border shadow-xs">
            <CardHeader className="p-4 pb-2 border-b">
              <CardTitle className="text-xs font-bold flex items-center gap-2">
                <Users className="h-4 w-4 text-emerald-600" /> Penanggung Jawab Properti (Agen)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs">
              {/* OPSI MENGUBAH AGEN (TERKUNCI KHUSUS SUPER ADMIN) */}
              {isSuperAdmin ? (
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground font-medium">Ubah Penugasan Agen (Hak Akses Super Admin):</Label>
                  <Select
                    value={property?.assigned_to || ""}
                    onValueChange={(val) => handleAssignAgent(val || null)}
                    disabled={assignLoading}
                  >
                    <SelectTrigger className="w-full h-9 text-xs">
                      <SelectValue placeholder="Pilih agen penanggung jawab" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="" className="text-xs text-rose-600 font-semibold">❌ -- Dilepas (Tanpa Agen) --</SelectItem>
                      {agents.map((agent) => (
                        <SelectItem key={agent.id} value={agent.id} className="text-xs">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-4 w-4">
                              <AvatarImage src={agent.avatar_url || undefined} />
                              <AvatarFallback className="text-[8px]">
                                {getInitials(agent.full_name || agent.email)}
                              </AvatarFallback>
                            </Avatar>
                            <span>{agent.full_name || agent.email}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 p-2 bg-slate-100 dark:bg-slate-800/60 rounded-lg text-[11px] text-slate-600 dark:text-slate-300">
                  <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Agen penanggung jawab tidak dapat diubah tanpa izin Super Admin.</span>
                </div>
              )}

              {assignedAgent ? (
                <div className="p-3.5 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-200/60 dark:border-emerald-900/50 space-y-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-11 w-11 border-2 border-emerald-500/30 shadow-xs shrink-0">
                      <AvatarImage src={assignedAgent.avatar_url || undefined} />
                      <AvatarFallback className="text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                        {getInitials(assignedAgent.full_name || assignedAgent.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-foreground text-xs truncate">
                        {assignedAgent.full_name || "Agen Inland Property"}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">{assignedAgent.email}</p>
                      {(assignedAgent.phone || assignedAgent.whatsapp) && (
                        <span className="inline-flex items-center gap-1 font-mono text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                          <Phone className="w-3 h-3" />
                          {assignedAgent.whatsapp || assignedAgent.phone}
                        </span>
                      )}
                    </div>
                  </div>

                  {(assignedAgent.phone || assignedAgent.whatsapp) ? (
                    <a
                      href={getWaLink(assignedAgent.whatsapp || assignedAgent.phone, property.title)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-xs transition shadow-sm shadow-emerald-600/20"
                    >
                      <MessageCircle className="w-4 h-4 fill-white text-emerald-600" />
                      <span>Chat WhatsApp Agen</span>
                    </a>
                  ) : (
                    <p className="text-[10px] text-amber-600 dark:text-amber-400 italic text-center">
                      Nomor WhatsApp agen belum dikonfigurasi.
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground italic text-center py-2">
                  Belum ada agen penanggung jawab yang ditugaskan.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Owner Card */}
          {property.owner && (
            <Card className="border shadow-xs">
              <CardHeader className="p-4 pb-2 border-b">
                <CardTitle className="text-xs font-bold flex items-center gap-2">
                  <User className="h-4 w-4 text-emerald-600" /> Informasi Pemilik Properti
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-2.5 text-xs">
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-emerald-100 text-emerald-700 font-bold text-xs">
                      {property.owner.full_name?.charAt(0).toUpperCase() || "O"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-bold text-foreground">{property.owner.full_name}</p>
                    <p className="text-[10px] text-muted-foreground">{property.owner.owner_code}</p>
                  </div>
                </div>
                <Separator />
                {property.owner.phone && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">📞</span>
                    <span className="font-mono">{property.owner.phone}</span>
                  </div>
                )}
                {property.owner.whatsapp && (
                  <a
                    href={getWaLink(property.owner.whatsapp, property.title)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-emerald-600 font-semibold hover:underline"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span className="font-mono">{property.owner.whatsapp} (WA Pemilik)</span>
                  </a>
                )}
              </CardContent>
            </Card>
          )}

          {/* Quick Actions Card */}
          <Card className="border shadow-xs">
            <CardHeader className="p-4 pb-2 border-b">
              <CardTitle className="text-xs font-bold">⚡ Aksi Cepat</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start text-xs text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 gap-2"
                onClick={() => router.push(`/kpr-calculator?property_id=${property.id}`)}
              >
                <Calculator className="h-4 w-4 text-emerald-600" />
                Simulasi KPR Properti Ini
              </Button>

              {canEdit && (
                <Button
                  variant="outline"
                  className="w-full justify-start text-xs gap-2"
                  onClick={() => router.push(`/properties/${property.id}/edit`)}
                >
                  <Pencil className="h-4 w-4" />
                  Edit Data Properti
                </Button>
              )}

              {/* FITUR EXPORT DIKUNCI */}
              <Button
                variant="outline"
                disabled
                className="w-full justify-between text-xs text-muted-foreground opacity-60 bg-slate-50 dark:bg-slate-900 cursor-not-allowed"
              >
                <span className="flex items-center gap-2">
                  <Lock className="h-3.5 w-3.5 text-slate-400" />
                  Export Portal Properti
                </span>
                <Badge variant="outline" className="text-[9px] py-0 px-1.5 text-slate-500 border-slate-300">
                  Belum Terintegrasi
                </Badge>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* FULLSCREEN PREVIEW LIGHTBOX DIALOG */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl p-2 bg-slate-950/95 border-slate-800 text-white rounded-2xl overflow-hidden">
          <div className="relative w-full h-[75vh] flex items-center justify-center">
            <button
              onClick={() => setPreviewOpen(false)}
              className="absolute top-2 right-2 p-2 bg-black/60 hover:bg-black text-white rounded-full transition z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={previewImage || DEFAULT_FALLBACK_IMAGE}
              alt="Preview Full"
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* STATUS UPDATE DIALOG */}
      {canEdit && (
        <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
          <DialogContent className="sm:max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">Ubah Status Properti</DialogTitle>
              <DialogDescription className="text-xs">
                Pilih status baru untuk publikasi atau ketersediaan properti ini
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <Select
                value={newStatus}
                onValueChange={(val) => setNewStatus(val as PropertyStatus)}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Pilih status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft" className="text-xs">📝 Draft</SelectItem>
                  <SelectItem value="review" className="text-xs">👀 Dalam Review</SelectItem>
                  <SelectItem value="published" className="text-xs">🚀 Published (Tayang)</SelectItem>
                  <SelectItem value="sold" className="text-xs">✅ Sold (Terjual)</SelectItem>
                  <SelectItem value="rented" className="text-xs">📋 Rented (Tersewa)</SelectItem>
                  <SelectItem value="archived" className="text-xs">📦 Archived (Arsip)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowStatusDialog(false)} className="text-xs">Batal</Button>
              <Button size="sm" onClick={handleUpdateStatus} disabled={updating} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
                {updating ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                Simpan Perubahan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* DELETE DIALOG */}
      {canEdit && (
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent className="sm:max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-rose-600">⚠️ Hapus Properti</DialogTitle>
              <DialogDescription className="text-xs">
                Apakah Anda yakin ingin menghapus properti <strong className="text-foreground">"{property.title}"</strong>?
                Tindakan ini permanen dan tidak dapat dibatalkan.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowDeleteDialog(false)} className="text-xs">Batal</Button>
              <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting} className="text-xs">
                {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                Hapus Permanen
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}