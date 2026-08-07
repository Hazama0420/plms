"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
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
  UserPlus,
  ArrowLeftRight,
  CalendarClock,
  CalendarPlus,
  CheckCircle2,
  Phone,
  Loader2,
  ChevronLeft,
  ChevronRight,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminAuditTrail } from "@/components/admin/AdminAuditTrail";
import { groupByDate } from "@/lib/activity-display";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { cn } from "@/lib/utils";

/** Jumlah log per halaman. */
const PAGE_SIZE = 50;

interface CrmActivity {
  id: string;
  activity_type: string;
  notes: string | null;
  created_at: string;
  user_id: string;
  users: {
    id: string;
    full_name: string | null;
    email: string | null;
    role: string | null;
    avatar_url: string | null;
  } | null;
}

// Mapping Jenis Aktivitas: badge warna adaptif + warna titik timeline.
//
// `activity_type` bertipe string bebas (bukan enum Postgres), jadi daftar ini
// murni lapisan tampilan. Isinya mengikuti nilai yang benar-benar ditulis
// codebase: services/crm.service.ts (created, status_change, followup_*),
// app/api/leads/route.ts (Klik WhatsApp, Lead Masuk, Inquiry Ulang), dan
// halaman CRM follow-up. Tipe di luar daftar jatuh ke fallback slate.
const activityTypeConfig: Record<
  string,
  { label: string; color: string; dot: string; icon: React.ReactNode }
> = {
  "WhatsApp Chat": {
    label: "Chat WA",
    color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    dot: "bg-emerald-500",
    icon: <MessageCircle className="w-3 h-3" />,
  },
  "Status Update": {
    label: "Update Status",
    color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    dot: "bg-blue-500",
    icon: <Activity className="w-3 h-3" />,
  },
  "Edit Follow-up": {
    label: "Edit Agenda",
    color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    dot: "bg-amber-500",
    icon: <Edit className="w-3 h-3" />,
  },
  "Delete Follow-up": {
    label: "Hapus Agenda",
    color: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    dot: "bg-rose-500",
    icon: <Trash2 className="w-3 h-3" />,
  },
  "AI Writer": {
    label: "AI Writer",
    color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    dot: "bg-purple-500",
    icon: <Sparkles className="w-3 h-3" />,
  },
  created: {
    label: "Lead Baru",
    color: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
    dot: "bg-green-500",
    icon: <UserPlus className="w-3 h-3" />,
  },
  status_change: {
    label: "Perubahan Status",
    color: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
    dot: "bg-indigo-500",
    icon: <ArrowLeftRight className="w-3 h-3" />,
  },
  followup_scheduled: {
    label: "Agenda Dijadwalkan",
    color: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
    dot: "bg-sky-500",
    icon: <CalendarClock className="w-3 h-3" />,
  },
  followup_completed: {
    label: "Agenda Selesai",
    color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    dot: "bg-emerald-500",
    icon: <CheckCircle2 className="w-3 h-3" />,
  },
  note: {
    label: "Catatan",
    color: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
    dot: "bg-slate-400",
    icon: <FileText className="w-3 h-3" />,
  },
  "Schedule Follow-up": {
    label: "Jadwal Agenda",
    color: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
    dot: "bg-sky-500",
    icon: <CalendarPlus className="w-3 h-3" />,
  },
  "Klik WhatsApp (Client)": {
    label: "Klik WA (Client)",
    color: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
    dot: "bg-green-500",
    icon: <Phone className="w-3 h-3" />,
  },
  "Lead Masuk (Website)": {
    label: "Lead Masuk (Web)",
    color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    dot: "bg-blue-500",
    icon: <UserPlus className="w-3 h-3" />,
  },
  "Inquiry Ulang (Website)": {
    label: "Inquiry Ulang (Web)",
    color: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20",
    dot: "bg-teal-500",
    icon: <RefreshCw className="w-3 h-3" />,
  },
};

const FALLBACK_TYPE_CONFIG = {
  color: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
  dot: "bg-slate-400",
  icon: <Activity className="w-3 h-3" />,
};

export default function AdminActivityLogsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [logs, setLogs] = useState<CrmActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<string | null>("all");

  // Pagination
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  // Delete (Super Admin only)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  // State Auth Pengguna
  const [currentUserRole, setCurrentUserRole] = useState<string>("");

  // Tab aktif. Dikendalikan (bukan defaultValue) karena tombol Refresh di
  // header hanya relevan untuk tab aktivitas CRM — tab audit memuat sendiri.
  const [activeTab, setActiveTab] = useState("crm");

  const isSuperAdmin = useMemo(() => {
    return currentUserRole === "super_admin" || currentUserRole === "superadmin";
  }, [currentUserRole]);

  const isAdmin = useMemo(() => {
    return currentUserRole === "admin";
  }, [currentUserRole]);

  const isAdminOrSuperAdmin = isSuperAdmin || isAdmin;

  // Sinkronkan page dari URL saat mount (sekali saja)
  useEffect(() => {
    const pageParam = searchParams.get("page");
    const pageNum = pageParam ? parseInt(pageParam, 10) : 1;
    if (pageNum > 0) {
      setPage(pageNum);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===== FETCH LOGS DENGAN PAGINATION + RBAC FILTERING =====
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

      // 2. Ambil Role Pengguna Saat Ini
      const { data: userData } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      const role = (userData?.role || user.user_metadata?.role || "agent").toLowerCase().trim();
      setCurrentUserRole(role);

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

      // 4. Query Utama dengan Pagination
      const offset = (page - 1) * PAGE_SIZE;
      let query = supabase
        .from("crm_activities")
        .select(
          `
          id,
          activity_type,
          notes,
          created_at,
          user_id,
          users:user_id (id, full_name, email, role, avatar_url)
        `,
          { count: "exact" }
        )
        .order("created_at", { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);

      // Jika role Admin (bukan Super Admin), filter out log Super Admin
      if (userIsAdmin) {
        if (targetUserIds.length > 0) {
          query = query.in("user_id", targetUserIds);
        } else {
          query = query.eq("user_id", "00000000-0000-0000-0000-000000000000");
        }
      }

      const { data, error, count } = await query;

      if (!error && data) {
        // PostgREST menandai setiap embed sebagai array pada tipe hasilnya.
        // `user_id` adalah relasi many-to-one, jadi isinya selalu satu baris
        // atau kosong — diratakan di sini supaya cocok dengan CrmActivity.
        setLogs(
          data.map((row) => ({
            ...row,
            users: Array.isArray(row.users) ? row.users[0] ?? null : row.users ?? null,
          }))
        );
        setTotalCount(count ?? 0);
      }
    } catch (err) {
      console.error("Gagal mengambil data log aktivitas:", err);
    } finally {
      setLoading(false);
    }
  }, [page]);

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

  // ===== PAGINATION =====
  const goToPage = useCallback(
    (nextPage: number) => {
      if (nextPage < 1 || nextPage > totalPages || nextPage === page) return;
      setPage(nextPage);
      setSelectedIds(new Set()); // pilihan lintas halaman tidak didukung
      const params = new URLSearchParams(searchParams.toString());
      params.set("page", String(nextPage));
      router.replace(`/admin/logs?${params.toString()}`);
    },
    [page, totalPages, searchParams, router]
  );

  // Ganti halaman / ubah filter → reset ke halaman 1
  useEffect(() => {
    if (page !== 1) {
      setPage(1);
      setSelectedIds(new Set());
      router.replace("/admin/logs");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, selectedUser]);

  // ===== DELETE (SUPER ADMIN) =====
  const handleDelete = useCallback(
    async (ids: string[]) => {
      if (ids.length === 0) return;
      setDeleting(true);
      try {
        const res = await fetch("/api/admin/logs", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error ?? "Gagal menghapus log.");
        }
        toast.success(`${json.deleted} log aktivitas dihapus.`);
        setSelectedIds(new Set());
        // Kurangi total agar halaman terakhir tidak menjadi kosong
        if (page > 1 && totalCount - json.deleted <= (page - 1) * PAGE_SIZE) {
          setPage(page - 1);
        } else {
          fetchLogs();
        }
      } catch (error) {
        console.error("Gagal menghapus log:", error);
        toast.error("Gagal menghapus log", {
          description: error instanceof Error ? error.message : "Terjadi kesalahan saat menghapus.",
        });
      } finally {
        setDeleting(false);
      }
    },
    [page, totalCount, fetchLogs]
  );

  const handleDeleteSingle = useCallback(
    (log: CrmActivity) => {
      if (
        window.confirm(
          `Hapus log aktivitas "${log.activity_type || "Aktivitas"}" milik ${
            log.users?.full_name || log.users?.email || "pengguna"
          }?`
        )
      ) {
        handleDelete([log.id]);
      }
    },
    [handleDelete]
  );

  const handleBulkDelete = useCallback(() => {
    const count = selectedIds.size;
    if (count === 0) return;
    if (window.confirm(`Hapus ${count} log aktivitas terpilih secara permanen?`)) {
      handleDelete(Array.from(selectedIds));
    }
  }, [selectedIds, handleDelete]);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === logs.length && logs.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(logs.map((log) => log.id)));
    }
  }, [logs, selectedIds]);

  const toggleSelectOne = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

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

  // Kelompokkan per tanggal untuk tampilan timeline.
  //
  // Catatan: pencarian & filter akun bekerja atas `logs` — yaitu batch 50 pada
  // halaman aktif, bukan seluruh basis data. Pencarian lintas semua halaman
  // butuh endpoint server-side dan berada di luar cakupan perubahan ini.
  const groupedLogs = useMemo(() => groupByDate(filteredLogs), [filteredLogs]);

  const allSelected = logs.length > 0 && selectedIds.size === logs.length;

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

          {activeTab === "crm" && (
            <Button
              variant="outline"
              size="sm"
              onClick={fetchLogs}
              className="text-xs h-8 gap-1.5 cursor-pointer border-border bg-background hover:bg-muted text-foreground"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} /> Refresh
            </Button>
          )}
        </div>
      </div>

      {/* TAB: aktivitas operasional CRM vs penggunaan wewenang administratif.
          Keduanya "log", tetapi menjawab pertanyaan yang berbeda dan disimpan di
          tabel berbeda (crm_activities vs admin_audit_log).

          Tab audit hanya dirender untuk Super Admin: GET /api/admin/audit
          memakai requireRole(['super_admin']), jadi menampilkannya kepada Admin
          hanya akan berujung 403. */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        {isSuperAdmin && (
          <TabsList className="bg-muted/50 border border-border h-auto p-1">
            <TabsTrigger value="crm" className="text-xs px-3 py-1.5 cursor-pointer gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Aktivitas CRM
            </TabsTrigger>
            <TabsTrigger value="admin" className="text-xs px-3 py-1.5 cursor-pointer gap-1.5">
              <Lock className="w-3.5 h-3.5" /> Aksi Admin
            </TabsTrigger>
          </TabsList>
        )}

        <TabsContent value="crm" className="space-y-4 mt-0">
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

      {/* BAR AKSI BORONGAN (BULK DELETE) */}
      {isSuperAdmin && selectedIds.size > 0 && (
        <Card className="border border-rose-500/30 bg-rose-500/5 shadow-sm">
          <CardContent className="p-3 flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-foreground">
              {selectedIds.size} log dipilih
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedIds(new Set())}
                className="h-9 text-xs cursor-pointer"
              >
                Batal
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
                disabled={deleting}
                className="h-9 text-xs gap-1.5 cursor-pointer"
              >
                {deleting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                Hapus Terpilih
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* TIMELINE LOG AKTIVITAS */}
      <Card className="border border-border shadow-2xs bg-card overflow-hidden text-card-foreground">
        <CardHeader className="p-3.5 border-b border-border bg-muted/30">
          <CardTitle className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Riwayat Log Sistem
              {isSuperAdmin && filteredLogs.length > 0 && (
                <label className="flex items-center gap-1.5 ml-2 cursor-pointer normal-case font-normal text-[10px]">
                  <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} className="h-3.5 w-3.5" />
                  <span>Pilih Semua</span>
                </label>
              )}
            </span>
            <Badge variant="outline" className="text-[10px] bg-background font-mono border-border">
              Hal. {page}/{totalPages} · {totalCount} log
            </Badge>
          </CardTitle>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-sm text-muted-foreground space-y-2">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto text-emerald-600 dark:text-emerald-400" />
              <p>Memuat data log aktivitas...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground space-y-2">
              <ShieldAlert className="w-8 h-8 opacity-40 mx-auto" />
              <p className="font-semibold text-foreground">Tidak ada catatan log aktivitas ditemukan.</p>
              <p className="text-xs">Coba ubah kata kunci pencarian atau reset filter akun Anda.</p>
            </div>
          ) : (
            <div className="relative">
              {groupedLogs.map((group) => (
                <div key={group.label}>
                  {/* Header tanggal sticky */}
                  <div className="sticky top-0 z-10 bg-card border-b border-border px-4 py-2">
                    <h3 className="text-xs font-bold text-foreground">{group.label}</h3>
                  </div>

                  {/* Entri timeline per tanggal */}
                  <div className="relative pl-6 py-2">
                    {/* Garis vertikal timeline */}
                    <div className="absolute left-6 top-0 bottom-0 w-px bg-border" />

                    {group.items.map((log) => {
                      const userObj = log.users;
                      const userName = userObj?.full_name || userObj?.email || "Sistem Administrator";
                      const userRole = (userObj?.role || "agent").toLowerCase();
                      const typeConfig = activityTypeConfig[log.activity_type] || {
                        label: log.activity_type || "Aktivitas",
                        ...FALLBACK_TYPE_CONFIG,
                      };
                      const isSelected = selectedIds.has(log.id);

                      return (
                        <div key={log.id} className="relative flex items-start gap-3 pb-4 pr-4 group">
                          {/* Titik timeline */}
                          <div
                            className={cn(
                              "absolute left-[-13px] w-3 h-3 rounded-full border-2 border-background z-10",
                              typeConfig.dot
                            )}
                          />

                          {/* Checkbox (Super Admin) */}
                          {isSuperAdmin && (
                            <div className="shrink-0 pt-1">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleSelectOne(log.id)}
                                className="h-4 w-4"
                              />
                            </div>
                          )}

                          {/* Avatar */}
                          <Avatar className="h-8 w-8 border border-border shrink-0 mt-0.5">
                            <AvatarImage src={userObj?.avatar_url || undefined} />
                            <AvatarFallback className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                              {userName.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>

                          {/* Konten */}
                          <div className="flex-1 min-w-0 space-y-1.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-sm text-foreground">{userName}</span>
                              <Badge
                                variant="outline"
                                className="text-[9px] uppercase font-mono px-1.5 py-0.5 bg-muted/60 text-muted-foreground border-border"
                              >
                                {userRole.replace("_", " ")}
                              </Badge>
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[10px] font-bold px-1.5 py-0.5 border flex items-center gap-1",
                                  typeConfig.color
                                )}
                              >
                                {typeConfig.icon}
                                {typeConfig.label}
                              </Badge>
                            </div>

                            <p className="text-[13px] text-foreground/90 leading-relaxed break-words bg-muted/30 p-2.5 rounded-lg border border-border/40">
                              {log.notes || "Tidak ada catatan detail."}
                            </p>

                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {log.created_at
                                  ? format(new Date(log.created_at), "HH:mm", { locale: id })
                                  : "-"}
                              </span>

                              {/* Tombol hapus satuan (Super Admin) */}
                              {isSuperAdmin && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteSingle(log)}
                                  disabled={deleting}
                                  className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                                  title="Hapus log ini"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>

        {/* PAGINATION */}
        {!loading && totalPages > 1 && (
          <div className="border-t border-border p-3 flex flex-col sm:flex-row items-center justify-between gap-3 bg-muted/20">
            <p className="text-xs text-muted-foreground">
              Menampilkan {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, totalCount)} dari {totalCount} log
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(page - 1)}
                disabled={page === 1}
                className="h-9 px-3 text-xs cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Sebelumnya
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(page + 1)}
                disabled={page === totalPages}
                className="h-9 px-3 text-xs cursor-pointer"
              >
                Berikutnya
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </Card>
        </TabsContent>

        {isSuperAdmin && (
          <TabsContent value="admin" className="mt-0">
            <AdminAuditTrail />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}