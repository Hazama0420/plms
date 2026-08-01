// components/crm/AgentActivityMonitor.tsx
"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageCircle, Clock, User, PhoneCall } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";

export default function AgentActivityMonitor() {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActivities = async () => {
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
          users:user_id (full_name, avatar_url, email),
          crm_leads:lead_id (
            id,
            interest_type,
            crm_contacts (full_name, phone)
          )
        `)
        .eq("activity_type", "WhatsApp Chat")
        .order("created_at", { ascending: false })
        .limit(20);

      if (!error && data) {
        setActivities(data);
      }
    } catch (err) {
      console.error("Gagal memuat aktivitas agen:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();

    // 🔴 BISA JUGA DIBUAT REAL-TIME MENGGUNAKAN SUPABASE REALTIME
    const channel = supabase
      .channel("crm_activities_changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "crm_activities" },
        () => fetchActivities()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <Card className="border border-border/70 rounded-2xl bg-card shadow-2xs">
      <CardHeader className="p-4 border-b border-border/60 flex flex-row items-center justify-between">
        <CardTitle className="text-xs font-bold flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-emerald-600" />
          Pantauan Aktivitas Kontak WA Agen
        </CardTitle>
        <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700 border-emerald-500/30">
          Real-time
        </Badge>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        {loading ? (
          <p className="text-xs text-muted-foreground text-center py-4">Memuat log aktivitas...</p>
        ) : activities.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">Belum ada riwayat agen menghubungi klien.</p>
        ) : (
          <div className="space-y-2.5">
            {activities.map((act) => (
              <div
                key={act.id}
                className="flex items-start justify-between p-3 bg-muted/30 rounded-xl border border-border/50 text-xs gap-3"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Avatar className="h-8 w-8 border border-border">
                    <AvatarImage src={act.users?.avatar_url} />
                    <AvatarFallback className="bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                      {act.users?.full_name?.slice(0, 2).toUpperCase() || "AG"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="font-bold text-foreground truncate">
                      {act.users?.full_name || act.users?.email || "Agen"}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {act.notes}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[10px] text-muted-foreground flex items-center justify-end gap-1 font-mono">
                    <Clock className="w-3 h-3 text-emerald-600" />
                    {formatDistanceToNow(new Date(act.created_at), { addSuffix: true, locale: id })}
                  </span>
                  <Badge variant="outline" className="text-[9px] mt-1 bg-background">
                    Chat WA
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}