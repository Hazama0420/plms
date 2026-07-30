// hooks/use-notifications.ts
"use client";

import { useState, useEffect, useCallback } from "react";
import { notificationService } from "@/services/notification.service";
import type { Notification } from "@/types/notification.types";
import { toast } from "sonner";

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchNotifications = useCallback(async (page = 1, is_read?: boolean) => {
    setLoading(true);
    try {
      const result = await notificationService.getNotifications({
        page,
        limit: 20,
        is_read,
      });

      // 🛡️ Safeguard: Penanganan jika result berupa object { data, totalPages }, Array [], atau null
      if (Array.isArray(result)) {
        setNotifications(result);
        setTotalPages(1);
      } else if (result && typeof result === "object") {
        setNotifications(result.data || []);
        setTotalPages(result.totalPages || 1);
      } else {
        setNotifications([]);
        setTotalPages(1);
      }

      setCurrentPage(page);
    } catch (error: any) {
      // Set fallback kosong dengan aman jika user belum login/terjadi error
      setNotifications([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const count = await notificationService.getUnreadCount();
      setUnreadCount(typeof count === "number" ? count : 0);
    } catch (error) {
      setUnreadCount(0);
    }
  }, []);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, is_read: true } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error: any) {
      toast.error("Gagal menandai dibaca", { 
        description: error?.message || "Terjadi kesalahan" 
      });
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true }))
      );
      setUnreadCount(0);
      toast.success("Semua notifikasi telah dibaca");
    } catch (error: any) {
      toast.error("Gagal menandai semua dibaca", { 
        description: error?.message || "Terjadi kesalahan" 
      });
    }
  }, []);

  const refresh = useCallback(() => {
    fetchNotifications(currentPage);
    fetchUnreadCount();
  }, [fetchNotifications, fetchUnreadCount, currentPage]);

  useEffect(() => {
    fetchNotifications(1);
    fetchUnreadCount();
  }, [fetchNotifications, fetchUnreadCount]);

  return {
    notifications,
    unreadCount,
    loading,
    totalPages,
    currentPage,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    refresh,
  };
}