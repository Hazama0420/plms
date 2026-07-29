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
  Loader2,
  Download,
  Calculator,
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
import { Label } from "@/components/ui/label";
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
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activityFilter, setActivityFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("timeline");

  // Dialog Visibility States
  const [showAddFollowup, setShowAddFollowup] = useState(false);
  const [showAddNote, setShowAddNote] = useState(false);
  const [showAddInterest, setShowAddInterest] = useState(false);
  const [showEditLead, setShowEditLead] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Form States
  const [newFollowup, setNewFollowup] = useState({ followup_date: "", notes: "", assigned_to: "" });
  const [newNote, setNewNote] = useState("");
  const [newInterest, setNewInterest] = useState({ property_id: "", interest_level: "", notes: "" });
  const [editLeadData, setEditLeadData] = useState({
    full_name: "",
    phone: "",
    whatsapp: "",
    email: "",
    occupation: "",
    city: "",
    source: "",
    budget: "",
    interest_type: "",
    notes: "",
  });

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

        const role = userData?.role || user.user_metadata?.role || "agent";
        setCurrentUserRole(role.toLowerCase());
      } catch (err) {
        console.error("Gagal memeriksa sesi pengguna:", err);
      }
    }
    checkUserSession();
  }, []);

  // ===== FETCH DATA =====
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const leadData = await crmService.getLeadById(leadId);
      setLead(leadData);

      if (leadData) {
        setEditLeadData({
          full_name: leadData.contact?.full_name || "",
          phone: leadData.contact?.phone || "",
          whatsapp: leadData.contact?.whatsapp || "",
          email: leadData.contact?.email || "",
          occupation: leadData.contact?.occupation || "",
          city: leadData.contact?.city || "",
          source: leadData.source || "",
          budget: leadData.budget ? String(leadData.budget) : "",
          interest_type: leadData.interest_type || "",
          notes: leadData.notes || "",
        });
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
  const isAdminOrSuperAdmin = currentUserRole === "super_admin" || currentUserRole === "admin";
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

  // ===== HANDLERS =====
  const handleOpenKprCalculator = () => {
    if (!lead) return;
    const clientName = lead.contact?.full_name || "Klien CRM";
    let url = `/kpr-calculator?client_name=${encodeURIComponent(clientName)}`;
    if (lead.interests && lead.interests.length > 0 && lead.interests[0].property_id) {
      url += `&property_id=${lead.interests[0].property_id}`;
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

  const handleAddInterest = async () => {
    if (!lead || !newInterest.property_id) {
      toast.error("Pilih properti yang diminati");
      return;
    }
    setSaving(true);
    try {
      await crmService.addInterest({
        lead_id: lead.id,
        property_id: newInterest.property_id,
        interest_level: newInterest.interest_level || undefined,
        notes: newInterest.notes || undefined,
      });
      toast.success("Minat properti berhasil ditambahkan");
      setShowAddInterest(false);
      setNewInterest({ property_id: "", interest_level: "", notes: "" });
      fetchData();
    } catch (error) {
      toast.error("Gagal menambahkan minat properti");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEditLead = async () => {
    if (!lead) return;
    if (!canModify) {
      toast.error("Anda tidak memiliki akses untuk mengedit lead ini.");
      return;
    }
    setSaving(true);
    try {
      await crmService.updateLead(lead.id, {
        source: editLeadData.source || undefined,
        budget: editLeadData.budget ? parseFloat(editLeadData.budget) : undefined,
        interest_type: editLeadData.interest_type || undefined,
        notes: editLeadData.notes || undefined,
      });

      if (lead.contact_id && crmService.updateContact) {
        await crmService.updateContact(lead.contact_id, {
          full_name: editLeadData.full_name,
          phone: editLeadData.phone,
          whatsapp: editLeadData.whatsapp,
          email: editLeadData.email,
          occupation: editLeadData.occupation,
          city: editLeadData.city,
        });
      }

      toast.success("Data prospek berhasil diperbarui");
      setShowEditLead(false);
      fetchData();
    } catch (error) {
      toast.error("Gagal memperbarui data lead");
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

  const getInitials = (name: string) => name ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "U";
  const getStatusLabel = (status: LeadStatus) => STATUS_OPTIONS.find((s) => s.value === status)?.label || status;

  // ============================================================
  // LOADING / EMPTY STATE
  // ============================================================
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
        <Button onClick={() => router.back()} className="mt-4 text-xs">
          <ArrowLeft className="h-4 w-4 mr-2" /> Kembali
        </Button>
      </div>
    );
  }

  // ============================================================
  // RENDER UTAMA
  // ============================================================
  return (
    <div className="space-y-6 pb-16 max-w-7xl mx-auto">
      {/* HEADER BAR */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
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
          <Button
            onClick={handleOpenKprCalculator}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 gap-1.5 shadow-sm"
          >
            <Calculator className="w-4 h-4" /> Simulasi KPR
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportLead} className="text-xs h-9">
            <Download className="h-4 w-4 mr-1.5" /> Export
          </Button>

          {/* 🔒 HANYA DITAMPILKAN JIKA PEMBUAT / ASSIGNED / ADMIN */}
          {canModify && (
            <>
              <Button variant="outline" size="sm" onClick={() => router.push(`/crm/leads/${lead.id}/edit`)} className="text-xs h-9">
                <Edit className="h-4 w-4 mr-1.5" /> Edit
              </Button>
              <Button variant="destructive" size="sm" onClick={() => setShowDeleteDialog(true)} className="text-xs h-9">
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
                {lead.contact?.whatsapp && (
                  <div className="flex items-center gap-2.5">
                    <MessageCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span className="font-mono text-emerald-600 font-semibold">{lead.contact.whatsapp}</span>
                    <a href={`https://wa.me/${lead.contact.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="ml-auto text-emerald-600 p-1 hover:bg-emerald-50 rounded-md">
                      <MessageCircle className="h-3.5 w-3.5" />
                    </a>
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
              <TabsTrigger value="interests" className="text-xs font-medium">🏠 Minat ({lead.interests?.length || 0})</TabsTrigger>
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
                  <Button variant="outline" className="w-full mt-4 text-xs h-9 gap-1.5" onClick={() => setShowAddNote(true)}>
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
                  <Button variant="outline" className="w-full mt-4 text-xs h-9 gap-1.5" onClick={() => setShowAddFollowup(true)}>
                    <Plus className="h-3.5 w-3.5" /> Buat Follow-up Baru
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB INTERESTS */}
            <TabsContent value="interests" className="mt-4">
              <Card className="border shadow-xs">
                <CardHeader className="p-4 pb-2 border-b">
                  <CardTitle className="text-sm font-bold">Minat Properti</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  {!lead.interests || lead.interests.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-8">Belum ada properti terpilih.</p>
                  ) : (
                    <div className="space-y-3">
                      {lead.interests.map((i: any) => (
                        <div key={i.id} className="p-3 rounded-xl border text-xs flex justify-between items-center">
                          <div>
                            <p className="font-bold">{i.property?.title || "Properti"}</p>
                            <p className="text-muted-foreground">Kode: {i.property?.listing_code || "-"}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <Button variant="outline" className="w-full mt-4 text-xs h-9 gap-1.5" onClick={() => setShowAddInterest(true)}>
                    <Plus className="h-3.5 w-3.5" /> Tambah Minat Properti
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

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
              className="text-xs"
              value={newFollowup.notes}
              onChange={(e) => setNewFollowup({ ...newFollowup, notes: e.target.value })}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button size="sm" onClick={handleAddFollowup} disabled={saving} className="bg-emerald-600 text-white text-xs">
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
            className="text-xs"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button size="sm" onClick={handleAddNote} disabled={saving} className="bg-emerald-600 text-white text-xs">
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
              onValueChange={(val) => setNewInterest({ ...newInterest, interest_level: val || "" })}
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
              className="text-xs"
              value={newInterest.notes}
              onChange={(e) => setNewInterest({ ...newInterest, notes: e.target.value })}
              rows={2}
            />
          </div>
          <DialogFooter>
            <Button size="sm" onClick={handleAddInterest} disabled={saving} className="bg-emerald-600 text-white text-xs">
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
            <Button variant="destructive" size="sm" onClick={handleDeleteLead} disabled={saving} className="text-xs">
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}