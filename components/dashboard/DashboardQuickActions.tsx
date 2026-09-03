// components/dashboard/DashboardQuickActions.tsx
"use client";

import Link from "next/link";
import { Plus, Users, Calendar, Calculator, FileText, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface DashboardQuickActionsProps {
  canManageProperties?: boolean;
  canManageCrm?: boolean;
}

export function DashboardQuickActions({
  canManageProperties = true,
  canManageCrm = true,
}: DashboardQuickActionsProps) {
  const actions = [
    canManageProperties
      ? {
          title: "Tambah Listing",
          desc: "Daftarkan properti baru",
          href: "/properties/create",
          icon: Plus,
          color: "text-emerald-600 dark:text-emerald-400",
          bg: "bg-emerald-500/10",
        }
      : null,
    canManageCrm
      ? {
          title: "Catat Lead Baru",
          desc: "Simpan data calon klien",
          href: "/crm/leads/create",
          icon: Users,
          color: "text-blue-600 dark:text-blue-400",
          bg: "bg-blue-500/10",
        }
      : null,
    canManageCrm
      ? {
          title: "Agenda Follow-up",
          desc: "Jadwal interaksi prospek",
          href: "/crm/followups",
          icon: Calendar,
          color: "text-purple-600 dark:text-purple-400",
          bg: "bg-purple-500/10",
        }
      : null,
    {
      title: "Simulasi KPR",
      desc: "Hitung cicilan & DP",
      href: "/kpr-calculator",
      icon: Calculator,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-500/10",
    },
  ].filter(Boolean) as {
    title: string;
    desc: string;
    href: string;
    icon: any;
    color: string;
    bg: string;
  }[];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {actions.map((act, i) => {
        const Icon = act.icon;
        return (
          <Link key={i} href={act.href}>
            <Card className="bg-card border-border/80 shadow-2xs hover:border-emerald-500/50 hover:shadow-xs transition-all rounded-2xl cursor-pointer h-full">
              <CardContent className="p-3.5 sm:p-4 flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${act.bg} ${act.color} shrink-0`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-xs text-foreground truncate">
                    {act.title}
                  </h4>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {act.desc}
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
