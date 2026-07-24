// components/dashboard/RecentActivities.tsx
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, Clock } from "lucide-react";

interface ActivityItem {
  id: string;
  action: string;
  description: string;
  time: string;
  type: "property" | "lead" | "survey" | "invoice";
}

export default function RecentActivities() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulasi fetch data
    setTimeout(() => {
      setActivities([
        { id: "1", action: "Properti Baru", description: "Villa Green Valley ditambahkan", time: "2 jam lalu", type: "property" },
        { id: "2", action: "Lead Update", description: "Budi Santoso berubah status ke Qualified", time: "4 jam lalu", type: "lead" },
        { id: "3", action: "Survey Selesai", description: "Ruko Sentra Bisnis telah disurvei", time: "6 jam lalu", type: "survey" },
        { id: "4", action: "Invoice Terkirim", description: "Invoice #INV-001 telah dikirim", time: "8 jam lalu", type: "invoice" },
      ]);
      setLoading(false);
    }, 500);
  }, []);

  if (loading) {
    return (
      <Card className="border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Aktivitas Terbaru</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          Aktivitas Terbaru
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {activities.map((item) => (
            <div key={item.id} className="flex items-start gap-3 text-sm">
              <div className="mt-0.5">
                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground">{item.action}</p>
                <p className="text-xs text-muted-foreground">{item.description}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{item.time}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}