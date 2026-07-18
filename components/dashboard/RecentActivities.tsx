// components/dashboard/RecentActivities.tsx
"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { UserPlus, RefreshCw, Calendar, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const activities = [
  { icon: UserPlus, label: "Status berubah menjadi new", time: "1 hari lalu", color: "text-blue-500" },
  { icon: RefreshCw, label: "Status berubah menjadi qualified", time: "1 hari lalu", color: "text-emerald-500" },
  { icon: RefreshCw, label: "Status berubah menjadi negotiation", time: "1 hari lalu", color: "text-purple-500" },
  { icon: RefreshCw, label: "Status berubah menjadi contacted", time: "1 hari lalu", color: "text-amber-500" },
  { icon: Calendar, label: "Follow-up dijadwalkan pada 15/7/2026", time: "2 hari lalu", color: "text-rose-500" },
  { icon: UserPlus, label: "Lead baru dibuat", time: "3 hari lalu", color: "text-emerald-500" },
];

export default function RecentActivities() {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            🔔 Aktivitas Terbaru
          </h3>
          <button className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1">
            Lihat semua <ChevronRight className="h-3 w-3" />
          </button>
        </div>
        <div className="space-y-3">
          {activities.map((activity, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="flex items-start gap-3 pb-3 border-b border-slate-100 dark:border-slate-800 last:border-0 last:pb-0"
            >
              <div className={cn("mt-0.5", activity.color)}>
                <activity.icon className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-slate-700 dark:text-slate-300">{activity.label}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">{activity.time}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}