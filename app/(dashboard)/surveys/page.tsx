// app/(dashboard)/surveys/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { normalizeRole } from "@/lib/permissions";
import { openWhatsApp } from "@/lib/whatsapp-link";
import { toast } from "sonner";
import type { Survey, SurveyRequest, SurveyStatus } from "@/types/survey.types";
import type { UserRole } from "@/types/user.types";
import {
  Plus,
  Search,
  Calendar as CalendarIcon,
  MapPin,
  User,
  Clock,
  MessageCircle,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  ExternalLink,
  Ban,
  Building2,
  Phone,
  Pencil,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

// ============================================================
// STATUS CONFIG
// ============================================================

const surveyStatusConfig: Record<
  SurveyStatus,
  { label: string; color: string; bg: string }
> = {
  scheduled: {
    label: "Terjadwal",
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-100 dark:bg-blue-950/60 border-blue-200",
  },
  completed: {
    label: "Selesai",
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-100 dark:bg-emerald-950/60 border-emerald-200",
  },
  cancelled: {
    label: "Dibatalkan",
    color: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-100 dark:bg-rose-950/60 border-rose-200",
  },
  no_show: {
    label: "Tidak Hadir",
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-100 dark:bg-amber-950/60 border-amber-200",
  },
};

const requestStatusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: "Menunggu", color: "text-amber-600" },
  contacted: { label: "Dihubungi", color: "text-blue-600" },
  scheduled: { label: "Terjadwal", color: "text-emerald-600" },
  rejected: { label: "Ditolak", color: "text-rose-600" },
  cancelled: { label: "Dibatalkan", color: "text-slate-600" },
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function formatAddress(addr?: Survey["property"]): string {
  if (!addr?.address) return "Lokasi tidak tersedia";
  const parts = [
    addr.address.district_name,
    addr.address.city_name,
    addr.address.province_name,
  ].filter(Boolean);
  return parts.join(", ") || addr.address.address || "Lokasi tidak tersedia";
}

function formatDateTime(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString("id-ID", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    }),
    time: d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
  };
}

function openGoogleMaps(label: string, address: string) {
  const query = encodeURIComponent(`${label}, ${address}`);
  window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, "_blank");
}

/** Ubah nilai `<input type="datetime-local">` menjadi ISO string. */
function localInputToISO(value: string): string {
  // Nilai datetime-local tidak berzona waktu; `new Date()` menafsirkannya
  // sebagai waktu lokal peramban, yang memang yang dimaksud pengguna.
  return new Date(value).toISOString();
}

/** Nilai minimum untuk `<input type="datetime-local">` — sekarang, waktu lokal. */
function nowLocalInputValue(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

/**
 * Ubah ISO string dari basis data menjadi nilai `<input type="datetime-local">`.
 *
 * Kebalikan dari localInputToISO. `toISOString()` TIDAK bisa dipakai di sini:
 * hasilnya UTC, sehingga jadwal pukul 09:00 WIB akan tampil 02:00 di form —
 * agen mengira jadwalnya salah lalu "memperbaikinya" menjadi benar-benar salah.
 */
function isoToLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

// ============================================================
// TIPE LOKAL
// ============================================================

interface PropertyOption {
  id: string;
  title: string;
  listing_code: string | null;
}

// ============================================================
// HALAMAN
// ============================================================

export default function SurveysPage() {
  // --- Identitas & peran ---
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole | "">("");
  const [profile, setProfile] = useState<{ full_name: string; phone: string }>({
    full_name: "",
    phone: "",
  });
  const [roleReady, setRoleReady] = useState(false);

  // --- Data ---
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [requests, setRequests] = useState<SurveyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // --- Dialog: pengajuan survei (client) ---
  const [isRequestOpen, setIsRequestOpen] = useState(false);
  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [requestForm, setRequestForm] = useState({
    property_id: "",
    requester_name: "",
    requester_phone: "",
    preferred_date: "",
    preferred_time: "",
    message: "",
  });

  // --- Dialog: buat jadwal (agen) ---
  const [scheduleTarget, setScheduleTarget] = useState<SurveyRequest | null>(null);
  // --- Dialog: ubah jadwal yang sudah ada (agen pemilik / admin) ---
  // Dialognya sama persis dengan "buat jadwal"; yang membedakan hanya sumber
  // datanya dan route tujuannya (PATCH vs POST). Salah satu dari keduanya selalu
  // null — keduanya tidak pernah terbuka bersamaan.
  const [editTarget, setEditTarget] = useState<Survey | null>(null);
  const [scheduleForm, setScheduleForm] = useState({
    scheduled_at: "",
    duration_min: "60",
    type: "lapangan",
    location_note: "",
    meeting_url: "",
    notes: "",
  });

  // --- Dialog: tolak pengajuan (agen) ---
  const [rejectTarget, setRejectTarget] = useState<SurveyRequest | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const [submitting, setSubmitting] = useState(false);

  const isAdmin = role === "admin" || role === "super_admin";
  const isAgent = role === "agent";
  const isStaff = isAdmin || isAgent;

  // ============================================================
  // 1. AMBIL IDENTITAS & PERAN
  // ============================================================
  useEffect(() => {
    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setRoleReady(true);
          return;
        }

        setUserId(user.id);

        const { data: userData } = await supabase
          .from("users")
          .select("role, full_name, phone")
          .eq("id", user.id)
          .maybeSingle();

        // Kolom `users.role` di produksi memuat dua ejaan: "superadmin" dan
        // "super_admin". Seluruh sisi server melewatkannya lewat normalizeRole()
        // (api-auth.ts:63, proxy.ts:128); tanpa langkah yang sama di sini,
        // super_admin berejaan "superadmin" akan jatuh ke tampilan client —
        // tidak melihat tab apa pun dan kehilangan tombol kelola jadwal,
        // padahal API tetap meloloskannya.
        setRole(normalizeRole(userData?.role ?? user.user_metadata?.role));
        setProfile({
          full_name: userData?.full_name || user.user_metadata?.full_name || "",
          phone: userData?.phone || "",
        });
      } catch (err) {
        console.error("Gagal mengambil data pengguna:", err);
      } finally {
        setRoleReady(true);
      }
    })();
  }, []);

  // Isi otomatis nama & telepon di form pengajuan begitu profil tersedia
  useEffect(() => {
    setRequestForm((prev) => ({
      ...prev,
      requester_name: prev.requester_name || profile.full_name,
      requester_phone: prev.requester_phone || profile.phone,
    }));
  }, [profile]);

  // ============================================================
  // 2. AMBIL DATA — semuanya lewat API, tidak ada query langsung
  //    ke tabel `surveys` dari peramban. Inilah yang menutup kebocoran:
  //    filter kepemilikan ditegakkan di server (dan oleh RLS), bukan di sini.
  // ============================================================
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [surveyRes, requestRes] = await Promise.all([
        fetch("/api/surveys"),
        fetch("/api/surveys/requests"),
      ]);

      const surveyJson = await surveyRes.json();
      const requestJson = await requestRes.json();

      if (!surveyRes.ok) throw new Error(surveyJson.error || "Gagal memuat jadwal survei.");
      if (!requestRes.ok) throw new Error(requestJson.error || "Gagal memuat pengajuan survei.");

      setSurveys(surveyJson.data || []);
      setRequests(requestJson.data || []);
    } catch (err: any) {
      // Kegagalan dilaporkan sebagai kegagalan — tidak ada lagi data karangan
      // yang muncul seolah-olah berhasil dimuat.
      console.error("Gagal memuat data survei:", err);
      toast.error("Gagal memuat data survei", {
        description: err?.message || "Periksa koneksi Anda lalu coba lagi.",
      });
      setSurveys([]);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (roleReady) fetchData();
  }, [roleReady, fetchData]);

  // Daftar properti terbit untuk dropdown pengajuan — data publik, aman diambil
  // langsung. Hanya dimuat saat dialog dibuka pertama kali.
  //
  // `ensureId` menjamin properti yang datang lewat tautan /surveys?request=<id>
  // ikut termuat walau bukan termasuk 200 listing terbaru. Tanpa itu, properti
  // lama yang dibuka dari halaman detailnya tidak akan ketemu di daftar dan
  // pemicunya menampilkan teks "Memuat properti..." selamanya.
  const loadProperties = useCallback(
    async (ensureId?: string) => {
      try {
        const { data, error } = await supabase
          .from("properties")
          .select("id, title, listing_code")
          .eq("status", "published")
          .order("created_at", { ascending: false })
          .limit(200);

        if (error) throw error;

        let list = data || [];

        if (ensureId && !list.some((p) => p.id === ensureId)) {
          const { data: extra } = await supabase
            .from("properties")
            .select("id, title, listing_code")
            .eq("id", ensureId)
            .eq("status", "published")
            .maybeSingle();

          if (extra) list = [extra, ...list];
        }

        setProperties(list);
      } catch (err) {
        console.error("Gagal memuat daftar properti:", err);
        toast.error("Gagal memuat daftar properti");
      }
    },
    []
  );

  // Buka dialog pengajuan lewat tautan dari halaman detail properti:
  // /surveys?request=<propertyId>
  useEffect(() => {
    if (!roleReady) return;
    const params = new URLSearchParams(window.location.search);
    const propertyId = params.get("request");
    if (!propertyId) return;

    setRequestForm((prev) => ({ ...prev, property_id: propertyId }));
    setIsRequestOpen(true);
    loadProperties(propertyId);

    // Bersihkan query supaya dialog tidak terbuka lagi saat pengguna kembali
    window.history.replaceState({}, "", "/surveys");
  }, [roleReady, loadProperties]);

  // ============================================================
  // 3. AKSI
  // ============================================================

  const handleSubmitRequest = async () => {
    if (!requestForm.property_id) {
      toast.error("Pilih properti yang ingin disurvei");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/surveys/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestForm),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal mengirim pengajuan.");

      toast.success("Pengajuan terkirim", {
        description: json.message || "Agen akan menghubungi Anda segera.",
      });
      setIsRequestOpen(false);
      setRequestForm((prev) => ({
        ...prev,
        property_id: "",
        preferred_date: "",
        preferred_time: "",
        message: "",
      }));
      fetchData();
    } catch (err: any) {
      toast.error("Pengajuan gagal", { description: err?.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkContacted = async (req: SurveyRequest) => {
    try {
      const res = await fetch(`/api/surveys/requests/${req.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "contacted" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal memperbarui status.");

      toast.success("Ditandai sudah dihubungi");
      fetchData();
    } catch (err: any) {
      toast.error("Gagal memperbarui status", { description: err?.message });
    }
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    if (rejectReason.trim().length === 0) {
      toast.error("Alasan penolakan wajib diisi");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/surveys/requests/${rejectTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "rejected", reject_reason: rejectReason.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal menolak pengajuan.");

      toast.success("Pengajuan ditolak", { description: "Client menerima notifikasi." });
      setRejectTarget(null);
      setRejectReason("");
      fetchData();
    } catch (err: any) {
      toast.error("Gagal menolak pengajuan", { description: err?.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateSchedule = async () => {
    if (!scheduleTarget) return;
    if (!scheduleForm.scheduled_at) {
      toast.error("Tentukan waktu survei");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/surveys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          request_id: scheduleTarget.id,
          property_id: scheduleTarget.property_id,
          client_id: scheduleTarget.requester_id,
          client_name: scheduleTarget.requester_name,
          client_phone: scheduleTarget.requester_phone,
          scheduled_at: localInputToISO(scheduleForm.scheduled_at),
          duration_min: Number(scheduleForm.duration_min),
          type: scheduleForm.type,
          location_note: scheduleForm.location_note,
          meeting_url: scheduleForm.meeting_url,
          notes: scheduleForm.notes,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal membuat jadwal.");

      toast.success("Jadwal survei dibuat", {
        description: "Client menerima notifikasi konfirmasi.",
      });
      setScheduleTarget(null);
      fetchData();
    } catch (err: any) {
      toast.error("Gagal membuat jadwal", { description: err?.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateSurveyStatus = async (survey: Survey, status: SurveyStatus) => {
    try {
      const res = await fetch(`/api/surveys/${survey.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal memperbarui jadwal.");

      toast.success(`Jadwal ditandai "${surveyStatusConfig[status].label}"`);
      fetchData();
    } catch (err: any) {
      toast.error("Gagal memperbarui jadwal", { description: err?.message });
    }
  };

  const openScheduleDialog = (req: SurveyRequest) => {
    setScheduleTarget(req);
    setScheduleForm({
      scheduled_at: "",
      duration_min: "60",
      type: "lapangan",
      location_note: "",
      meeting_url: "",
      notes: req.message ? `Dari pengajuan: ${req.message}` : "",
    });
  };

  /**
   * Buka dialog ubah jadwal, terisi nilai yang sekarang berlaku.
   *
   * Form-nya sama dengan dialog buat jadwal — pengubahan waktu, durasi, metode,
   * titik temu, dan catatan semuanya lewat satu tempat. Route PATCH-nya sudah
   * mengosongkan `reminder_sent_at` bila waktunya bergeser dan memberi tahu
   * client, jadi tidak ada yang perlu diurus di sisi ini.
   */
  const openEditDialog = (survey: Survey) => {
    setEditTarget(survey);
    setScheduleForm({
      scheduled_at: isoToLocalInput(survey.scheduled_at),
      duration_min: String(survey.duration_min ?? 60),
      type: survey.type || "lapangan",
      location_note: survey.location_note || "",
      meeting_url: survey.meeting_url || "",
      notes: survey.notes || "",
    });
  };

  const handleUpdateSchedule = async () => {
    if (!editTarget) return;
    if (!scheduleForm.scheduled_at) {
      toast.error("Tentukan waktu survei");
      return;
    }

    setSubmitting(true);
    try {
      const nextISO = localInputToISO(scheduleForm.scheduled_at);

      const res = await fetch(`/api/surveys/${editTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // Waktu hanya dikirim bila benar-benar berubah. Mengirimnya selalu
          // akan mengosongkan reminder_sent_at dan memberi notifikasi
          // "jadwal diubah" kepada client walau agen cuma memperbaiki catatan.
          ...(nextISO !== editTarget.scheduled_at ? { scheduled_at: nextISO } : {}),
          duration_min: Number(scheduleForm.duration_min),
          type: scheduleForm.type,
          location_note: scheduleForm.location_note,
          meeting_url: scheduleForm.meeting_url,
          notes: scheduleForm.notes,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal memperbarui jadwal.");

      toast.success("Jadwal diperbarui", { description: json.message });
      setEditTarget(null);
      fetchData();
    } catch (err: any) {
      toast.error("Gagal memperbarui jadwal", { description: err?.message });
    } finally {
      setSubmitting(false);
    }
  };

  const contactViaWhatsApp = (phone: string | null | undefined, text: string) => {
    if (!openWhatsApp(phone, text)) {
      toast.error("Nomor WhatsApp tidak tersedia atau tidak valid");
    }
  };

  // ============================================================
  // 4. PENYARINGAN
  // ============================================================
  const term = search.toLowerCase().trim();

  const filteredSurveys = surveys.filter((s) => {
    if (!term) return true;
    return (
      s.property?.title?.toLowerCase().includes(term) ||
      s.property?.listing_code?.toLowerCase().includes(term) ||
      s.client_name?.toLowerCase().includes(term) ||
      formatAddress(s.property).toLowerCase().includes(term)
    );
  });

  const filteredRequests = requests.filter((r) => {
    if (!term) return true;
    return (
      r.property?.title?.toLowerCase().includes(term) ||
      r.property?.listing_code?.toLowerCase().includes(term) ||
      r.requester_name?.toLowerCase().includes(term)
    );
  });

  // Request yang masih perlu ditangani agen
  const openRequests = filteredRequests.filter(
    (r) => r.status === "pending" || r.status === "contacted"
  );
  const pendingCount = requests.filter((r) => r.status === "pending").length;

  // ============================================================
  // 5. RENDER
  // ============================================================

  if (!roleReady) {
    return (
      <div className="space-y-4 max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 max-w-6xl mx-auto px-4 sm:px-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Jadwal Survei
          </h1>
          <p className="text-sm text-muted-foreground">
            {isStaff
              ? "Tangani pengajuan survei dari client dan kelola janji temu Anda."
              : "Pengajuan dan jadwal survei properti Anda."}
          </p>
        </div>

        {!isStaff && (
          <Button
            onClick={() => {
              if (properties.length === 0) loadProperties();
              setIsRequestOpen(true);
            }}
            className="gap-2 shrink-0 rounded-xl cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20"
          >
            <Plus className="h-4 w-4" /> Ajukan Survei
          </Button>
        )}
      </div>

      {/* CATATAN PRIVASI */}
      <div className="p-3.5 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-start gap-3 text-blue-800 dark:text-blue-300 text-xs">
        <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <span>
          {isStaff
            ? "Anda hanya melihat pengajuan dan jadwal yang ditugaskan kepada Anda. Data janji temu agen lain tidak ditampilkan."
            : "Jadwal ini bersifat pribadi — hanya Anda dan agen yang bersangkutan dapat melihatnya."}
        </span>
      </div>

      {/* PENCARIAN */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cari properti, kode listing, atau nama..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-9 text-xs rounded-xl"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-2xl" />
          ))}
        </div>
      ) : isStaff ? (
        // ============================================================
        // TAMPILAN AGEN / ADMIN — dua tab
        // ============================================================
        <Tabs defaultValue="requests" className="w-full">
          <TabsList className="w-full grid grid-cols-2 rounded-xl h-10">
            <TabsTrigger value="requests" className="text-xs gap-1.5 rounded-lg cursor-pointer">
              Request Masuk
              {pendingCount > 0 && (
                <Badge className="h-4 min-w-4 px-1 text-[10px] bg-rose-600 text-white rounded-full">
                  {pendingCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="schedule" className="text-xs rounded-lg cursor-pointer">
              Jadwal Survei ({filteredSurveys.length})
            </TabsTrigger>
          </TabsList>

          {/* TAB: REQUEST MASUK */}
          <TabsContent value="requests" className="mt-4 space-y-3">
            {openRequests.length === 0 ? (
              <EmptyState
                icon={<MessageCircle className="w-8 h-8 text-muted-foreground/50" />}
                title="Belum ada pengajuan yang perlu ditangani"
                description="Pengajuan survei dari client atas properti yang Anda pegang akan muncul di sini."
              />
            ) : (
              openRequests.map((req) => (
                <RequestCard
                  key={req.id}
                  request={req}
                  onContact={() =>
                    contactViaWhatsApp(
                      req.requester_phone,
                      `Halo ${req.requester_name}, saya agen untuk properti ${
                        req.property?.listing_code || req.property?.title || ""
                      }. Terkait pengajuan survei Anda, kapan waktu yang cocok untuk kita bertemu?`
                    )
                  }
                  onMarkContacted={() => handleMarkContacted(req)}
                  onSchedule={() => openScheduleDialog(req)}
                  onReject={() => {
                    setRejectTarget(req);
                    setRejectReason("");
                  }}
                />
              ))
            )}

            {/* Riwayat pengajuan yang sudah selesai/ditolak */}
            {filteredRequests.some((r) => !openRequests.includes(r)) && (
              <div className="pt-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  Riwayat Pengajuan
                </p>
                <div className="space-y-2">
                  {filteredRequests
                    .filter((r) => !openRequests.includes(r))
                    .map((req) => {
                      const cfg = requestStatusConfig[req.status];
                      return (
                        <Card key={req.id} className="p-3 rounded-xl bg-muted/30">
                          <div className="flex items-center justify-between gap-3 text-xs">
                            <div className="min-w-0">
                              <p className="font-semibold truncate">
                                {req.property?.title || "Properti"}
                              </p>
                              <p className="text-[11px] text-muted-foreground truncate">
                                {req.requester_name}
                                {req.reject_reason ? ` — ${req.reject_reason}` : ""}
                              </p>
                            </div>
                            <Badge variant="outline" className={`text-[10px] rounded-lg shrink-0 ${cfg?.color}`}>
                              {cfg?.label || req.status}
                            </Badge>
                          </div>
                        </Card>
                      );
                    })}
                </div>
              </div>
            )}
          </TabsContent>

          {/* TAB: JADWAL SURVEI */}
          <TabsContent value="schedule" className="mt-4 space-y-3">
            {filteredSurveys.length === 0 ? (
              <EmptyState
                icon={<CalendarIcon className="w-8 h-8 text-muted-foreground/50" />}
                title="Belum ada jadwal survei"
                description="Jadwal terbentuk setelah Anda menyetujui pengajuan dan menentukan waktu bersama client."
              />
            ) : (
              filteredSurveys.map((survey) => (
                <SurveyCard
                  key={survey.id}
                  survey={survey}
                  viewerIsAgent={survey.agent_id === userId || isAdmin}
                  onContact={() =>
                    contactViaWhatsApp(
                      survey.client_phone,
                      `Halo ${survey.client_name}, mengenai jadwal survei properti ${
                        survey.property?.listing_code || survey.property?.title || ""
                      }...`
                    )
                  }
                  onComplete={() => handleUpdateSurveyStatus(survey, "completed")}
                  onNoShow={() => handleUpdateSurveyStatus(survey, "no_show")}
                  onCancel={() => handleUpdateSurveyStatus(survey, "cancelled")}
                  onEdit={() => openEditDialog(survey)}
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      ) : (
        // ============================================================
        // TAMPILAN CLIENT — pengajuan sendiri + jadwal sendiri
        // ============================================================
        <div className="space-y-6">
          {/* Jadwal saya */}
          <section className="space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Jadwal Survei Saya
            </p>
            {filteredSurveys.length === 0 ? (
              <EmptyState
                icon={<CalendarIcon className="w-8 h-8 text-muted-foreground/50" />}
                title="Belum ada jadwal survei"
                description="Ajukan survei atas properti yang Anda minati. Agen akan menghubungi Anda untuk menentukan waktu."
              />
            ) : (
              filteredSurveys.map((survey) => (
                <SurveyCard
                  key={survey.id}
                  survey={survey}
                  viewerIsAgent={false}
                  onContact={() =>
                    contactViaWhatsApp(
                      survey.agent?.phone,
                      `Halo, saya ${survey.client_name}. Mengenai jadwal survei properti ${
                        survey.property?.listing_code || survey.property?.title || ""
                      }...`
                    )
                  }
                />
              ))
            )}
          </section>

          {/* Pengajuan saya */}
          {filteredRequests.length > 0 && (
            <section className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Pengajuan Saya
              </p>
              {filteredRequests.map((req) => {
                const cfg = requestStatusConfig[req.status];
                return (
                  <Card key={req.id} className="p-3.5 rounded-2xl">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <p className="font-bold text-xs truncate">
                          {req.property?.title || "Properti"}
                        </p>
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Diajukan{" "}
                          {new Date(req.created_at).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                        {req.status === "rejected" && req.reject_reason && (
                          <p className="text-[11px] text-rose-600">
                            Alasan: {req.reject_reason}
                          </p>
                        )}
                        {req.status === "pending" && (
                          <p className="text-[11px] text-muted-foreground">
                            Agen akan menghubungi Anda melalui WhatsApp.
                          </p>
                        )}
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-[10px] rounded-lg shrink-0 ${cfg?.color}`}
                      >
                        {cfg?.label || req.status}
                      </Badge>
                    </div>

                    {req.agent?.phone && req.status !== "rejected" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          contactViaWhatsApp(
                            req.agent?.phone,
                            `Halo, saya ${req.requester_name}. Saya mengajukan survei untuk ${
                              req.property?.listing_code || req.property?.title || "properti Anda"
                            }.`
                          )
                        }
                        className="mt-3 h-8 w-full text-[11px] gap-1.5 rounded-xl cursor-pointer text-emerald-700 border-emerald-300"
                      >
                        <MessageCircle className="w-3.5 h-3.5" /> Hubungi Agen
                      </Button>
                    )}
                  </Card>
                );
              })}
            </section>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* DIALOG: AJUKAN SURVEI (client)                               */}
      {/* ============================================================ */}
      <Dialog open={isRequestOpen} onOpenChange={setIsRequestOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Ajukan Survei Properti</DialogTitle>
            <DialogDescription className="text-xs">
              Agen properti akan menghubungi Anda via WhatsApp untuk menyepakati waktu.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-[11px] font-medium">Properti *</Label>
              <Select
                value={requestForm.property_id}
                onValueChange={(v) => setRequestForm({ ...requestForm, property_id: v || "" })}
              >
                <SelectTrigger className="h-9 text-xs rounded-xl mt-1">
                  {/* Base UI menampilkan NILAI mentah bila anak SelectValue kosong —
                      untuk properti itu berarti UUID yang tidak berarti apa-apa bagi
                      pengguna. Labelnya dicari sendiri, sepola StepContact.tsx:119-127.
                      Saat tautan datang dari halaman detail properti, daftar dropdown
                      mungkin belum termuat; teks sementara lebih baik daripada UUID. */}
                  <SelectValue placeholder="Pilih properti">
                    {(() => {
                      if (!requestForm.property_id) return undefined;
                      const picked = properties.find((p) => p.id === requestForm.property_id);
                      if (!picked) return "Memuat properti...";
                      return `${picked.listing_code ? `[${picked.listing_code}] ` : ""}${picked.title}`;
                    })()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-xl max-h-64">
                  {properties.length === 0 ? (
                    <div className="p-3 text-[11px] text-muted-foreground text-center">
                      Memuat properti...
                    </div>
                  ) : (
                    properties.map((p) => (
                      <SelectItem key={p.id} value={p.id} className="text-xs">
                        {p.listing_code ? `[${p.listing_code}] ` : ""}
                        {p.title}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[11px] font-medium">Nama Anda *</Label>
              <Input
                value={requestForm.requester_name}
                onChange={(e) =>
                  setRequestForm({ ...requestForm, requester_name: e.target.value })
                }
                placeholder="Nama lengkap"
                className="h-9 text-xs rounded-xl mt-1"
              />
            </div>

            <div>
              <Label className="text-[11px] font-medium">Nomor WhatsApp *</Label>
              <Input
                value={requestForm.requester_phone}
                onChange={(e) =>
                  setRequestForm({ ...requestForm, requester_phone: e.target.value })
                }
                placeholder="08xxxxxxxxxx"
                className="h-9 text-xs rounded-xl mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[11px] font-medium">Tanggal Diinginkan</Label>
                <Input
                  type="date"
                  min={new Date().toISOString().slice(0, 10)}
                  value={requestForm.preferred_date}
                  onChange={(e) =>
                    setRequestForm({ ...requestForm, preferred_date: e.target.value })
                  }
                  className="h-9 text-xs rounded-xl mt-1"
                />
              </div>
              <div>
                <Label className="text-[11px] font-medium">Jam Diinginkan</Label>
                <Input
                  type="time"
                  value={requestForm.preferred_time}
                  onChange={(e) =>
                    setRequestForm({ ...requestForm, preferred_time: e.target.value })
                  }
                  className="h-9 text-xs rounded-xl mt-1"
                />
              </div>
            </div>

            <p className="text-[10px] text-muted-foreground -mt-1">
              Waktu di atas hanya preferensi. Jadwal pasti disepakati bersama agen.
            </p>

            <div>
              <Label className="text-[11px] font-medium">Pesan untuk Agen</Label>
              <Textarea
                value={requestForm.message}
                onChange={(e) => setRequestForm({ ...requestForm, message: e.target.value })}
                placeholder="Hal yang ingin Anda periksa saat survei..."
                rows={3}
                className="text-xs rounded-xl mt-1"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsRequestOpen(false)}
              className="text-xs rounded-xl cursor-pointer"
            >
              Batal
            </Button>
            <Button
              size="sm"
              onClick={handleSubmitRequest}
              disabled={submitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-xl cursor-pointer gap-1.5"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {submitting ? "Mengirim..." : "Kirim Pengajuan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================================ */}
      {/* DIALOG: BUAT JADWAL (agen)                                   */}
      {/* ============================================================ */}
      <Dialog
        open={!!scheduleTarget || !!editTarget}
        onOpenChange={(o) => {
          if (o) return;
          setScheduleTarget(null);
          setEditTarget(null);
        }}
      >
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              {editTarget ? "Ubah Jadwal Survei" : "Buat Jadwal Survei"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {editTarget ? (
                <>
                  Untuk <strong>{editTarget.client_name}</strong> —{" "}
                  {editTarget.property?.title}
                </>
              ) : (
                <>
                  Untuk <strong>{scheduleTarget?.requester_name}</strong> —{" "}
                  {scheduleTarget?.property?.title}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            {scheduleTarget?.preferred_date && (
              <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-800 dark:text-amber-300">
                Preferensi client: {scheduleTarget.preferred_date}
                {scheduleTarget.preferred_time ? ` pukul ${scheduleTarget.preferred_time}` : ""}
              </div>
            )}

            {editTarget && (
              <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-[11px] text-blue-800 dark:text-blue-300">
                Mengubah waktu akan mengirim notifikasi ke client dan menjadwalkan
                ulang pengingat H-1 jam.
              </div>
            )}

            <div>
              <Label className="text-[11px] font-medium">Waktu Survei *</Label>
              <Input
                type="datetime-local"
                min={nowLocalInputValue()}
                value={scheduleForm.scheduled_at}
                onChange={(e) =>
                  setScheduleForm({ ...scheduleForm, scheduled_at: e.target.value })
                }
                className="h-9 text-xs rounded-xl mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[11px] font-medium">Durasi (menit)</Label>
                <Input
                  type="number"
                  min={15}
                  max={480}
                  step={15}
                  value={scheduleForm.duration_min}
                  onChange={(e) =>
                    setScheduleForm({ ...scheduleForm, duration_min: e.target.value })
                  }
                  className="h-9 text-xs rounded-xl mt-1"
                />
              </div>
              <div>
                <Label className="text-[11px] font-medium">Metode</Label>
                <Select
                  value={scheduleForm.type}
                  onValueChange={(v) => setScheduleForm({ ...scheduleForm, type: v || "lapangan" })}
                >
                  <SelectTrigger className="h-9 text-xs rounded-xl mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="lapangan" className="text-xs">
                      Lapangan
                    </SelectItem>
                    <SelectItem value="virtual" className="text-xs">
                      Virtual
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {scheduleForm.type === "virtual" ? (
              <div>
                <Label className="text-[11px] font-medium">URL Meeting *</Label>
                <Input
                  value={scheduleForm.meeting_url}
                  onChange={(e) =>
                    setScheduleForm({ ...scheduleForm, meeting_url: e.target.value })
                  }
                  placeholder="https://meet.google.com/..."
                  className="h-9 text-xs rounded-xl mt-1"
                />
              </div>
            ) : (
              <div>
                <Label className="text-[11px] font-medium">Titik Temu</Label>
                <Input
                  value={scheduleForm.location_note}
                  onChange={(e) =>
                    setScheduleForm({ ...scheduleForm, location_note: e.target.value })
                  }
                  placeholder="Contoh: Pos security cluster depan"
                  className="h-9 text-xs rounded-xl mt-1"
                />
              </div>
            )}

            <div>
              <Label className="text-[11px] font-medium">Catatan</Label>
              <Textarea
                value={scheduleForm.notes}
                onChange={(e) => setScheduleForm({ ...scheduleForm, notes: e.target.value })}
                rows={2}
                className="text-xs rounded-xl mt-1"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setScheduleTarget(null);
                setEditTarget(null);
              }}
              className="text-xs rounded-xl cursor-pointer"
            >
              Batal
            </Button>
            <Button
              size="sm"
              onClick={editTarget ? handleUpdateSchedule : handleCreateSchedule}
              disabled={submitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-xl cursor-pointer gap-1.5"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {submitting
                ? "Menyimpan..."
                : editTarget
                  ? "Simpan Perubahan"
                  : "Simpan & Beri Tahu Client"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================================ */}
      {/* DIALOG: TOLAK PENGAJUAN (agen)                               */}
      {/* ============================================================ */}
      <Dialog open={!!rejectTarget} onOpenChange={(o) => !o && setRejectTarget(null)}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Tolak Pengajuan</DialogTitle>
            <DialogDescription className="text-xs">
              Alasan ini dikirim ke client sebagai notifikasi, jadi tuliskan dengan jelas.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <Label className="text-[11px] font-medium">Alasan Penolakan *</Label>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Contoh: Properti sudah terjual / sedang dalam proses akad."
              rows={3}
              className="text-xs rounded-xl mt-1"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRejectTarget(null)}
              className="text-xs rounded-xl cursor-pointer"
            >
              Batal
            </Button>
            <Button
              size="sm"
              onClick={handleReject}
              disabled={submitting}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs rounded-xl cursor-pointer gap-1.5"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Tolak Pengajuan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================
// SUB-KOMPONEN
// ============================================================

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Card className="p-8 rounded-2xl">
      <div className="flex flex-col items-center text-center gap-2">
        {icon}
        <p className="text-xs font-bold text-foreground">{title}</p>
        <p className="text-[11px] text-muted-foreground max-w-xs">{description}</p>
      </div>
    </Card>
  );
}

function RequestCard({
  request,
  onContact,
  onMarkContacted,
  onSchedule,
  onReject,
}: {
  request: SurveyRequest;
  onContact: () => void;
  onMarkContacted: () => void;
  onSchedule: () => void;
  onReject: () => void;
}) {
  const cfg = requestStatusConfig[request.status];

  return (
    <Card className="rounded-2xl border shadow-2xs overflow-hidden">
      <CardHeader className="p-3.5 pb-2.5 border-b bg-muted/30">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-xs font-bold truncate flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              {request.property?.title || "Properti"}
            </CardTitle>
            <p className="text-[11px] text-muted-foreground mt-1 flex items-start gap-1">
              <MapPin className="w-3 h-3 text-rose-500 shrink-0 mt-0.5" />
              {formatAddress(request.property)}
            </p>
          </div>
          <Badge variant="outline" className={`text-[10px] rounded-lg shrink-0 ${cfg?.color}`}>
            {cfg?.label || request.status}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-3.5 space-y-2.5 text-xs">
        <div className="space-y-1.5">
          <p className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="font-semibold">{request.requester_name}</span>
          </p>
          <p className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
            <Phone className="w-3.5 h-3.5 shrink-0" />
            {request.requester_phone}
          </p>
          {request.preferred_date && (
            <p className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
              <CalendarIcon className="w-3.5 h-3.5 shrink-0" />
              Preferensi: {request.preferred_date}
              {request.preferred_time ? ` • ${request.preferred_time}` : ""}
            </p>
          )}
        </div>

        {request.message && (
          <p className="p-2.5 bg-muted/50 rounded-xl text-[11px] text-muted-foreground leading-relaxed">
            {request.message}
          </p>
        )}

        <Separator />

        <div className="grid grid-cols-2 gap-2">
          <Button
            size="sm"
            onClick={onContact}
            className="h-8 text-[11px] gap-1.5 rounded-xl cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <MessageCircle className="w-3.5 h-3.5" /> Hubungi via WA
          </Button>
          <Button
            size="sm"
            onClick={onSchedule}
            className="h-8 text-[11px] gap-1.5 rounded-xl cursor-pointer bg-blue-600 hover:bg-blue-700 text-white"
          >
            <CalendarIcon className="w-3.5 h-3.5" /> Buat Jadwal
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {request.status === "pending" ? (
            <Button
              size="sm"
              variant="outline"
              onClick={onMarkContacted}
              className="h-8 text-[11px] gap-1.5 rounded-xl cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Sudah Dihubungi
            </Button>
          ) : (
            <div />
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={onReject}
            className="h-8 text-[11px] gap-1.5 rounded-xl cursor-pointer text-rose-600 border-rose-200 hover:bg-rose-50"
          >
            <XCircle className="w-3.5 h-3.5" /> Tolak
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SurveyCard({
  survey,
  viewerIsAgent,
  onContact,
  onComplete,
  onNoShow,
  onCancel,
  onEdit,
}: {
  survey: Survey;
  viewerIsAgent: boolean;
  onContact: () => void;
  onComplete?: () => void;
  onNoShow?: () => void;
  onCancel?: () => void;
  onEdit?: () => void;
}) {
  const cfg = surveyStatusConfig[survey.status] || surveyStatusConfig.scheduled;
  const { date, time } = formatDateTime(survey.scheduled_at);
  const address = formatAddress(survey.property);
  const isActive = survey.status === "scheduled";

  return (
    <Card className="rounded-2xl border shadow-2xs overflow-hidden">
      <CardHeader className="p-3.5 pb-2.5 border-b bg-muted/30">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <Badge
                variant="outline"
                className="font-mono text-[10px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 rounded-lg"
              >
                <Clock className="w-3 h-3 mr-1" /> {time}
              </Badge>
              <span className="text-[11px] font-bold text-foreground">{date}</span>
            </div>
            <CardTitle className="text-xs font-bold truncate">
              {survey.property?.title || "Properti"}
            </CardTitle>
            <p className="text-[11px] text-muted-foreground mt-1 flex items-start gap-1">
              <MapPin className="w-3 h-3 text-rose-500 shrink-0 mt-0.5" />
              {address}
            </p>
          </div>
          <Badge
            variant="outline"
            className={`text-[10px] font-semibold border px-2 py-0.5 rounded-lg shrink-0 ${cfg.bg} ${cfg.color}`}
          >
            {cfg.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-3.5 space-y-2.5 text-xs">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
            <User className="w-3.5 h-3.5 shrink-0" />
            {viewerIsAgent
              ? `Client: ${survey.client_name}`
              : `Agen: ${survey.agent?.full_name || "Agen properti"}`}
          </span>
          <Badge variant="outline" className="text-[10px] rounded-lg capitalize">
            {survey.type}
          </Badge>
        </div>

        {survey.location_note && (
          <p className="text-[11px] text-muted-foreground">
            <span className="font-semibold text-foreground">Titik temu:</span>{" "}
            {survey.location_note}
          </p>
        )}

        {survey.notes && (
          <p className="p-2.5 bg-muted/50 rounded-xl text-[11px] text-muted-foreground leading-relaxed">
            {survey.notes}
          </p>
        )}

        <Separator />

        <div className="grid grid-cols-2 gap-2">
          {survey.type === "virtual" && survey.meeting_url ? (
            <Button
              size="sm"
              onClick={() => window.open(survey.meeting_url!, "_blank")}
              className="h-8 text-[11px] gap-1.5 rounded-xl cursor-pointer bg-blue-600 hover:bg-blue-700 text-white"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Buka Meeting
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => openGoogleMaps(survey.property?.title || "Properti", address)}
              className="h-8 text-[11px] gap-1.5 rounded-xl cursor-pointer bg-blue-600 hover:bg-blue-700 text-white"
            >
              <MapPin className="w-3.5 h-3.5" /> Navigasi
            </Button>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={onContact}
            className="h-8 text-[11px] gap-1.5 rounded-xl cursor-pointer text-emerald-700 border-emerald-300"
          >
            <MessageCircle className="w-3.5 h-3.5" /> Hubungi
          </Button>
        </div>

        {/* Aksi status — hanya agen pemilik jadwal (atau admin) yang boleh */}
        {viewerIsAgent && isActive && (
          <div className="space-y-2 pt-1">
            <div className="grid grid-cols-3 gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={onComplete}
                className="h-8 text-[10px] gap-1 rounded-xl cursor-pointer text-emerald-700"
              >
                <CheckCircle2 className="w-3 h-3" /> Selesai
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={onNoShow}
                className="h-8 text-[10px] gap-1 rounded-xl cursor-pointer text-amber-700"
              >
                <Ban className="w-3 h-3" /> Absen
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={onCancel}
                className="h-8 text-[10px] gap-1 rounded-xl cursor-pointer text-rose-600"
              >
                <XCircle className="w-3 h-3" /> Batal
              </Button>
            </div>

            {onEdit && (
              <Button
                size="sm"
                variant="outline"
                onClick={onEdit}
                className="h-8 w-full text-[10px] gap-1 rounded-xl cursor-pointer text-blue-700 border-blue-300"
              >
                <Pencil className="w-3 h-3" /> Ubah Jadwal
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
