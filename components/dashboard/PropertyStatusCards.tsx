// components/dashboard/PropertyStatusCards.tsx
"use client";

import { motion } from "framer-motion";
import { FileText, Eye, CheckCircle, ShoppingBag, Home, Archive } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const statuses = [
  { label: "Draft", count: 5, icon: FileText, color: "slate" },
  { label: "Review", count: 0, icon: Eye, color: "amber" },
  { label: "Published", count: 4, icon: CheckCircle, color: "emerald" },
  { label: "Sold", count: 0, icon: ShoppingBag, color: "blue" },
  { label: "Rented", count: 0, icon: Home, color: "purple" },
  { label: "Archived", count: 0, icon: Archive, color: "rose" },
];

const colorMap: Record<string, string> = {
  slate: "text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800",
  amber: "text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30",
  emerald: "text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30",
  blue: "text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30",
  purple: "text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30",
  rose: "text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/30",
};

export default function PropertyStatusCards() {
  const total = statuses.reduce((acc, s) => acc + s.count, 0);

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            📊 Status Properti
          </h3>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-500 dark:text-slate-400">Total: </span>
            <span className="font-bold text-slate-800 dark:text-white">{total}</span>
          </div>
        </div>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {statuses.map((status) => (
            <motion.div
              key={status.label}
              whileHover={{ scale: 1.02 }}
              className="text-center"
            >
              <div className={cn("p-3 rounded-xl", colorMap[status.color])}>
                <status.icon className="h-5 w-5 mx-auto" />
                <p className="text-lg font-bold text-slate-700 dark:text-slate-200 mt-1">
                  {status.count}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{status.label}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}