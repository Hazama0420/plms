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
  Maximize2,
  Lock,
  ChevronLeft,
  ChevronRight,
  Bed,
  Bath,
  Building2,
  Sparkles,
  Car,
  Compass,
  FileCheck,
  Zap,
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
import { cn } from "@/lib/utils";

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

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: "Draf Internal", color: "text-slate-600 dark:text-slate-400", bg: "bg-slate-500/10 border-slate-500/20" },
  review: { label: "Peninjauan", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
  published: { label: "Dipublikasikan", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  sold: { label: "Terjual", color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-500/10 border-indigo-500/20" },
  rented: { label: "Tersewa", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
  archived: { label: "Diarsip", color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-500/10 border-rose-500/20" },
};

interface LocationData {
  countries: { id: string | number; name: string }[];
  provinces: { id: string | number; name: string }[];
  cities: { id: string | number; name: string }[];
  districts: { id: string | number; name: string }[];
  villages: { id: string | number; name: string }[];
}

const DEFAULT_FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1600&q=80";

// 🔒 Helper Sensor Nomor HP di Deskripsi
const maskPhoneNumbers = (text?: string | null): string => {
  if (!text) return "Belum ada deskripsi rinci untuk properti ini.";
  const phoneRegex = /(?:\+?62|0)8[1-9][0-9\-\s]{6,12}/g;
  return text.replace(phoneRegex, "xxxxxx");
};

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

  const [agents, setAgents] = useState<any[]>([]);
  const [fetchedAssignedAgent, setFetchedAssignedAgent] = useState<any>(null);
  const [assignLoading, setAssignLoading] = useState(false);

  // State Modal Form Leads CRM
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [leadName, setLeadName] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [leadMessage, setLeadMessage] = useState("");
  const [submittingLead, setSubmittingLead] = useState(false);

  const [locationData, setLocationData] = useState<LocationData>({
    countries: [],
    provinces: [],
    cities: [],
    districts: [],
    villages: [],
  });

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
      }
    };
    fetchUserAndRole();
  }, []);

  useEffect(() => {
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
  }, []);

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
        console.error("Gagal memuat master data wilayah:", error);
      }
    };

    if (propertyId) {
      fetchProperty();
      fetchLocationData();
    }
  }, [propertyId]);

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

  const resolveLocationName = (
    addressObj: any,
    idKey: string,
    nameKey: string,
    nestedKey: string,
    lookupList: { id: string | number; name: string }[]
  ): string => {
    if (!addressObj) return "-";
    if (addressObj[nameKey] && typeof addressObj[nameKey] === "string" && addressObj[nameKey].trim() !== "") {
      return addressObj[nameKey];
    }
    if (addressObj[nestedKey] && typeof addressObj[nestedKey] === "object" && addressObj[nestedKey].name) {
      return addressObj[nestedKey].name;
    }
    const targetId = addressObj[idKey];
    if (targetId !== undefined && targetId !== null && targetId !== "") {
      const matched = lookupList.find((item) => String(item.id).trim() === String(targetId).trim());
      if (matched) return matched.name;
    }
    return "-";
  };

  const addressObj = useMemo(() => {
    if (!property?.address) return null;
    return Array.isArray(property.address) ? property.address[0] : property.address;
  }, [property?.address]);

  // 📍 PENGGABUNGAN ALAMAT LENGKAP (Provinsi, Kota/Kabupaten, Kecamatan)
  const formattedFullLocation = useMemo(() => {
    if (!addressObj && !property?.address) return "Alamat lokasi belum dikonfigurasi";

    const prov = resolveLocationName(addressObj, "province_id", "province_name", "provinces", locationData.provinces);
    const city = resolveLocationName(addressObj, "city_id", "city_name", "cities", locationData.cities);
    const dist = resolveLocationName(addressObj, "district_id", "district_name", "districts", locationData.districts);
    const detailAddress = addressObj?.address || addressObj?.full_address || property?.address?.address || "";

    const regionParts = [dist, city, prov].filter((p) => p && p !== "-");
    const regionString = regionParts.length > 0 ? regionParts.join(", ") : "";

    if (detailAddress && regionString) {
      return `${detailAddress}, ${regionString}`;
    }
    return detailAddress || regionString || "Alamat lokasi belum dikonfigurasi";
  }, [addressObj, locationData, property?.address]);

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

  // Handler Submit Lead & Otomatisasi Fonnte
  const handleLeadSubmit = async (e: React.FormEvent, targetPhone: string) => {
    e.preventDefault();
    if (!leadName || !leadPhone) {
      toast.error("Mohon lengkapi Nama dan No WhatsApp Anda.");
      return;
    }

    setSubmittingLead(true);
    try {
      const cleanLeadPhone = leadPhone.replace(/[^0-9]/g, "");
      let contactId: string | null = null;
      
      const { data: existingContact } = await supabase
        .from("crm_contacts")
        .select("id")
        .eq("phone", cleanLeadPhone)
        .maybeSingle();

      if (existingContact) {
        contactId = existingContact.id;
      } else {
        const randomCode = `CNT-${Date.now().toString().slice(-6)}`;
        const { data: newContact, error: contactErr } = await supabase
          .from("crm_contacts")
          .insert([
            { 
              contact_code: randomCode,
              full_name: leadName, 
              phone: cleanLeadPhone,
              whatsapp: cleanLeadPhone 
            }
          ])
          .select("id")
          .single();
        
        if (contactErr) throw contactErr;
        contactId = newContact.id;
      }

      const targetAgentId = property?.assigned_to || property?.user_id || null;

      const { data: newLead, error: leadErr } = await supabase
        .from("crm_leads")
        .insert([
          {
            contact_id: contactId,
            property_id: property?.id || null,
            assigned_to: targetAgentId,
            source: "Website Property Detail",
            status: "new",
            interest_type: property?.title || property?.listing_type || "Properti Pilihan",
            budget: calculatedPrice || null,
            notes: leadMessage || `Tertarik dengan properti: ${property?.title} (${property?.listing_code})`,
          },
        ])
        .select("id")
        .single();

      if (leadErr) throw leadErr;

      if (property?.id && newLead?.id) {
        await supabase.from("crm_interests").insert([
          {
            lead_id: newLead.id,
            property_id: property.id,
            priority: 1,
            interest_level: "high",
            notes: `Inquiry otomatis dari website: ${property.title}`,
          },
        ]);
      }

      if (targetAgentId) {
        try {
          await fetch("/api/notifications/whatsapp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              agentId: targetAgentId,
              leadName: leadName,
              clientPhone: cleanLeadPhone || leadPhone,
              propertyInterest: property?.title || "Properti Pilihan",
            }),
          });
        } catch (waErr) {
          console.error("Gagal pemicu WA otomatis:", waErr);
        }
      }

      try {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from("crm_activities").insert([
          {
            lead_id: newLead.id,
            user_id: user?.id || targetAgentId || null,
            activity_type: "Lead Masuk (Website)",
            notes: `Prospek baru "${leadName}" berminat pada properti "${property?.title || 'Properti'}"`
          }
        ]);
      } catch (actErr) {
        console.error("Gagal log aktivitas:", actErr);
      }

      toast.success("Berhasil! Data Anda tercatat dan agen kami telah dinotifikasi.");

      let cleanTargetPhone = targetPhone ? targetPhone.replace(/[^0-9]/g, "") : "";
      if (cleanTargetPhone.startsWith("0")) cleanTargetPhone = "62" + cleanTargetPhone.slice(1);

      const text = encodeURIComponent(
        `Halo, saya *${leadName}* tertarik dengan properti *${property?.title}* (${property?.listing_code}). ${leadMessage ? `Pesan: "${leadMessage}"` : "Mohon informasi lebih lanjut."}`
      );
      
      setShowLeadModal(false);
      setLeadName("");
      setLeadPhone("");
      setLeadMessage("");

      window.open(`https://wa.me/${cleanTargetPhone}?text=${text}`, "_blank");
    } catch (err: any) {
      toast.error("Gagal menyimpan data lead", { description: err.message || JSON.stringify(err) });
    } finally {
      setSubmittingLead(false);
    }
  };

  const handleAssignAgent = async (agentId: string | null) => {
    if (!property) return;
    if (!isSuperAdmin) {
      toast.error("Akses Ditolak!", { description: "Agen penanggung jawab hanya dapat diubah oleh Super Admin." });
      return;
    }

    setAssignLoading(true);
    try {
      const updated = await propertyService.updateAssignedTo(property.id, agentId || null);
      setProperty(updated);
      toast.success(agentId ? "Agen penanggung jawab berhasil ditugaskan." : "Penugasan agen dilepas.");
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
      await propertyService.updateStatus(property.id, newStatus);
      toast.success(`Status publikasi diubah menjadi ${statusConfig[newStatus]?.label || newStatus}`);
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

  if (loading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto px-3 sm:px-6 py-6">
        <Skeleton className="h-10 w-48 rounded-xl" />
        <Skeleton className="h-[280px] sm:h-[380px] w-full rounded-3xl" />
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

  if (!property) {
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
      {/* 1. TOP HEADER & BAR AKSI */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.back()}
            className="h-9 w-9 rounded-xl shrink-0 cursor-pointer border-border/80 hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-2xl font-extrabold tracking-tight truncate">
                {property.title}
              </h1>
              <Badge
                variant="outline"
                className={cn(
                  "text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border shadow-2xs shrink-0",
                  statusConfig[property.status]?.color,
                  statusConfig[property.status]?.bg
                )}
              >
                {statusConfig[property.status]?.label || property.status}
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1.5 font-mono">
              <span className="font-semibold text-foreground">{property.listing_code}</span>
              <span>•</span>
              <span className="text-emerald-600 font-sans font-medium">{property.property_type}</span>
            </p>
          </div>
        </div>

        {/* AKSI DESKTOP & MOBILE DROPDOWN */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/kpr-calculator?property_id=${property.id}`)}
            className="border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10 text-xs h-9 font-semibold gap-1.5 rounded-xl cursor-pointer"
          >
            <Calculator className="h-3.5 w-3.5 text-emerald-600" />
            <span>Simulasi KPR</span>
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
          <span>
            {userRole === "agent"
              ? "Properti ini diposting oleh agen lain. Anda dapat melihat detail lengkapnya tanpa akses edit."
              : "Halaman ini ditampilkan dalam mode baca saja (Read-Only)."}
          </span>
        </div>
      )}

      {/* 2. HERO BANNER FOTO */}
      <div className="space-y-2.5">
        <div className="relative group w-full aspect-[4/3] sm:aspect-[21/9] max-h-[440px] rounded-2xl sm:rounded-3xl overflow-hidden border border-border/70 bg-slate-950 shadow-md">
          <img
            src={activeImage || DEFAULT_FALLBACK_IMAGE}
            alt={property.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 cursor-pointer"
            onClick={() => openLightbox(activeImage || DEFAULT_FALLBACK_IMAGE)}
            onError={(e) => {
              (e.target as HTMLImageElement).src = DEFAULT_FALLBACK_IMAGE;
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-transparent opacity-90" />

          <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap">
            <Badge className={cn("text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 shadow-xs border-0 text-white", property.listing_type === "sewa" ? "bg-amber-600" : "bg-emerald-600")}>
              {property.listing_type === "jual" ? "DIJUAL" : "DISEWAKAN"}
            </Badge>
            <Badge variant="outline" className="text-[10px] px-2.5 py-0.5 font-semibold backdrop-blur-md bg-slate-950/60 border-white/20 text-white">
              {property.property_type}
            </Badge>
          </div>

          <Button
            size="sm"
            onClick={() => openLightbox(activeImage || DEFAULT_FALLBACK_IMAGE)}
            className="absolute top-3 right-3 bg-slate-950/70 hover:bg-slate-950/90 backdrop-blur-md text-white text-[11px] font-medium gap-1 border border-white/15 rounded-xl cursor-pointer h-8 px-2.5"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Perbesar Foto</span>
          </Button>

          <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2">
            <div className="text-white font-mono font-black text-base sm:text-2xl bg-slate-950/80 px-3.5 py-1.5 rounded-xl backdrop-blur-md border border-white/15 shadow-md">
              {formatCurrency(calculatedPrice)}
            </div>
            <div className="bg-slate-950/80 backdrop-blur-md text-white text-[10px] sm:text-xs px-2.5 py-1.5 rounded-xl border border-white/15 flex items-center gap-1 font-medium shadow-md">
              <ImageIcon className="w-3 h-3 text-emerald-400" />
              <span>{allImages.length > 0 ? `${allImages.length} Foto` : "1 Foto"}</span>
            </div>
          </div>
        </div>

        {allImages.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {allImages.map((imgUrl, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveImage(imgUrl)}
                className={cn(
                  "relative w-16 h-12 sm:w-24 sm:h-16 rounded-xl overflow-hidden shrink-0 border-2 transition-all cursor-pointer shadow-2xs",
                  activeImage === imgUrl
                    ? "border-emerald-500 ring-2 ring-emerald-500/30 scale-102"
                    : "border-border/60 opacity-60 hover:opacity-100"
                )}
              >
                <img
                  src={imgUrl}
                  alt={`Pratinjau ${idx + 1}`}
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

      {/* 3. KONTEN UTAMA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* KOLOM KIRI: SPESIFIKASI & ALAMAT KONSOLIDASI */}
        <div className="lg:col-span-2 space-y-5">
          <Card className="border border-border/70 shadow-2xs rounded-2xl bg-card overflow-hidden">
            <CardHeader className="p-4 pb-3 border-b border-border/60">
              <CardTitle className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> Ringkasan Informasi Utama & Spesifikasi
              </CardTitle>
            </CardHeader>

            <CardContent className="p-4 space-y-5 text-xs">
              {/* MATRIX SPESIFIKASI */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <Label className="text-muted-foreground text-[10px] font-medium">Kode Listing</Label>
                  <p className="font-mono font-bold text-foreground text-xs mt-0.5">{property.listing_code}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-[10px] font-medium">Tipe Properti</Label>
                  <p className="font-semibold text-foreground mt-0.5">{property.property_type}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-[10px] font-medium">Jenis Transaksi</Label>
                  <p className="font-semibold text-foreground mt-0.5">{property.listing_type === "jual" ? "Penjualan (Jual)" : "Penyewaan (Sewa)"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-[10px] font-medium">Kategori</Label>
                  <p className="font-semibold text-foreground mt-0.5">{property.property_category || "-"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-[10px] font-medium">Sertifikat / Legalitas</Label>
                  <p className="font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-1">
                    <FileCheck className="w-3.5 h-3.5" />
                    {specObj?.certificate || "SHM - Hak Milik"}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-[10px] font-medium">Didaftarkan Pada</Label>
                  <p className="font-medium text-foreground mt-0.5">{formatRelativeTime(property.created_at)}</p>
                </div>
              </div>

              <Separator />

              {/* 📍 BLOK LOKASI & ALAMAT LENGKAP KONSOLIDASI */}
              <div>
                <Label className="text-muted-foreground text-[10px] font-medium flex items-center gap-1.5 mb-1.5">
                  <MapPin className="w-3.5 h-3.5 text-rose-500" />
                  Lokasi & Alamat Lengkap
                </Label>
                <div className="bg-muted/30 p-3.5 rounded-xl border border-border/50 text-xs font-medium text-foreground leading-relaxed">
                  {formattedFullLocation}
                </div>
              </div>

              <Separator />

              {/* DESKRIPSI DENGAN MASKING NOMOR TELEPON */}
              <div>
                <Label className="text-muted-foreground text-[10px] font-medium">Deskripsi Properti</Label>
                <p className="text-xs text-foreground mt-1.5 whitespace-pre-wrap leading-relaxed bg-muted/20 p-3.5 rounded-xl border border-border/40 font-normal">
                  {maskPhoneNumbers(property.description)}
                </p>
              </div>

              {property.selling_point && (
                <div>
                  <Label className="text-muted-foreground text-[10px] font-medium">💎 Keunggulan Utama (Selling Point)</Label>
                  <div className="text-xs text-foreground font-medium mt-1.5 p-3.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-950 dark:text-emerald-200">
                    {property.selling_point}
                  </div>
                </div>
              )}

              <Separator />

              {/* FASILITAS BANGUNAN */}
              <div>
                <Label className="text-muted-foreground text-[10px] font-medium mb-2.5 block">Fasilitas & Karakteristik</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-3 bg-muted/40 rounded-xl border border-border/60 text-center">
                    <p className="text-xs font-bold text-foreground">{specObj?.bedroom || 0} Ruang</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center justify-center gap-1">
                      <Bed className="w-3 h-3 text-emerald-600" /> Kamar Tidur
                    </p>
                  </div>

                  <div className="p-3 bg-muted/40 rounded-xl border border-border/60 text-center">
                    <p className="text-xs font-bold text-foreground">{specObj?.bathroom || 0} Ruang</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center justify-center gap-1">
                      <Bath className="w-3 h-3 text-emerald-600" /> Kamar Mandi
                    </p>
                  </div>

                  <div className="p-3 bg-muted/40 rounded-xl border border-border/60 text-center">
                    <p className="text-xs font-bold text-foreground">{landObj?.land_area || specObj?.land_area || 0} m²</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center justify-center gap-1">
                      <Building2 className="w-3 h-3 text-emerald-600" /> Luas Tanah
                    </p>
                  </div>

                  <div className="p-3 bg-muted/40 rounded-xl border border-border/60 text-center">
                    <p className="text-xs font-bold text-foreground">{buildingObj?.building_area || specObj?.building_area || 0} m²</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center justify-center gap-1">
                      <Building2 className="w-3 h-3 text-emerald-600" /> Luas Bangunan
                    </p>
                  </div>

                  {specObj?.carport && (
                    <div className="p-3 bg-muted/40 rounded-xl border border-border/60 text-center">
                      <p className="text-xs font-bold text-foreground">{specObj.carport} Mobil</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center justify-center gap-1">
                        <Car className="w-3 h-3 text-emerald-600" /> Carport
                      </p>
                    </div>
                  )}

                  {specObj?.electricity && (
                    <div className="p-3 bg-muted/40 rounded-xl border border-border/60 text-center">
                      <p className="text-xs font-bold text-foreground">{specObj.electricity} VA</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center justify-center gap-1">
                        <Zap className="w-3 h-3 text-amber-500" /> Daya Listrik
                      </p>
                    </div>
                  )}

                  {specObj?.facing && (
                    <div className="p-3 bg-muted/40 rounded-xl border border-border/60 text-center">
                      <p className="text-xs font-bold text-foreground">{specObj.facing}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center justify-center gap-1">
                        <Compass className="w-3 h-3 text-blue-500" /> Hadap
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* KOLOM KANAN: CARD AGEN REDESAIN (FOKUS FOTO KECIL-BESAR & NAMA) */}
        <div className="lg:col-span-1 space-y-5">
          <Card className="border border-border/70 shadow-2xs rounded-2xl bg-card overflow-hidden">
            <CardHeader className="p-4 pb-3 border-b border-border/60">
              <CardTitle className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-emerald-600" /> 
                Agen Penanggung Jawab
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4 text-xs">
              {isSuperAdmin && (
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground font-medium">Atur Agen Penanggung Jawab:</Label>
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
                      <SelectItem value="" className="text-xs text-rose-600 font-medium">❌ Tanpa Agen</SelectItem>
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
                /* 🎯 CARD AGEN REDESAIN PROSENSI UTAMA (FOKUS FOTO BOLA BESAR & NAMA SAJA) */
                <div className="flex flex-col items-center text-center p-5 bg-gradient-to-b from-emerald-500/10 via-emerald-500/5 to-transparent rounded-2xl border border-emerald-500/20 space-y-3">
                  <Avatar className="h-20 w-20 border-2 border-emerald-500/40 shadow-md">
                    <AvatarImage src={assignedAgent.avatar_url || undefined} className="object-cover" />
                    <AvatarFallback className="text-lg font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                      {getInitials(assignedAgent.full_name || assignedAgent.email)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="space-y-0.5">
                    <p className="font-extrabold text-foreground text-sm sm:text-base leading-snug">
                      {assignedAgent.full_name || "Agen Resmi Inland Property"}
                    </p>
                    <Badge variant="outline" className="text-[9px] font-semibold border-emerald-500/30 text-emerald-700 dark:text-emerald-400 bg-emerald-500/10">
                      Agen Penanggung Jawab
                    </Badge>
                  </div>

                  {/* 🟢 TOMBOL UTAMA */}
                  <Button
                    onClick={() => setShowLeadModal(true)}
                    className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md cursor-pointer h-12 transition-all active:scale-[0.98] mt-2"
                  >
                    <MessageCircle className="w-5 h-5 fill-white text-emerald-600" />
                    <span>Hubungi Agen via WhatsApp</span>
                  </Button>
                </div>
              ) : (
                <div className="p-4 bg-muted/30 rounded-xl text-center space-y-2">
                  <p className="text-[11px] text-muted-foreground italic">
                    Belum ada agen spesifik yang ditugaskan.
                  </p>
                  <Button
                    onClick={() => setShowLeadModal(true)}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-xs h-10 cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4 mr-1.5" /> Konsultasi Properti
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* CARD PEMILIK PROPERTI */}
          {property.owner && (
            <Card className="border border-border/70 shadow-2xs rounded-2xl bg-card overflow-hidden">
              <CardHeader className="p-4 pb-2 border-b border-border/60">
                <CardTitle className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-emerald-600" /> Pemilik Properti
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

      {/* 4. FLOATING ACTION BAR LAYAR HP */}
      <div className="fixed bottom-0 left-0 right-0 p-3 bg-background/95 backdrop-blur-md border-t border-border z-40 sm:hidden flex items-center gap-2 shadow-lg">
        <Button
          onClick={() => setShowLeadModal(true)}
          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-11 rounded-xl shadow-md gap-2 cursor-pointer"
        >
          <MessageCircle className="w-4 h-4 fill-white text-emerald-600" />
          <span>Chat WhatsApp Agent</span>
        </Button>
        <Button
          variant="outline"
          onClick={() => router.push(`/kpr-calculator?property_id=${property.id}`)}
          className="h-11 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-semibold text-xs px-3 rounded-xl cursor-pointer"
        >
          <Calculator className="w-4 h-4" />
        </Button>
      </div>

      {/* 5. LIGHTBOX PREVIEW */}
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
                <img
                  src={allImages[previewIndex] || DEFAULT_FALLBACK_IMAGE}
                  alt={`Pratinjau ${previewIndex + 1}`}
                  className="max-w-full max-h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = DEFAULT_FALLBACK_IMAGE;
                  }}
                />

                {allImages.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => setPreviewIndex((prev) => (prev !== null ? (prev === 0 ? allImages.length - 1 : prev - 1) : 0))}
                      className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-slate-950/70 hover:bg-emerald-600 text-white transition backdrop-blur-md cursor-pointer"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewIndex((prev) => (prev !== null ? (prev === allImages.length - 1 ? 0 : prev + 1) : 0))}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-slate-950/70 hover:bg-emerald-600 text-white transition backdrop-blur-md cursor-pointer"
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

      {/* 6. MODAL FORM CAPTURE LEADS */}
      <Dialog open={showLeadModal} onOpenChange={setShowLeadModal}>
        <DialogContent className="sm:max-w-md rounded-2xl bg-card border border-border p-5 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-1.5 text-foreground">
              <MessageCircle className="w-4 h-4 text-emerald-600" />
              Konsultasi & Tanya Properti
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Lengkapi data Anda agar agen penanggung jawab kami dapat segera merespons ketertarikan Anda pada <span className="font-semibold text-emerald-600">{property?.title}</span>.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={(e) => handleLeadSubmit(e, assignedAgent?.whatsapp || assignedAgent?.phone || "6281234567890")} className="space-y-3.5 py-1">
            <div className="space-y-1">
              <Label className="text-xs font-medium text-foreground">Nama Lengkap</Label>
              <input
                type="text"
                required
                placeholder="Contoh: Budi Santoso"
                value={leadName}
                onChange={(e) => setLeadName(e.target.value)}
                className="w-full h-10 px-3 text-xs rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium text-foreground">Nomor WhatsApp / HP</Label>
              <input
                type="tel"
                required
                placeholder="Contoh: 081234567890"
                value={leadPhone}
                onChange={(e) => setLeadPhone(e.target.value)}
                className="w-full h-10 px-3 text-xs rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium text-foreground">Pesan / Catatan Khusus (Opsional)</Label>
              <textarea
                placeholder="Contoh: Apakah bisa survei lokasi minggu ini?"
                value={leadMessage}
                onChange={(e) => setLeadMessage(e.target.value)}
                rows={3}
                className="w-full p-3 text-xs rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              />
            </div>

            <DialogFooter className="gap-2 pt-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowLeadModal(false)}
                className="text-xs rounded-xl cursor-pointer h-10"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={submittingLead}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-xl cursor-pointer gap-1.5 h-10 font-bold"
              >
                {submittingLead && <Loader2 className="h-4 w-4 animate-spin" />}
                Kirim & Buka WhatsApp
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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