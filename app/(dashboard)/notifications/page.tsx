// app/(dashboard)/notifications/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check, CheckCheck, ArrowLeft } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";

import { useNotifications } from "@/hooks/use-notifications";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

  const formatTime = (date: string) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: id });
  };

  const handlePageChange = (page: number) => {
    const isRead = filter === "all" ? undefined : filter === "unread" ? false : true;
    fetchNotifications(page, isRead);
  };

  // ✅ FIX: terima string | null dan convert ke "all" jika null
  const handleFilterChange = (value: string | null) => {
    const newFilter = (value || "all") as "all" | "unread" | "read";
    setFilter(newFilter);
    const isRead = newFilter === "all" ? undefined : newFilter === "unread" ? false : true;
    fetchNotifications(1, isRead);
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 p-6 text-white shadow-lg">
        <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="h-10 w-10 text-white hover:bg-white/20"
            >
              <ArrowLeft size={22} />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <Bell className="h-6 w-6" />
                Notifikasi
              </h1>
              <p className="text-sm text-white/80">
                {unreadCount > 0
                  ? `${unreadCount} notifikasi belum dibaca`
                  : "Semua notifikasi sudah dibaca"}
              </p>
            </div>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="secondary"
              size="sm"
              onClick={async () => {
                await markAllAsRead();
                refresh();
              }}
              className="bg-white/20 text-white hover:bg-white/30"
            >
              <CheckCheck className="h-4 w-4 mr-2" />
              Tandai semua dibaca
            </Button>
          )}
        </div>
      </div>

      {/* FILTER */}
      <Card className="shadow-sm">
        <CardContent className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground">Filter:</span>
            {/* ✅ FIX: onValueChange langsung panggil handleFilterChange, sudah support null */}
            <Select value={filter} onValueChange={handleFilterChange}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue placeholder="Semua" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua</SelectItem>
                <SelectItem value="unread">Belum Dibaca</SelectItem>
                <SelectItem value="read">Sudah Dibaca</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <span className="text-sm text-muted-foreground">
            Total {notifications.length} notifikasi
          </span>
        </CardContent>
      </Card>

      {/* LIST */}
      <Card className="shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-3">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-12 text-center">
              <Bell className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-lg font-medium text-muted-foreground">Tidak ada notifikasi</p>
              <p className="text-sm text-muted-foreground">
                {filter === "unread"
                  ? "Semua notifikasi sudah dibaca"
                  : "Belum ada notifikasi masuk"}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "flex items-start gap-4 p-4 hover:bg-muted/50 transition cursor-pointer",
                    !notification.is_read && "bg-blue-50/50 dark:bg-blue-950/20"
                  )}
                  onClick={() => {
                    if (!notification.is_read) {
                      markAsRead(notification.id);
                    }
                    if (notification.link) {
                      router.push(notification.link);
                    }
                  }}
                >
                  <div className="text-2xl shrink-0 mt-0.5">
                    {TYPE_ICONS[notification.type] || "📌"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-medium">{notification.title}</p>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {notification.message}
                        </p>
                      </div>
                      {!notification.is_read && (
                        <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      <Badge variant="outline" className="text-xs">
                        {TYPE_LABELS[notification.type] || notification.type}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatTime(notification.created_at)}
                      </span>
                      {notification.sender && (
                        <span className="text-xs text-muted-foreground">
                          dari {notification.sender.full_name}
                        </span>
                      )}
                      {notification.is_read && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                          <Check className="h-3 w-3 mr-0.5" />
                          Dibaca
                        </Badge>
                      )}
                    </div>
                  </div>
                  {!notification.is_read && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        markAsRead(notification.id);
                      }}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Menampilkan {notifications.length} notifikasi
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
    </div>
  );
}