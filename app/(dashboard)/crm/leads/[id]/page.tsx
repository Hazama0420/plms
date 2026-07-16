"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  Calendar,
  Clock,
  MessageCircle,
  PhoneCall,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Tag,
  Building2,
  Users,
  MessageSquare,
  Loader2,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";

import { crmService, type LeadWithRelations } from "@/services/crm.service";
import { usePermissions } from "@/hooks/use-permissions";
import type { LeadStatus, CRMContact } from "@/types/crm.types";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

// ============================================================
// TYPES
// ============================================================
interface Activity {
  id: string;
  lead_id: string;
  user_id: string;
  activity_type: string;
  notes: string;
  created_at: string;
  user?: {
    full_name: string;
  };
}

interface Followup {
  id: string;
  lead_id: string;
  assigned_to: string;
  followup_date: string;
  notes: string | null;
  status: "pending" | "completed" | "cancelled";
  completed_at: string | null;
  assigned_user?: {
    full_name: string;
  };
}

// ============================================================
// STATUS CONFIG (FIX: valid badge variants)
// ============================================================
const STATUS_OPTIONS: { value: LeadStatus; label: string; color: string }[] = [
  { value: "new", label: "Baru", color: "bg-blue-500" },
  { value: "contacted", label: "Dihubungi", color: "bg-amber-500" },
  { value: "qualified", label: "Kualifikasi", color: "bg-green-500" },
  { value: "negotiation", label: "Negosiasi", color: "bg-purple-500" },
  { value: "proposal", label: "Proposal", color: "bg-indigo-500" },
  { value: "won", label: "Menang", color: "bg-emerald-600" },
  { value: "lost", label: "Hilang", color: "bg-rose-500" },
];

// ✅ FIX: Gunakan varian yang valid (tanpa "success" dan "warning")
const STATUS_BADGE_VARIANTS: Record<
  LeadStatus,
  { variant: "default" | "secondary" | "destructive" | "outline"; className: string }
> = {
  new: { variant: "secondary", className: "bg-blue-100 text-blue-700 border-blue-200" },
  contacted: { variant: "secondary", className: "bg-amber-100 text-amber-700 border-amber-200" },
  qualified: { variant: "secondary", className: "bg-green-100 text-green-700 border-green-200" },
  negotiation: { variant: "secondary", className: "bg-purple-100 text-purple-700 border-purple-200" },
  proposal: { variant: "secondary", className: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  won: { variant: "secondary", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  lost: { variant: "secondary", className: "bg-rose-100 text-rose-700 border-rose-200" },
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
  const { userRole } = usePermissions();

  const [lead, setLead] = useState<LeadWithRelations | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [followups, setFollowups] = useState<Followup[]>([]);
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState<any[]>([]);

  // Tabs state (controlled)
  const [activeTab, setActiveTab] = useState("timeline");

  // Dialog states
  const [showAddFollowup, setShowAddFollowup] = useState(false);
  const [showAddNote, setShowAddNote] = useState(false);
  const [showAddInterest, setShowAddInterest] = useState(false);
  const [showEditLead, setShowEditLead] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form states
  const [newFollowup, setNewFollowup] = useState({
    followup_date: "",
    notes: "",
    assigned_to: "",
  });
  const [newNote, setNewNote] = useState("");
  const [newInterest, setNewInterest] = useState({
    property_id: "",
    interest_level: "",
    notes: "",
  });
  const [editLeadData, setEditLeadData] = useState({
    source: "",
    budget: "",
    interest_type: "",
    notes: "",
  });

  // ===== FETCH DATA =====
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const leadData = await crmService.getLeadById(leadId);
      setLead(leadData);

      const activitiesData = await crmService.getActivities(leadId);
      setActivities(activitiesData || []);

      const followupsData = await crmService.getFollowups({ lead_id: leadId, status: undefined, limit: 50 });
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

  // ===== HANDLERS =====
  const handleUpdateStatus = async (status: LeadStatus) => {
    if (!lead) return;
    setSaving(true);
    try {
      await crmService.updateStatus(lead.id, status);
      toast.success(`Status berhasil diubah menjadi ${STATUS_OPTIONS.find(s => s.value === status)?.label}`);
      fetchData();
    } catch (error) {
      toast.error("Gagal update status");
    } finally {
      setSaving(false);
    }
  };

  const handleAddFollowup = async () => {
    if (!lead) return;
    if (!newFollowup.followup_date) {
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
      toast.success("Follow-up berhasil ditambahkan");
      setShowAddFollowup(false);
      setNewFollowup({ followup_date: "", notes: "", assigned_to: "" });
      fetchData();
    } catch (error) {
      toast.error("Gagal menambahkan follow-up");
    } finally {
      setSaving(false);
    }
  };

  const handleAddNote = async () => {
    if (!lead) return;
    if (!newNote.trim()) {
      toast.error("Catatan wajib diisi");
      return;
    }

    setSaving(true);
    try {
      await crmService.logActivity({
        lead_id: lead.id,
        activity_type: "note",
        notes: newNote,
      });
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
    if (!lead) return;
    if (!newInterest.property_id) {
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
      toast.success("Interest berhasil ditambahkan");
      setShowAddInterest(false);
      setNewInterest({ property_id: "", interest_level: "", notes: "" });
      fetchData();
    } catch (error) {
      toast.error("Gagal menambahkan interest");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateFollowupStatus = async (followupId: string, status: "completed" | "cancelled") => {
    setSaving(true);
    try {
      await crmService.updateFollowup(followupId, { status });
      toast.success(`Follow-up ${status === "completed" ? "selesai" : "dibatalkan"}`);
      fetchData();
    } catch (error) {
      toast.error("Gagal update follow-up");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteFollowup = async (followupId: string) => {
    if (!confirm("Yakin ingin menghapus follow-up ini?")) return;
    setSaving(true);
    try {
      await crmService.deleteFollowup(followupId);
      toast.success("Follow-up berhasil dihapus");
      fetchData();
    } catch (error) {
      toast.error("Gagal hapus follow-up");
    } finally {
      setSaving(false);
    }
  };

  // ===== HELPERS =====
  const getStatusLabel = (status: LeadStatus) => {
    return STATUS_OPTIONS.find(s => s.value === status)?.label || status;
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (date: string) => {
    return format(new Date(date), "dd MMM yyyy, HH:mm", { locale: id });
  };

  const formatRelativeTime = (date: string) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: id });
  };

  // ============================================================
  // LOADING & ERROR
  // ============================================================
  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <Skeleton className="h-64 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl mt-4" />
          </div>
          <div className="lg:col-span-2">
            <Skeleton className="h-80 w-full rounded-xl" />
            <Skeleton className="h-64 w-full rounded-xl mt-4" />
          </div>
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center">
        <div className="text-6xl mb-4">🔍</div>
        <h2 className="text-2xl font-bold text-slate-700">Lead Tidak Ditemukan</h2>
        <p className="text-slate-500 mt-2">Lead yang Anda cari mungkin telah dihapus.</p>
        <Button onClick={() => router.back()} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Kembali
        </Button>
      </div>
    );
  }

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
              {lead.contact?.full_name || "Tanpa Nama"}
              <Badge
                variant={STATUS_BADGE_VARIANTS[lead.status].variant}
                className={STATUS_BADGE_VARIANTS[lead.status].className}
              >
                {getStatusLabel(lead.status)}
              </Badge>
            </h1>
            <p className="text-sm text-muted-foreground">
              {lead.contact?.email || lead.contact?.phone || "Tidak ada kontak"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setShowEditLead(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button variant="default" size="sm" onClick={() => setShowAddFollowup(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Follow-up
          </Button>
        </div>
      </div>

      {/* MAIN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN - Profile & Info */}
        <div className="lg:col-span-1 space-y-6">
          {/* Profile Card */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={undefined} />
                  <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                    {getInitials(lead.contact?.full_name || "U")}
                  </AvatarFallback>
                </Avatar>
                <h3 className="text-lg font-semibold mt-3">
                  {lead.contact?.full_name || "Tanpa Nama"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {lead.contact?.occupation || "Tidak ada pekerjaan"}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="text-xs">
                    {lead.source || "Sumber tidak diketahui"}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {lead.interest_type || "Tidak ada minat"}
                  </Badge>
                </div>
              </div>

              <Separator className="my-4" />

              {/* Kontak */}
              <div className="space-y-2 text-sm">
                {lead.contact?.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{lead.contact.phone}</span>
                    <a
                      href={`https://wa.me/${lead.contact.phone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto text-emerald-500 hover:text-emerald-600"
                    >
                      <MessageCircle className="h-4 w-4" />
                    </a>
                  </div>
                )}
                {lead.contact?.whatsapp && (
                  <div className="flex items-center gap-3">
                    <MessageCircle className="h-4 w-4 text-emerald-500" />
                    <span>{lead.contact.whatsapp}</span>
                    <a
                      href={`https://wa.me/${lead.contact.whatsapp.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto text-emerald-500 hover:text-emerald-600"
                    >
                      <MessageCircle className="h-4 w-4" />
                    </a>
                  </div>
                )}
                {lead.contact?.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate">{lead.contact.email}</span>
                    <a
                      href={`mailto:${lead.contact.email}`}
                      className="ml-auto text-blue-500 hover:text-blue-600"
                    >
                      <Mail className="h-4 w-4" />
                    </a>
                  </div>
                )}
                {lead.contact?.city && (
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{lead.contact.city}</span>
                  </div>
                )}
              </div>

              <Separator className="my-4" />

              {/* Lead Info */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Budget</span>
                  <span className="font-medium">
                    {lead.budget ? `Rp ${lead.budget.toLocaleString("id-ID")}` : "Tidak disebutkan"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tipe Minat</span>
                  <span className="font-medium">{lead.interest_type || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sumber</span>
                  <span className="font-medium">{lead.source || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Select
                    value={lead.status}
                    onValueChange={(val) => handleUpdateStatus(val as LeadStatus)}
                    disabled={saving}
                  >
                    <SelectTrigger className="w-[140px] h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <div className="flex items-center gap-2">
                            <span className={`h-2 w-2 rounded-full ${opt.color}`} />
                            {opt.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dibuat</span>
                  <span className="text-xs">{formatRelativeTime(lead.created_at)}</span>
                </div>
                {lead.assigned_user && (
                  <div className="flex items-center gap-2 mt-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={lead.assigned_user.avatar_url || undefined} />
                      <AvatarFallback className="text-[10px]">
                        {getInitials(lead.assigned_user.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-muted-foreground">
                      Assigned to: {lead.assigned_user.full_name}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Aksi Cepat</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start" onClick={() => setShowAddFollowup(true)}>
                <Calendar className="h-4 w-4 mr-2" />
                Jadwalkan Follow-up
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => setShowAddNote(true)}>
                <MessageSquare className="h-4 w-4 mr-2" />
                Tambah Catatan
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => setShowAddInterest(true)}>
                <Building2 className="h-4 w-4 mr-2" />
                Tambah Minat Properti
              </Button>
              {lead.contact?.phone && (
                <a
                  href={`https://wa.me/${lead.contact.phone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full"
                >
                  <Button variant="default" className="w-full bg-emerald-500 hover:bg-emerald-600">
                    <MessageCircle className="h-4 w-4 mr-2" />
                    WhatsApp
                  </Button>
                </a>
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN - Timeline & Followups */}
        <div className="lg:col-span-2 space-y-6">
          {/* ✅ FIX: Tabs controlled */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="timeline">⏱️ Timeline</TabsTrigger>
              <TabsTrigger value="followups">📅 Follow-up ({followups.length})</TabsTrigger>
              <TabsTrigger value="interests">🏠 Minat ({lead.interests?.length || 0})</TabsTrigger>
            </TabsList>

            {/* ===== TIMELINE TAB ===== */}
            <TabsContent value="timeline" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Riwayat Aktivitas</CardTitle>
                  <CardDescription>Semua interaksi dengan lead ini</CardDescription>
                </CardHeader>
                <CardContent>
                  {activities.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Belum ada aktivitas. Mulai dengan menambahkan catatan atau follow-up.
                    </p>
                  ) : (
                    <ScrollArea className="h-[500px] pr-4">
                      <div className="relative pl-6 border-l-2 border-muted space-y-6">
                        {activities.map((activity) => (
                          <div key={activity.id} className="relative">
                            <div className="absolute -left-[22px] p-1 rounded-full bg-background border-2 border-muted">
                              {ACTIVITY_ICONS[activity.activity_type] || <Clock className="h-4 w-4 text-muted-foreground" />}
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-start justify-between gap-4">
                                <p className="text-sm font-medium">{activity.notes || activity.activity_type}</p>
                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                  {formatRelativeTime(activity.created_at)}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span className="capitalize">{activity.activity_type.replace(/_/g, " ")}</span>
                                {activity.user?.full_name && (
                                  <>
                                    <span>·</span>
                                    <span>{activity.user.full_name}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                  <Button variant="outline" className="w-full mt-4" onClick={() => setShowAddNote(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Tambah Aktivitas
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ===== FOLLOWUPS TAB ===== */}
            <TabsContent value="followups" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Daftar Follow-up</CardTitle>
                  <CardDescription>Jadwal dan riwayat follow-up</CardDescription>
                </CardHeader>
                <CardContent>
                  {followups.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Belum ada follow-up. Buat jadwal follow-up sekarang.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {followups.map((followup) => (
                        <div
                          key={followup.id}
                          className="flex items-start justify-between p-3 rounded-lg border bg-card/50 hover:bg-card transition"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={
                                  followup.status === "completed"
                                    ? "success"
                                    : followup.status === "cancelled"
                                    ? "destructive"
                                    : "warning"
                                }
                                className="text-xs"
                              >
                                {followup.status === "pending"
                                  ? "⏳ Pending"
                                  : followup.status === "completed"
                                  ? "✅ Selesai"
                                  : "❌ Dibatalkan"}
                              </Badge>
                              <span className="text-sm font-medium">{formatDate(followup.followup_date)}</span>
                            </div>
                            {followup.notes && <p className="text-sm text-muted-foreground">{followup.notes}</p>}
                            {followup.assigned_user && (
                              <p className="text-xs text-muted-foreground">
                                Assigned: {followup.assigned_user.full_name}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            {followup.status === "pending" && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-green-500 hover:text-green-600"
                                  onClick={() => handleUpdateFollowupStatus(followup.id, "completed")}
                                  disabled={saving}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-rose-500 hover:text-rose-600"
                                  onClick={() => handleUpdateFollowupStatus(followup.id, "cancelled")}
                                  disabled={saving}
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => handleDeleteFollowup(followup.id)}
                              disabled={saving}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <Button variant="outline" className="w-full mt-4" onClick={() => setShowAddFollowup(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Tambah Follow-up
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ===== INTERESTS TAB ===== */}
            <TabsContent value="interests" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Properti yang Diminati</CardTitle>
                  <CardDescription>Daftar properti yang diminati lead ini</CardDescription>
                </CardHeader>
                <CardContent>
                  {lead.interests?.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Belum ada properti yang diminati.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {lead.interests?.map((interest) => (
                        <div
                          key={interest.id}
                          className="flex items-center justify-between p-3 rounded-lg border"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">
                                {interest.property?.title || "Properti tidak ditemukan"}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span>{interest.property?.listing_code}</span>
                              {interest.interest_level && (
                                <Badge variant="outline" className="text-xs">
                                  Level: {interest.interest_level}
                                </Badge>
                              )}
                              {interest.property?.price?.selling_price && (
                                <span>
                                  Rp {interest.property.price.selling_price.toLocaleString("id-ID")}
                                </span>
                              )}
                            </div>
                            {interest.notes && <p className="text-sm text-muted-foreground">{interest.notes}</p>}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={async () => {
                              if (confirm("Hapus interest ini?")) {
                                await crmService.removeInterest(interest.id);
                                fetchData();
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  <Button variant="outline" className="w-full mt-4" onClick={() => setShowAddInterest(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Tambah Minat Properti
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* ===== DIALOGS ===== */}

      {/* Add Followup Dialog */}
      <Dialog open={showAddFollowup} onOpenChange={setShowAddFollowup}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Jadwalkan Follow-up</DialogTitle>
            <DialogDescription>Buat jadwal follow-up untuk lead ini</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tanggal & Waktu</Label>
              <Input
                type="datetime-local"
                value={newFollowup.followup_date}
                onChange={(e) => setNewFollowup({ ...newFollowup, followup_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Catatan</Label>
              <Textarea
                placeholder="Catatan follow-up..."
                value={newFollowup.notes}
                onChange={(e) => setNewFollowup({ ...newFollowup, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddFollowup(false)}>Batal</Button>
            <Button onClick={handleAddFollowup} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Note Dialog */}
      <Dialog open={showAddNote} onOpenChange={setShowAddNote}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Catatan</DialogTitle>
            <DialogDescription>Tambahkan catatan atau aktivitas baru</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Catatan</Label>
              <Textarea
                placeholder="Tulis catatan..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddNote(false)}>Batal</Button>
            <Button onClick={handleAddNote} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Interest Dialog */}
      <Dialog open={showAddInterest} onOpenChange={setShowAddInterest}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Minat Properti</DialogTitle>
            <DialogDescription>Pilih properti yang diminati oleh lead</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Pilih Properti</Label>
              <Select
                value={newInterest.property_id}
                onValueChange={(val) => setNewInterest({ ...newInterest, property_id: val || "" })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih properti" />
                </SelectTrigger>
                <SelectContent>
                  {properties.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.title} ({p.listing_code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Level Minat</Label>
              <Select
                value={newInterest.interest_level}
                onValueChange={(val) => setNewInterest({ ...newInterest, interest_level: val || "" })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">Tinggi</SelectItem>
                  <SelectItem value="medium">Sedang</SelectItem>
                  <SelectItem value="low">Rendah</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Catatan</Label>
              <Textarea
                placeholder="Catatan tambahan..."
                value={newInterest.notes}
                onChange={(e) => setNewInterest({ ...newInterest, notes: e.target.value })}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddInterest(false)}>Batal</Button>
            <Button onClick={handleAddInterest} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Lead Dialog */}
      <Dialog open={showEditLead} onOpenChange={setShowEditLead}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Lead</DialogTitle>
            <DialogDescription>Update informasi lead</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Sumber</Label>
              <Input
                placeholder="Sumber lead..."
                value={editLeadData.source}
                onChange={(e) => setEditLeadData({ ...editLeadData, source: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Budget</Label>
              <Input
                type="number"
                placeholder="Budget..."
                value={editLeadData.budget}
                onChange={(e) => setEditLeadData({ ...editLeadData, budget: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Tipe Minat</Label>
              <Input
                placeholder="Tipe minat..."
                value={editLeadData.interest_type}
                onChange={(e) => setEditLeadData({ ...editLeadData, interest_type: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Catatan</Label>
              <Textarea
                placeholder="Catatan..."
                value={editLeadData.notes}
                onChange={(e) => setEditLeadData({ ...editLeadData, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditLead(false)}>Batal</Button>
            <Button
              onClick={async () => {
                if (!lead) return;
                setSaving(true);
                try {
                  await crmService.updateLead(lead.id, {
                    source: editLeadData.source || undefined,
                    budget: editLeadData.budget ? parseFloat(editLeadData.budget) : undefined,
                    interest_type: editLeadData.interest_type || undefined,
                    notes: editLeadData.notes || undefined,
                  });
                  toast.success("Lead berhasil diupdate");
                  setShowEditLead(false);
                  fetchData();
                } catch (error) {
                  toast.error("Gagal update lead");
                } finally {
                  setSaving(false);
                }
              }}
              disabled={saving}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}