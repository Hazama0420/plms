// components/dashboard/KPICards.tsx
"use client";

import { motion } from "framer-motion";
import { 
  Home, 
  Building2, 
  Users, 
  TrendingUp, 
  DollarSign, 
  FileText, 
  CheckCircle
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// ✅ Definisikan tipe color yang valid
type KpiColor = "emerald" | "blue" | "purple" | "amber" | "rose";

const kpis: {
  label: string;
  value: number | string;
  icon: any;
  color: KpiColor;
  detail: string;
}[] = [
  {
    label: "Total Properti",
    value: 10,
    icon: Home,
    color: "emerald",
    detail: "4 aktif",
  },
  {
    label: "Listing Aktif",
    value: 4,
    icon: Building2,
    color: "blue",
    detail: "6 tidak aktif",
  },
  {
    label: "Leads Hari Ini",
    value: 0,
    icon: Users,
    color: "purple",
    detail: "Prospek baru masuk",
  },
  {
    label: "Total Agen",
    value: 0,
    icon: TrendingUp,
    color: "amber",
    detail: "Terdaftar di sistem",
  },
  {
    label: "Revenue Bulanan",
    value: "Rp 850JT",
    icon: DollarSign,
    color: "emerald",
    detail: "+12% dari bulan lalu",
  },
  {
    label: "Proyek Aktif",
    value: 2,
    icon: Building2,
    color: "blue",
    detail: "1 hampir selesai",
  },
  {
    label: "Invoice Pending",
    value: 3,
    icon: FileText,
    color: "rose",
    detail: "Total Rp 120JT",
  },
  {
    label: "Proyek Selesai",
    value: 5,
    icon: CheckCircle,
    color: "emerald",
    detail: "4 properti terjual",
  },
];

// ✅ Gunakan `as const` pada colorMap agar keys-nya diketahui
const colorMap: Record<KpiColor, string> = {
  emerald: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400",
  blue: "bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400",
  purple: "bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400",
  amber: "bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400",
  rose: "bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400",
};

export default function KPICards() {
  return (
    <div className="mt-6">
      <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">
        Ringkasan Bisnis
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((kpi, index) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
          >
            <Card className="border-0 shadow-sm hover:shadow-md transition-all">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      {kpi.label}
                    </p>
                    <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">
                      {kpi.value}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                      {kpi.detail}
                    </p>
                  </div>
                  <div className={cn("p-2.5 rounded-xl", colorMap[kpi.color])}>
                    <kpi.icon className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}