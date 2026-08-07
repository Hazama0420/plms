// components/notification-bell.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, ArrowRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/hooks/use-notifications";
import type { Notification } from "@/types/notification.types";

const TYPE_ICONS: Record<string, string> = {
  task: "📋",
  reminder: "⏰",
  announcement: "📢",
  assignment: "👤",
  property_update: "🏠",
  lead: "🎯",
  support: "🎧",
};

const TYPE_LABELS: Record<string, string> = {
  task: "Tugas",
  reminder: "Pengingat",
  announcement: "Pengumuman",
  assignment: "Penugasan",
  property_update: "Update Properti",
  lead: "Prospek Lead",
  support: "Bantuan",
};

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead, refresh, loading } = useNotifications();
  const prevOpenRef = useRef(open);

  useEffect(() => {
    if (open && !prevOpenRef.current) {
      refresh();
    }
    prevOpenRef.current = open;
  }, [open, refresh]);

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }

    // 🟢 PERBAIKAN: Gunakan Type Assertion 'as any' untuk mengakses action_url jika link bernilai null
    const targetUrl = notification.link || (notification as any).action_url;
    if (targetUrl) {
      router.push(targetUrl);
    }
    setOpen(false);
  };

  const formatTime = (date: string) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: id });
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      {/* 🔔 TRIGGER TOMBOL LONCENG */}
      <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-xl text-sm font-medium transition-all hover:bg-[#F4EFE6] text-slate-700 h-9 w-9 relative focus:outline-hidden cursor-pointer">
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-emerald-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow-xs animate-pulse">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </DropdownMenuTrigger>

      {/* 📋 DROPDOWN KONTEN NOTIFIKASI */}
      <DropdownMenuContent align="end" className="w-80 sm:w-88 p-0 rounded-2xl shadow-lg border-[#F4EFE6] bg-white text-slate-800 overflow-hidden">
        
        {/* Header Dropdown */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#FDFBF7] border-b border-[#F4EFE6]">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs text-slate-900 tracking-tight">Notifikasi</span>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0 h-4 font-mono">
                {unreadCount} baru
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-[11px] text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 h-7 px-2 font-medium cursor-pointer"
              onClick={async () => {
                await markAllAsRead();
                refresh();
              }}
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Tandai semua dibaca
            </Button>
          )}
        </div>

        {/* Isi Daftar Notifikasi */}
        {loading ? (
          <div className="p-4 space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-xl bg-[#F4EFE6]" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-12 px-4 text-center">
            <div className="w-12 h-12 bg-[#FDFBF7] border border-[#F4EFE6] rounded-full flex items-center justify-center mx-auto mb-2.5">
              <Bell className="h-5 w-5 text-slate-300" />
            </div>
            <p className="text-xs font-semibold text-slate-700">Tidak ada notifikasi</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Semua pesan dan tugas Anda sudah bersih.</p>
          </div>
        ) : (
          <>
            <ScrollArea className="h-[340px]">
              <div className="divide-y divide-[#F4EFE6]">
                {notifications.slice(0, 10).map((notification) => (
                  <div
                    key={notification.id}
                    className={cn(
                      "flex items-start gap-3 p-3.5 hover:bg-[#FDFBF7] cursor-pointer transition-colors relative group",
                      !notification.is_read && "bg-emerald-50/40"
                    )}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    {/* Icon Tipe */}
                    <div className="text-base shrink-0 mt-0.5 w-7 h-7 rounded-lg bg-white border border-[#F4EFE6] flex items-center justify-center shadow-2xs">
                      {TYPE_ICONS[notification.type] || "📌"}
                    </div>

                    {/* Teks Pesan */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn("text-xs line-clamp-1", !notification.is_read ? "font-bold text-slate-900" : "font-medium text-slate-700")}>
                          {notification.title}
                        </p>
                        {!notification.is_read && (
                          <span className="h-2 w-2 rounded-full bg-emerald-600 shrink-0 mt-1" />
                        )}
                      </div>
                      
                      <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                        {notification.message}
                      </p>

                      <div className="flex items-center justify-between pt-1">
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-[#F4EFE6] text-slate-600 bg-white font-mono uppercase">
                          {TYPE_LABELS[notification.type] || notification.type}
                        </Badge>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {formatTime(notification.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Footer Dropdown */}
            {notifications.length > 10 && (
              <div className="p-2 border-t border-[#F4EFE6] bg-[#FDFBF7]">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs h-8 text-slate-700 hover:bg-[#F4EFE6] font-semibold cursor-pointer gap-1.5"
                  onClick={() => {
                    setOpen(false);
                    router.push("/notifications");
                  }}
                >
                  Lihat semua notifikasi <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}