// app/(dashboard)/crm/followups/[id]/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  User,
  MessageSquare,
  Loader2,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  MessageCircle,
  AlertCircle,
  ExternalLink,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import { format, isBefore, isToday } from "date-fns";
import { id } from "date-fns/locale";

import { crmService } from "@/services/crm.service";
import { supabase } from "@/lib/supabase/client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
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
import { cn } from "@/lib/utils";

// ===== STATUS CONFIG =====
const statusConfig: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  pending: {
    label: "Pending",
    color: "text-amber-700 dark:text-amber-300",
    bg: "bg-amber-100 dark:bg-amber-950/60 border-amber-200",
    icon: <Clock className="w-4 h-4 text-amber-600" />,
  },
  completed: {
    label: "Selesai",
    color: "text-emerald-700 dark:text-emerald-300",
    bg: "bg-emerald-100 dark:bg-emerald-950/60 border-emerald-200",
    icon: <CheckCircle className="w-4 h-4 text-emerald-600" />,
  },
  cancelled: {
    label: "Dibatalkan",
    color: "text-slate-700 dark:text-slate-300",
    bg: "bg-slate-100 dark:bg-slate-800 border-slate-200",
    icon: <XCircle className="w-4 h-4 text-slate-500" />,
  },
};

export default function FollowupDetailPage() {
  const router = useRouter();
  const params = useParams();
  const followupId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [followup, setFollowup] = useState<any>(null);

  // User Session & Role
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string>("");

  // Modals
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Edit Form State
  const [editForm, setEditForm] = useState({
    status: "pending",
    followup_date: "",
    notes: "",
  });

  // Check RBAC Permissions
  const isAdmin =
    currentUserRole === "admin" ||
    currentUserRole === "super_admin" ||
    currentUserRole === "superadmin";

  const canModify = isAdmin || followup?.assigned_to === currentUserId || followup?.created_by === currentUserId;

  // 🔒 HELPER SENSOR NOMOR HP UNTUK AGENT
  const formatPhoneForUser = useCallback((phone?: string) => {
    if (!phone) return "";
    if (isAdmin) return phone;
    if (phone.length <= 4) return "xxxxxx";
    return phone.slice(0, 4) + "xxxxxx";
  }, [isAdmin]);

  // ===== FETCH DATA =====
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Get Logged in User
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        const { data: userData } = await supabase
          .from("users")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();

        const role = (userData?.role || user.user_metadata?.role || "agent").toLowerCase();
        setCurrentUserRole(role);
      }

      // 2. Fetch Detail Follow-up
      const data = await crmService.getFollowupById(followupId);
      setFollowup(data);

      if (data) {
        const isoLocal = data.followup_date
          ? new Date(new Date(data.followup_date).getTime() - new Date().getTimezoneOffset() * 60000)
              .toISOString()
              .slice(0, 16)
          : "";

        setEditForm({
          status: data.status || "pending",
          followup_date: isoLocal,
          notes: data.notes || "",
        });
      }
    } catch (error) {
      console.error("Error fetching followup detail:", error);
      toast.error("Gagal memuat detail follow-up");
    } finally {
      setLoading(false);
    }
  }, [followupId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ===== HANDLER UPDATE STATUS + CRM ACTIVITY LOG =====
  const handleUpdateStatus = async (status: "pending" | "completed" | "cancelled") => {
    if (!canModify) {
      toast.error("Akses ditolak: Anda tidak memiliki wewenang mengubah data ini.");
      return;
    }

    setSaving(true);
    try {
      await crmService.updateFollowup(followupId, { status });

      // 🔴 Sisipkan pencatatan log aktivitas ke crm_activities
      const leadId = followup?.lead_id;
      const leadName = followup?.lead?.contact?.full_name || followup?.lead?.full_name || "Klien";
      const statusLabel = statusConfig[status]?.label || status;

      if (currentUserId && leadId) {
        await supabase.from("crm_activities").insert([
          {
            lead_id: leadId,
            user_id: currentUserId,
            activity_type: "Status Update",
            notes: `Status follow-up untuk ${leadName} diperbarui menjadi: ${statusLabel}`,
            created_at: new Date().toISOString(),
          },
        ]);
      }

      toast.success(`Status berhasil diperbarui menjadi ${statusLabel}`);
      await fetchData();
    } catch (error: any) {
      console.error("Error updating status:", error);
      toast.error("Gagal update status: " + (error.message || "Terjadi kesalahan"));
    } finally {
      setSaving(false);
    }
  };

  // ===== HANDLER UPDATE DETAIL (TANGGAL & CATATAN) =====
  const handleSaveEdit = async () => {
    if (!canModify) {
      toast.error("Akses ditolak: Anda tidak memiliki wewenang mengubah data ini.");
      return;
    }

    setSaving(true);
    try {
      await crmService.updateFollowup(followupId, {
        status: (editForm.status as "pending" | "completed" | "cancelled") || "pending",
        followup_date: editForm.followup_date || new Date().toISOString(),
        notes: editForm.notes || undefined,
      });

      // Catat log aktivitas edit agenda
      const leadId = followup?.lead_id;
      if (currentUserId && leadId) {
        await supabase.from("crm_activities").insert([
          {
            lead_id: leadId,
            user_id: currentUserId,
            activity_type: "Edit Follow-up",
            notes: `Detail jadwal/catatan follow-up diperbarui.`,
            created_at: new Date().toISOString(),
          },
        ]);
      }

      toast.success("Follow-up berhasil diperbarui!");
      setShowEditDialog(false);
      await fetchData();
    } catch (error: any) {
      console.error("Gagal memperbarui follow-up:", error);
      toast.error(error.message || "Terjadi kesalahan saat menyimpan perubahan.");
    } finally {
      setSaving(false);
    }
  };

  // ===== HANDLER DELETE (Hanya untuk Admin) =====
  const handleDelete = async () => {
    if (!isAdmin) {
      toast.error("Akses ditolak: Hanya Admin yang dapat menghapus agenda.");
      return;
    }

    setSaving(true);
    try {
      await crmService.deleteFollowup(followupId);
      toast.success("Follow-up berhasil dihapus");
      router.push("/crm/followups");
      router.refresh();
    } catch (error: any) {
      console.error("Error deleting followup:", error);
      toast.error("Gagal menghapus follow-up: " + (error.message || "Terjadi kesalahan"));
    } finally {
      setSaving(false);
    }
  };

  // ===== DIRECT WHATSAPP LINK + CRM ACTIVITY LOGGING =====
  const handleOpenWhatsApp = async () => {
    const contactPhone = followup?.lead?.contact?.phone || followup?.lead?.phone;
    if (!contactPhone) {
      toast.error("Nomor WhatsApp lead tidak tersedia");
      return;
    }

    const leadName = followup?.lead?.contact?.full_name || followup?.lead?.full_name || "Bpk/Ibu";
    const leadId = followup?.lead_id;

    // 🔴 Catat log aktivitas ke crm_activities
    if (currentUserId && leadId) {
      try {
        await supabase.from("crm_activities").insert([
          {
            lead_id: leadId,
            user_id: currentUserId,
            activity_type: "WhatsApp Chat",
            notes: `Follow-up WA dikirim ke ${leadName} dari halaman Detail`,
            created_at: new Date().toISOString(),
          },
        ]);
      } catch (err) {
        console.error("Gagal mencatat log aktivitas WA:", err);
      }
    }

    let cleanPhone = contactPhone.replace(/[^0-9]/g, "");
    if (cleanPhone.startsWith("0")) cleanPhone = "62" + cleanPhone.slice(1);
    const msg = encodeURIComponent(
      `Halo Bpk/Ibu *${leadName}*,\n\nSalam hangat dari Inland Property. Menindaklanjuti jadwal diskusi kita:\n\n"${followup?.notes || "Prospek unit properti"}"\n\nApakah ada waktu luang untuk berdiskusi lebih lanjut hari ini? Terima kasih!`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${msg}`, "_blank");
  };

  const getInitials = (name: string) => {
    if (!name) return "L";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="space-y-4 max-w-3xl mx-auto pb-12 px-3">
        <Skeleton className="h-8 w-40 rounded-lg" />
        <Card className="p-4 space-y-3">
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-32 w-full rounded-lg" />
        </Card>
      </div>
    );
  }

  if (!followup) {
    return (
      <div className="flex h-72 flex-col items-center justify-center gap-2 text-center px-4">
        <div className="p-3 bg-muted rounded-full">
          <Calendar className="w-8 h-8 text-muted-foreground" />
        </div>
        <p className="text-sm font-bold text-foreground">Agenda Follow-up Tidak Ditemukan</p>
        <p className="text-xs text-muted-foreground max-w-xs">
          Data mungkin telah dihapus atau Anda tidak memiliki akses untuk melihat agenda ini.
        </p>
        <Button onClick={() => router.push("/crm/followups")} size="sm" className="mt-2 bg-emerald-600 hover:bg-emerald-700 text-xs h-8">
          <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Kembali ke Daftar Follow-up
        </Button>
      </div>
    );
  }

  const dateObj = followup.followup_date ? new Date(followup.followup_date) : null;
  const isOverdue =
    followup.status === "pending" &&
    dateObj &&
    isBefore(dateObj, new Date()) &&
    !isToday(dateObj);

  const contactData = followup.lead?.contact || followup.lead?.crm_contacts || {};
  const leadName = contactData.full_name || followup.lead?.full_name || followup.lead?.name || "Prospek Lead";
  const leadPhone = contactData.phone || followup.lead?.phone || followup.lead?.contact_phone || "";
  const leadEmail = contactData.email || followup.lead?.email || "";

  return (
    <div className="max-w-3xl mx-auto space-y-4 pb-12 px-3 sm:px-4">
      {/* 1. HEADER UTAMA (COMPACT & CLEAN) */}
      <div className="flex items-center justify-between border-b pb-3 gap-2">
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push("/crm/followups")}
            className="h-8 w-8 rounded-lg shrink-0"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </Button>
          <div>
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-foreground flex items-center gap-1.5">
              📅 Detail Agenda Follow-up
            </h1>
            <p className="text-[11px] text-muted-foreground leading-none mt-0.5">
              Klien: <span className="font-semibold text-foreground">{leadName}</span>
            </p>
          </div>
        </div>

        {/* AKSI TOMBOL */}
        <div className="flex items-center gap-1.5 shrink-0">
          {leadPhone && (
            <Button
              size="sm"
              onClick={handleOpenWhatsApp}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1 h-8 px-2.5 shadow-xs"
            >
              <MessageCircle className="w-3.5 h-3.5 fill-white" /> Chat WA
            </Button>
          )}

          {canModify && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowEditDialog(true)}
              className="text-xs h-8 gap-1 px-2.5"
            >
              <Edit className="w-3 h-3" /> Edit
            </Button>
          )}

          {/* 🔒 TOMBOL HAPUS HANYA UNTUK ADMIN */}
          {isAdmin && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
              className="text-xs h-8 gap-1 px-2.5"
            >
              <Trash2 className="w-3 h-3" /> Hapus
            </Button>
          )}
        </div>
      </div>

      {/* 2. CARD RINGKASAN STATUS */}
      <Card className="border shadow-2xs bg-card">
        <CardContent className="p-3.5 sm:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "p-2.5 rounded-xl border flex items-center justify-center shrink-0",
                  isOverdue
                    ? "bg-rose-100 dark:bg-rose-950/60 border-rose-300 text-rose-600"
                    : statusConfig[followup.status]?.bg
                )}
              >
                {isOverdue ? <AlertCircle className="w-4 h-4 text-rose-600" /> : statusConfig[followup.status]?.icon}
              </div>

              <div>
                <span className="text-[10px] font-semibold text-muted-foreground block uppercase tracking-wider">
                  Status Saat Ini
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] font-bold px-2 py-0.2 border",
                      isOverdue
                        ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border-rose-200"
                        : statusConfig[followup.status]?.bg,
                      isOverdue ? "" : statusConfig[followup.status]?.color
                    )}
                  >
                    {isOverdue ? "Overdue" : statusConfig[followup.status]?.label || followup.status}
                  </Badge>
                  {isOverdue && (
                    <span className="text-[10px] font-medium text-rose-600">⚠️ Melewati batas target</span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Status Switcher */}
            {canModify && (
              <div className="flex items-center gap-2 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-border/50">
                <Label className="text-[11px] text-muted-foreground whitespace-nowrap">Ubah Status:</Label>
                <Select
                  value={followup.status}
                  onValueChange={(val) => handleUpdateStatus(val as any)}
                  disabled={saving}
                >
                  <SelectTrigger className="w-[130px] h-8 text-xs bg-background">
                    <SelectValue placeholder="Pilih status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending" className="text-xs">⏳ Pending</SelectItem>
                    <SelectItem value="completed" className="text-xs">✅ Selesai</SelectItem>
                    <SelectItem value="cancelled" className="text-xs">❌ Dibatalkan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 3. BENTO GRID: JADWAL & AGENT */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Jadwal Waktu */}
        <Card className="border shadow-2xs bg-card">
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-500" /> Waktu Target Follow-up
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 space-y-0.5">
            <p className="text-xs sm:text-sm font-bold font-mono text-foreground">
              {dateObj ? format(dateObj, "EEEE, dd MMM yyyy", { locale: id }) : "-"}
            </p>
            <p className="text-xs font-mono font-semibold text-emerald-600 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Pukul {dateObj ? format(dateObj, "HH:mm", { locale: id }) : "-"} WIB
            </p>
          </CardContent>
        </Card>

        {/* Agent In-Charge */}
        <Card className="border shadow-2xs bg-card">
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-blue-500" /> Penanggung Jawab
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="flex items-center gap-2.5">
              <Avatar className="h-7 w-7 border border-blue-200">
                <AvatarImage src={followup.assigned_user?.avatar_url || undefined} />
                <AvatarFallback className="bg-blue-50 text-blue-700 font-bold text-[10px]">
                  {getInitials(followup.assigned_user?.full_name || "Agent")}
                </AvatarFallback>
              </Avatar>
              <div className="truncate">
                <p className="text-xs font-bold text-foreground truncate">
                  {followup.assigned_user?.full_name || followup.assigned_to || "Belum Di-assign"}
                </p>
                <p className="text-[10px] text-muted-foreground font-mono truncate">
                  {followup.assigned_user?.email || "Tidak ada email"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 4. CARD PROFIL LEAD KLIEN (DENGAN SENSOR NO HP UNTUK AGENT) */}
      <Card className="border shadow-2xs bg-card overflow-hidden">
        <CardHeader className="bg-muted/30 border-b p-3 pb-2.5">
          <CardTitle className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-emerald-600" /> Informasi Profil Lead Klien
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border border-emerald-500/20">
                <AvatarFallback className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-xs">
                  {getInitials(leadName)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-bold text-xs sm:text-sm text-foreground">{leadName}</p>
                <div className="flex flex-wrap items-center gap-2.5 text-[11px] text-muted-foreground mt-0.5 font-mono">
                  {/* 🔒 NOMOR HP DISENSOR JIKA ROLE AGENT */}
                  {leadPhone && <span className="flex items-center gap-1">📞 {formatPhoneForUser(leadPhone)}</span>}
                  {leadEmail && <span className="flex items-center gap-1">✉️ {leadEmail}</span>}
                </div>
              </div>
            </div>

            {followup.lead_id && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/crm/leads/${followup.lead_id}`)}
                className="text-[11px] h-7 gap-1 shrink-0 px-2.5"
              >
                Detail Lead <ExternalLink className="w-3 h-3 ml-0.5" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 5. CARD CATATAN & PLAN ACTIVITY */}
      <Card className="border shadow-2xs bg-card">
        <CardHeader className="p-3 pb-2 border-b">
          <CardTitle className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-purple-500" /> Catatan & Rencana Aktivitas
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3.5">
          {followup.notes ? (
            <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed font-sans bg-muted/40 p-3 rounded-lg border border-border/50">
              {followup.notes}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground italic">
              Tidak ada catatan atau instruksi aktivitas khusus yang ditambahkan.
            </p>
          )}
        </CardContent>
      </Card>

      {/* MODAL DIALOG 1: EDIT AGENDA FOLLOW-UP */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              ✏️ Edit Agenda Follow-up
            </DialogTitle>
            <DialogDescription className="text-xs">
              Perbarui status, tanggal pengingat, atau catatan aktivitas follow-up ini.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-1 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-bold">Status Follow-up</Label>
              <Select
                value={editForm.status}
                onValueChange={(val) => setEditForm({ ...editForm, status: val || "pending" })}
              >
                <SelectTrigger className="h-8 text-xs bg-background">
                  <SelectValue placeholder="Pilih status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending" className="text-xs">⏳ Pending</SelectItem>
                  <SelectItem value="completed" className="text-xs">✅ Selesai</SelectItem>
                  <SelectItem value="cancelled" className="text-xs">❌ Dibatalkan</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Tanggal & Waktu Follow-up</Label>
              <Input
                type="datetime-local"
                value={editForm.followup_date}
                onChange={(e) => setEditForm({ ...editForm, followup_date: e.target.value })}
                className="h-8 text-xs font-mono"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Catatan Activity</Label>
              <Textarea
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                placeholder="Catatan rencana follow-up..."
                rows={3}
                className="text-xs leading-relaxed"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowEditDialog(false)}
              className="text-xs h-8"
            >
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={saving}
              onClick={handleSaveEdit}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 h-8"
            >
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
              Simpan Perubahan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL DIALOG 2: DELETE CONFIRMATION (HANYA UNTUK ADMIN) */}
      {isAdmin && (
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent className="sm:max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-rose-600 flex items-center gap-2">
                ⚠️ Konfirmasi Hapus Follow-up
              </DialogTitle>
              <DialogDescription className="text-xs">
                Apakah Anda yakin ingin menghapus agenda follow-up ini? Tindakan ini permanen dan tidak dapat dibatalkan.
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteDialog(false)}
                className="text-xs h-8"
              >
                Batal
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={saving}
                onClick={handleDelete}
                className="text-xs gap-1 h-8"
              >
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                Ya, Hapus
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}