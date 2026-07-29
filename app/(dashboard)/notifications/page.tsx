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
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";
import { toast } from "sonner";

import { useNotifications } from "@/hooks/use-notifications";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
};

const TYPE_LABELS: Record<string, string> = {
  task: "Tugas",
  reminder: "Pengingat",
  announcement: "Pengumuman",
  assignment: "Penugasan",
  property_update: "Update Properti",
};

export default function NotificationsPage() {
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");
  const [userRole, setUserRole] = useState<string>("");
  
  // Dialog States untuk Hapus
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleteAllOpen, setIsDeleteAllOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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

  // Memeriksa Role Pengguna (Super Admin / Admin)
  useEffect(() => {
    const checkUserRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: userData } = await supabase
            .from("users")
            .select("role")
            .eq("id", user.id)
            .maybeSingle();

          const role = (userData?.role || user.user_metadata?.role || "").toLowerCase();
          setUserRole(role);
        }
      } catch (error) {
        console.error("Error checking role:", error);
      }
    };

    checkUserRole();
  }, []);

  const isSuperAdmin = userRole === "super_admin" || userRole === "admin";

  const formatTime = (date: string) => {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true, locale: id });
    } catch {
      return "Baru saja";
    }
  };

  const handlePageChange = (page: number) => {
    const isRead = filter === "all" ? undefined : filter === "unread" ? false : true;
    fetchNotifications(page, isRead);
  };

  const handleFilterChange = (newFilter: "all" | "unread" | "read") => {
    setFilter(newFilter);
    const isRead = newFilter === "all" ? undefined : newFilter === "unread" ? false : true;
    fetchNotifications(1, isRead);
  };

  // ===== HAPUS NOTIFIKASI INDIVIDUAL (SUPER ADMIN) =====
  const handleDeleteSingle = async (notificationId: string) => {
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", notificationId);

      if (error) throw error;

      toast.success("Notifikasi berhasil dihapus");
      setDeletingId(null);
      refresh();
    } catch (error: any) {
      console.error("Error deleting notification:", error);
      toast.error("Gagal menghapus notifikasi", {
        description: error.message || "Silakan coba lagi.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // ===== HAPUS SEMUA NOTIFIKASI (SUPER ADMIN) =====
  const handleDeleteAll = async () => {
    setIsDeleting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Super admin menghapus semua notifikasi milik akun ini / sistem
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("user_id", user.id);

      if (error) throw error;

      toast.success("Seluruh notifikasi berhasil dibersihkan");
      setIsDeleteAllOpen(false);
      refresh();
    } catch (error: any) {
      console.error("Error deleting all notifications:", error);
      toast.error("Gagal membersihkan notifikasi", {
        description: error.message || "Silakan coba lagi.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* 1. HEADER HERO BANNER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute -right-12 -top-12 h-56 w-56 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-white/10 blur-3xl pointer-events-none" />

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
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
                <Bell className="h-6 w-6" /> Pusat Notifikasi
                {isSuperAdmin && (
                  <Badge className="bg-amber-400 text-amber-950 hover:bg-amber-300 text-[10px] font-bold">
                    Super Admin
                  </Badge>
                )}
              </h1>
              <p className="text-xs sm:text-sm text-white/80 mt-0.5">
                {unreadCount > 0
                  ? `Anda memiliki ${unreadCount} pesan atau tugas yang belum dibaca.`
                  : "Semua pemberitahuan telah ditinjau dengan baik."}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refresh()}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20 text-xs h-9 gap-1.5"
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
                className="bg-white text-blue-700 hover:bg-white/90 font-bold text-xs h-9 shadow-md gap-1.5"
              >
                <CheckCheck className="h-4 w-4" /> Tandai Dibaca
              </Button>
            )}

            {/* HANYA TAMPIL UNTUK SUPER ADMIN */}
            {isSuperAdmin && notifications.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setIsDeleteAllOpen(true)}
                className="bg-rose-500/80 hover:bg-rose-600 text-white text-xs h-9 gap-1.5 border border-rose-400/30 shadow-md"
              >
                <Trash2 className="h-3.5 w-3.5" /> Bersihkan Semua
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 2. FILTER & STATS BAR */}
      <Card className="border shadow-xs bg-card">
        <CardContent className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          {/* Pill Tabs Filter */}
          <div className="flex items-center gap-1.5 bg-muted p-1 rounded-xl w-full sm:w-auto">
            <button
              onClick={() => handleFilterChange("all")}
              className={cn(
                "flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-semibold transition",
                filter === "all" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Semua ({notifications.length})
            </button>
            <button
              onClick={() => handleFilterChange("unread")}
              className={cn(
                "flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5",
                filter === "unread" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Belum Dibaca
              {unreadCount > 0 && (
                <span className="bg-blue-600 text-white px-1.5 py-0.2 rounded-full text-[10px]">
                  {unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={() => handleFilterChange("read")}
              className={cn(
                "flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-semibold transition",
                filter === "read" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Sudah Dibaca
            </button>
          </div>

          <div className="text-xs text-muted-foreground font-mono self-end sm:self-auto">
            Menampilkan halaman {currentPage} dari {totalPages || 1}
          </div>
        </CardContent>
      </Card>

      {/* 3. NOTIFICATIONS LIST CONTAINER */}
      <Card className="border shadow-xs overflow-hidden">
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
          ) : notifications.length === 0 ? (
            <div className="flex h-80 flex-col items-center justify-center p-8 text-center">
              <div className="p-4 bg-muted/60 rounded-full mb-3">
                <Inbox className="h-10 w-10 text-muted-foreground/40" />
              </div>
              <p className="text-base font-bold text-foreground">Tidak Ada Notifikasi</p>
              <p className="text-xs text-muted-foreground max-w-sm mt-1">
                {filter === "unread"
                  ? "Kerja bagus! Semua pesan dan pengingat sudah dibaca."
                  : "Belum ada riwayat aktivitas atau pengumuman masuk."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {notifications.map((notification) => {
                const isUnread = !notification.is_read;

                return (
                  <div
                    key={notification.id}
                    onClick={() => {
                      if (isUnread) {
                        markAsRead(notification.id);
                      }
                      if (notification.link) {
                        router.push(notification.link);
                      }
                    }}
                    className={cn(
                      "flex items-start gap-3 sm:gap-4 p-4 sm:p-5 transition-all cursor-pointer select-none group relative",
                      isUnread
                        ? "bg-blue-50/60 dark:bg-blue-950/20 hover:bg-blue-100/50 dark:hover:bg-blue-900/30"
                        : "hover:bg-muted/40"
                    )}
                  >
                    {/* Icon Emoji Type */}
                    <div className="text-2xl sm:text-3xl shrink-0 mt-0.5 p-2 bg-background rounded-2xl shadow-xs border flex items-center justify-center">
                      {TYPE_ICONS[notification.type] || "📌"}
                    </div>

                    {/* Content Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className={cn("text-xs sm:text-sm text-foreground", isUnread ? "font-bold" : "font-medium")}>
                              {notification.title}
                            </h3>
                            {isUnread && (
                              <span className="h-2 w-2 rounded-full bg-blue-600 shrink-0 animate-pulse" />
                            )}
                          </div>
                          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed font-sans">
                            {notification.message}
                          </p>
                        </div>
                      </div>

                      {/* Footer Metadata */}
                      <div className="flex flex-wrap items-center gap-3 mt-3">
                        <Badge variant="outline" className="text-[10px] font-medium px-2 py-0.5 bg-background">
                          {TYPE_LABELS[notification.type] || notification.type}
                        </Badge>

                        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {formatTime(notification.created_at)}
                        </span>

                        {notification.sender && (
                          <span className="text-[11px] text-muted-foreground">
                            • Dari <strong className="text-foreground">{notification.sender.full_name}</strong>
                          </span>
                        )}

                        {notification.is_read && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 gap-1 text-muted-foreground ml-auto sm:ml-0">
                            <Check className="h-3 w-3 text-emerald-600" /> Dibaca
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* ACTION BUTTONS (TANDAI DIBACA & HAPUS UTK SUPER ADMIN) */}
                    <div className="flex items-center gap-1 shrink-0">
                      {isUnread && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-xl text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(notification.id);
                          }}
                          title="Tandai sudah dibaca"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}

                      {/* 🗑️ TOMBOL HAPUS SUPER ADMIN */}
                      {isSuperAdmin && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-xl text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingId(notification.id);
                          }}
                          title="Hapus Notifikasi (Super Admin)"
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

      {/* ===== MODAL 1: KONFIRMASI HAPUS SINGLE NOTIFIKASI ===== */}
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeletingId(null)}
              className="text-xs"
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={isDeleting}
              onClick={() => deletingId && handleDeleteSingle(deletingId)}
              className="text-xs bg-rose-600 hover:bg-rose-700"
            >
              {isDeleting ? "Menghapus..." : "Ya, Hapus Notifikasi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== MODAL 2: KONFIRMASI HAPUS SEMUA NOTIFIKASI ===== */}
      <Dialog open={isDeleteAllOpen} onOpenChange={setIsDeleteAllOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-rose-600 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5" /> Bersihkan Seluruh Notifikasi?
            </DialogTitle>
            <DialogDescription className="text-xs leading-relaxed">
              Apakah Anda yakin ingin menghapus <strong>seluruh riwayat notifikasi</strong> Anda? Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDeleteAllOpen(false)}
              className="text-xs"
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={isDeleting}
              onClick={handleDeleteAll}
              className="text-xs bg-rose-600 hover:bg-rose-700"
            >
              {isDeleting ? "Membersihkan..." : "Ya, Bersihkan Semua"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}