"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ShieldAlert,
  Clock,
  RefreshCw,
  Search,
  FileText,
  UserCheck,
  X,
  Lock,
  Activity,
  MessageCircle,
  Edit,
  Trash2,
  Sparkles,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { cn } from "@/lib/utils";

// Mapping Jenis Aktivitas dengan Badge Warna Adaptif
const activityTypeConfig: Record<
  string,
  { label: string; color: string; icon: React.ReactNode }
> = {
  "WhatsApp Chat": {
    label: "Chat WA",
    color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    icon: <MessageCircle className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />,
  },
  "Status Update": {
    label: "Update Status",
    color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    icon: <Activity className="w-3 h-3 text-blue-600 dark:text-blue-400" />,
  },
  "Edit Follow-up": {
    label: "Edit Agenda",
    color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    icon: <Edit className="w-3 h-3 text-amber-600 dark:text-amber-400" />,
  },
  "Delete Follow-up": {
    label: "Hapus Agenda",
    color: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    icon: <Trash2 className="w-3 h-3 text-rose-600 dark:text-rose-400" />,
  },
  "AI Writer": {
    label: "AI Writer",
    color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    icon: <Sparkles className="w-3 h-3 text-purple-600 dark:text-purple-400" />,
  },
};

export default function AdminActivityLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<string | null>("all");

  // State Auth Pengguna
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string>("");

  const isSuperAdmin = useMemo(() => {
    return currentUserRole === "super_admin" || currentUserRole === "superadmin";
  }, [currentUserRole]);

  const isAdmin = useMemo(() => {
    return currentUserRole === "admin";
  }, [currentUserRole]);

  const isAdminOrSuperAdmin = isSuperAdmin || isAdmin;

  // ===== FETCH LOGS DENGAN FILTERING ATURAN RBAC =====
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Dapatkan Sesi Pengguna Login
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      setCurrentUserId(user.id);

      // 2. Ambil Role Pengguna Saat Ini
      const { data: userData } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      const role = (userData?.role || user.user_metadata?.role || "agent").toLowerCase().trim();
      setCurrentUserRole(role);

      const userIsSuperAdmin = role === "super_admin" || role === "superadmin";
      const userIsAdmin = role === "admin";

      // 3. Filter User IDs Sesuai Aturan:
      // - Super Admin: Bebas (Seluruh User)
      // - Admin: Semua User KECUALI Role Super Admin
      let targetUserIds: string[] = [];

      if (userIsAdmin) {
        const { data: allowedUsers } = await supabase
          .from("users")
          .select("id")
          .not("role", "in", '("super_admin","superadmin")');

        targetUserIds = (allowedUsers || []).map((u) => u.id);
      }

      // 4. Query Utama ke Supabase
      let query = supabase
        .from("crm_activities")
        .select(`
          id,
          activity_type,
          notes,
          created_at,
          user_id,
          users:user_id (id, full_name, email, role, avatar_url)
        `)
        .order("created_at", { ascending: false })
        .limit(200);

      // Jika role Admin (bukan Super Admin), filter out log Super Admin
      if (userIsAdmin) {
        if (targetUserIds.length > 0) {
          query = query.in("user_id", targetUserIds);
        } else {
          query = query.eq("user_id", "00000000-0000-0000-0000-000000000000");
        }
      }

      const { data, error } = await query;

      if (!error && data) {
        setLogs(data);
      }
    } catch (err) {
      console.error("Gagal mengambil data log aktivitas:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();

    const channel = supabase
      .channel("admin_logs_realtime_changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "crm_activities" },
        () => fetchLogs()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchLogs]);

  // Daftar User untuk Dropdown Select
  const availableUsers = useMemo(() => {
    const userMap = new Map();
    logs.forEach((log) => {
      if (log.users?.id) {
        userMap.set(log.users.id, {
          id: log.users.id,
          name: log.users.full_name || log.users.email || "Pengguna",
          role: log.users.role || "agent",
        });
      }
    });
    return Array.from(userMap.values());
  }, [logs]);

  // Filter Lokal berdasarkan Input Search & User Select
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesSearch =
        log.activity_type?.toLowerCase().includes(search.toLowerCase()) ||
        log.notes?.toLowerCase().includes(search.toLowerCase()) ||
        log.users?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        log.users?.email?.toLowerCase().includes(search.toLowerCase());

      const matchesUser =
        !selectedUser ||
        selectedUser === "all" ||
        log.user_id === selectedUser ||
        log.users?.id === selectedUser;

      return matchesSearch && matchesUser;
    });
  }, [logs, search, selectedUser]);

  // Tampilan Akses Ditolak jika Role Agen/Viewer mencoba membuka
  if (!loading && !isAdminOrSuperAdmin) {
    return (
      <div className="flex h-96 flex-col items-center justify-center text-center p-6 space-y-3">
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-full text-rose-600 dark:text-rose-400">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-base font-bold text-foreground">Akses Halaman Dibatasi</h2>
        <p className="text-xs text-muted-foreground max-w-sm">
          Halaman Audit Trail & Log Aktivitas Sistem khusus untuk Admin dan Super Admin.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 max-w-5xl mx-auto pb-16 px-3 sm:px-4 text-foreground">
      {/* HEADER UTAMA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            🛡️ Audit Trail & Log Aktivitas
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isSuperAdmin
              ? "Pantau seluruh rekam jejak aktivitas operasional tim (Semua Role) secara real-time."
              : "Pantau rekam jejak aktivitas operasional tim (Semua Role KECUALI Super Admin) secara real-time."}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {isAdmin && (
            <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 gap-1">
              <Lock className="w-3 h-3" /> Exclude Super Admin Logs
            </Badge>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={fetchLogs}
            className="text-xs h-8 gap-1.5 cursor-pointer border-border bg-background hover:bg-muted text-foreground"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} /> Refresh
          </Button>
        </div>
      </div>

      {/* FILTER & PENCARIAN */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Cari aktivitas, catatan, atau keyword..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs bg-card border-border text-foreground"
          />
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={selectedUser || "all"}
            onValueChange={(val) => setSelectedUser(val)}
          >
            <SelectTrigger className="w-full sm:w-[200px] h-9 text-xs bg-card border-border text-foreground">
              <UserCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 mr-1.5 shrink-0" />
              <SelectValue placeholder="Semua Akun" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border text-card-foreground">
              <SelectItem value="all" className="text-xs font-semibold">
                ✨ {isSuperAdmin ? "Semua Pengguna" : "Semua Pengguna (Excl. Super Admin)"}
              </SelectItem>
              {availableUsers.map((u) => (
                <SelectItem key={u.id} value={u.id} className="text-xs">
                  {u.name} <span className="text-[10px] text-muted-foreground">({u.role})</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedUser && selectedUser !== "all" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedUser("all")}
              className="h-9 px-2 text-xs text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
              title="Reset Filter Akun"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* DAFTAR LOG / AUDIT TRAIL */}
      <Card className="border border-border shadow-2xs bg-card overflow-hidden text-card-foreground">
        <CardHeader className="p-3.5 border-b border-border bg-muted/30">
          <CardTitle className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Riwayat Log Sistem
            </span>
            <Badge variant="outline" className="text-[10px] bg-background font-mono border-border">
              Total: {filteredLogs.length} Log
            </Badge>
          </CardTitle>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-xs text-muted-foreground space-y-2">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto text-emerald-600 dark:text-emerald-400" />
              <p>Memuat data log aktivitas...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-12 text-center text-xs text-muted-foreground space-y-2">
              <ShieldAlert className="w-8 h-8 opacity-40 mx-auto" />
              <p className="font-semibold text-foreground">Tidak ada catatan log aktivitas ditemukan.</p>
              <p className="text-[11px]">Coba ubah kata kunci pencarian atau reset filter akun Anda.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {filteredLogs.map((log) => {
                const userObj = log.users || {};
                const userName = userObj.full_name || userObj.email || "Sistem Administrator";
                const userRole = (userObj.role || "agent").toLowerCase();

                const typeConfig =
                  activityTypeConfig[log.activity_type] || {
                    label: log.activity_type || "Aktivitas",
                    color: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
                    icon: <Activity className="w-3 h-3" />,
                  };

                return (
                  <div
                    key={log.id}
                    className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <Avatar className="h-8 w-8 sm:h-9 sm:w-9 border border-border shrink-0 mt-0.5">
                        <AvatarImage src={userObj.avatar_url} />
                        <AvatarFallback className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                          {userName.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-xs text-foreground">
                            {userName}
                          </span>
                          <Badge
                            variant="outline"
                            className="text-[9px] uppercase font-mono px-1.5 py-0.2 bg-muted/60 text-muted-foreground border-border"
                          >
                            {userRole.replace("_", " ")}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[9px] font-bold px-1.5 py-0.2 border flex items-center gap-1",
                              typeConfig.color
                            )}
                          >
                            {typeConfig.icon}
                            {typeConfig.label}
                          </Badge>
                        </div>

                        <p className="text-[11px] text-foreground/90 leading-relaxed break-words bg-muted/40 p-2 rounded-lg border border-border/40 font-mono">
                          {log.notes || "Tidak ada catatan detail."}
                        </p>
                      </div>
                    </div>

                    <div className="text-left sm:text-right shrink-0 pt-1 sm:pt-0 border-t sm:border-0 border-border/40">
                      <span className="text-[10px] sm:text-[11px] text-muted-foreground flex items-center sm:justify-end gap-1 font-mono">
                        <Clock className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        {log.created_at
                          ? format(new Date(log.created_at), "dd MMM yyyy, HH:mm", { locale: id })
                          : "-"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}