"use client";

import { useEffect, useState } from "react";
import { dashboardService } from "@/services/dashboard.service";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Home, DollarSign, Users, TrendingUp } from "lucide-react";

export default function KPICards() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardService
      .getStats()
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-4 flex items-center gap-4">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
            <Home className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Properti</p>
            <p className="text-2xl font-bold">{stats?.totalProperties || 0}</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 flex items-center gap-4">
          <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
            <DollarSign className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Revenue</p>
            <p className="text-2xl font-bold">{stats?.revenueFormatted || "Rp 0"}</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 flex items-center gap-4">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
            <Users className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Leads</p>
            <p className="text-2xl font-bold">{stats?.newLeads || 0}</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 flex items-center gap-4">
          <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
            <TrendingUp className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Konversi</p>
            <p className="text-2xl font-bold">{stats?.conversionRate || "0%"}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}