// app/(dashboard)/notifications/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Check,
  CheckCheck,
  ArrowLeft,
  RefreshCw,
  Inbox,
  Clock,
  Trash2,
  ShieldAlert,
  Send,
  Megaphone,
  Layers,
  Activity,
  ExternalLink,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { id as localeID } from "date-fns/locale";
import { toast } from "sonner";

import { useNotifications } from "@/hooks/use-notifications";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const TYPE_ICONS: Record<string, string> = {
  task: "📋",
  reminder: "⏰",
  announcement: "📢",
  assignment: "👤",
  property_update: "🏠",
  system: "⚡",
  lead: "🎯",
};

const TYPE_LABELS: Record<string, string> = {
  task: "Tugas",
  reminder: "Pengingat",
  announcement: "Pengumuman",
  assignment: "Penugasan",
  property_update: "Update Properti",
  system: "Aktivitas Sistem",
  lead: "Leads CRM",
};

export default function NotificationsPage() {
  const router = useRouter();

  // State Filtering Tab
  const [categoryFilter, setCategoryFilter] = useState<"all" | "system" | "admin">("all");
  const [readFilter, setReadFilter] = useState<"all" | "unread" | "read">("all");

  // State User & Role
  const [userRole, setUserRole] = useState<string>("viewer");
  const [currentUserId, setCurrentUserId] = useState<string>("");

  // State Dialog Modal Hapus
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleteAllOpen, setIsDeleteAllOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // State Modal Send Announcement (Khusus Super Admin / Admin)
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendTitle, setSendTitle] = useState("");
  const [sendMessage, setSendMessage] = useState("");
  const [sendTargetRole, setSendTargetRole] = useState<"internal" | "viewer" | "all">("internal");
  const [sendActionUrl, setSendActionUrl] = useState("");

  const {
    notifications,
    unreadCount,
    loading,
    totalPages,
    currentPage,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    refresh,
  } = useNotifications();

  // Memeriksa User Profile & Role dari Supabase
  useEffect(() => {
    const checkUser = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          setCurrentUserId(user.id);
          const { data: userData } = await supabase
            .from("users")
            .select("role")
            .eq("id", user.id)
            .maybeSingle();

          const role = (userData?.role || user.user_metadata?.role || "viewer").toLowerCase();
          setUserRole(role);
        }
      } catch (error) {
        console.error("Error checking user role:", error);
      }
    };

    checkUser();
  }, []);

  const isSuperAdmin = userRole === "super_admin" || userRole === "superadmin";
  const isAdmin = userRole === "admin" || isSuperAdmin;
  const isViewer = userRole === "viewer";

  const formatTime = (date: string) => {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true, locale: localeID });
    } catch {
      return "Baru saja";
    }
  };

  // 🔴 FILTERING STRICT SISI FRONTEND: CEGAH VIEWER (CLIENT) MELIHAT NOTIFIKASI INTERNAL
  const displayNotifications = notifications.filter((notif: any) => {
    // 1. Proteksi Hak Akses Viewer
    if (isViewer) {
      if (
        notif.target_role === "internal" ||
        notif.target_role === "agent" ||
        notif.target_role === "admin"
      ) {
        return false;
      }
    }

    // 2. Filter Tab Kategori (System vs Admin Announcement)
    if (categoryFilter !== "all") {
      const itemCat = notif.category || (notif.type === "announcement" ? "admin" : "system");
      if (itemCat !== categoryFilter) return false;
    }

    // 3. Filter Status Read/Unread
    if (readFilter === "unread" && notif.is_read) return false;
    if (readFilter === "read" && !notif.is_read) return false;

    return true;
  });

  const handlePageChange = (page: number) => {
    fetchNotifications(page);
  };

  // ===== HAPUS NOTIFIKASI INDIVIDUAL =====
  const handleDeleteSingle = async (notificationId: string) => {
    setIsDeleting(true);
    try {
      const { error } = await supabase.from("notifications").delete().eq("id", notificationId);

      if (error) throw error;

      toast.success("Notifikasi berhasil dihapus");
      setDeletingId(null);
      refresh();
    } catch (error: any) {
      console.error("Error deleting notification:", error);
      toast.error("Gagal menghapus notifikasi: " + (error.message || "Silakan coba lagi."));
    } finally {
      setIsDeleting(false);
    }
  };

  // ===== HAPUS SEMUA NOTIFIKASI =====
  const handleDeleteAll = async () => {
    setIsDeleting(true);
    try {
      if (!currentUserId) return;

      const { error } = await supabase.from("notifications").delete().eq("user_id", currentUserId);

      if (error) throw error;

      toast.success("Seluruh notifikasi berhasil dibersihkan");
      setIsDeleteAllOpen(false);
      refresh();
    } catch (error: any) {
      console.error("Error deleting all notifications:", error);
      toast.error("Gagal membersihkan notifikasi: " + (error.message || "Silakan coba lagi."));
    } finally {
      setIsDeleting(false);
    }
  };

  // ===== KIRIM PENGUMUMAN ADMIN + ONESIGNAL PUSH =====
  const handleSendAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sendTitle.trim() || !sendMessage.trim()) {
      toast.error("Judul dan pesan pengumuman wajib diisi.");
      return;
    }

    setIsSending(true);
    try {
      // 1. Simpan ke Tabel Supabase Notifications
      const { error: dbErr } = await supabase.from("notifications").insert([
        {
          sender_id: currentUserId,
          title: sendTitle.trim(),
          message: sendMessage.trim(),
          type: "announcement",
          category: "admin",
          target_role: sendTargetRole,
          action_url: sendActionUrl.trim() || null,
        },
      ]);

      if (dbErr) {
        throw new Error(dbErr.message || JSON.stringify(dbErr));
      }

      // 2. Trigger API Route OneSignal REST API Push Notification
      const apiRes = await fetch("/api/notifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: sendTitle.trim(),
          message: sendMessage.trim(),
          targetRole: sendTargetRole,
          category: "admin",
          type: "announcement",
          actionUrl: sendActionUrl.trim() || undefined,
        }),
      });

      const apiResult = await apiRes.json();
      if (!apiRes.ok || !apiResult.success) {
        throw new Error(apiResult.error || "Gagal mengirim OneSignal push notification");
      }

      toast.success("Pengumuman berhasil disiarkan ke pengguna dan OneSignal!");
      setIsSendModalOpen(false);
      setSendTitle("");
      setSendMessage("");
      setSendActionUrl("");
      refresh();
    } catch (err: any) {
      console.error("Gagal mengirim pengumuman:", err);
      
      // Ekstraksi pesan error agar tidak menjadi {}
      const errorMsg =
        err?.message ||
        err?.error ||
        (typeof err === "object" ? JSON.stringify(err) : String(err));

      toast.error("Gagal menyiarkan pengumuman", {
        description: errorMsg === "{}" || !errorMsg ? "Terjadi kesalahan pada server atau jaringan." : errorMsg,
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* 1. HEADER HERO BANNER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-700 via-teal-800 to-slate-900 p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute -right-12 -top-12 h-56 w-56 rounded-full bg-emerald-400/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-teal-400/10 blur-3xl pointer-events-none" />

        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="h-10 w-10 rounded-xl text-white hover:bg-white/20 shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
                  <Bell className="h-6 w-6 text-emerald-400" /> Pusat Notifikasi
                </h1>
                <Badge
                  className={cn(
                    "text-[10px] font-bold uppercase px-2 py-0.5 rounded-full",
                    isAdmin ? "bg-amber-400 text-slate-950" : "bg-blue-500 text-white"
                  )}
                >
                  {isViewer ? "Client Portal" : userRole.replace("_", " ")}
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-emerald-100/80 mt-0.5">
                {unreadCount > 0
                  ? `Anda memiliki ${unreadCount} pemberitahuan baru yang belum dibaca.`
                  : "Semua notifikasi dan pengumuman telah ditinjau dengan baik."}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            {/* BUTTON SIARKAN PENGUMUMAN (KHUSUS ADMIN / SUPER ADMIN) */}
            {isAdmin && (
              <Button
                size="sm"
                onClick={() => setIsSendModalOpen(true)}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs h-9 shadow-md gap-1.5 rounded-xl"
              >
                <Megaphone className="h-4 w-4" /> Siarkan Pengumuman (OneSignal)
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => refresh()}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20 text-xs h-9 gap-1.5 rounded-xl"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </Button>

            {unreadCount > 0 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={async () => {
                  await markAllAsRead();
                  refresh();
                }}
                className="bg-white text-emerald-800 hover:bg-white/90 font-bold text-xs h-9 shadow-md gap-1.5 rounded-xl"
              >
                <CheckCheck className="h-4 w-4" /> Tandai Dibaca
              </Button>
            )}

            {isAdmin && notifications.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setIsDeleteAllOpen(true)}
                className="bg-rose-500/80 hover:bg-rose-600 text-white text-xs h-9 gap-1.5 border border-rose-400/30 shadow-md rounded-xl"
              >
                <Trash2 className="h-3.5 w-3.5" /> Bersihkan Semua
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 2. TAB PEMISAH: SYSTEM VS ADMIN ANNOUNCEMENT & STATUS FILTER */}
      <Card className="border shadow-2xs bg-card rounded-2xl">
        <CardContent className="p-4 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
          {/* TAB CATEGORY */}
          <div className="flex items-center gap-1.5 bg-muted p-1 rounded-xl overflow-x-auto">
            <button
              onClick={() => setCategoryFilter("all")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shrink-0",
                categoryFilter === "all"
                  ? "bg-background text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Layers className="w-3.5 h-3.5" /> Semua Kategori
            </button>

            <button
              onClick={() => setCategoryFilter("system")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shrink-0",
                categoryFilter === "system"
                  ? "bg-background text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Activity className="w-3.5 h-3.5 text-blue-600" /> Aktivitas Sistem
            </button>

            {!isViewer && (
              <button
                onClick={() => setCategoryFilter("admin")}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shrink-0",
                  categoryFilter === "admin"
                    ? "bg-background text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Megaphone className="w-3.5 h-3.5 text-amber-600" /> Pengumuman Admin Internal
              </button>
            )}
          </div>

          {/* STATUS FILTER */}
          <div className="flex items-center gap-2 self-end md:self-auto">
            <Select value={readFilter} onValueChange={(v: any) => setReadFilter(v)}>
              <SelectTrigger className="h-8 text-xs w-36 rounded-xl">
                <SelectValue placeholder="Status Dibaca" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="unread">Belum Dibaca ({unreadCount})</SelectItem>
                <SelectItem value="read">Sudah Dibaca</SelectItem>
              </SelectContent>
            </Select>

            <span className="text-xs text-muted-foreground font-mono">
              Total: {displayNotifications.length}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* 3. NOTIFICATIONS LIST CONTAINER */}
      <Card className="border shadow-2xs overflow-hidden rounded-2xl">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-3">
                  <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-1/3 rounded-md" />
                    <Skeleton className="h-3 w-3/4 rounded-md" />
                  </div>
                </div>
              ))}
            </div>
          ) : displayNotifications.length === 0 ? (
            <div className="flex h-80 flex-col items-center justify-center p-8 text-center">
              <div className="p-4 bg-muted/60 rounded-full mb-3">
                <Inbox className="h-10 w-10 text-muted-foreground/40" />
              </div>
              <p className="text-base font-bold text-foreground">Tidak Ada Notifikasi</p>
              <p className="text-xs text-muted-foreground max-w-sm mt-1">
                {readFilter === "unread"
                  ? "Kerja bagus! Semua pemberitahuan sudah dibaca."
                  : "Belum ada riwayat aktivitas atau pengumuman masuk."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {displayNotifications.map((notification: any) => {
                const isUnread = !notification.is_read;
                const isAnnouncement =
                  notification.category === "admin" || notification.type === "announcement";

                return (
                  <div
                    key={notification.id}
                    onClick={() => {
                      if (isUnread) {
                        markAsRead(notification.id);
                      }
                      const targetUrl = notification.action_url || notification.link;
                      if (targetUrl) {
                        router.push(targetUrl);
                      }
                    }}
                    className={cn(
                      "flex items-start gap-3 sm:gap-4 p-4 sm:p-5 transition-all cursor-pointer select-none group relative",
                      isUnread
                        ? "bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-100/40 dark:hover:bg-emerald-900/30"
                        : "hover:bg-muted/40"
                    )}
                  >
                    {/* Icon Emoji */}
                    <div
                      className={cn(
                        "text-2xl sm:text-3xl shrink-0 mt-0.5 p-2 rounded-2xl shadow-2xs border flex items-center justify-center",
                        isAnnouncement
                          ? "bg-amber-100 dark:bg-amber-950/60 border-amber-300"
                          : "bg-background"
                      )}
                    >
                      {TYPE_ICONS[notification.type] || "📌"}
                    </div>

                    {/* Content Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h3
                              className={cn(
                                "text-xs sm:text-sm text-foreground",
                                isUnread
                                  ? "font-bold text-emerald-900 dark:text-emerald-200"
                                  : "font-medium"
                              )}
                            >
                              {notification.title}
                            </h3>
                            {isUnread && (
                              <span className="h-2 w-2 rounded-full bg-emerald-600 shrink-0 animate-pulse" />
                            )}
                          </div>
                          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed font-sans">
                            {notification.message}
                          </p>
                        </div>
                      </div>

                      {/* Footer Metadata */}
                      <div className="flex flex-wrap items-center gap-2.5 mt-3">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] font-medium px-2 py-0.5 rounded-md",
                            isAnnouncement
                              ? "bg-amber-50 text-amber-800 border-amber-300"
                              : "bg-background"
                          )}
                        >
                          {isAnnouncement
                            ? "📢 Pengumuman Admin"
                            : TYPE_LABELS[notification.type] || notification.type}
                        </Badge>

                        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {formatTime(notification.created_at)}
                        </span>

                        {(notification.action_url || notification.link) && (
                          <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-0.5 hover:underline">
                            <ExternalLink className="w-3 h-3" /> Buka Tautan
                          </span>
                        )}

                        {notification.is_read && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] px-1.5 py-0 h-4 gap-1 text-muted-foreground ml-auto sm:ml-0 rounded-md"
                          >
                            <Check className="h-3 w-3 text-emerald-600" /> Dibaca
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1 shrink-0">
                      {isUnread && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-xl text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(notification.id);
                          }}
                          title="Tandai sudah dibaca"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}

                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-xl text-muted-foreground hover:text-rose-600 hover:bg-rose-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingId(notification.id);
                          }}
                          title="Hapus Notifikasi"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 4. PAGINATION */}
      {totalPages > 1 && (
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row pt-2">
          <p className="text-xs text-muted-foreground font-mono">
            Halaman {currentPage} dari {totalPages}
          </p>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                  className={cn(currentPage === 1 && "pointer-events-none opacity-50")}
                />
              </PaginationItem>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = i + 1;
                return (
                  <PaginationItem key={pageNum}>
                    <PaginationLink
                      onClick={() => handlePageChange(pageNum)}
                      isActive={currentPage === pageNum}
                      className="text-xs"
                    >
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}
              {totalPages > 5 && <PaginationEllipsis />}
              <PaginationItem>
                <PaginationNext
                  onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                  className={cn(currentPage === totalPages && "pointer-events-none opacity-50")}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      {/* ===== MODAL 1: BUAT & SIARKAN PENGUMUMAN ADMIN (ONESIGNAL INTEGRATION) ===== */}
      <Dialog open={isSendModalOpen} onOpenChange={setIsSendModalOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-foreground">
              <Megaphone className="w-5 h-5 text-amber-500" /> Siarkan Pengumuman Tim (OneSignal Push)
            </DialogTitle>
            <DialogDescription className="text-xs">
              Kirim pengumuman penting langsung ke dashboard tim dan push notification HP/Laptop via OneSignal.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSendAnnouncement} className="space-y-3.5 py-2 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Judul Pengumuman</Label>
              <Input
                placeholder="Contoh: Rapat Koordinasi Penjualan Q3..."
                value={sendTitle}
                onChange={(e) => setSendTitle(e.target.value)}
                required
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Isi Pesan Pengumuman</Label>
              <Textarea
                placeholder="Tuliskan rincian pengumuman atau instruksi internal di sini..."
                value={sendMessage}
                onChange={(e) => setSendMessage(e.target.value)}
                rows={4}
                required
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Target Penerima</Label>
                <Select
                  value={sendTargetRole}
                  onValueChange={(v: any) => setSendTargetRole(v)}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="internal">🔒 Hanya Internal Tim (Admin & Agen)</SelectItem>
                    <SelectItem value="viewer">👥 Hanya Client (Viewer Portal)</SelectItem>
                    <SelectItem value="all">🌐 Semua Pengguna (Broadcast Publik)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Action Link (Opsional)</Label>
                <Input
                  placeholder="misal: /properties atau /crm"
                  value={sendActionUrl}
                  onChange={(e) => setSendActionUrl(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <DialogFooter className="pt-3 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsSendModalOpen(false)}
                className="text-xs h-9 rounded-xl"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isSending}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs h-9 gap-1.5 rounded-xl shadow-md"
              >
                <Send className="w-3.5 h-3.5" />
                {isSending ? "Menyiarkan..." : "Siarkan via OneSignal"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ===== MODAL 2: KONFIRMASI HAPUS SINGLE NOTIFIKASI ===== */}
      <Dialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-rose-600 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5" /> Hapus Notifikasi Ini?
            </DialogTitle>
            <DialogDescription className="text-xs">
              Tindakan ini akan menghapus notifikasi terpilih secara permanen dari sistem.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setDeletingId(null)} className="text-xs rounded-xl">
              Batal
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={isDeleting}
              onClick={() => deletingId && handleDeleteSingle(deletingId)}
              className="text-xs bg-rose-600 hover:bg-rose-700 rounded-xl"
            >
              {isDeleting ? "Menghapus..." : "Ya, Hapus Notifikasi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== MODAL 3: KONFIRMASI HAPUS SEMUA NOTIFIKASI ===== */}
      <Dialog open={isDeleteAllOpen} onOpenChange={setIsDeleteAllOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-rose-600 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5" /> Bersihkan Seluruh Notifikasi?
            </DialogTitle>
            <DialogDescription className="text-xs leading-relaxed">
              Apakah Anda yakin ingin menghapus <strong>seluruh riwayat notifikasi</strong> Anda?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsDeleteAllOpen(false)} className="text-xs rounded-xl">
              Batal
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={isDeleting}
              onClick={handleDeleteAll}
              className="text-xs bg-rose-600 hover:bg-rose-700 rounded-xl"
            >
              {isDeleting ? "Membersihkan..." : "Ya, Bersihkan Semua"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}