"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Activity,
  MessageCircle,
  Clock,
  User,
  PhoneCall,
  RefreshCw,
  Edit,
  Trash2,
  Sparkles,
  ShieldAlert,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";
import { cn } from "@/lib/utils";

// Mapping Ikon & Warna berdasarkan Jenis Aktivitas
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

export default function AgentActivityMonitor() {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // User State
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string>("");

  const isSuperAdmin = useMemo(() => {
    return currentUserRole === "super_admin" || currentUserRole === "superadmin";
  }, [currentUserRole]);

  const isAdmin = useMemo(() => {
    return currentUserRole === "admin";
  }, [currentUserRole]);

  const isAdminOrSuperAdmin = isSuperAdmin || isAdmin;

  // Sensor Nomor HP jika role Agent
  const formatPhoneForUser = useCallback(
    (phone?: string) => {
      if (!phone) return "-";
      if (isAdminOrSuperAdmin) return phone;
      return "08xx-xxxx-xxxx";
    },
    [isAdminOrSuperAdmin]
  );

  // ===== FETCH ACTIVITIES SESUAI LOGIKA RBAC =====
  const fetchActivities = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Dapatkan Sesi Pengguna
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      setCurrentUserId(user.id);

      // 2. Ambil Role Pengguna
      const { data: userData } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      const role = (userData?.role || user.user_metadata?.role || "agent").toLowerCase().trim();
      setCurrentUserRole(role);

      const userIsSuperAdmin = role === "super_admin" || role === "superadmin";
      const userIsAdmin = role === "admin";

      // 3. Terapkan Filter RBAC
      let targetUserIds: string[] = [];

      if (userIsSuperAdmin) {
        // Super Admin dapat melihat seluruh log tanpa filter user_id
        targetUserIds = [];
      } else if (userIsAdmin) {
        // 🔴 ADMIN: Hanya dapat melihat aktivitas milik AGENT saja
        const { data: agentUsers } = await supabase
          .from("users")
          .select("id")
          .eq("role", "agent");

        targetUserIds = (agentUsers || []).map((u) => u.id);
      } else {
        // AGENT: Hanya dapat melihat aktivitas dirinya sendiri
        targetUserIds = [user.id];
      }

      // 4. Jalankan Query Utama Ke Supabase
      let query = supabase
        .from("crm_activities")
        .select(`
          id,
          activity_type,
          notes,
          created_at,
          user_id,
          users:user_id (id, full_name, avatar_url, email, role),
          crm_leads:lead_id (
            id,
            interest_type,
            crm_contacts (full_name, phone)
          )
        `)
        .order("created_at", { ascending: false })
        .limit(20);

      if (!userIsSuperAdmin) {
        if (targetUserIds.length > 0) {
          query = query.in("user_id", targetUserIds);
        } else {
          // Jika admin tidak memiliki agent sama sekali, berikan ID dummy agar hasil kosong
          query = query.eq("user_id", "00000000-0000-0000-0000-000000000000");
        }
      }

      const { data, error } = await query;

      if (error) throw error;
      setActivities(data || []);
    } catch (err: any) {
      console.error("Gagal memuat monitor aktivitas agen:", err?.message || err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActivities();

    // Channel Supabase Realtime
    const channel = supabase
      .channel("crm_activities_monitor_changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "crm_activities" },
        () => fetchActivities()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchActivities]);

  return (
    <Card className="border border-border shadow-2xs bg-card rounded-2xl overflow-hidden text-card-foreground">
      <CardHeader className="p-3.5 sm:p-4 border-b border-border bg-muted/20 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <div>
            <CardTitle className="text-xs sm:text-sm font-bold text-foreground">
              Pantauan Aktivitas Agen CRM
            </CardTitle>
            <p className="text-[10px] text-muted-foreground leading-none mt-0.5">
              {isSuperAdmin
                ? "Memantau seluruh log aktivitas tim (Agent, Admin & Super Admin)"
                : isAdmin
                ? "Memantau log aktivitas khusus Agent"
                : "Log riwayat aktivitas CRM milik Anda"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={fetchActivities}
            className="p-1 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
          </button>
          <Badge
            variant="outline"
            className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 flex items-center gap-1"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Real-time
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-3.5 sm:p-4 space-y-3">
        {loading ? (
          <div className="text-center py-6 space-y-2">
            <RefreshCw className="w-6 h-6 text-emerald-600 dark:text-emerald-400 animate-spin mx-auto opacity-70" />
            <p className="text-xs text-muted-foreground">Memuat log aktivitas terbarukan...</p>
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-8 space-y-1">
            <ShieldAlert className="w-8 h-8 text-muted-foreground/40 mx-auto" />
            <p className="text-xs font-semibold text-foreground">Belum Ada Catatan Aktivitas</p>
            <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
              {isAdmin
                ? "Belum ada aktivitas baru dari agen yang tercatat."
                : "Belum ada aktivitas CRM yang dicatat."}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-0.5">
            {activities.map((act) => {
              const userObj = act.users || {};
              const leadObj = act.crm_leads || {};
              const contactObj = leadObj.crm_contacts || {};

              const userName = userObj.full_name || userObj.email || "Pengguna";
              const userRole = (userObj.role || "agent").toLowerCase();
              const leadName = contactObj.full_name || "Klien Prospek";
              const leadPhone = contactObj.phone || "";

              const typeConfig =
                activityTypeConfig[act.activity_type] || {
                  label: act.activity_type || "Aktivitas",
                  color: "bg-slate-500/10 text-slate-600 border-slate-500/20",
                  icon: <Activity className="w-3 h-3" />,
                };

              return (
                <div
                  key={act.id}
                  className="flex items-start justify-between p-3 bg-muted/30 hover:bg-muted/60 transition rounded-xl border border-border/60 text-xs gap-3"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <Avatar className="h-8 w-8 border border-border shrink-0 mt-0.5">
                      <AvatarImage src={userObj.avatar_url} />
                      <AvatarFallback className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                        {userName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-bold text-foreground truncate">{userName}</p>
                        <Badge
                          variant="outline"
                          className="text-[9px] px-1.5 py-0 capitalize bg-background text-muted-foreground font-mono"
                        >
                          {userRole.replace("_", " ")}
                        </Badge>
                      </div>

                      <p className="text-xs text-foreground/90 leading-relaxed mt-0.5 break-words">
                        {act.notes}
                      </p>

                      {contactObj.full_name && (
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground font-mono">
                          <span>👤 {leadName}</span>
                          {leadPhone && <span>📞 {formatPhoneForUser(leadPhone)}</span>}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0 flex flex-col items-end gap-1">
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      {act.created_at
                        ? formatDistanceToNow(new Date(act.created_at), {
                            addSuffix: true,
                            locale: id,
                          })
                        : "-"}
                    </span>

                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[9px] font-bold px-1.5 py-0.5 border flex items-center gap-1",
                        typeConfig.color
                      )}
                    >
                      {typeConfig.icon}
                      {typeConfig.label}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}