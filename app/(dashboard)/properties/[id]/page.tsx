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
  Bed,
  Bath,
  Building2,
  Sparkles,
  Car,
  Compass,
  FileCheck,
  Zap,
  Tag,
  Calendar,
  CalendarCheck,
  Layers,
  Armchair,
  Share2,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Ruler,
} from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

import { supabase } from "@/lib/supabase/client";
import propertyService from "@/services/property.service";
import { WatermarkedImage } from "@/components/ui/WatermarkedImage";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { cn } from "@/lib/utils";
import { LeadCaptureModal } from "@/components/inquiry/LeadCaptureModal";
import { useLeadCapture } from "@/hooks/use-lead-capture";

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
  location?: string | null;
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

interface PropertyCardItem {
  id: string;
  title: string;
  listing_code: string;
  listing_type: string;
  property_type: string;
  price: number | null;
  location: string;
  bedrooms: number;
  bathrooms: number;
  building_area: number;
  land_area: number;
  thumbnail: string;
  agent_name: string;
  agent_avatar: string | null;
  agent_phone: string | null;
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: "Draf Internal", color: "text-slate-600 dark:text-slate-400", bg: "bg-slate-500/10 border-slate-500/20" },
  review: { label: "Peninjauan", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
  published: { label: "Dipublikasikan", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  sold: { label: "Terjual", color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-500/10 border-indigo-500/20" },
  rented: { label: "Tersewa", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
  archived: { label: "Diarsip", color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-500/10 border-rose-500/20" },
};

const DEFAULT_FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1600&q=80";

// Sensor Nomor HP di Deskripsi
const maskPhoneNumbers = (text?: string | null): string => {
  if (!text) return "Belum ada deskripsi rinci untuk properti ini.";
  const phoneRegex = /(?:\+?62|0)8[1-9][0-9\-\s]{6,12}/g;
  return text.replace(phoneRegex, "xxxxxx");
};

// Formatter Data Properti Kartu
const formatPropertyItem = (p: any): PropertyCardItem => {
  const addrObj = Array.isArray(p.address) ? p.address[0] : p.address;
  const priceObj = Array.isArray(p.price) ? p.price[0] : p.price;
  const specObj = Array.isArray(p.specifications)
    ? p.specifications[0]
    : p.specifications || (Array.isArray(p.specs) ? p.specs[0] : p.specs);
  const bldObj = Array.isArray(p.building) ? p.building[0] : p.building;
  const landObj = Array.isArray(p.land) ? p.land[0] : p.land;
  const mediaArr = Array.isArray(p.media) ? p.media : [];

  const agentObj = Array.isArray(p.agent)
    ? p.agent[0]
    : p.agent || (Array.isArray(p.user) ? p.user[0] : p.user);

  const rawAgentName = agentObj?.full_name || agentObj?.name || p.agent_name || "Agen Inland";
  const agentFirstName = rawAgentName.trim().split(" ")[0] || "Agen";
  const agentAvatar = agentObj?.avatar_url || agentObj?.photo_url || p.agent_avatar || null;
  const agentPhone = agentObj?.phone || agentObj?.whatsapp || p.agent_phone || null;

  let thumbnail: string = DEFAULT_FALLBACK_IMAGE;
  if (mediaArr.length > 0) {
    const primary = mediaArr.find((m: any) => m.is_primary) || mediaArr[0];
    thumbnail = primary?.public_url || primary?.url || primary?.file_path || DEFAULT_FALLBACK_IMAGE;
  } else if (p.images) {
    if (Array.isArray(p.images) && p.images.length > 0) {
      thumbnail = typeof p.images[0] === "string" ? p.images[0] : DEFAULT_FALLBACK_IMAGE;
    } else if (typeof p.images === "string") {
      try {
        const parsed = JSON.parse(p.images);
        thumbnail = Array.isArray(parsed) ? parsed[0] : p.images;
      } catch {
        thumbnail = p.images;
      }
    }
  } else if (p.thumbnail || p.image_url) {
    thumbnail = p.thumbnail || p.image_url;
  }

  let priceVal: number | null = null;
  if (typeof p.price === "number") priceVal = p.price;
  else if (typeof priceObj === "number") priceVal = priceObj;
  else if (priceObj && typeof priceObj === "object") {
    priceVal = priceObj.selling_price || priceObj.rental_price || priceObj.price || null;
  }

  let locationText = p.location || "";
  let district = addrObj?.district_name || addrObj?.district || "";
  let city = addrObj?.city_name || addrObj?.city || "";
  let province = addrObj?.province_name || addrObj?.province || "";

  const locParts = [district, city, province].filter((pt) => pt && pt !== "-");
  if (locParts.length > 0) {
    locationText = locParts.join(", ");
  } else if (addrObj?.address) {
    locationText = addrObj.address;
  }
  if (!locationText) locationText = "Lokasi Terverifikasi";

  const bedroom = specObj?.bedroom ?? specObj?.bedrooms ?? p.bedrooms ?? 0;
  const bathroom = specObj?.bathroom ?? specObj?.bathrooms ?? p.bathrooms ?? 0;

  const buildingArea = bldObj?.building_area ?? specObj?.building_area ?? p.building_area ?? 0;
  const landArea = landObj?.land_area ?? specObj?.land_area ?? p.land_area ?? 0;

  return {
    id: p.id,
    title: p.title || "Properti Inland",
    listing_code: p.listing_code || `INL-${p.id?.slice(0, 4)?.toUpperCase()}`,
    listing_type: p.listing_type || "jual",
    property_type: p.property_type || "Rumah",
    price: priceVal,
    location: locationText,
    bedrooms: Number(bedroom),
    bathrooms: Number(bathroom),
    building_area: Number(buildingArea),
    land_area: Number(landArea),
    thumbnail: thumbnail,
    agent_name: agentFirstName,
    agent_avatar: agentAvatar,
    agent_phone: agentPhone,
  };
};

// Component Baris Spesifikasi
function SpecRowItem({ label, value, icon: Icon }: { label: string; value?: React.ReactNode; icon?: any }) {
  return (
    <div className="flex items-start justify-between py-2.5 border-b border-border/50 text-xs sm:text-sm gap-4">
      <span className="text-muted-foreground flex items-center gap-2 shrink-0 font-medium">
        {Icon && <Icon className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />}
        {label}
      </span>
      <span className="font-semibold text-foreground text-right leading-tight break-words">
        {value || "-"}
      </span>
    </div>
  );
}

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
  const [activeImage, setActiveImage] = useState<string>("");

  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>("agent");
  // Peran awalnya ditebak "agent", jadi tanpa penanda ini halaman akan sempat
  // merender isi draf sebelum peran sebenarnya (tamu/viewer) selesai dibaca.
  const [roleResolved, setRoleResolved] = useState(false);

  const [agents, setAgents] = useState<any[]>([]);
  const [fetchedAssignedAgent, setFetchedAssignedAgent] = useState<any>(null);
  const [assignLoading, setAssignLoading] = useState(false);

  // State "Detail Lengkap" Toggle
  const [showFullSpecs, setShowFullSpecs] = useState(false);

  // State Kalkulator KPR
  const [kprDpPercent, setKprDpPercent] = useState<number>(20);
  const [kprTenor, setKprTenor] = useState<number>(15);
  const [kprBunga, setKprBunga] = useState<number>(7.5);

  // State Properti Untukmu
  const [relatedProperties, setRelatedProperties] = useState<PropertyCardItem[]>([]);
  const [loadingRelated, setLoadingRelated] = useState<boolean>(false);

  // Nama wilayah kini tersimpan langsung di `property_address`
  // (province_name/city_name/district_name/village_name), jadi halaman ini
  // tidak lagi menarik isi penuh lima tabel master setiap kali dibuka.

  const getImagesList = (data: PropertyDetail | null): string[] => {
    if (!data) return [];
    let list: string[] = [];

    if (Array.isArray(data.media) && data.media.length > 0) {
      list = data.media
        .map((m: any) => m.file_url || m.public_url || m.url || m.file_path)
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
        } else {
          setUserRole("guest");
        }
      } catch (err) {
        console.error("Gagal mengambil peran pengguna:", err);
        setUserRole("guest");
      } finally {
        setRoleResolved(true);
      }
    };
    fetchUserAndRole();
  }, []);

  // Daftar lengkap agen hanya dibutuhkan dropdown "Atur Agent" (:1500) yang
  // hanya dirender untuk super admin. Sebelumnya query ini berjalan untuk setiap
  // pengunjung — termasuk tamu di halaman publik — dan mengirimkan email serta
  // nomor telepon seluruh staf ke peramban.
  //
  // Peran lain tidak kehilangan apa pun: fetchDirectAgent() di bawah mengambil
  // satu baris agen penanggung jawab begitu ia tidak ditemukan di `agents`,
  // dan assignedAgent() jatuh ke hasilnya.
  //
  // Dibandingkan ke `userRole` langsung, bukan ke isSuperAdmin, karena konstanta
  // itu baru dideklarasikan di :427 — setelah efek ini.
  useEffect(() => {
    if (userRole !== "super_admin" && userRole !== "superadmin") return;

    const fetchAgents = async () => {
      try {
        const { data, error } = await supabase
          .from("users")
          .select("id, full_name, email, avatar_url, phone, whatsapp")
          .order("full_name");
        if (!error) setAgents(data || []);
      } catch (e) {
        console.error("Gagal mengambil daftar agen:", e);
      }
    };
    fetchAgents();
  }, [userRole]);

  useEffect(() => {
    const fetchProperty = async () => {
      setLoading(true);
      try {
        const data = await propertyService.getById(propertyId);
        setProperty(data);

        const imgs = getImagesList(data);
        setActiveImage(imgs.length > 0 ? imgs[0] : DEFAULT_FALLBACK_IMAGE);
      } catch (error) {
        console.error("Gagal memuat data properti:", error);
        toast.error("Gagal memuat data properti");
      } finally { // 👈 SUDAH DIPERBAIKI (ganti 'font-medium' jadi 'finally')
        setLoading(false);
      }
    };

    if (propertyId) {
      fetchProperty();
    }
  }, [propertyId]);

  useEffect(() => {
    async function fetchDirectAgent() {
      if (property?.assigned_to) {
        const found = agents.find((a) => a.id === property.assigned_to);
        if (!found) {
          // Kolom terbatas: halaman ini terbuka untuk tamu, dan hak kolom `anon`
          // hanya mencakup id/full_name/avatar_url. Meminta email/phone/whatsapp
          // di sini membuat PostgREST menjawab 401 untuk pengunjung anonim —
          // kartu kontak agen selalu kosong bagi mereka. Nomor WhatsApp tujuan
          // ditentukan server lewat POST /api/leads, bukan dari embed ini.
          const { data } = await supabase
            .from("users")
            .select("id, full_name, avatar_url")
            .eq("id", property.assigned_to)
            .maybeSingle();
          if (data) setFetchedAssignedAgent(data);
        }
      }
    }
    fetchDirectAgent();
  }, [property?.assigned_to, agents]);

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

  const isSuperAdmin = userRole === "super_admin" || userRole === "superadmin";

  const isLoggedIn = !!currentUser && currentUser.id !== "";

  // HOOK INQUIRY — dideklarasikan di sini karena butuh assignedAgent yang baru
  // tersedia setelah useMemo (:431-433)
  const { requestContact, modalProps } = useLeadCapture({
    isLoggedIn,
    source: "Website Property Detail",
    fallbackWhatsapp: assignedAgent?.whatsapp || assignedAgent?.phone || null,
  });

  // Tamu dan viewer hanya boleh melihat listing yang sudah dipublikasikan.
  // Draf, peninjauan, dan arsip diperlakukan seolah tidak ada — bukan "akses
  // ditolak" — supaya keberadaan listing internal pun tidak ikut bocor.
  //
  // Catatan: ini penjagaan di sisi klien. Pertahanan sebenarnya adalah kebijakan
  // RLS pada tabel `properties`, yang berada di luar repo ini.
  const hiddenFromPublic = useMemo(() => {
    if (!property) return false;
    const role = userRole.toLowerCase();
    if (role !== "guest" && role !== "viewer") return false;
    return property.status !== "published";
  }, [property, userRole]);

  const canEdit = useMemo(() => {
    if (!currentUser?.id || !property) return false;
    const role = userRole.toLowerCase();

    if (role === "super_admin" || role === "superadmin" || role === "admin") {
      return true;
    }
    if (role === "viewer" || role === "reviewer" || role === "commissioner") {
      return false;
    }

    const currentUserId = currentUser.id;
    const isCreator = Boolean(property.created_by && property.created_by === currentUserId);
    const isUserOwner = Boolean(property.user_id && property.user_id === currentUserId);
    const isAssigned = Boolean(property.assigned_to && property.assigned_to === currentUserId);

    return isCreator || isUserOwner || isAssigned;
  }, [currentUser, property, userRole]);

  // Nama wilayah dibaca langsung dari `property_address`. Sebelumnya helper ini
  // masih mencocokkan uuid ke lima tabel master; tabel itu sudah ditinggalkan
  // dan pencocokannya justru mengosongkan lokasi.
  const resolveLocationName = (addressObj: any, nameKeys: string[]): string => {
    if (!addressObj) return "";

    for (const key of nameKeys) {
      const value = addressObj[key];
      if (typeof value === "string" && value.trim() !== "") {
        return value.trim();
      }
      if (value && typeof value === "object" && typeof value.name === "string") {
        return value.name.trim();
      }
    }

    return "";
  };

  const addressObj = useMemo(() => {
    if (!property?.address) return null;
    return Array.isArray(property.address) ? property.address[0] : property.address;
  }, [property?.address]);

  // 📍 Ekstraksi Wilayah Lengkap: (Kecamatan, Kota/Kabupaten, Provinsi)
  const regionLocationText = useMemo(() => {
    const dist = resolveLocationName(addressObj, ["district_name", "district"]);
    const city = resolveLocationName(addressObj, ["city_name", "city"]);
    const prov = resolveLocationName(addressObj, ["province_name", "province"]);

    const parts = [dist, city, prov].filter((p) => p && p !== "-" && p.toLowerCase() !== "null");

    if (parts.length > 0) {
      return parts.join(", ");
    }

    if (property?.location && typeof property.location === "string" && property.location.trim() !== "") {
      return property.location;
    }

    return "Lokasi Terverifikasi";
  }, [addressObj, property?.location]);

  const fullStreetAddress = useMemo(() => {
    const street = addressObj?.address || addressObj?.full_address || "";
    if (street && regionLocationText && regionLocationText !== "Lokasi Terverifikasi") {
      return `${street}, ${regionLocationText}`;
    }
    return street || regionLocationText;
  }, [addressObj, regionLocationText]);

  const specObj = useMemo(() => {
    if (!property?.specifications) return {};
    return Array.isArray(property.specifications) ? property.specifications[0] : property.specifications;
  }, [property?.specifications]);

  const priceObj = useMemo(() => {
    if (!property?.price) return {};
    return Array.isArray(property.price) ? property.price[0] : property.price;
  }, [property?.price]);

  const landObj = useMemo(() => {
    if (!property?.land) return {};
    return Array.isArray(property.land) ? property.land[0] : property.land;
  }, [property?.land]);

  const buildingObj = useMemo(() => {
    if (!property?.building) return {};
    return Array.isArray(property.building) ? property.building[0] : property.building;
  }, [property?.building]);

  const calculatedPrice = priceObj?.selling_price || priceObj?.rental_price || priceObj?.price || 0;

  // Hitung Nilai KPR
  const kprDpRupiah = useMemo(() => {
    if (!calculatedPrice) return 0;
    return Math.round((calculatedPrice * (kprDpPercent || 0)) / 100);
  }, [calculatedPrice, kprDpPercent]);

  const kprAngsuranBulan = useMemo(() => {
    if (!calculatedPrice || calculatedPrice <= 0) return 0;
    const principal = calculatedPrice - kprDpRupiah;
    if (principal <= 0) return 0;
    const months = (kprTenor || 1) * 12;
    const rate = ((kprBunga || 0) / 100) / 12;
    if (rate <= 0) return Math.round(principal / months);
    const payment = (principal * rate * Math.pow(1 + rate, months)) / (Math.pow(1 + rate, months) - 1);
    return isNaN(payment) ? 0 : Math.round(payment);
  }, [calculatedPrice, kprDpRupiah, kprTenor, kprBunga]);

  // "Properti Untukmu": kategori yang sama, di kota yang sama.
  //
  // Sebelumnya ada empat strategi bertingkat: kecamatan, lalu kota, lalu
  // kategori saja secara global, lalu properti terbaru apa pun. Dua strategi
  // terakhir itulah sumber keluhan "hanya memfilter kategori" — begitu tidak
  // ada tetangga di kecamatan yang sama, seksi ini diam-diam menampilkan
  // properti dari kota mana saja tanpa memberi tahu pengguna.
  //
  // Sekarang satu kueri saja dengan kunci Kota. Kecamatan terlalu sempit dan
  // justru yang dulu memicu jatuh ke fallback global. Bila kotanya belum
  // terisi, hasilnya dikosongkan — seksi menampilkan pesan kosong, bukan
  // rekomendasi yang tidak relevan.
  useEffect(() => {
    async function fetchRelated() {
      if (!property?.id) return;
      setLoadingRelated(true);
      try {
        // Pencocokan murni berbasis nama wilayah — `district_id`/`city_id`
        // mengacu ke tabel master yang sudah tidak diisi lagi.
        const targetCityName = resolveLocationName(addressObj, ["city_name", "city"]);

        if (!targetCityName) {
          setRelatedProperties([]);
          return;
        }

        // `!inner` wajib: tanpa itu PostgREST hanya mengosongkan objek address
        // yang tidak cocok, sementara baris propertinya tetap ikut terkirim —
        // persis gejala filter lokasi yang "tidak berpengaruh".
        let query = supabase
          .from("properties")
          .select(`
            *,
            address:property_address!inner(*),
            price:property_price(*),
            specifications:property_specifications(*),
            building:property_building(*),
            land:property_land(*),
            media:property_media(*),
            agent:users!assigned_to(full_name, avatar_url)
          `)
          .eq("status", "published")
          .neq("id", property.id)
          .ilike("address.city_name", `%${targetCityName}%`);

        if (property.property_type) {
          query = query.eq("property_type", property.property_type);
        }

        const { data, error } = await query
          .order("created_at", { ascending: false })
          .limit(8);

        if (error) {
          console.error("Gagal memuat rekomendasi properti:", error.message);
          setRelatedProperties([]);
          return;
        }

        setRelatedProperties((data ?? []).map(formatPropertyItem).slice(0, 4));
      } catch (e) {
        console.error("Gagal memuat rekomendasi properti:", e);
        setRelatedProperties([]);
      } finally {
        setLoadingRelated(false);
      }
    }

    fetchRelated();
  }, [property?.id, property?.property_type, addressObj]);

  // Kota yang benar-benar dipakai memfilter rekomendasi. Dipakai bersama oleh
  // kueri, tombol "Lihat Semua", dan subjudul seksi supaya ketiganya tidak
  // pernah bercerita hal yang berbeda — subjudul dulu menyebut kecamatan
  // sementara filternya bekerja di level lain.
  const relatedCityName = resolveLocationName(addressObj, ["city_name", "city"]);

  // Tombol "Lihat Semua" harus menghasilkan daftar yang sama persis dengan yang
  // baru saja dilihat pengguna: kategori + kota, tanpa kata kunci.
  //
  // Versi lama mengirim nama kecamatan lewat `q`. Parameter itu hanya
  // dicocokkan ke title/listing_code/description di propertyService.getList —
  // tidak pernah ke alamat — sehingga katalog selalu kosong dan nama kecamatan
  // muncul mentah di dalam kotak pencarian.
  const handleSeeAllRelated = () => {
    const params = new URLSearchParams();
    params.set("view", "global");

    if (property?.property_type) {
      params.set("property_type", property.property_type);
    }

    if (relatedCityName) {
      params.set("city_name", relatedCityName);
    }

    router.push(`/properties?${params.toString()}`);
  };

  // Inquiry pengunjung kini ditangani useLeadCapture + LeadCaptureModal.
  // Formulir inline yang dulu ada di sini digantikan komponen bersama supaya
  // katalog, dasbor, dan halaman ini memakai aturan yang sama: tamu mengisi
  // form, client terdaftar langsung tercatat dari data akunnya.

  const handleAssignAgent = async (agentId: string | null) => {
    if (!property) return;
    if (!isSuperAdmin) {
      toast.error("Akses Ditolak!", { description: "Agen penanggung jawab hanya dapat diubah oleh Super Admin." });
      return;
    }

    setAssignLoading(true);
    try {
      const result = await propertyService.updateAssignedTo(property.id, agentId || null);
      setProperty(result.data);

      if (result.drafted) {
        toast.warning("Penugasan dilepas", {
          description: result.message || "Listing dikembalikan ke draf karena tidak ada penanggung jawab.",
          duration: 6000,
        });
      } else {
        toast.success(agentId ? "Agen penanggung jawab berhasil ditugaskan." : "Penugasan agen dilepas.");
      }
    } catch (error: any) {
      toast.error("Gagal menugaskan agen", { description: error.message });
    } finally {
      setAssignLoading(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!property) return;
    if (!canEdit) {
      toast.error("Akses Ditolak!", { description: "Anda tidak memiliki izin mengedit properti ini." });
      return;
    }

    setUpdating(true);
    try {
      const result = await propertyService.updateStatus(property.id, newStatus);

      // Server bisa menurunkan permintaan "Dipublikasikan" menjadi draf bila
      // listingnya belum punya agen. Pesan sukses tidak boleh mengklaim status
      // yang tidak jadi tersimpan.
      if (result.downgraded) {
        toast.warning("Listing disimpan sebagai draf", {
          description: result.message || undefined,
          duration: 6000,
        });
      } else {
        toast.success(`Status publikasi diubah menjadi ${statusConfig[result.data.status]?.label || result.data.status}`);
      }

      const updated = await propertyService.getById(property.id);
      setProperty(updated);
      setShowStatusDialog(false);
    } catch (error: any) {
      toast.error("Gagal mengubah status", { description: error.message || "Silakan coba beberapa saat lagi." });
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!property) return;
    if (!canEdit) {
      toast.error("Akses Ditolak!", { description: "Anda tidak memiliki izin menghapus properti ini." });
      return;
    }

    setDeleting(true);
    try {
      await propertyService.delete(property.id);
      toast.success("Properti berhasil dihapus permanen");
      router.push("/properties");
    } catch (error: any) {
      toast.error("Gagal menghapus properti", { description: error.message || "Silakan coba beberapa saat lagi." });
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleDuplicate = async () => {
    if (!property) return;
    if (!canEdit) {
      toast.error("Akses Ditolak!", { description: "Anda tidak memiliki izin menduplikasi properti ini." });
      return;
    }

    try {
      const duplicated = await propertyService.duplicate(property.id);
      toast.success("Properti berhasil diduplikasi!");
      router.push(`/properties/${duplicated.id}`);
    } catch (error: any) {
      toast.error("Gagal menduplikasi properti", { description: error.message || "Silakan coba lagi." });
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: property?.title,
        text: `Lihat properti ${property?.title} di Inland Property`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Tautan properti disalin ke clipboard!");
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

  const getInitials = (name: string) => {
    if (!name) return "IP";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const allImages = getImagesList(property);

  const openLightbox = (urlOrIndex: string | number) => {
    if (typeof urlOrIndex === "number") {
      setPreviewIndex(urlOrIndex);
    } else {
      const foundIdx = allImages.findIndex((img) => img === urlOrIndex);
      setPreviewIndex(foundIdx >= 0 ? foundIdx : 0);
    }
  };

  // `!roleResolved` ikut menahan render: tanpa itu, tamu sempat melihat kilasan
  // isi listing draf selama peran masih dianggap "agent" (nilai awal state).
  if (loading || !roleResolved) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto px-3 sm:px-6 py-6">
        <Skeleton className="h-10 w-48 rounded-xl" />
        <Skeleton className="h-[320px] sm:h-[420px] w-full rounded-3xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-72 w-full rounded-3xl" />
          </div>
          <div className="lg:col-span-1 space-y-4">
            <Skeleton className="h-72 w-full rounded-3xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!property || hiddenFromPublic) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-center max-w-md mx-auto space-y-4 p-4">
        <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center text-2xl border border-border/60 shadow-xs">🏠</div>
        <h2 className="text-lg font-bold text-foreground">Properti Tidak Ditemukan</h2>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Data properti ini mungkin telah dihapus atau Anda tidak memiliki hak akses untuk melihatnya.
        </p>
        <Button onClick={() => router.back()} variant="outline" className="text-xs rounded-xl h-9 cursor-pointer">
          <ArrowLeft className="h-4 w-4 mr-2" /> Kembali
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-28 sm:pb-24 max-w-7xl mx-auto px-3 sm:px-6 pt-2 text-foreground">
      
      {/* 1. BAR AKSI KEMBALI & OPSIONAL */}
      <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="text-xs font-semibold h-9 rounded-xl gap-1.5 cursor-pointer hover:bg-muted text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Kembali
        </Button>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
            className="text-xs h-9 rounded-xl font-medium gap-1.5 cursor-pointer border-border/80"
          >
            <Share2 className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Bagikan</span>
          </Button>

          {canEdit && (
            <div className="hidden sm:flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/properties/${property.id}/edit`)}
                className="text-xs font-semibold h-9 rounded-xl gap-1.5 cursor-pointer hover:border-blue-500/50"
              >
                <Pencil className="h-3.5 w-3.5 text-blue-600" /> Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDuplicate}
                className="text-xs font-semibold h-9 rounded-xl gap-1.5 cursor-pointer"
              >
                <Copy className="h-3.5 w-3.5" /> Duplikasi
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => setShowStatusDialog(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold h-9 rounded-xl gap-1.5 cursor-pointer shadow-xs"
              >
                <Clock className="h-3.5 w-3.5" /> Status
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
                className="text-xs font-semibold h-9 rounded-xl gap-1.5 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" /> Hapus
              </Button>
            </div>
          )}

          {canEdit && (
            <div className="sm:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-xl border border-border/80 p-2 hover:bg-accent focus:outline-none h-9 w-9">
                  <MoreVertical className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 rounded-xl p-1 shadow-lg">
                  <DropdownMenuItem onClick={() => router.push(`/properties/${property.id}/edit`)} className="text-xs gap-2 rounded-lg cursor-pointer">
                    <Pencil className="h-3.5 w-3.5 text-blue-600" /> Edit Properti
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDuplicate} className="text-xs gap-2 rounded-lg cursor-pointer">
                    <Copy className="h-3.5 w-3.5" /> Duplikasi
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowStatusDialog(true)} className="text-xs gap-2 rounded-lg cursor-pointer">
                    <Clock className="h-3.5 w-3.5 text-emerald-600" /> Ubah Status
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setShowDeleteDialog(true)} className="text-xs gap-2 text-rose-600 dark:text-rose-400 rounded-lg cursor-pointer">
                    <Trash2 className="h-3.5 w-3.5" /> Hapus Permanen
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>

      {!canEdit && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center gap-2.5 text-amber-800 dark:text-amber-300 text-[11px] backdrop-blur-sm">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
          <span>Halaman ini ditampilkan dalam mode baca saja (Read-Only).</span>
        </div>
      )}

      {/* 2. BENTO GALLERY FOTO */}
      <div className="space-y-2.5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 aspect-[4/3] sm:aspect-[16/10] md:aspect-[16/9] max-h-[460px] w-full rounded-2xl sm:rounded-3xl overflow-hidden bg-slate-950 border border-border/50 shadow-xs">
          
          {/* FOTO UTAMA */}
          <div
            onClick={() => openLightbox(0)}
            className={cn(
              "relative w-full h-full overflow-hidden cursor-pointer bg-slate-900 group",
              allImages.length === 1 ? "md:col-span-3" : "md:col-span-2"
            )}
          >
            <WatermarkedImage
              src={allImages[0] || DEFAULT_FALLBACK_IMAGE}
              alt={property.title}
              className="absolute inset-0 w-full h-full"
              imageClassName="object-cover object-center w-full h-full transition-transform duration-700 group-hover:scale-105"
              watermarkSize="w-1/3"
              watermarkOpacity={0.65}
            />

            <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap z-10 pointer-events-none">
              <Badge className={cn("text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 shadow-xs border-0 text-white", property.listing_type === "sewa" ? "bg-amber-600" : "bg-emerald-600")}>
                {property.listing_type === "jual" ? "DIJUAL" : "DISEWAKAN"}
              </Badge>
              <Badge variant="outline" className="text-[10px] px-2.5 py-0.5 font-semibold backdrop-blur-md bg-slate-950/60 border-white/20 text-white">
                {property.property_type}
              </Badge>
              <Badge
                variant="outline"
                className={cn(
                  "text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border shadow-2xs",
                  statusConfig[property.status]?.color,
                  statusConfig[property.status]?.bg
                )}
              >
                {statusConfig[property.status]?.label || property.status}
              </Badge>
            </div>

            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                openLightbox(0);
              }}
              className="absolute top-3 right-3 bg-slate-950/70 hover:bg-slate-950/90 backdrop-blur-md text-white text-[11px] font-medium gap-1 border border-white/15 rounded-xl cursor-pointer h-8 px-2.5 z-10 md:hidden"
            >
              <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
              <span>{allImages.length} Foto</span>
            </Button>
          </div>

          {/* FOTO SAMPLING KANAN */}
          {allImages.length > 1 && (
            <div className="hidden md:grid md:grid-rows-2 gap-2.5 h-full md:col-span-1">
              <div
                onClick={() => openLightbox(1)}
                className={cn(
                  "relative w-full h-full overflow-hidden cursor-pointer bg-slate-900 group",
                  allImages.length === 2 ? "row-span-2" : "row-span-1"
                )}
              >
                <WatermarkedImage
                  src={allImages[1]}
                  alt="Foto Properti 2"
                  className="absolute inset-0 w-full h-full"
                  imageClassName="object-cover object-center w-full h-full transition-transform duration-700 group-hover:scale-105"
                  watermarkSize="w-1/2"
                  watermarkOpacity={0.6}
                />
              </div>

              {allImages.length >= 3 && (
                <div
                  onClick={() => openLightbox(2)}
                  className="relative w-full h-full row-span-1 overflow-hidden cursor-pointer bg-slate-900 group"
                >
                  <WatermarkedImage
                    src={allImages[2]}
                    alt="Foto Properti 3"
                    className="absolute inset-0 w-full h-full"
                    imageClassName="object-cover object-center w-full h-full transition-transform duration-700 group-hover:scale-105"
                    watermarkSize="w-1/2"
                    watermarkOpacity={0.6}
                  />
                  <div className="absolute inset-0 bg-slate-950/40 group-hover:bg-slate-950/20 transition-colors flex flex-col items-center justify-center text-white p-3 z-10 backdrop-blur-[1px]">
                    <div className="bg-slate-950/80 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/20 text-xs font-bold flex items-center gap-1.5 shadow-lg">
                      <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{allImages.length > 3 ? `+${allImages.length - 2} Foto Lainnya` : "Lihat Semua Foto"}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* THUMBNAIL STRIP */}
        {allImages.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none pt-1">
            {allImages.map((imgUrl, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setActiveImage(imgUrl);
                  openLightbox(idx);
                }}
                className={cn(
                  "relative w-16 h-12 sm:w-20 sm:h-14 rounded-xl overflow-hidden shrink-0 border-2 transition-all cursor-pointer shadow-2xs bg-slate-900",
                  activeImage === imgUrl
                    ? "border-emerald-500 ring-2 ring-emerald-500/30 scale-102"
                    : "border-border/60 opacity-70 hover:opacity-100"
                )}
              >
                <WatermarkedImage
                  src={imgUrl}
                  alt={`Pratinjau ${idx + 1}`}
                  className="absolute inset-0 w-full h-full"
                  imageClassName="object-cover object-center w-full h-full"
                  watermarkSize="w-1/2"
                  watermarkOpacity={0.5}
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 3. KONTEN UTAMA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-2">
        <div className="lg:col-span-2 space-y-6">
          <div className="space-y-2 border-b border-border/60 pb-5">
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
              <div>
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                  {property.listing_type === "jual" ? "Jual Properti" : "Sewa Properti"} • {property.property_type}
                </span>
                <h1 className="text-lg sm:text-2xl font-extrabold tracking-tight text-foreground mt-0.5 leading-snug">
                  {property.title}
                </h1>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{regionLocationText}</span>
            </p>

            <div className="pt-2 flex items-baseline gap-3">
              <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">
                {formatCurrency(calculatedPrice)}
              </span>
              {property.listing_type === "sewa" && property.rental_period && (
                <span className="text-xs text-muted-foreground font-medium">/ {property.rental_period}</span>
              )}
            </div>
          </div>

          {/* DETAIL SPESIFIKASI */}
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600" /> Detail Properti
            </h2>

            <div className="bg-card border border-border/70 rounded-2xl p-4 sm:p-5 shadow-2xs divide-y divide-border/40 space-y-0">
              <SpecRowItem label="Transaksi" value={property.listing_type === "jual" ? "Jual" : "Sewa"} icon={Tag} />
              <SpecRowItem label="Kamar Tidur" value={specObj?.bedroom ? `${specObj.bedroom} Kamar` : "-"} icon={Bed} />
              <SpecRowItem label="Kamar Mandi" value={specObj?.bathroom ? `${specObj.bathroom} Kamar` : "-"} icon={Bath} />
              <SpecRowItem label="Luas Tanah" value={(landObj?.land_area || specObj?.land_area) ? `${landObj?.land_area || specObj?.land_area} m²` : "-"} icon={Building2} />
              <SpecRowItem label="Luas Bangunan" value={(buildingObj?.building_area || specObj?.building_area) ? `${buildingObj?.building_area || specObj?.building_area} m²` : "-"} icon={Layers} />

              {showFullSpecs && (
                <>
                  <SpecRowItem label="Tipe Properti" value={property.property_type || "Rumah"} icon={Building2} />
                  <SpecRowItem label="Alamat" value={fullStreetAddress} icon={MapPin} />
                  <SpecRowItem label="Lokasi (Kec, Kab/Kota, Prov)" value={regionLocationText} icon={Compass} />
                  <SpecRowItem label="Listrik" value={specObj?.electricity ? `${specObj.electricity} Watt / VA` : "-"} icon={Zap} />
                  <SpecRowItem label="Sertifikat" value={specObj?.certificate || "SHM - Hak Milik"} icon={FileCheck} />
                  <SpecRowItem label="Furnish" value={specObj?.furnishing || "Unfurnished"} icon={Armchair} />
                  <SpecRowItem label="Ada Garasi / Carport" value={specObj?.carport ? `Ya (${specObj.carport} Mobil)` : "Tidak / Standard"} icon={Car} />
                  <SpecRowItem label="Terdaftar Pada" value={property.created_at ? format(new Date(property.created_at), "dd MMMM yyyy", { locale: id }) : "-"} icon={Calendar} />
                  <SpecRowItem label="ID Listing" value={property.listing_code} icon={Tag} />
                </>
              )}
            </div>

            <div className="pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowFullSpecs(!showFullSpecs)}
                className="w-full border-2 border-emerald-600 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-600 dark:hover:text-white font-bold text-xs h-10 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-2xs"
              >
                <span>{showFullSpecs ? "Sembunyikan Detail" : "Detail Lengkap"}</span>
                {showFullSpecs ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* SELLING POINTS */}
          {property.selling_point && (
            <div className="space-y-2 pt-2">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                💎 Keunggulan Utama (Selling Points)
              </h3>
              <div className="text-xs text-foreground font-medium p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-emerald-950 dark:text-emerald-200 leading-relaxed">
                {property.selling_point}
              </div>
            </div>
          )}

          {/* DESKRIPSI LENGKAP */}
          <div className="space-y-2 pt-2">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Deskripsi Lengkap</h3>
            <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap bg-card border border-border/60 p-4 sm:p-5 rounded-2xl">
              {maskPhoneNumbers(property.description)}
            </p>
          </div>

          {/* KALKULATOR KPR */}
          <section className="bg-card border border-emerald-600/30 dark:border-emerald-500/30 rounded-2xl p-4 sm:p-6 space-y-4 shadow-2xs">
            <div className="flex items-center gap-2.5 border-b border-border/60 pb-3">
              <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-xs">
                <Calculator className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-foreground tracking-tight">Simulasi Kalkulator KPR Sederhana</h3>
                <p className="text-[11px] text-muted-foreground">Hitung estimasi angsuran bulanan berdasarkan harga properti ini.</p>
              </div>
            </div>

            <div className="space-y-3.5 pt-1">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">Harga Properti (Rp)</Label>
                <input
                  type="text"
                  disabled
                  readOnly
                  value={formatCurrency(calculatedPrice)}
                  className="w-full h-10 px-3.5 text-xs font-bold font-mono rounded-xl border border-border bg-muted/60 text-foreground cursor-not-allowed"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">Uang Muka (DP)</Label>
                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-4 sm:col-span-3 relative">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={kprDpPercent}
                      onChange={(e) => setKprDpPercent(Math.max(0, Math.min(100, Number(e.target.value))))}
                      className="w-full h-10 pl-3 pr-7 text-xs font-bold rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">%</span>
                  </div>
                  <div className="col-span-8 sm:col-span-9">
                    <input
                      type="text"
                      disabled
                      readOnly
                      value={formatCurrency(kprDpRupiah)}
                      className="w-full h-10 px-3.5 text-xs font-bold font-mono rounded-xl border border-border bg-muted/60 text-foreground cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-foreground">Jangka Waktu (Tenor)</Label>
                  <div className="relative">
                    <input
                      type="number"
                      min={1}
                      max={35}
                      value={kprTenor}
                      onChange={(e) => setKprTenor(Math.max(1, Number(e.target.value)))}
                      className="w-full h-10 pl-3 pr-16 text-xs font-bold rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">Tahun</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-foreground">Suku Bunga / Tahun</Label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      min={0}
                      value={kprBunga}
                      onChange={(e) => setKprBunga(Math.max(0, Number(e.target.value)))}
                      className="w-full h-10 pl-3 pr-8 text-xs font-bold rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">%</span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-emerald-500/10 dark:bg-emerald-950/40 border border-emerald-500/30 rounded-2xl space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">Estimasi Angsuran Per Bulan</span>
                <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                  {formatCurrency(kprAngsuranBulan)} <span className="text-xs font-sans font-medium text-muted-foreground">/ bulan</span>
                </div>
              </div>
            </div>
          </section>

          {/* 🏡 SECTION "PROPERTI UNTUKMU" — kategori + Kota yang sama */}
          <section className="space-y-3 pt-2">
            <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
              <div>
                <h3 className="text-sm sm:text-base font-extrabold uppercase tracking-wide text-foreground flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-emerald-600" /> Properti Untukmu
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  {relatedCityName ? (
                    <>
                      Pilihan properti serupa tipe{" "}
                      <span className="font-semibold text-emerald-600">{property.property_type}</span> di{" "}
                      <span className="font-semibold text-emerald-600">{relatedCityName}</span>.
                    </>
                  ) : (
                    <>Kota properti ini belum terisi, jadi rekomendasi serupa belum bisa ditampilkan.</>
                  )}
                </p>
              </div>

              {/* Disembunyikan saat kosong: menuju katalog yang sudah pasti nihil
                  hanya membuang klik pengguna. */}
              {relatedProperties.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSeeAllRelated}
                  className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 hover:bg-emerald-600/10 rounded-lg cursor-pointer h-8 shrink-0"
                >
                  Lihat Semua <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                </Button>
              )}
            </div>

            {loadingRelated ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-56 w-full rounded-2xl" />
                ))}
              </div>
            ) : relatedProperties.length === 0 ? (
              <Card className="border border-border/60 p-6 text-center rounded-2xl bg-card">
                <Building2 className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground font-medium">Belum ada rekomendasi properti serupa untuk area ini.</p>
              </Card>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                {relatedProperties.map((relProp) => {
                  const isRent =
                    relProp.listing_type === "sewa" ||
                    relProp.listing_type === "disewa" ||
                    relProp.listing_type === "rent";

                  return (
                    <Card
                      key={relProp.id}
                      onClick={() => router.push(`/properties/${relProp.id}`)}
                      className="group border border-border/70 hover:border-emerald-600/60 bg-card rounded-2xl overflow-hidden shadow-2xs hover:shadow-md transition-all duration-300 cursor-pointer flex flex-col justify-between"
                    >
                      <div>
                        <div className="relative aspect-[16/10] bg-muted overflow-hidden">
                          <WatermarkedImage
                            src={relProp.thumbnail}
                            alt={relProp.title}
                            className="w-full h-full"
                            imageClassName="group-hover:scale-105 transition-transform duration-500 object-cover"
                            watermarkOpacity={0.6}
                            watermarkSize="w-1/3"
                          />

                          <div className="absolute top-1.5 left-1.5 z-10">
                            <Badge
                              className={cn(
                                "text-[8px] font-bold px-1.5 py-0.5 uppercase tracking-wide text-white border-0 rounded",
                                isRent ? "bg-slate-800" : "bg-emerald-600"
                              )}
                            >
                              {isRent ? "SEWA" : "DIJUAL"}
                            </Badge>
                          </div>

                          <div className="absolute bottom-1.5 right-1.5 z-10">
                            <span className="text-[8.5px] font-mono font-medium text-foreground bg-background/95 px-1 py-0.5 rounded border border-border">
                              {relProp.listing_code}
                            </span>
                          </div>
                        </div>

                        <CardContent className="p-2.5 space-y-1">
                          <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 leading-none pt-0.5">
                            {formatCurrency(relProp.price || 0)}
                          </div>

                          <h4 
                            className="font-semibold text-[11px] leading-tight text-foreground truncate group-hover:text-emerald-600 transition-colors"
                            title={relProp.title}
                          >
                            {relProp.title}
                          </h4>

                          <p className="text-[10px] text-muted-foreground flex items-center gap-1 truncate">
                            <MapPin className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                            {relProp.location}
                          </p>

                          <div className="flex items-center justify-between pt-1.5 text-[9px] text-muted-foreground font-medium border-t border-border/50 mt-1">
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="flex items-center gap-0.5">
                                <Bed className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                                {relProp.bedrooms || 0} KT
                              </span>
                              <span className="flex items-center gap-0.5">
                                <Bath className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                                {relProp.bathrooms || 0} KM
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="flex items-center gap-0.5">
                                <Maximize2 className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                                LB {relProp.building_area || 0}m²
                              </span>
                              <span className="flex items-center gap-0.5">
                                <Ruler className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                                LT {relProp.land_area || 0}m²
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>

        </div>

        {/* KOLOM KANAN: AGENT PROFILE */}
        <div className="lg:col-span-1 space-y-5">
          <div className="sticky top-20 space-y-4">
            <Card className="border border-border/80 shadow-xs rounded-2xl bg-card overflow-hidden">
              <CardHeader className="p-4 pb-2 border-b border-border/60">
                <CardTitle className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-emerald-600" /> Agent Penanggung Jawab
                </CardTitle>
              </CardHeader>

              <CardContent className="p-5 space-y-4 text-xs">
                {isSuperAdmin && (
                  <div className="space-y-1 pb-2 border-b border-border/40">
                    <Label className="text-[10px] text-muted-foreground font-medium">Atur Agent (Super Admin):</Label>
                    <Select
                      value={property?.assigned_to || ""}
                      onValueChange={(val) => handleAssignAgent(val || null)}
                      disabled={assignLoading}
                    >
                      <SelectTrigger className="w-full h-8 text-xs rounded-xl bg-background border-border/80">
                        <span>
                          {agents.find((a) => a.id === property?.assigned_to)?.full_name ||
                            assignedAgent?.full_name ||
                            "Pilih agen resmi..."}
                        </span>
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="" className="text-xs text-rose-600 font-medium">❌ Tanpa Agent</SelectItem>
                        {agents.map((agent) => (
                          <SelectItem key={agent.id} value={agent.id} className="text-xs">
                            {agent.full_name || agent.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {assignedAgent ? (
                  <div className="flex flex-col items-center text-center p-4 bg-emerald-500/5 dark:bg-emerald-950/20 rounded-2xl border border-emerald-500/20 space-y-3">
                    <Avatar className="h-20 w-20 border-2 border-emerald-500/40 shadow-md">
                      <AvatarImage src={assignedAgent.avatar_url || undefined} className="object-cover" />
                      <AvatarFallback className="text-lg font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                        {getInitials(assignedAgent.full_name || assignedAgent.email)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="space-y-0.5">
                      <p className="font-extrabold text-foreground text-sm sm:text-base leading-snug">
                        {assignedAgent.full_name || "Agent Inland Property"}
                      </p>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold uppercase tracking-wider">
                        Official Inland Agent
                      </span>
                    </div>

                    <Button
                      onClick={() => requestContact({
                        id: property.id,
                        title: property.title,
                        listing_code: property.listing_code,
                      })}
                      className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md cursor-pointer h-12 transition-all active:scale-[0.98] mt-1"
                    >
                      <MessageCircle className="w-5 h-5 fill-white text-emerald-600" />
                      <span>Hubungi Agent via WhatsApp</span>
                    </Button>
                  </div>
                ) : (
                  <div className="p-4 bg-muted/30 rounded-xl text-center space-y-2">
                    <p className="text-[11px] text-muted-foreground italic">Belum ada agent spesifik yang ditugaskan.</p>
                    <Button
                      onClick={() => requestContact({
                        id: property.id,
                        title: property.title,
                        listing_code: property.listing_code,
                      })}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-xs h-10 cursor-pointer"
                    >
                      <MessageCircle className="w-4 h-4 mr-1.5" /> Konsultasi Properti
                    </Button>
                  </div>
                )}

                {/* AJUKAN SURVEI —
                    Hanya untuk pengguna yang sudah masuk: pengajuan disimpan
                    atas nama akun pemanggil (POST /api/surveys/requests menolak
                    tamu), dan agen menghubungi lewat nomor yang terikat akun itu.
                    Disembunyikan bagi agen properti ini sendiri; ia yang membuat
                    jadwal, bukan yang mengajukan. */}
                {currentUser && property.status === "published" && property.assigned_to !== currentUser.id && (
                  <Button
                    variant="outline"
                    onClick={() => router.push(`/surveys?request=${property.id}`)}
                    className="w-full mt-3 h-11 rounded-xl font-bold text-xs cursor-pointer border-2 border-blue-600 text-blue-700 dark:text-blue-400 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 dark:hover:text-white gap-2 transition-all"
                  >
                    <CalendarCheck className="w-4 h-4" />
                    Ajukan Jadwal Survei
                  </Button>
                )}
              </CardContent>
            </Card>

            {property.owner && (
              <Card className="border border-border/70 shadow-2xs rounded-2xl bg-card overflow-hidden">
                <CardHeader className="p-4 pb-2 border-b border-border/60">
                  <CardTitle className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-emerald-600" /> Pemilik Properti (Internal)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-2 text-xs">
                  <div className="flex items-center gap-2.5">
                    <Avatar className="h-8 w-8 border border-border">
                      <AvatarFallback className="bg-emerald-500/10 text-emerald-700 font-bold text-[10px]">
                        {property.owner.full_name?.charAt(0).toUpperCase() || "P"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-bold text-foreground text-xs">{property.owner.full_name}</p>
                      <p className="text-[9px] text-muted-foreground font-mono">{property.owner.owner_code}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* 4. FLOATING ACTION BAR MOBILE */}
      <div className="fixed bottom-0 left-0 right-0 p-3 bg-background/95 backdrop-blur-md border-t border-border z-40 sm:hidden flex items-center gap-2 shadow-lg">
        <Button
          onClick={() => requestContact({
            id: property.id,
            title: property.title,
            listing_code: property.listing_code,
          })}
          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-11 rounded-xl shadow-md gap-2 cursor-pointer"
        >
          <MessageCircle className="w-4 h-4 fill-white text-emerald-600" />
          <span>Chat WhatsApp Agent</span>
        </Button>
      </div>

      {/* 5. LIGHTBOX PREVIEW FOTO */}
      <Dialog open={previewIndex !== null} onOpenChange={(open) => !open && setPreviewIndex(null)}>
        <DialogContent className="w-full max-w-full sm:max-w-4xl p-3 bg-slate-950 border-slate-800 text-white rounded-2xl overflow-hidden flex flex-col justify-between">
          <DialogHeader className="pb-2 border-b border-slate-800 flex flex-row items-center justify-between">
            <DialogTitle className="text-xs font-bold text-white">
              Foto {previewIndex !== null ? `#${previewIndex + 1}` : ""} / {allImages.length || 1}
            </DialogTitle>
          </DialogHeader>

          {previewIndex !== null && (
            <div className="py-2 flex-1 flex flex-col justify-center">
              <div className="relative w-full h-[55vh] sm:h-[70vh] bg-black/90 rounded-xl overflow-hidden flex items-center justify-center border border-slate-800">
                <WatermarkedImage
                  src={allImages[previewIndex] || DEFAULT_FALLBACK_IMAGE}
                  alt={`Pratinjau ${previewIndex + 1}`}
                  className="w-full h-full flex items-center justify-center"
                  imageClassName="max-w-full max-h-full object-contain object-center"
                  watermarkSize="w-1/3"
                  watermarkOpacity={0.7}
                />

                {allImages.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => setPreviewIndex((prev) => (prev !== null ? (prev === 0 ? allImages.length - 1 : prev - 1) : 0))}
                      className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-slate-950/70 hover:bg-emerald-600 text-white transition backdrop-blur-md cursor-pointer z-20 border border-white/20"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewIndex((prev) => (prev !== null ? (prev === allImages.length - 1 ? 0 : prev + 1) : 0))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-slate-950/70 hover:bg-emerald-600 text-white transition backdrop-blur-md cursor-pointer z-20 border border-white/20"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 6. MODAL CAPTURE LEADS —
          Hanya muncul untuk tamu (belum login) dan pengguna yang profilnya
          belum memuat nama/nomor WhatsApp. Client yang sudah terdaftar
          langsung diteruskan ke WhatsApp oleh useLeadCapture, dengan
          aktivitasnya dicatat server memakai data akunnya sendiri. */}
      <LeadCaptureModal {...modalProps} />

      {/* DIALOG UBAH STATUS */}
      {canEdit && (
        <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
          <DialogContent className="sm:max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold">Ubah Status Publikasi</DialogTitle>
              <DialogDescription className="text-xs">
                Pilih status ketersediaan properti untuk mengontrol visibilitas publik.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-1">
              <Select value={newStatus} onValueChange={(val) => setNewStatus(val as PropertyStatus)}>
                <SelectTrigger className="h-10 text-xs rounded-xl">
                  <SelectValue placeholder="Pilih status" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="draft" className="text-xs">📝 Draf Internal</SelectItem>
                  <SelectItem value="review" className="text-xs">👀 Dalam Peninjauan</SelectItem>
                  <SelectItem value="published" className="text-xs">🚀 Dipublikasikan (Tayang Publik)</SelectItem>
                  <SelectItem value="sold" className="text-xs">✅ Terjual (Sold)</SelectItem>
                  <SelectItem value="rented" className="text-xs">📋 Tersewa (Rented)</SelectItem>
                  <SelectItem value="archived" className="text-xs">📦 Diarsip</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowStatusDialog(false)} className="text-xs rounded-xl cursor-pointer h-9">
                Batal
              </Button>
              <Button size="sm" onClick={handleUpdateStatus} disabled={updating} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-xl cursor-pointer h-9">
                {updating && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
                Simpan Perubahan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* DIALOG HAPUS PROPERTI */}
      {canEdit && (
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent className="sm:max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold text-rose-600">⚠️ Konfirmasi Hapus Properti</DialogTitle>
              <DialogDescription className="text-xs">
                Apakah Anda yakin ingin menghapus data properti <strong className="text-foreground">"{property.title}"</strong>? Tindakan ini bersifat permanen.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowDeleteDialog(false)} className="text-xs rounded-xl cursor-pointer h-9">
                Batal
              </Button>
              <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting} className="text-xs rounded-xl cursor-pointer h-9">
                {deleting && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
                Hapus Permanen
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}