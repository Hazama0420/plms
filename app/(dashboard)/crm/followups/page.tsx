"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  Calendar,
  User,
  Clock,
  MoreHorizontal,
  Pencil,
  Trash2,
  MessageCircle,
  Sparkles,
  RefreshCw,
  AlertCircle,
  Check,
  Copy,
  Send,
  Eye,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";
import { crmService } from "@/services/crm.service";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { format, isBefore, isToday } from "date-fns";
import { id } from "date-fns/locale";
import { useTranslation } from "@/hooks/use-translation";

// ============================================================
// TIPE DATA & STATUS CONFIG
// ============================================================
export interface FollowUpItem {
  id: string;
  lead_id: string;
  notes: string | null;
  followup_date: string;
  status: "pending" | "completed" | "cancelled" | "overdue" | string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  assigned_to?: string | null;
  created_by?: string | null;
  lead_name: string;
  lead_phone: string;
  lead_email: string;
  assigned_user_name: string;
}

// statusConfig moved inside component to react to language changes

export default function FollowupsPage() {
  const router = useRouter();
  const { t } = useTranslation();

  const statusConfig: Record<string, { label: string; color: string }> = {
    pending: {
      label: t("crm.followups.statusLabel.pending"),
      color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    },
    completed: {
      label: t("crm.followups.statusLabel.completed"),
      color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    },
    cancelled: {
      label: t("crm.followups.statusLabel.cancelled"),
      color: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
    },
    overdue: {
      label: t("crm.followups.statusLabel.overdue"),
      color: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    },
  };

  const [followups, setFollowups] = useState<FollowUpItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<string>("all");

  // User State & RBAC
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string>("");

  // AI Modal Assistant States & Limit 3x per hari
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [selectedFollowup, setSelectedFollowup] = useState<FollowUpItem | null>(null);
  const [aiMessage, setAiMessage] = useState("");
  const [generatingAi, setGeneratingAi] = useState(false);
  const isAdminOrSuperAdmin = useMemo(() => {
    return (
      currentUserRole === "super_admin" ||
      currentUserRole === "superadmin" ||
      currentUserRole === "admin"
    );
  }, [currentUserRole]);

  // 🔒 SENSOR NOMOR HP TERSTANDAR: HANYA ADMIN & AGEN PENANGGUNG JAWAB YANG DAPAT MELIHAT
  const canAccessContact = useCallback(
    (item?: FollowUpItem) => {
      if (isAdminOrSuperAdmin) return true;
      if (!currentUserId || !item) return false;
      return item.assigned_to === currentUserId;
    },
    [isAdminOrSuperAdmin, currentUserId]
  );

  const formatPhoneForUser = useCallback(
    (phone?: string, item?: FollowUpItem) => {
      if (!phone) return "-";
      if (isAdminOrSuperAdmin || (item && canAccessContact(item))) return phone;
      return "08xx-xxxx-xxxx";
    },
    [isAdminOrSuperAdmin, canAccessContact]
  );

  const canModifyFollowup = useCallback(
    (item: FollowUpItem) => {
      if (!item) return false;
      if (isAdminOrSuperAdmin) return true;
      if (!currentUserId) return false;

      return (
        item.assigned_to === currentUserId ||
        item.created_by === currentUserId
      );
    },
    [isAdminOrSuperAdmin, currentUserId]
  );

  // ===== 🚀 PEMANGGILAN DATA SEQUENTIAL =====
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Ambil User Auth
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      setCurrentUserId(user.id);

      // 2. Ambil Role User
      const { data: userData } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      const role = (userData?.role || user.user_metadata?.role || "agent").toLowerCase();
      setCurrentUserRole(role);

      const isUserAdmin =
        role === "super_admin" || role === "superadmin" || role === "admin";

      // (Penggunaan AI diatur penuh di backend)

      // 4. Fetch Follow-ups
      let query = supabase
  .from("crm_followups")
  .select(`
    *,
    lead:crm_leads (
      id,
      budget,
      interest_type,
      contact:crm_contacts (
        full_name,
        phone,
        email
      )
    ),
    assigned_user:users!assigned_to (
      id,
      full_name,
      email
    )
  `)
  .order("followup_date", { ascending: true });

      // Jika role Agent, filter hanya agenda miliknya
      if (!isUserAdmin) {
        query = query.eq("assigned_to", user.id);
      }

      const { data, error } = await query;
      if (error) throw error;

      const mapped: FollowUpItem[] = (data || []).map((item: any) => {
        const leadObj = item.lead || {};
        const contactObj = leadObj.contact || leadObj.crm_contacts || {};

        const leadName =
          contactObj.full_name ||
          leadObj.full_name ||
          leadObj.name ||
          leadObj.contact_name ||
          "Prospek Lead";

        const leadPhone = contactObj.phone || leadObj.phone || leadObj.contact_phone || "";
        const leadEmail = contactObj.email || leadObj.email || "";
        const assignedName =
          item.assigned_user?.full_name || item.assigned_user?.email || "Belum Ditugaskan";

        return {
          id: item.id,
          lead_id: item.lead_id,
          notes: item.notes || "",
          followup_date: item.followup_date,
          status: item.status || "pending",
          completed_at: item.completed_at,
          created_at: item.created_at,
          updated_at: item.updated_at,
          assigned_to: item.assigned_to,
          created_by: item.created_by,
          lead_name: leadName,
          lead_phone: leadPhone,
          lead_email: leadEmail,
          assigned_user_name: assignedName,
        };
      });

      setFollowups(mapped);
    } catch (error: any) {
      console.error("Error loading followups:", error?.message || error);
      toast.error(t("crm.followups.toastLoadError"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ===== TOGGLE STATUS SELESAI + CRM ACTIVITY LOG =====
  const handleToggleComplete = async (e: React.MouseEvent, item: FollowUpItem) => {
    e.stopPropagation();

    if (!canModifyFollowup(item)) {
      toast.error(t("crm.followups.toastAccessDenied"), {
        description: t("crm.followups.toastAgentModifyWarning"),
      });
      return;
    }

    const isCompleted = item.status === "completed";
    const newStatus = isCompleted ? "pending" : "completed";
    setFollowups((prev) =>
      prev.map((f) =>
        f.id === item.id ? ({ ...f, status: newStatus, completed_at: isCompleted ? null : new Date().toISOString() } as FollowUpItem) : f
      )
    );

    try {
      const result = await crmService.updateFollowup(item.id, { status: newStatus });

      setFollowups((prev) =>
        prev.map((followup) => followup.id === item.id ? { ...followup, ...result.data } : followup)
      );

      if (result.lifecycle.shouldOfferNextFollowup) {
        toast.success(t("crm.followups.toastFollowupSuccess").replace("{name}", item.lead_name), {
          description: t("crm.followups.toastFollowupSuggestion"),
          action: {
            label: t("crm.followups.toastCreateNext"),
            onClick: () => router.push(`/crm/followups/create?lead_id=${result.lifecycle.leadId}`),
          },
        });
      } else {
        toast.success(
          isCompleted
            ? t("crm.followups.toastStatusReverted")
            : t("crm.followups.toastFollowupSuccess").replace("{name}", item.lead_name)
        );
      }
    } catch (err: any) {
      toast.error(t("common.error") + ": " + err.message);
      loadData();
    }
  };

  // ===== HAPUS FOLLOW-UP (KHUSUS ADMIN / SUPER ADMIN) =====
  const handleDelete = async (item: FollowUpItem) => {
    if (!isAdminOrSuperAdmin) {
      toast.error(t("crm.followups.toastAccessDenied"), {
        description: t("crm.followups.toastDeleteWarning"),
      });
      return;
    }

    if (!confirm(t("crm.followups.toastDeleteConfirm").replace("{name}", item.lead_name))) return;

    try {
      await crmService.deleteFollowup(item.id);

      if (currentUserId && item.lead_id) {
        await supabase.from("crm_activities").insert([
          {
            lead_id: item.lead_id,
            user_id: currentUserId,
            activity_type: "Delete Follow-up",
            notes: `Agenda follow-up dengan ${item.lead_name} dihapus oleh Admin`,
            created_at: new Date().toISOString(),
          },
        ]);
      }

      toast.success(t("crm.followups.toastDeleteSuccess"));
      setFollowups((prev) => prev.filter((f) => f.id !== item.id));
    } catch (error: any) {
      toast.error(t("common.error") + ": " + error.message);
    }
  };

  // 🛡️ CHAT WA & PENCATATAN LOG AKTIVITAS DENGAN PROTEKSI AKSES KONTAK
  const handleOpenWhatsApp = async (e: React.MouseEvent, item: FollowUpItem) => {
    e.stopPropagation();

    if (!canAccessContact(item)) {
      toast.error(t("crm.followups.toastAccessDenied"), {
        description: t("crm.followups.toastWaLockedWarning"),
      });
      return;
    }

    if (!item.lead_phone) {
      toast.error(t("crm.followups.toastNoPhone"));
      return;
    }

    if (currentUserId && item.lead_id) {
      try {
        const actorLabel = isAdminOrSuperAdmin ? "Admin" : "Agen";
        await supabase.from("crm_activities").insert([
          {
            lead_id: item.lead_id,
            user_id: currentUserId,
            activity_type: "WhatsApp Chat",
            notes: `${actorLabel} mengontak ${item.lead_name} via WhatsApp Direct`,
            created_at: new Date().toISOString(),
          },
        ]);
      } catch (err) {
        console.error("Gagal mencatat log aktivitas WA:", err);
      }
    }

    let cleanPhone = item.lead_phone.replace(/[^0-9]/g, "");
    if (cleanPhone.startsWith("0")) cleanPhone = "62" + cleanPhone.slice(1);
    const msg = encodeURIComponent(
      `Halo Bpk/Ibu *${item.lead_name}*,\n\nSalam hangat dari Tim Inland Property. Mengenai rencana diskusi/follow-up kita:\n\n"${item.notes || "Prospek penawaran unit properti"}"\n\nApakah ada waktu luang untuk berdiskusi lebih lanjut hari ini? Terima kasih!`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${msg}`, "_blank");
  };

  // 🛡️ AI WRITER DENGAN PROTEKSI ROLE
  const handleOpenAiWriter = async (e: React.MouseEvent, item: FollowUpItem) => {
    e.stopPropagation();

    if (!isAdminOrSuperAdmin) {
      toast.error(t("crm.followups.toastAccessDenied"), {
        description: t("crm.followups.toastAiLockedWarning"),
      });
      return;
    }

    if (!currentUserId) {
      toast.error(t("crm.followups.toastNoSession"));
      return;
    }

    setSelectedFollowup(item);
    setIsAiModalOpen(true);
    setGeneratingAi(true);
    setAiMessage("");

    try {
      const res = await fetch("/api/ai/followup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadName: item.lead_name,
          property: item.notes || "Properti Pilihan",
          status: item.status || "Pending Follow-up",
        }),
      });

      if (!res.ok) {
        if (res.status === 429) {
          toast.error(t("crm.followups.toastAiLimit"));
        } else if (res.status === 403) {
          toast.error(t("crm.followups.toastAiUnavailable"));
        } else if (res.status === 503) {
          toast.error(t("crm.followups.toastAiServiceDown"));
        } else {
          toast.error(t("crm.followups.toastAiError"));
        }
        setIsAiModalOpen(false);
        return;
      }

      const data = await res.json();
      if (data?.message) {
        setAiMessage(data.message);
      } else {
        toast.error(t("crm.followups.toastAiFormatError"));
        setIsAiModalOpen(false);
      }
    } catch (err) {
      toast.error(t("crm.followups.toastNetworkError"));
      setIsAiModalOpen(false);
    } finally {
      setGeneratingAi(false);
    }
  };

  // ===== CALCULATE STATS =====
  const stats = useMemo(() => {
    const total = followups.length;
    const pending = followups.filter((f) => f.status === "pending").length;
    const completed = followups.filter((f) => f.status === "completed").length;
    const overdue = followups.filter((f) => {
      if (f.status === "overdue") return true;
      if (f.status !== "pending" || !f.followup_date) return false;
      const date = new Date(f.followup_date);
      return isBefore(date, new Date()) && !isToday(date);
    }).length;

    return { total, pending, completed, overdue };
  }, [followups]);

  // ===== FILTERED DATA =====
  const filteredFollowups = useMemo(() => {
    return followups.filter((item) => {
      const matchSearch =
        item.lead_name.toLowerCase().includes(search.toLowerCase()) ||
        item.notes?.toLowerCase().includes(search.toLowerCase()) ||
        item.assigned_user_name.toLowerCase().includes(search.toLowerCase());

      if (!matchSearch) return false;

      if (activeTab === "pending") return item.status === "pending";
      if (activeTab === "completed") return item.status === "completed";
      if (activeTab === "overdue") {
        if (item.status === "overdue") return true;
        if (item.status !== "pending" || !item.followup_date) return false;
        const d = new Date(item.followup_date);
        return isBefore(d, new Date()) && !isToday(d);
      }
      return true;
    });
  }, [followups, search, activeTab]);

  return (
    <div className="space-y-6 pb-16 bg-background min-h-screen text-foreground">
      {/* 1. HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            📅 {t("crm.followups.title")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("crm.followups.subtitle")}
          </p>
        </div>

        <Button
          onClick={() => router.push("/crm/followups/create")}
          className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 gap-2 shrink-0 cursor-pointer"
        >
          <Plus className="h-4 w-4" /> {t("crm.followups.createBtn")}
        </Button>
      </div>

      {/* 2. STATS CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3.5 border border-border shadow-xs bg-card hover:border-emerald-500/30 transition">
          <span className="text-[11px] font-semibold text-muted-foreground block">
            {t("crm.followups.stats.total")}
          </span>
          <span className="text-xl font-bold font-mono text-foreground mt-0.5 block">
            {stats.total}
          </span>
        </Card>
        <Card className="p-3.5 border border-border shadow-xs bg-card hover:border-amber-500/30 transition">
          <span className="text-[11px] font-semibold text-muted-foreground block">
            {t("crm.followups.stats.pending")}
          </span>
          <span className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-0.5 block">
            {stats.pending}
          </span>
        </Card>
        <Card className="p-3.5 border border-border shadow-xs bg-card hover:border-rose-500/30 transition">
          <span className="text-[11px] font-semibold text-muted-foreground block">
            {t("crm.followups.stats.overdue")}
          </span>
          <span className="text-xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-0.5 block">
            {stats.overdue}
          </span>
        </Card>
        <Card className="p-3.5 border border-border shadow-xs bg-card hover:border-emerald-500/30 transition">
          <span className="text-[11px] font-semibold text-muted-foreground block">
            {t("crm.followups.stats.completed")}
          </span>
          <span className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 block">
            {stats.completed}
          </span>
        </Card>
      </div>

      {/* 3. SEARCH & FILTER TABS */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("crm.followups.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs border-border bg-background text-foreground"
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 w-full sm:w-auto justify-between sm:justify-end">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto max-w-full">
            <TabsList className="bg-muted p-1 h-9 border border-border overflow-x-auto scrollbar-none whitespace-nowrap flex w-auto">
              <TabsTrigger value="all" className="text-xs px-2.5">
                {t("crm.followups.tabs.all")} ({stats.total})
              </TabsTrigger>
              <TabsTrigger value="pending" className="text-xs px-2.5">
                {t("crm.followups.tabs.pending")} ({stats.pending})
              </TabsTrigger>
              <TabsTrigger value="overdue" className="text-xs px-2.5 text-rose-600 dark:text-rose-400">
                {t("crm.followups.tabs.overdue")} ({stats.overdue})
              </TabsTrigger>
              <TabsTrigger value="completed" className="text-xs px-2.5">
                {t("crm.followups.tabs.completed")} ({stats.completed})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Button
            variant="outline"
            size="icon"
            onClick={loadData}
            className="h-9 w-9 shrink-0 cursor-pointer border-border bg-background hover:bg-muted text-foreground"
            title="Refresh Data"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* 4. FOLLOW-UP LIST */}
      {loading ? (
        <Card className="border border-border bg-card shadow-xs overflow-hidden">
          <CardContent className="p-0">
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full bg-muted" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : filteredFollowups.length === 0 ? (
        <Card className="border border-border bg-card shadow-xs overflow-hidden">
          <CardContent className="p-0">
            <div className="flex h-64 flex-col items-center justify-center p-8 text-center text-muted-foreground">
              <Calendar className="h-10 w-10 mb-2 opacity-40" />
              <p className="text-sm font-semibold text-foreground">{t("crm.followups.emptyTitle")}</p>
              <p className="text-xs max-w-sm mt-1">
                {t("crm.followups.emptyDesc")}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="block md:hidden space-y-3">
            {filteredFollowups.map((item) => {
              const st = statusConfig[item.status] || statusConfig.pending;
              const dateObj = item.followup_date ? new Date(item.followup_date) : null;
              const isItemOverdue =
                item.status === "pending" &&
                dateObj &&
                isBefore(dateObj, new Date()) &&
                !isToday(dateObj);

              return (
                <Card
                  key={item.id}
                  onClick={() => router.push(item.lead_id ? `/crm/leads/${item.lead_id}?tab=followups` : `/crm/followups/${item.id}`)}
                  className="border border-border bg-card rounded-xl p-3 space-y-2 cursor-pointer hover:bg-muted/50 transition"
                >
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="outline" className={cn("text-[9px] font-bold px-1.5 py-0.5 border", isItemOverdue ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20" : st.color)}>
                      {isItemOverdue ? "Overdue" : st.label}
                    </Badge>
                    <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {dateObj ? format(dateObj, "dd MMM yyyy HH:mm", { locale: id }) : "-"}
                    </span>
                  </div>

                  <div className="space-y-0.5">
                    <p className="font-bold text-xs text-foreground flex items-center gap-1.5 truncate">
                      <User className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      {item.lead_name}
                    </p>
                    {item.lead_phone && (
                      <p className="text-[10px] text-muted-foreground font-mono pl-5">
                        {formatPhoneForUser(item.lead_phone, item)}
                      </p>
                    )}
                  </div>

                  {item.notes && (
                    <p className="text-[11px] text-muted-foreground line-clamp-2">{item.notes}</p>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-border/50">
                    <span className="text-[10px] text-muted-foreground truncate">{item.assigned_user_name}</span>
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => handleToggleComplete(e, item)}
                        className={cn(
                          "h-7 px-2 text-[10px] rounded-lg flex items-center gap-1 transition",
                          item.status === "completed"
                            ? "bg-emerald-600/10 text-emerald-600 dark:text-emerald-400"
                            : "bg-muted text-muted-foreground hover:bg-emerald-600/10 hover:text-emerald-600"
                        )}
                      >
                        <Check className="w-3 h-3" />
                        {item.status === "completed" ? t("crm.followups.statusLabel.completed") : t("crm.followups.markDone")}
                      </button>
                      <button
                        onClick={(e) => handleOpenWhatsApp(e, item)}
                        className={cn(
                          "h-7 px-2 text-[10px] rounded-lg flex items-center gap-1",
                          canAccessContact(item)
                            ? "bg-emerald-600/10 text-emerald-600 dark:text-emerald-400"
                            : "bg-muted text-muted-foreground"
                        )}
                        title={canAccessContact(item) ? "WhatsApp" : "Terkunci"}
                      >
                        {canAccessContact(item) ? <MessageCircle className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                        WA
                      </button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block">
            <Card className="border border-border bg-card shadow-xs overflow-hidden">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow className="border-b border-border">
                        <TableHead className="w-10 text-center">{t("crm.followups.table.done")}</TableHead>
                        <TableHead className="text-xs font-semibold text-muted-foreground">{t("crm.followups.table.leadClient")}</TableHead>
                        <TableHead className="text-xs font-semibold text-muted-foreground">{t("crm.followups.table.activityNotes")}</TableHead>
                        <TableHead className="text-xs font-semibold text-muted-foreground">{t("crm.followups.table.followupSchedule")}</TableHead>
                        <TableHead className="text-xs font-semibold text-muted-foreground">{t("crm.followups.table.status")}</TableHead>
                        <TableHead className="text-xs font-semibold text-muted-foreground">{t("crm.followups.table.pic")}</TableHead>
                        <TableHead className="text-xs font-semibold text-muted-foreground text-right">{t("crm.followups.table.actionWa")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredFollowups.map((item) => {
                        const st = statusConfig[item.status] || statusConfig.pending;
                        const dateObj = item.followup_date ? new Date(item.followup_date) : null;
                        const isItemOverdue =
                          item.status === "pending" &&
                          dateObj &&
                          isBefore(dateObj, new Date()) &&
                          !isToday(dateObj);
                        const hasAccess = canModifyFollowup(item);

                        return (
                          <TableRow
                            key={item.id}
                            onDoubleClick={() => router.push(item.lead_id ? `/crm/leads/${item.lead_id}?tab=followups` : `/crm/followups/${item.id}`)}
                            className={cn(
                              "hover:bg-muted/60 border-b border-border transition-colors cursor-pointer select-none",
                              item.status === "completed" && "opacity-75 bg-muted/20"
                            )}
                            title="Klik 2x untuk membuka detail lead & agenda"
                          >
                            <TableCell className="text-center p-2">
                              <div
                                role="button"
                                tabIndex={0}
                                onClick={(e) => handleToggleComplete(e, item)}
                                className={cn(
                                  "w-5 h-5 rounded-md border flex items-center justify-center mx-auto cursor-pointer transition",
                                  item.status === "completed"
                                    ? "bg-emerald-600 border-emerald-600 text-white"
                                    : "border-border bg-background hover:border-emerald-500"
                                )}
                                title={
                                  item.status === "completed"
                                    ? t("crm.followups.statusLabel.pending")
                                    : t("crm.followups.statusLabel.completed")
                                }
                              >
                                {item.status === "completed" && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                              </div>
                            </TableCell>

                            <TableCell className="p-3">
                              <div className="flex flex-col">
                                <span
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    router.push(item.lead_id ? `/crm/leads/${item.lead_id}?tab=followups` : `/crm/followups/${item.id}`);
                                  }}
                                  className="font-bold text-xs text-foreground flex items-center gap-1.5 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
                                >
                                  <User className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                  {item.lead_name}
                                </span>
                                {item.lead_phone && (
                                  <span className="text-[10px] text-muted-foreground font-mono pl-5">
                                    {formatPhoneForUser(item.lead_phone, item)}
                                  </span>
                                )}
                              </div>
                            </TableCell>

                            <TableCell className="p-3">
                              <p className="text-xs text-foreground line-clamp-2 max-w-xs leading-relaxed">
                                {item.notes || "-"}
                              </p>
                            </TableCell>

                            <TableCell className="p-3 text-xs">
                              <div className="flex flex-col font-mono">
                                <span className="font-semibold text-foreground flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-muted-foreground shrink-0" />
                                  {dateObj
                                    ? format(dateObj, "dd MMM yyyy HH:mm", { locale: id })
                                    : "-"}
                                </span>
                                {isItemOverdue && (
                                  <span className="text-[9px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-0.5 mt-0.5">
                                    <AlertCircle className="w-2.5 h-2.5" /> {t("crm.followups.overdueLabel")}
                                  </span>
                                )}
                              </div>
                            </TableCell>

                            <TableCell className="p-3">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[10px] font-bold px-2 py-0.5 border",
                                  isItemOverdue
                                    ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                                    : st.color
                                )}
                              >
                                {isItemOverdue ? t("crm.followups.overdueBadge") : st.label}
                              </Badge>
                            </TableCell>

                            <TableCell className="p-3 text-xs text-muted-foreground">
                              {item.assigned_user_name}
                            </TableCell>

                            <TableCell className="p-3 text-right">
                              <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => handleOpenAiWriter(e, item)}
                                  className={cn(
                                    "h-8 px-2 gap-1 text-xs cursor-pointer",
                                    isAdminOrSuperAdmin
                                      ? "text-amber-600 dark:text-amber-400 hover:text-amber-700 hover:bg-amber-500/10"
                                      : "text-muted-foreground hover:bg-muted"
                                  )}
                                  title={isAdminOrSuperAdmin ? t("crm.followups.aiWriterBtn") : t("crm.followups.toastAiLockedWarning")}
                                >
                                  {isAdminOrSuperAdmin ? <Sparkles className="w-3.5 h-3.5 fill-amber-500 text-amber-500" /> : <Lock className="w-3.5 h-3.5 text-muted-foreground" />}
                                  {t("crm.followups.aiWriterBtn")}
                                </Button>

                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => handleOpenWhatsApp(e, item)}
                                  className={cn(
                                    "h-8 text-xs px-2 gap-1 cursor-pointer",
                                    canAccessContact(item)
                                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
                                      : "border-border bg-muted text-muted-foreground"
                                  )}
                                  title={canAccessContact(item) ? t("crm.followups.chatWaBtn") : t("crm.followups.toastWaLockedWarning")}
                                >
                                  {canAccessContact(item) ? <MessageCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Lock className="w-3.5 h-3.5 text-amber-500" />} {t("crm.followups.chatWaBtn")}
                                </Button>

                                <DropdownMenu>
                                  <DropdownMenuTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus:outline-hidden cursor-pointer">
                                    <MoreHorizontal className="w-4 h-4" />
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-48 bg-card border-border text-card-foreground">
                                    {item.lead_id && (
                                      <DropdownMenuItem onClick={() => router.push(`/crm/leads/${item.lead_id}?tab=followups`)}>
                                        <User className="w-3.5 h-3.5 mr-2 text-emerald-600 dark:text-emerald-400" /> Detail Lead & Properti
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem onClick={() => router.push(`/crm/followups/${item.id}`)}>
                                      <Eye className="w-3.5 h-3.5 mr-2 text-blue-600 dark:text-blue-400" /> {t("crm.followups.detailMenu")}
                                    </DropdownMenuItem>
                                    {hasAccess && (
                                      <DropdownMenuItem onClick={() => router.push(`/crm/followups/${item.id}/edit`)}>
                                        <Pencil className="w-3.5 h-3.5 mr-2" /> {t("crm.followups.editMenu")}
                                      </DropdownMenuItem>
                                    )}
                                    {isAdminOrSuperAdmin && (
                                      <DropdownMenuItem onClick={() => handleDelete(item)} className="text-rose-600 dark:text-rose-400">
                                        <Trash2 className="w-3.5 h-3.5 mr-2" /> {t("crm.followups.deleteMenu")}
                                      </DropdownMenuItem>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* 5. MODAL AI WRITER GENERATOR */}
      <Dialog open={isAiModalOpen} onOpenChange={setIsAiModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl border-border bg-card text-card-foreground">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500" /> {t("crm.followups.aiModal.title")}
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              {t("crm.followups.aiModal.desc").replace("{name}", selectedFollowup?.lead_name ?? "")}
            </DialogDescription>
          </DialogHeader>

          {generatingAi ? (
            <div className="p-8 text-center space-y-2">
              <RefreshCw className="w-8 h-8 text-emerald-600 dark:text-emerald-400 animate-spin mx-auto" />
              <p className="text-xs text-muted-foreground">{t("crm.followups.aiModal.generating")}</p>
            </div>
          ) : (
            <div className="space-y-3 py-2 text-xs">
              <Textarea
                value={aiMessage}
                onChange={(e) => setAiMessage(e.target.value)}
                rows={6}
                className="text-xs leading-relaxed font-mono bg-background border-border text-foreground resize-none focus-visible:ring-emerald-600"
              />
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(aiMessage);
                toast.success(t("crm.followups.toastCopySuccess"));
              }}
              className="text-xs gap-1.5 cursor-pointer border-border bg-background text-foreground"
            >
              <Copy className="w-3.5 h-3.5" /> {t("crm.followups.aiModal.copyBtn")}
            </Button>

            <Button
              size="sm"
              onClick={async () => {
                if (!isAdminOrSuperAdmin) {
                  toast.error(t("crm.followups.toastAccessDenied"), {
                    description: t("crm.followups.toastAdminWaWarning"),
                  });
                  return;
                }

                if (selectedFollowup?.lead_phone) {
                  if (currentUserId && selectedFollowup.lead_id) {
                    try {
                      await supabase.from("crm_activities").insert([
                        {
                          lead_id: selectedFollowup.lead_id,
                          user_id: currentUserId,
                          activity_type: "WhatsApp Chat",
                          notes: `Follow-up WA (via AI Writer) dikirim ke ${selectedFollowup.lead_name}`,
                          created_at: new Date().toISOString(),
                        },
                      ]);
                    } catch (err) {
                      console.error("Gagal mencatat log aktivitas WA:", err);
                    }
                  }

                  let clean = selectedFollowup.lead_phone.replace(/[^0-9]/g, "");
                  if (clean.startsWith("0")) clean = "62" + clean.slice(1);
                  window.open(`https://wa.me/${clean}?text=${encodeURIComponent(aiMessage)}`, "_blank");
                  setIsAiModalOpen(false);
                } else {
                  toast.error(t("crm.followups.toastNoPhoneAvail"));
                }
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" /> {t("crm.followups.aiModal.sendWaBtn")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
