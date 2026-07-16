// app/(dashboard)/crm/followups/[id]/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Calendar, User, Phone, Mail, MessageSquare, Loader2, Edit, Trash2, CheckCircle, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";

import { crmService } from "@/services/crm.service";

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
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  pending: { label: "Pending", color: "text-amber-600", bg: "bg-amber-100", icon: <Clock size={18} /> },
  completed: { label: "Selesai", color: "text-emerald-600", bg: "bg-emerald-100", icon: <CheckCircle size={18} /> },
  cancelled: { label: "Dibatalkan", color: "text-rose-600", bg: "bg-rose-100", icon: <XCircle size={18} /> },
};

export default function FollowupDetailPage() {
  const router = useRouter();
  const params = useParams();
  const followupId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [followup, setFollowup] = useState<any>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editForm, setEditForm] = useState({
    status: "pending",
    notes: "",
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const data = await crmService.getFollowupById(followupId);
        setFollowup(data);
        setEditForm({
          status: data.status || "pending",
          notes: data.notes || "",
        });
      } catch (error) {
        console.error("Error fetching followup:", error);
        toast.error("Gagal memuat data follow-up");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [followupId]);

  const handleUpdateStatus = async (status: "pending" | "completed" | "cancelled") => {
    setSaving(true);
    try {
      await crmService.updateFollowup(followupId, { status });
      toast.success(`Status berhasil diperbarui`);
      const updated = await crmService.getFollowupById(followupId);
      setFollowup(updated);
      setEditForm({ ...editForm, status });
    } catch (error: any) {
      console.error("Error updating status:", error);
      toast.error("Gagal update status", {
        description: error.message || "Silakan coba lagi.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateNotes = async () => {
    setSaving(true);
    try {
      await crmService.updateFollowup(followupId, {
        notes: editForm.notes,
      });
      toast.success("Catatan berhasil diperbarui");
      const updated = await crmService.getFollowupById(followupId);
      setFollowup(updated);
      setShowEditDialog(false);
    } catch (error: any) {
      console.error("Error updating notes:", error);
      toast.error("Gagal update catatan", {
        description: error.message || "Silakan coba lagi.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await crmService.deleteFollowup(followupId);
      toast.success("Follow-up berhasil dihapus");
      router.push("/crm/followups");
      router.refresh();
    } catch (error: any) {
      console.error("Error deleting followup:", error);
      toast.error("Gagal hapus follow-up", {
        description: error.message || "Silakan coba lagi.",
      });
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (!followup) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <div className="text-6xl">📅</div>
        <p className="text-lg font-medium text-slate-700">Follow-up tidak ditemukan</p>
        <Button onClick={() => router.back()}>
          <ArrowLeft size={16} className="mr-2" />
          Kembali
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">📅 Detail Follow-up</h1>
            <p className="text-sm text-muted-foreground">
              {followup.lead?.contact?.full_name || "Lead tidak ditemukan"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowEditDialog(true)}>
            <Edit size={16} className="mr-2" />
            Edit
          </Button>
          <Button variant="destructive" size="sm" onClick={() => setShowDeleteDialog(true)}>
            <Trash2 size={16} className="mr-2" />
            Hapus
          </Button>
        </div>
      </div>

      {/* STATUS CARD */}
      <Card className="border-0 shadow-md">
        <CardContent className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={cn(
                "p-3 rounded-full",
                statusConfig[followup.status]?.bg
              )}>
                {statusConfig[followup.status]?.icon}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge
                  className={cn(
                    "text-sm font-medium border-0",
                    statusConfig[followup.status]?.bg,
                    statusConfig[followup.status]?.color
                  )}
                >
                  {statusConfig[followup.status]?.label || followup.status}
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Select
                value={followup.status}
                onValueChange={(val) => handleUpdateStatus(val as any)}
                disabled={saving}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Ubah Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">⏳ Pending</SelectItem>
                  <SelectItem value="completed">✅ Selesai</SelectItem>
                  <SelectItem value="cancelled">❌ Dibatalkan</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* INFO GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar size={18} className="text-amber-500" />
              Jadwal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">{formatDate(followup.followup_date)}</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <User size={18} className="text-blue-500" />
              Assigned Agent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={followup.assigned_user?.avatar_url || undefined} />
                <AvatarFallback>
                  {getInitials(followup.assigned_user?.full_name || "Agent")}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium">
                {followup.assigned_user?.full_name || followup.assigned_to || "Tidak diassign"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* LEAD INFO */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            👤 Info Lead Terkait
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="text-lg bg-primary/10 text-primary">
                {getInitials(followup.lead?.contact?.full_name || "L")}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-lg">
                {followup.lead?.contact?.full_name || "Lead tidak ditemukan"}
              </p>
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                {followup.lead?.contact?.phone && (
                  <span>📞 {followup.lead.contact.phone}</span>
                )}
                {followup.lead?.contact?.email && (
                  <span>✉️ {followup.lead.contact.email}</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/crm/leads/${followup.lead?.id}`)}
            >
              Lihat Detail Lead
            </Button>
            {followup.lead?.contact?.phone && (
              <Button
                variant="outline"
                size="sm"
                className="text-emerald-500 border-emerald-200 hover:bg-emerald-50"
                onClick={() => {
                  const phone = followup.lead.contact.phone.replace(/\D/g, "");
                  window.open(`https://wa.me/${phone}`, "_blank");
                }}
              >
                WhatsApp
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* NOTES */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare size={18} className="text-purple-500" />
            Catatan
          </CardTitle>
        </CardHeader>
        <CardContent>
          {followup.notes ? (
            <p className="text-sm whitespace-pre-wrap">{followup.notes}</p>
          ) : (
            <p className="text-sm text-muted-foreground italic">Tidak ada catatan</p>
          )}
        </CardContent>
      </Card>

      {/* EDIT DIALOG */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>✏️ Edit Follow-up</DialogTitle>
            <DialogDescription>Update catatan follow-up ini</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Catatan</Label>
              <Textarea
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                placeholder="Catatan follow-up..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Batal
            </Button>
            <Button onClick={handleUpdateNotes} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE DIALOG */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>⚠️ Hapus Follow-up</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus follow-up ini? Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Batal
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}