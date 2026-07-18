// components/dashboard/QuickActions.tsx
"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { 
  Plus, 
  Building2, 
  UserPlus, 
  FileText, 
  Calendar, 
  Image, 
  Receipt,
  ChevronRight 
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type ActionColor = "emerald" | "blue" | "purple" | "amber" | "rose" | "cyan" | "orange";

const actions: {
  icon: any;
  label: string;
  href: string;
  color: ActionColor;
}[] = [
  { icon: Plus, label: "Tambah Properti", href: "/properties/create", color: "emerald" },
  { icon: Building2, label: "Proyek Konstruksi", href: "/projects/create", color: "blue" },
  { icon: UserPlus, label: "Tambah Lead", href: "/crm/leads/create", color: "purple" },
  { icon: FileText, label: "Buat Quotation", href: "/quotations/create", color: "amber" },
  { icon: Calendar, label: "Jadwalkan Survey", href: "/surveys/create", color: "rose" },
  { icon: Image, label: "Upload Media", href: "/media/upload", color: "cyan" },
  { icon: Receipt, label: "Buat Invoice", href: "/invoices/create", color: "orange" },
];

const colorMap: Record<ActionColor, string> = {
  emerald: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400",
  blue: "bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400",
  purple: "bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400",
  amber: "bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400",
  rose: "bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400",
  cyan: "bg-cyan-50 dark:bg-cyan-950/30 text-cyan-600 dark:text-cyan-400",
  orange: "bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400",
};

export default function QuickActions() {
  const router = useRouter();

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          Aksi Cepat
        </h2>
        <button className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1">
          Lihat semua <ChevronRight className="h-3 w-3" />
        </button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
        {actions.map((action, index) => (
          <motion.div
            key={action.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
          >
            <Card
              className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer group hover:-translate-y-1"
              onClick={() => router.push(action.href)}
            >
              <CardContent className="p-4 text-center">
                <div className={cn("w-10 h-10 rounded-xl mx-auto flex items-center justify-center", colorMap[action.color])}>
                  <action.icon className="h-5 w-5" />
                </div>
                <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mt-2 line-clamp-1">
                  {action.label}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}