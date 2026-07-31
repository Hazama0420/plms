// app/(dashboard)/crm/leads/[id]/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Clock,
  MessageCircle,
  PhoneCall,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  Tag,
  Users,
  MessageSquare,
  Download,
  Calculator,
  Sparkles,
  Lock,
  Copy,
  Send,
  RefreshCw,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";

import { crmService, type LeadWithRelations } from "@/services/crm.service";
import { supabase } from "@/lib/supabase/client";
import type { LeadStatus } from "@/types/crm.types";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
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

// ============================================================
// TYPES & CONFIG
// ============================================================
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
  new: { className: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-400" },
  contacted: { className: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-400" },
  qualified: { className: "bg-green-100 text-green-700 border-green-200 dark:bg-green-950/60 dark:text-green-400" },
  negotiation: { className: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-400" },
  proposal: { className: "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-400" },
  won: { className: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400" },
  lost: { className: "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-400" },
};

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  created: <Plus className="h-4 w-4 text-blue-500" />,
  status_change: <Tag className="h-4 w-4 text-purple-500" />,
  followup_scheduled: <Calendar className="h-4 w-4 text-amber-500" />,
  followup_completed: <CheckCircle className="h-4 w-4 text-green-500" />,
  note: <MessageSquare className="h-4 w-4 text-slate-500" />,
  call: <PhoneCall className="h-4 w-4 text-emerald-500" />,
  meeting: <Users className="h-4 w-4 text-indigo-500" />,
};

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function LeadDetailPage() {
  const router = useRouter();
  const params = useParams();
  const leadId = params.id as string;

  // State User Login & Role
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string>("");

  // State Utama
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

  // Dialog Visibility States
  const [showAddFollowup, setShowAddFollowup] = useState(false);
  const [showAddNote, setShowAddNote] = useState(false);
  const [showAddInterest, setShowAddInterest] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // AI Writer Modal States
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiGeneratedMessage, setAiGeneratedMessage] = useState("");
  const [generatingAi, setGeneratingAi] = useState(false);

  // Form States
  const [newFollowup, setNewFollowup] = useState({ followup_date: "", notes: "", assigned_to: "" });
  const [newNote, setNewNote] = useState("");
  const [newInterest, setNewInterest] = useState({ property_id: "", interest_level: "high", notes: "" });

  // ===== FETCH USER SESSION & ROLE =====
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

  const isAdminOrSuperAdmin =
    currentUserRole === "super_admin" ||
    currentUserRole === "superadmin" ||
    currentUserRole === "admin";

  // ===== FETCH DATA DENGAN TABEL CRM_INTERESTS =====
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const leadData = await crmService.getLeadById(leadId);
      setLead(leadData);

      // Fetch Minat Properti Langsung dari Tabel `crm_interests`
      const { data: interestsData, error: intErr } = await supabase
        .from("crm_interests")
        .select(`
          id,
          interest_level,
          notes,
          priority,
          created_at,
          property:properties (
            id,
            title,
            listing_code,
            price
          )
        `)
        .eq("lead_id", leadId);

      if (!intErr) {
        setInterestsList(interestsData || []);
      }

      const activitiesData = await crmService.getActivities(leadId);
      setActivities(activitiesData || []);
      setFilteredActivities(activitiesData || []);

      const followupsData = await crmService.getFollowups({ lead_id: leadId, limit: 50 });
      setFollowups(followupsData.data || []);

      const props = await crmService.getPropertiesForLead();
      setProperties(props || []);
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

  // ===== LOGIKA HAK AKSES MODIFIKASI =====
  const isOwner =
    (lead as any)?.created_by === currentUserId ||
    (lead as any)?.user_id === currentUserId ||
    lead?.assigned_to === currentUserId;

  const canModify = isAdminOrSuperAdmin || isOwner;

  // ===== FILTER ACTIVITIES =====
  useEffect(() => {
    if (activityFilter === "all") {
      setFilteredActivities(activities);
    } else {
      setFilteredActivities(activities.filter((a) => a.activity_type === activityFilter));
    }
  }, [activityFilter, activities]);

  // ===== DIRECT WHATSAPP HELPER =====
  const openWhatsApp = (phone?: string, customText?: string) => {
    if (!phone) {
      toast.error("Nomor WhatsApp tidak tersedia");
      return;
    }
    const cleanPhone = phone.replace(/[^0-9]/g, "").replace(/^0/, "62");
    const defaultText = `Halo Bpk/Ibu ${lead?.contact?.full_name || ""}, perkenalkan saya dari Inland Property...`;
    const text = customText ? encodeURIComponent(customText) : encodeURIComponent(defaultText);
    window.open(`https://wa.me/${cleanPhone}?text=${text}`, "_blank");
  };

  // ===== 🔒 AI WRITER FOLLOW-UP HANDLER =====
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
        toast.error(json?.error || "Gagal membuat pesan AI.");
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

  // ===== ACTION HANDLERS =====
  const handleOpenKprCalculator = () => {
    if (!lead) return;
    const clientName = lead.contact?.full_name || "Klien CRM";
    let url = `/kpr-calculator?client_name=${encodeURIComponent(clientName)}`;
    if (interestsList.length > 0 && interestsList[0]?.property?.id) {
      url += `&property_id=${interestsList[0].property.id}`;
    }
    router.push(url);
  };

  const handleUpdateStatus = async (status: LeadStatus) => {
    if (!lead) return;
    if (!canModify) {
      toast.error("Anda tidak memiliki hak akses untuk mengubah status lead ini.");
      return;
    }
    setSaving(true);
    try {
      await crmService.updateStatus(lead.id, status);
      toast.success("Status prospek berhasil diperbarui");
      fetchData();
    } catch (error) {
      toast.error("Gagal update status");
    } finally {
      setSaving(false);
    }
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

  // FIX TABEL CRM_INTERESTS
  const handleAddInterest = async () => {
    if (!lead || !newInterest.property_id) {
      toast.error("Pilih properti yang diminati");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("crm_interests").insert({
        lead_id: lead.id,
        property_id: newInterest.property_id,
        interest_level: newInterest.interest_level || "high",
        notes: newInterest.notes || null,
        priority: 1,
      });

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

  const handleDeleteLead = async () => {
    if (!lead) return;
    if (!canModify) {
      toast.error("Anda tidak memiliki akses untuk menghapus lead ini.");
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

  const handleExportLead = () => {
    if (!lead) return;
    const csvData = [
      ["Field", "Value"],
      ["Nama", lead.contact?.full_name || ""],
      ["Email", lead.contact?.email || ""],
      ["Telepon", lead.contact?.phone || ""],
      ["Budget", lead.budget ? lead.budget.toString() : ""],
      ["Status", lead.status],
    ];
    const blob = new Blob([csvData.map((r) => r.join(",")).join("\n")], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lead-${lead.contact?.full_name || lead.id}.csv`;
    a.click();
    toast.success("Data berhasil diekspor");
  };

  const getInitials = (name: string) => (name ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "U");
  const getStatusLabel = (status: LeadStatus) => STATUS_OPTIONS.find((s) => s.value === status)?.label || status;

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-96 w-full rounded-2xl" />
          <Skeleton className="h-96 lg:col-span-2 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center">
        <h2 className="text-xl font-bold">Lead Tidak Ditemukan</h2>
        <Button onClick={() => router.back()} className="mt-4 text-xs cursor-pointer">
          <ArrowLeft className="h-4 w-4 mr-2" /> Kembali
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16 max-w-7xl mx-auto">
      {/* HEADER BAR */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="cursor-pointer">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
              {lead.contact?.full_name || "Tanpa Nama"}
              <Badge variant="secondary" className={cn("text-xs font-semibold", STATUS_BADGE_VARIANTS[lead.status]?.className)}>
                {getStatusLabel(lead.status)}
              </Badge>
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {lead.contact?.email || lead.contact?.phone || "Kontak belum lengkap"}
            </p>
          </div>
        </div>

        {/* HEADER ACTIONS */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* AI Writer Button dengan Status Role */}
          <Button
            onClick={handleOpenAiWriter}
            className={cn(
              "text-xs h-9 gap-1.5 shadow-xs cursor-pointer",
              isAdminOrSuperAdmin
                ? "bg-amber-600 hover:bg-amber-700 text-white"
                : "bg-slate-100 text-slate-400 hover:bg-slate-200"
            )}
            title={isAdminOrSuperAdmin ? "Draf Pesan AI WhatsApp" : "Khusus Super Admin & Admin"}
          >
            {isAdminOrSuperAdmin ? <Sparkles className="w-4 h-4 fill-amber-300" /> : <Lock className="w-4 h-4" />}
            AI Writer
          </Button>

          <Button
            onClick={handleOpenKprCalculator}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 gap-1.5 shadow-xs cursor-pointer"
          >
            <Calculator className="w-4 h-4" /> Simulasi KPR
          </Button>

          <Button variant="outline" size="sm" onClick={handleExportLead} className="text-xs h-9 cursor-pointer">
            <Download className="h-4 w-4 mr-1.5" /> Export
          </Button>

          {/* 🔒 HANYA DITAMPILKAN JIKA PEMBUAT / ASSIGNED / ADMIN */}
          {canModify && (
            <>
              <Button variant="outline" size="sm" onClick={() => router.push(`/crm/leads/${lead.id}/edit`)} className="text-xs h-9 cursor-pointer">
                <Edit className="h-4 w-4 mr-1.5" /> Edit
              </Button>
              <Button variant="destructive" size="sm" onClick={() => setShowDeleteDialog(true)} className="text-xs h-9 cursor-pointer">
                <Trash2 className="h-4 w-4 mr-1.5" /> Hapus
              </Button>
            </>
          )}
        </div>
      </div>

      {/* GRID KONTEN */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* KOLOM KIRI: PROFIL & INFO */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border shadow-xs">
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center">
                <Avatar className="h-20 w-20 ring-2 ring-emerald-500/20">
                  <AvatarFallback className="text-2xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold">
                    {getInitials(lead.contact?.full_name || "U")}
                  </AvatarFallback>
                </Avatar>
                <h3 className="text-base font-bold mt-3">{lead.contact?.full_name || "Tanpa Nama"}</h3>
                <p className="text-xs text-muted-foreground">{lead.contact?.occupation || "Pekerjaan belum diisi"}</p>
                <div className="flex items-center gap-1.5 mt-3 flex-wrap justify-center">
                  <Badge variant="outline" className="text-[10px]">{lead.source || "Sumber -"}</Badge>
                  <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                    {lead.interest_type || "Minat -"}
                  </Badge>
                </div>
              </div>

              <Separator className="my-4" />

              {/* Kontak Detail */}
              <div className="space-y-2.5 text-xs">
                {lead.contact?.phone && (
                  <div className="flex items-center gap-2.5">
                    <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="font-mono">{lead.contact.phone}</span>
                    <a href={`tel:${lead.contact.phone}`} className="ml-auto text-blue-500 p-1 hover:bg-blue-50 rounded-md">
                      <PhoneCall className="h-3.5 w-3.5" />
                    </a>
                  </div>
                )}
                {lead.contact?.phone && (
                  <div className="flex items-center gap-2.5">
                    <MessageCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span className="font-mono text-emerald-600 font-semibold">{lead.contact?.phone}</span>
<button
  type="button"
  onClick={() => openWhatsApp(lead.contact?.phone ?? undefined)}
  className="ml-auto text-emerald-600 p-1 hover:bg-emerald-50 rounded-md cursor-pointer"
  title="Kirim Pesan WhatsApp"
>
  <MessageSquare className="w-4 h-4" />
</button>
                  </div>
                )}
                {lead.contact?.email && (
                  <div className="flex items-center gap-2.5">
                    <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="truncate">{lead.contact.email}</span>
                  </div>
                )}
                {lead.contact?.city && (
                  <div className="flex items-center gap-2.5">
                    <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span>{lead.contact.city}</span>
                  </div>
                )}
              </div>

              <Separator className="my-4" />

              {/* Informasi Finansial & Status */}
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Budget</span>
                  <span className="font-mono font-bold text-emerald-600">
                    {lead.budget ? `Rp ${lead.budget.toLocaleString("id-ID")}` : "Belum Ditentukan"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Status Lead</span>
                  <Select
                    value={lead.status}
                    onValueChange={(val) => handleUpdateStatus(val as LeadStatus)}
                    disabled={saving || !canModify}
                  >
                    <SelectTrigger className="w-[130px] h-7 text-[11px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value} className="text-xs">
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* KOLOM KANAN: TABS (TIMELINE, FOLLOWUPS, INTERESTS) */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 h-10">
              <TabsTrigger value="timeline" className="text-xs font-medium">⏱️ Timeline ({filteredActivities.length})</TabsTrigger>
              <TabsTrigger value="followups" className="text-xs font-medium">📅 Follow-up ({followups.length})</TabsTrigger>
              <TabsTrigger value="interests" className="text-xs font-medium">🏠 Minat ({interestsList.length})</TabsTrigger>
            </TabsList>

            {/* TAB TIMELINE */}
            <TabsContent value="timeline" className="mt-4">
              <Card className="border shadow-xs">
                <CardHeader className="p-4 pb-2 border-b flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-bold">Riwayat Aktivitas</CardTitle>
                  <Select
                    value={activityFilter}
                    onValueChange={(val) => setActivityFilter(val || "all")}
                  >
                    <SelectTrigger className="w-[130px] h-7 text-xs">
                      <SelectValue placeholder="Filter Tipe" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs">Semua</SelectItem>
                      <SelectItem value="note" className="text-xs">Catatan</SelectItem>
                      <SelectItem value="call" className="text-xs">Telepon</SelectItem>
                    </SelectContent>
                  </Select>
                </CardHeader>
                <CardContent className="p-4">
                  {filteredActivities.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-8">Belum ada riwayat aktivitas.</p>
                  ) : (
                    <ScrollArea className="h-[400px] pr-4">
                      <div className="relative pl-6 border-l-2 border-muted space-y-6">
                        {filteredActivities.map((act) => (
                          <div key={act.id} className="relative">
                            <div className="absolute -left-[22px] p-1 rounded-full bg-background border-2 border-muted">
                              {ACTIVITY_ICONS[act.activity_type] || <Clock className="h-3.5 w-3.5" />}
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs font-medium leading-relaxed">{act.notes}</p>
                              <span className="text-[10px] text-muted-foreground">
                                {formatDistanceToNow(new Date(act.created_at), { addSuffix: true, locale: id })}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                  <Button variant="outline" className="w-full mt-4 text-xs h-9 gap-1.5 cursor-pointer" onClick={() => setShowAddNote(true)}>
                    <Plus className="h-3.5 w-3.5" /> Tambah Catatan Aktivitas
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB FOLLOW-UPS */}
            <TabsContent value="followups" className="mt-4">
              <Card className="border shadow-xs">
                <CardHeader className="p-4 pb-2 border-b">
                  <CardTitle className="text-sm font-bold">Agenda Follow-up</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  {followups.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-8">Belum ada agenda follow-up.</p>
                  ) : (
                    <div className="space-y-3">
                      {followups.map((f) => (
                        <div key={f.id} className="flex items-center justify-between p-3 rounded-xl border text-xs">
                          <div>
                            <Badge className="text-[10px] mb-1">{f.status}</Badge>
                            <p className="font-semibold">{format(new Date(f.followup_date), "dd MMM yyyy, HH:mm", { locale: id })}</p>
                            {f.notes && <p className="text-muted-foreground mt-0.5">{f.notes}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <Button variant="outline" className="w-full mt-4 text-xs h-9 gap-1.5 cursor-pointer" onClick={() => setShowAddFollowup(true)}>
                    <Plus className="h-3.5 w-3.5" /> Buat Follow-up Baru
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB INTERESTS (CRM_INTERESTS) */}
            <TabsContent value="interests" className="mt-4">
              <Card className="border shadow-xs">
                <CardHeader className="p-4 pb-2 border-b">
                  <CardTitle className="text-sm font-bold">Minat Properti</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  {interestsList.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-8">Belum ada properti terpilih.</p>
                  ) : (
                    <div className="space-y-3">
                      {interestsList.map((i: any) => (
                        <div key={i.id} className="p-3 rounded-xl border text-xs flex justify-between items-center">
                          <div>
                            <p className="font-bold text-slate-900 dark:text-slate-100">{i.property?.title || "Properti Pilihan"}</p>
                            <p className="text-muted-foreground">Kode Listing: {i.property?.listing_code || "-"}</p>
                            {i.notes && <p className="text-[11px] text-slate-500 mt-1">{i.notes}</p>}
                          </div>
                          <Badge variant="outline" className="text-[10px] uppercase font-mono">
                            {i.interest_level || "HIGH"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                  <Button variant="outline" className="w-full mt-4 text-xs h-9 gap-1.5 cursor-pointer" onClick={() => setShowAddInterest(true)}>
                    <Plus className="h-3.5 w-3.5" /> Tambah Minat Properti
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* 🤖 DIALOG MODAL AI WRITER FOLLOW-UP */}
      <Dialog open={aiModalOpen} onOpenChange={setAiModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500" /> AI Writer Follow-Up
              </DialogTitle>
              <Badge
                variant="outline"
                className={
                  isAdminOrSuperAdmin
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]"
                    : "bg-amber-50 text-amber-700 border-amber-200 text-[10px]"
                }
              >
                {isAdminOrSuperAdmin ? "Admin Access" : "Khusus Admin"}
              </Badge>
            </div>
            <DialogDescription className="text-xs">
              Draf pesan WhatsApp ramah & persuasif untuk <span className="font-semibold text-slate-800 dark:text-slate-200">{lead.contact?.full_name}</span>.
            </DialogDescription>
          </DialogHeader>

          {!isAdminOrSuperAdmin ? (
            <div className="py-8 text-center space-y-3">
              <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto">
                <Lock className="w-6 h-6" />
              </div>
              <div className="space-y-1 max-w-xs mx-auto">
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Akses Terkunci
                </h4>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Fitur AI Writer Follow-Up khusus digunakan oleh **Super Admin** dan **Admin**.
                </p>
              </div>
            </div>
          ) : generatingAi ? (
            <div className="p-8 text-center space-y-2">
              <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
              <p className="text-xs text-muted-foreground">AI sedang menyusun draf pesan follow-up...</p>
            </div>
          ) : (
            <div className="space-y-3 py-2 text-xs">
              <Textarea
                value={aiGeneratedMessage}
                onChange={(e) => setAiGeneratedMessage(e.target.value)}
                rows={6}
                className="text-xs leading-relaxed font-mono bg-muted/30 resize-none focus-visible:ring-emerald-600"
              />
            </div>
          )}

          <DialogFooter className="gap-2">
            {isAdminOrSuperAdmin ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(aiGeneratedMessage);
                    toast.success("Pesan berhasil disalin ke clipboard!");
                  }}
                  className="text-xs gap-1.5 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" /> Salin Pesan
                </Button>

                <Button
                  size="sm"
                  onClick={() => {
  openWhatsApp(lead.contact?.phone ?? undefined, aiGeneratedMessage ?? undefined);
  setAiModalOpen(false);
}}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" /> Kirim ke WhatsApp
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAiModalOpen(false)}
                className="w-full text-xs cursor-pointer"
              >
                Tutup
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG TAMBAH FOLLOWUP */}
      <Dialog open={showAddFollowup} onOpenChange={setShowAddFollowup}>
        <DialogContent className="sm:max-w-md rounded-2xl text-xs">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">Jadwalkan Follow-up</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input
              type="datetime-local"
              className="h-9 text-xs"
              value={newFollowup.followup_date}
              onChange={(e) => setNewFollowup({ ...newFollowup, followup_date: e.target.value })}
            />
            <Textarea
              placeholder="Catatan follow-up..."
              className="text-xs resize-none"
              value={newFollowup.notes}
              onChange={(e) => setNewFollowup({ ...newFollowup, notes: e.target.value })}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button size="sm" onClick={handleAddFollowup} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs cursor-pointer">
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG TAMBAH CATATAN */}
      <Dialog open={showAddNote} onOpenChange={setShowAddNote}>
        <DialogContent className="sm:max-w-md rounded-2xl text-xs">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">Tambah Catatan</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Tulis catatan..."
            className="text-xs resize-none"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button size="sm" onClick={handleAddNote} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs cursor-pointer">
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG TAMBAH MINAT */}
      <Dialog open={showAddInterest} onOpenChange={setShowAddInterest}>
        <DialogContent className="sm:max-w-md rounded-2xl text-xs">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">Tambah Minat Properti</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Select
              value={newInterest.property_id}
              onValueChange={(val) => setNewInterest({ ...newInterest, property_id: val || "" })}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Pilih properti" />
              </SelectTrigger>
              <SelectContent>
                {properties.map((p) => (
                  <SelectItem key={p.id} value={p.id} className="text-xs">
                    {p.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={newInterest.interest_level}
              onValueChange={(val) => setNewInterest({ ...newInterest, interest_level: val || "high" })}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Level minat" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high" className="text-xs">Tinggi</SelectItem>
                <SelectItem value="medium" className="text-xs">Sedang</SelectItem>
                <SelectItem value="low" className="text-xs">Rendah</SelectItem>
              </SelectContent>
            </Select>

            <Textarea
              placeholder="Catatan tambahan..."
              className="text-xs resize-none"
              value={newInterest.notes}
              onChange={(e) => setNewInterest({ ...newInterest, notes: e.target.value })}
              rows={2}
            />
          </div>
          <DialogFooter>
            <Button size="sm" onClick={handleAddInterest} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs cursor-pointer">
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG HAPUS */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md rounded-2xl text-xs">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-rose-600">Hapus Lead?</DialogTitle>
            <DialogDescription className="text-xs">Tindakan ini permanen dan tidak dapat dibatalkan.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="destructive" size="sm" onClick={handleDeleteLead} disabled={saving} className="text-xs cursor-pointer">
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}