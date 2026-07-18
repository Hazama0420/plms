// components/dashboard/LeadPipeline.tsx
"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

const stages = [
  { label: "New", count: 3, color: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" },
  { label: "Qualified", count: 2, color: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" },
  { label: "Survey", count: 1, color: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" },
  { label: "Negotiation", count: 2, color: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400" },
  { label: "Deal", count: 0, color: "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400" },
  { label: "Lost", count: 1, color: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400" },
];

export default function LeadPipeline() {
  const total = stages.reduce((acc, s) => acc + s.count, 0);

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            📈 Pipeline Leads
          </h3>
          <button className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1">
            Lihat semua <ChevronRight className="h-3 w-3" />
          </button>
        </div>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {stages.map((stage, index) => (
            <motion.div
              key={stage.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="text-center"
            >
              <div className={cn("p-3 rounded-xl", stage.color)}>
                <p className="text-xl font-bold">{stage.count}</p>
                <p className="text-xs mt-1">{stage.label}</p>
              </div>
            </motion.div>
          ))}
        </div>
        <div className="flex justify-between mt-3 text-xs text-slate-500 dark:text-slate-400">
          <span>Total Leads: {total}</span>
          <span>Konversi: {total > 0 ? Math.round((stages.find(s => s.label === "Deal")?.count || 0) / total * 100) : 0}%</span>
        </div>
      </CardContent>
    </Card>
  );
}