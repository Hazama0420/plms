// app/(dashboard)/admin/logs/page.tsx
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ShieldAlert, Clock, RefreshCw, Search, FileText, UserCheck, X } from "lucide-react";
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

export default function AdminActivityLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  // 🟢 PERBAIKAN 1: Izinkan tipe string | null pada state
  const [selectedUser, setSelectedUser] = useState<string | null>("all");

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
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
        .limit(150);

      if (!error && data) {
        setLogs(data);
      }
    } catch (err) {
      console.error("Gagal mengambil data log admin:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();

    const channel = supabase
      .channel("admin_logs_realtime")
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

  const availableUsers = useMemo(() => {
    const userMap = new Map();
    logs.forEach((log) => {
      if (log.users?.id) {
        userMap.set(log.users.id, {
          id: log.users.id,
          name: log.users.full_name || log.users.email || "Pengguna",
          role: log.users.role || "user",
        });
      }
    });
    return Array.from(userMap.values());
  }, [logs]);

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.activity_type?.toLowerCase().includes(search.toLowerCase()) ||
      log.notes?.toLowerCase().includes(search.toLowerCase()) ||
      log.users?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      log.users?.email?.toLowerCase().includes(search.toLowerCase());

    const matchesUser =
      !selectedUser || selectedUser === "all" || log.user_id === selectedUser || log.users?.id === selectedUser;

    return matchesSearch && matchesUser;
  });

  return (
    <div className="space-y-4 sm:space-y-6 max-w-5xl mx-auto pb-16 px-3 sm:px-4">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            🛡️ Audit Trail & Log Aktivitas
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Pantau seluruh rekam jejak, perubahan data sistem, dan aktivitas operasional tim secara real-time.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchLogs}
          className="text-xs h-8 gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </Button>
      </div>

      {/* FILTER & PENCARIAN */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Cari aktivitas, catatan, atau keyword..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs bg-card"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* 🟢 PERBAIKAN 2: Bungkus onValueChange dengan fungsi untuk mengamankan tipe parameter */}
          <Select 
            value={selectedUser || "all"} 
            onValueChange={(val) => setSelectedUser(val)}
          >
            <SelectTrigger className="w-full sm:w-[200px] h-9 text-xs bg-card">
              <UserCheck className="w-3.5 h-3.5 text-emerald-600 mr-1.5 shrink-0" />
              <SelectValue placeholder="Semua Akun / Agent" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs font-semibold">
                ✨ Semua Akun / Agent
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
              className="h-9 px-2 text-xs text-muted-foreground hover:text-foreground shrink-0"
              title="Reset Filter Akun"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* DAFTAR LOG / AUDIT TRAIL */}
      <Card className="border shadow-2xs bg-card overflow-hidden">
        <CardHeader className="p-3.5 border-b bg-muted/30">
          <CardTitle className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-emerald-600" /> Riwayat Log Sistem
            </span>
            <Badge variant="outline" className="text-[10px] bg-background font-mono">
              Total: {filteredLogs.length}
            </Badge>
          </CardTitle>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-xs text-muted-foreground space-y-2">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto text-emerald-600" />
              <p>Memuat data log aktivitas...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-12 text-center text-xs text-muted-foreground space-y-2">
              <ShieldAlert className="w-8 h-8 opacity-40 mx-auto" />
              <p className="font-semibold">Tidak ada catatan log aktivitas ditemukan.</p>
              <p className="text-[11px]">Coba ubah kata kunci pencarian atau reset filter akun Anda.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <Avatar className="h-8 w-8 sm:h-9 sm:w-9 border shrink-0 mt-0.5">
                      <AvatarImage src={log.users?.avatar_url} />
                      <AvatarFallback className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-bold">
                        {log.users?.full_name?.slice(0, 2).toUpperCase() || "AD"}
                      </AvatarFallback>
                    </Avatar>

                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-xs text-foreground">
                          {log.users?.full_name || log.users?.email || "Sistem Administrator"}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[9px] uppercase font-mono px-1.5 py-0.2 bg-muted/60 text-muted-foreground border-border"
                        >
                          {log.users?.role || "admin"}
                        </Badge>
                      </div>

                      <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                        {log.activity_type}
                      </p>

                      <p className="text-[11px] text-muted-foreground leading-relaxed break-words bg-muted/40 p-2 rounded-lg border border-border/40 font-mono">
                        {log.notes || "Tidak ada catatan detail."}
                      </p>
                    </div>
                  </div>

                  <div className="text-left sm:text-right shrink-0 pt-1 sm:pt-0 border-t sm:border-0 border-border/40">
                    <span className="text-[10px] sm:text-[11px] text-muted-foreground flex items-center sm:justify-end gap-1 font-mono">
                      <Clock className="w-3 h-3 text-emerald-600 shrink-0" />
                      {format(new Date(log.created_at), "dd MMM yyyy, HH:mm", { locale: id })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}