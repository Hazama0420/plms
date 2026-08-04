"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MessageCircle,
  Plus,
  Trash2,
  CheckCircle,
  Tag,
  Users,
  MessageSquare,
  Calculator,
  Sparkles,
  Lock,
  Copy,
  Send,
  RefreshCw,
  Building,
  Zap,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";

import { crmService, type LeadWithRelations } from "@/services/crm.service";
import { supabase } from "@/lib/supabase/client";
import type { LeadStatus } from "@/types/crm.types";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface Activity {
  id: string;
  lead_id: string;
  user_id: string;
  activity_type: string;
  notes: string;
  created_at: string;
  user?: { full_name: string };
}

interface Followup {
  id: string;
  lead_id: string;
  assigned_to: string;
  followup_date: string;
  notes: string | null;
  status: "pending" | "completed" | "cancelled";
  completed_at: string | null;
}

const STATUS_OPTIONS: { value: LeadStatus; label: string; color: string }[] = [
  { value: "new", label: "Baru", color: "bg-blue-500" },
  { value: "contacted", label: "Dihubungi", color: "bg-amber-500" },
  { value: "qualified", label: "Kualifikasi", color: "bg-green-500" },
  { value: "negotiation", label: "Negosiasi", color: "bg-purple-500" },
  { value: "proposal", label: "Proposal", color: "bg-indigo-500" },
  { value: "won", label: "Menang", color: "bg-emerald-600" },
  { value: "lost", label: "Hilang", color: "bg-rose-500" },
];

const STATUS_BADGE_VARIANTS: Record<LeadStatus, { className: string }> = {
  new: { className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
  contacted: { className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
  qualified: { className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
  negotiation: { className: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" },
  proposal: { className: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20" },
  won: { className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
  lost: { className: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20" },
};

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  created: <Plus className="h-3.5 w-3.5 text-blue-500" />,
  status_change: <Tag className="h-3.5 w-3.5 text-purple-500" />,
  followup_scheduled: <Calendar className="h-3.5 w-3.5 text-amber-500" />,
  followup_completed: <CheckCircle className="h-3.5 w-3.5 text-green-500" />,
  note: <MessageSquare className="h-3.5 w-3.5 text-slate-400" />,
  "WhatsApp Chat": <MessageCircle className="h-3.5 w-3.5 text-emerald-500" />,
  meeting: <Users className="h-3.5 w-3.5 text-indigo-500" />,
};

export default function LeadDetailPage() {
  const router = useRouter();
  const params = useParams();
  const leadId = params.id as string;

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string>("");

  const [lead, setLead] = useState<LeadWithRelations | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<Activity[]>([]);
  const [followups, setFollowups] = useState<Followup[]>([]);
  const [interestsList, setInterestsList] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activityFilter, setActivityFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("timeline");

  const [showAddFollowup, setShowAddFollowup] = useState(false);
  const [showAddNote, setShowAddNote] = useState(false);
  const [showAddInterest, setShowAddInterest] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiGeneratedMessage, setAiGeneratedMessage] = useState("");
  const [generatingAi, setGeneratingAi] = useState(false);

  const [newFollowup, setNewFollowup] = useState({ followup_date: "", notes: "", assigned_to: "" });
  const [newNote, setNewNote] = useState("");
  const [newInterest, setNewInterest] = useState({ property_id: "", interest_level: "high", notes: "" });

  useEffect(() => {
    async function checkUserSession() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        setCurrentUserId(user.id);

        const { data: userData } = await supabase
          .from("users")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();

        const role = (userData?.role || user.user_metadata?.role || "agent").toLowerCase();
        setCurrentUserRole(role);
      } catch (err) {
        console.error("Gagal memeriksa sesi pengguna:", err);
      }
    }
    checkUserSession();
  }, []);

  const isAdminOrSuperAdmin = useMemo(() => {
    return (
      currentUserRole === "super_admin" ||
      currentUserRole === "superadmin" ||
      currentUserRole === "admin"
    );
  }, [currentUserRole]);

  // 🔒 SENSOR NOMOR TELEPON TOTAL UNTUK ROLE AGENT
  const formatPhoneForUser = useCallback(
    (phone?: string) => {
      if (!phone) return "-";
      if (isAdminOrSuperAdmin) return phone;
      return "08xx-xxxx-xxxx";
    },
    [isAdminOrSuperAdmin]
  );

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const leadData = await crmService.getLeadById(leadId);
      setLead(leadData);

      const { data: interestsData, error: intErr } = await supabase
        .from("crm_interests")
        .select("*")
        .eq("lead_id", leadId);

      if (!intErr && interestsData && interestsData.length > 0) {
        const propertyIds = interestsData.map((i: any) => i.property_id).filter(Boolean);
        let propertiesMap: Record<string, any> = {};

        if (propertyIds.length > 0) {
          const { data: propData } = await supabase
            .from("properties")
            .select("id, title, listing_code")
            .in("id", propertyIds);

          if (propData) {
            propertiesMap = propData.reduce((acc: any, p: any) => {
              acc[p.id] = p;
              return acc;
            }, {});
          }
        }

        const formattedInterests = interestsData.map((i: any) => ({
          ...i,
          property: propertiesMap[i.property_id] || { title: "Properti Pilihan", listing_code: "INL-PROP" },
        }));

        setInterestsList(formattedInterests);
      } else {
        setInterestsList([]);
      }

      const activitiesData = await crmService.getActivities(leadId);
      setActivities(activitiesData || []);
      setFilteredActivities(activitiesData || []);

      const followupsData = await crmService.getFollowups({ lead_id: leadId, limit: 50 });
      setFollowups(followupsData.data || []);

      const { data: propsData } = await supabase
        .from("properties")
        .select("id, title, listing_code")
        .eq("status", "published");

      setProperties(propsData || []);
    } catch (error) {
      console.error("Error fetching lead detail:", error);
      toast.error("Gagal memuat data lead");
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (activityFilter === "all") {
      setFilteredActivities(activities);
    } else {
      setFilteredActivities(activities.filter((a) => a.activity_type === activityFilter));
    }
  }, [activityFilter, activities]);

  // 🛡️ BUKA WHATSAPP DENGAN BLOKIR TOTAL UNTUK ROLE AGENT
  const handleOpenWhatsApp = async (phone?: string, customText?: string) => {
    if (!isAdminOrSuperAdmin) {
      toast.error("Akses Kontak Terkunci!", {
        description:
          "Nomor kontak disembunyikan demi keamanan data perusahaan. Gunakan sistem pesan terpusat atau hubungi Admin.",
      });
      return;
    }

    if (!phone) {
      toast.error("Nomor WhatsApp tidak tersedia");
      return;
    }

    let cleanPhone = phone.replace(/[^0-9]/g, "");
    if (cleanPhone.startsWith("0")) cleanPhone = "62" + cleanPhone.slice(1);

    if (currentUserId && leadId) {
      try {
        await supabase.from("crm_activities").insert([
          {
            lead_id: leadId,
            user_id: currentUserId,
            activity_type: "WhatsApp Chat",
            notes: `Admin mengontak klien ${lead?.contact?.full_name || "Klien"} via WhatsApp`,
            created_at: new Date().toISOString(),
          },
        ]);
        fetchData();
      } catch (err) {
        console.error("Gagal mencatat log aktivitas WA:", err);
      }
    }

    const defaultText = `Halo Bpk/Ibu ${lead?.contact?.full_name || ""}, perkenalkan saya dari Inland Property...`;
    const text = customText ? encodeURIComponent(customText) : encodeURIComponent(defaultText);
    window.open(`https://wa.me/${cleanPhone}?text=${text}`, "_blank");
  };

  const handleSendWaNotificationToAgent = async () => {
    if (!isAdminOrSuperAdmin) return;

    if (!lead?.assigned_to) {
      toast.error("Lead ini belum memiliki Agen Penanggung Jawab!");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/notifications/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: lead.assigned_to,
          leadName: lead.contact?.full_name || "Tanpa Nama",
          clientPhone: lead.contact?.phone || "-",
          propertyInterest:
            interestsList[0]?.property?.title || lead.interest_type || "Properti Pilihan",
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("Notifikasi WhatsApp berhasil dikirim ke HP Agen!");
      } else {
        toast.error("Gagal: " + (data.error || "Gagal mengirim pesan"));
      }
    } catch (err) {
      toast.error("Gagal terhubung ke API WhatsApp Notification");
    } finally {
      setSaving(false);
    }
  };

  const handleOpenAiWriter = async () => {
    if (!isAdminOrSuperAdmin) {
      toast.error("Fitur Terkunci!", {
        description: "Fitur AI Writer Follow-Up khusus untuk Super Admin dan Admin.",
      });
      return;
    }

    setAiModalOpen(true);
    setGeneratingAi(true);
    setAiGeneratedMessage("");

    try {
      const clientName = lead?.contact?.full_name || "Klien";
      const propertyInterest =
        lead?.interest_type ||
        (interestsList.length > 0 && interestsList[0]?.property?.title) ||
        "Properti Pilihan";

      const res = await fetch("/api/ai/followup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadName: clientName,
          property: propertyInterest,
          status: lead?.status || "New Lead",
          userRole: currentUserRole,
        }),
      });

      const json = await res.json();
      if (res.ok && json?.message) {
        setAiGeneratedMessage(json.message);
      } else {
        setAiGeneratedMessage(
          `Halo Bpk/Ibu ${clientName},\n\nPerkenalkan saya dari Inland Property. Menindaklanjuti ketertarikan Anda pada properti *${propertyInterest}*, apakah ada waktu luang minggu ini untuk survey lokasi bersama?\n\nTerima kasih!`
        );
      }
    } catch (err) {
      toast.error("Gagal terhubung ke AI Service.");
    } finally {
      setGeneratingAi(false);
    }
  };

  const handleOpenKprCalculator = () => {
    if (!lead) return;
    const clientName = lead.contact?.full_name || "Klien CRM";
    let url = `/kpr-calculator?client_name=${encodeURIComponent(clientName)}`;
    if (interestsList.length > 0 && interestsList[0]?.property?.id) {
      url += `&property_id=${interestsList[0].property.id}`;
    }
    router.push(url);
  };

  const handleAddFollowup = async () => {
    if (!lead || !newFollowup.followup_date) {
      toast.error("Tanggal follow-up wajib diisi");
      return;
    }
    setSaving(true);
    try {
      await crmService.createFollowup({
        lead_id: lead.id,
        assigned_to: newFollowup.assigned_to || lead.assigned_to || "",
        followup_date: newFollowup.followup_date,
        notes: newFollowup.notes,
      });
      toast.success("Agenda follow-up berhasil dibuat");
      setShowAddFollowup(false);
      setNewFollowup({ followup_date: "", notes: "", assigned_to: "" });
      fetchData();
    } catch (error) {
      toast.error("Gagal membuat follow-up");
    } finally {
      setSaving(false);
    }
  };

  const handleAddNote = async () => {
    if (!lead || !newNote.trim()) {
      toast.error("Catatan wajib diisi");
      return;
    }
    setSaving(true);
    try {
      await crmService.logActivity({ lead_id: lead.id, activity_type: "note", notes: newNote });
      toast.success("Catatan berhasil ditambahkan");
      setShowAddNote(false);
      setNewNote("");
      fetchData();
    } catch (error) {
      toast.error("Gagal menambahkan catatan");
    } finally {
      setSaving(false);
    }
  };

  const handleAddInterest = async () => {
    if (!lead || !newInterest.property_id) {
      toast.error("Pilih properti yang diminati terlebih dahulu");
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        lead_id: lead.id,
        property_id: newInterest.property_id,
        interest_level: newInterest.interest_level || "high",
        notes: newInterest.notes || null,
      };

      const { error } = await supabase.from("crm_interests").insert(payload);
      if (error) throw error;

      toast.success("Minat properti berhasil ditambahkan");
      setShowAddInterest(false);
      setNewInterest({ property_id: "", interest_level: "high", notes: "" });
      fetchData();
    } catch (error: any) {
      console.error("Gagal menambah minat:", error);
      toast.error("Gagal menambahkan minat properti");
    } finally {
      setSaving(false);
    }
  };

  // 🔒 HAPUS LEAD KHUSUS ADMIN & SUPER ADMIN
  const handleDeleteLead = async () => {
    if (!lead) return;
    if (!isAdminOrSuperAdmin) {
      toast.error("Akses Ditolak!", {
        description: "Hanya Admin yang memiliki izin untuk menghapus data lead.",
      });
      setShowDeleteDialog(false);
      return;
    }
    setSaving(true);
    try {
      await crmService.deleteLead(lead.id);
      toast.success("Lead berhasil dihapus");
      router.push("/crm/leads");
    } catch (error) {
      toast.error("Gagal menghapus lead");
    } finally {
      setSaving(false);
      setShowDeleteDialog(false);
    }
  };

  const getStatusLabel = (status: LeadStatus) => STATUS_OPTIONS.find((s) => s.value === status)?.label || status;

  if (loading) {
    return (
      <div className="space-y-4 p-4 max-w-4xl mx-auto">
        <Skeleton className="h-10 w-36 bg-muted" />
        <Skeleton className="h-48 w-full rounded-2xl bg-muted" />
        <Skeleton className="h-72 w-full rounded-2xl bg-muted" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="flex flex-col items-center justify-center h-80 text-center p-4">
        <h2 className="text-base font-bold text-foreground">Lead Tidak Ditemukan</h2>
        <Button onClick={() => router.back()} className="mt-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white h-9">
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Kembali
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20 max-w-4xl mx-auto px-3 sm:px-4 bg-background min-h-screen text-foreground">
      
      {/* 🚀 HEADER MINIMALIS & COMPACT */}
      <div className="flex items-center justify-between pt-3 pb-2 border-b border-border gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-8 w-8 shrink-0 hover:bg-muted text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold tracking-tight truncate text-foreground">
              {lead.contact?.full_name || "Tanpa Nama"}
            </h1>
            <p className="text-[11px] text-muted-foreground truncate font-mono">
              {lead.contact?.email || formatPhoneForUser(lead.contact?.phone ?? "")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="outline" className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-md", STATUS_BADGE_VARIANTS[lead.status]?.className)}>
            {getStatusLabel(lead.status)}
          </Badge>

          {/* 🔒 TOMBOL HAPUS HANYA UNTUK ADMIN */}
          {isAdminOrSuperAdmin && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowDeleteDialog(true)}
              className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 cursor-pointer"
              title="Hapus Lead (Khusus Admin)"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* ⚡ ACTION BAR DENGAN PROTEKSI ROLE */}
      <div className={cn(
        "grid gap-2 bg-card p-2 rounded-xl border border-border shadow-2xs",
        isAdminOrSuperAdmin ? "grid-cols-4" : "grid-cols-3"
      )}>
        {/* 1. WA KLIEN */}
        <Button
          onClick={() => handleOpenWhatsApp(lead.contact?.phone ?? undefined)}
          className={cn(
            "flex flex-col items-center justify-center gap-1 h-14 rounded-lg text-[9px] sm:text-[10px] font-semibold cursor-pointer transition-colors",
            isAdminOrSuperAdmin
              ? "bg-emerald-600 hover:bg-emerald-700 text-white"
              : "bg-muted text-muted-foreground border border-border"
          )}
        >
          {isAdminOrSuperAdmin ? <MessageSquare className="w-4 h-4" /> : <Lock className="w-4 h-4 text-amber-500" />}
          <span>{isAdminOrSuperAdmin ? "WA Klien" : "WA Terkunci"}</span>
        </Button>

        {/* 2. NOTIF AGEN (KHUSUS SUPER ADMIN & ADMIN) */}
        {isAdminOrSuperAdmin && (
          <Button
            onClick={handleSendWaNotificationToAgent}
            disabled={saving}
            className="flex flex-col items-center justify-center gap-1 h-14 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[9px] sm:text-[10px] font-semibold cursor-pointer shadow-2xs"
            title="Kirim Notifikasi WA ke Agen Penanggung Jawab"
          >
            <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
            <span>Notif Agen</span>
          </Button>
        )}

        {/* 3. AI WRITER */}
        <Button
          onClick={handleOpenAiWriter}
          className={cn(
            "flex flex-col items-center justify-center gap-1 h-14 rounded-lg text-[9px] sm:text-[10px] font-semibold cursor-pointer shadow-2xs",
            isAdminOrSuperAdmin ? "bg-amber-600 hover:bg-amber-700 text-white" : "bg-muted text-muted-foreground border border-border"
          )}
        >
          {isAdminOrSuperAdmin ? <Sparkles className="w-4 h-4 fill-amber-200" /> : <Lock className="w-4 h-4 text-muted-foreground" />}
          <span>AI Writer</span>
        </Button>

        {/* 4. SIMULASI KPR */}
        <Button
          onClick={handleOpenKprCalculator}
          className="flex flex-col items-center justify-center gap-1 h-14 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-lg text-[9px] sm:text-[10px] font-semibold cursor-pointer shadow-2xs"
        >
          <Calculator className="w-4 h-4" />
          <span>Simulasi</span>
        </Button>
      </div>

      {/* 📋 CARD RINGKASAN PROFIL */}
      <Card className="border border-border bg-card shadow-2xs rounded-xl overflow-hidden text-card-foreground">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-medium">Pekerjaan</span>
            <span className="font-semibold text-foreground">{lead.contact?.occupation || "Belum diisi"}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-medium">Sumber Leads</span>
            <Badge variant="outline" className="text-[10px] font-mono border-border bg-background">{lead.source || "Website"}</Badge>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-medium">Budget Maksimal</span>
            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
              {lead.budget ? `Rp ${lead.budget.toLocaleString("id-ID")}` : "Belum Ditentukan"}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* 📑 TABS NAVIGASI */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-9 bg-muted border border-border rounded-xl p-1 shadow-2xs">
          <TabsTrigger value="timeline" className="text-[11px] font-semibold data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-muted-foreground rounded-lg transition-all">
            Timeline ({filteredActivities.length})
          </TabsTrigger>
          <TabsTrigger value="followups" className="text-[11px] font-semibold data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-muted-foreground rounded-lg transition-all">
            Follow-up ({followups.length})
          </TabsTrigger>
          <TabsTrigger value="interests" className="text-[11px] font-semibold data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-muted-foreground rounded-lg transition-all">
            Minat ({interestsList.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="mt-3">
          <Card className="border border-border bg-card shadow-2xs rounded-xl text-card-foreground">
            <CardHeader className="p-3.5 pb-2.5 border-b border-border flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-bold text-foreground">Riwayat Aktivitas</CardTitle>
              <Select value={activityFilter} onValueChange={(val) => setActivityFilter(val || "all")}>
                <SelectTrigger className="w-[110px] h-7 text-[11px] border-border bg-background">
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border text-card-foreground">
                  <SelectItem value="all" className="text-xs">Semua</SelectItem>
                  <SelectItem value="note" className="text-xs">Catatan</SelectItem>
                  <SelectItem value="WhatsApp Chat" className="text-xs">Chat WA</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent className="p-3.5 space-y-3">
              {filteredActivities.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">Belum ada riwayat aktivitas.</p>
              ) : (
                <ScrollArea className="h-[280px] pr-2">
                  <div className="relative pl-5 border-l-2 border-border space-y-4">
                    {filteredActivities.map((act) => (
                      <div key={act.id} className="relative text-xs">
                        <div className="absolute -left-[23px] p-1 rounded-full bg-card border-2 border-emerald-600">
                          {ACTIVITY_ICONS[act.activity_type] || <Clock className="h-3 w-3 text-emerald-600" />}
                        </div>
                        <div className="space-y-0.5 pl-1">
                          <p className="font-medium text-foreground leading-snug">{act.notes}</p>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {formatDistanceToNow(new Date(act.created_at), { addSuffix: true, locale: id })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
              <Button
                variant="outline"
                className="w-full text-xs h-9 border-border bg-background hover:bg-muted text-foreground font-semibold gap-1.5 cursor-pointer"
                onClick={() => setShowAddNote(true)}
              >
                <Plus className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> Tambah Catatan Aktivitas
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="followups" className="mt-3">
          <Card className="border border-border bg-card shadow-2xs rounded-xl text-card-foreground">
            <CardHeader className="p-3.5 pb-2.5 border-b border-border">
              <CardTitle className="text-xs font-bold text-foreground">Agenda Follow-up</CardTitle>
            </CardHeader>
            <CardContent className="p-3.5 space-y-3">
              {followups.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">Belum ada agenda follow-up.</p>
              ) : (
                <div className="space-y-2.5">
                  {followups.map((f) => (
                    <div key={f.id} className="p-3 rounded-lg border border-border bg-background text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-[9px] uppercase font-mono border-border text-muted-foreground">{f.status}</Badge>
                        <span className="text-[10px] font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                          {format(new Date(f.followup_date), "dd MMM yyyy, HH:mm", { locale: id })}
                        </span>
                      </div>
                      {f.notes && <p className="text-muted-foreground text-[11px] mt-1">{f.notes}</p>}
                    </div>
                  ))}
                </div>
              )}
              <Button
                variant="outline"
                className="w-full text-xs h-9 border-border bg-background hover:bg-muted text-foreground font-semibold gap-1.5 cursor-pointer"
                onClick={() => setShowAddFollowup(true)}
              >
                <Plus className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> Buat Follow-up Baru
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="interests" className="mt-3">
          <Card className="border border-border bg-card shadow-2xs rounded-xl text-card-foreground">
            <CardHeader className="p-3.5 pb-2.5 border-b border-border">
              <CardTitle className="text-xs font-bold text-foreground">Minat Properti</CardTitle>
            </CardHeader>
            <CardContent className="p-3.5 space-y-3">
              {interestsList.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">Belum ada properti terpilih.</p>
              ) : (
                <div className="space-y-2.5">
                  {interestsList.map((i: any) => (
                    <div key={i.id} className="p-3 rounded-lg border border-border bg-background text-xs flex justify-between items-start gap-2">
                      <div className="space-y-1">
                        <p className="font-bold text-foreground flex items-center gap-1.5">
                          <Building className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          {i.property?.title || "Properti Pilihan"}
                        </p>
                        <p className="text-[10px] font-mono text-muted-foreground">Kode: {i.property?.listing_code || "-"}</p>
                        {i.notes && <p className="text-[11px] text-muted-foreground">{i.notes}</p>}
                      </div>
                      <Badge variant="outline" className="text-[9px] uppercase font-mono border-emerald-500/20 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 shrink-0">
                        {i.interest_level || "HIGH"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
              <Button
                variant="outline"
                className="w-full text-xs h-9 border-border bg-background hover:bg-muted text-foreground font-semibold gap-1.5 cursor-pointer"
                onClick={() => setShowAddInterest(true)}
              >
                <Plus className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> Tambah Minat Properti
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 🤖 DIALOG MODAL AI WRITER */}
      <Dialog open={aiModalOpen} onOpenChange={setAiModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl border-border bg-card text-card-foreground">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
              <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500" /> AI Writer Follow-Up
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Draf pesan WhatsApp ramah untuk <span className="font-semibold text-foreground">{lead.contact?.full_name}</span>.
            </DialogDescription>
          </DialogHeader>

          {generatingAi ? (
            <div className="p-6 text-center space-y-2">
              <RefreshCw className="w-6 h-6 text-emerald-600 dark:text-emerald-400 animate-spin mx-auto" />
              <p className="text-xs text-muted-foreground">AI sedang menyusun draf pesan...</p>
            </div>
          ) : (
            <Textarea
              value={aiGeneratedMessage}
              onChange={(e) => setAiGeneratedMessage(e.target.value)}
              rows={5}
              className="text-xs leading-relaxed font-mono bg-background border-border text-foreground resize-none"
            />
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(aiGeneratedMessage);
                toast.success("Pesan berhasil disalin!");
              }}
              className="text-xs h-9 border-border bg-background text-foreground cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5 mr-1" /> Salin
            </Button>
            <Button
              size="sm"
              onClick={() => {
                handleOpenWhatsApp(lead.contact?.phone ?? undefined, aiGeneratedMessage ?? undefined);
                setAiModalOpen(false);
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 cursor-pointer shadow-2xs"
            >
              <Send className="w-3.5 h-3.5 mr-1" /> Kirim WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG TAMBAH FOLLOWUP */}
      <Dialog open={showAddFollowup} onOpenChange={setShowAddFollowup}>
        <DialogContent className="sm:max-w-md rounded-2xl text-xs border-border bg-card text-card-foreground">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-foreground">Jadwalkan Follow-up</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <Input
              type="datetime-local"
              className="h-9 text-xs border-border bg-background text-foreground"
              value={newFollowup.followup_date}
              onChange={(e) => setNewFollowup({ ...newFollowup, followup_date: e.target.value })}
            />
            <Textarea
              placeholder="Catatan follow-up..."
              className="text-xs resize-none border-border bg-background text-foreground placeholder:text-muted-foreground"
              value={newFollowup.notes}
              onChange={(e) => setNewFollowup({ ...newFollowup, notes: e.target.value })}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button size="sm" onClick={handleAddFollowup} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 cursor-pointer">
              Simpan Jadwal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG TAMBAH CATATAN */}
      <Dialog open={showAddNote} onOpenChange={setShowAddNote}>
        <DialogContent className="sm:max-w-md rounded-2xl text-xs border-border bg-card text-card-foreground">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-foreground">Tambah Catatan Aktivitas</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Tulis catatan aktivitas..."
            className="text-xs resize-none border-border bg-background text-foreground placeholder:text-muted-foreground"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button size="sm" onClick={handleAddNote} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 cursor-pointer">
              Simpan Catatan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG TAMBAH MINAT */}
      <Dialog open={showAddInterest} onOpenChange={setShowAddInterest}>
        <DialogContent className="sm:max-w-md rounded-2xl text-xs border-border bg-card text-card-foreground">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-foreground">Tambah Minat Properti</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <Select
              value={newInterest.property_id}
              onValueChange={(val) => setNewInterest({ ...newInterest, property_id: val || "" })}
            >
              <SelectTrigger className="h-9 text-xs border-border bg-background text-foreground">
                <SelectValue placeholder="Pilih properti..." />
              </SelectTrigger>
              <SelectContent className="bg-card border-border text-card-foreground">
                {properties.map((p) => (
                  <SelectItem key={p.id} value={p.id} className="text-xs">
                    {p.title} ({p.listing_code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={newInterest.interest_level}
              onValueChange={(val) => setNewInterest({ ...newInterest, interest_level: val || "high" })}
            >
              <SelectTrigger className="h-9 text-xs border-border bg-background text-foreground">
                <SelectValue placeholder="Level Minat" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border text-card-foreground">
                <SelectItem value="high" className="text-xs">Tinggi (High)</SelectItem>
                <SelectItem value="medium" className="text-xs">Sedang (Medium)</SelectItem>
                <SelectItem value="low" className="text-xs">Rendah (Low)</SelectItem>
              </SelectContent>
            </Select>

            <Textarea
              placeholder="Catatan tambahan minat..."
              className="text-xs resize-none border-border bg-background text-foreground placeholder:text-muted-foreground"
              value={newInterest.notes}
              onChange={(e) => setNewInterest({ ...newInterest, notes: e.target.value })}
              rows={2}
            />
          </div>
          <DialogFooter>
            <Button size="sm" onClick={handleAddInterest} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 cursor-pointer">
              Simpan Minat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 🔒 DIALOG HAPUS (KHUSUS ADMIN) */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md rounded-2xl text-xs border-border bg-card text-card-foreground">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-rose-600 dark:text-rose-400">Hapus Lead?</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">Tindakan ini permanen dan menghapus seluruh riwayat prospek.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="destructive" size="sm" onClick={handleDeleteLead} disabled={saving} className="text-xs h-9 cursor-pointer">
              Ya, Hapus Permanen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}