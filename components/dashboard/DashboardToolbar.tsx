// components/dashboard/DashboardToolbar.tsx
"use client";

import { useRouter } from "next/navigation";
import {
  Plus,
  Building2,
  UserPlus,
  FileText,
  Calendar,
  Image,
  Receipt,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const actions = [
  { icon: Plus, label: "Tambah Properti", href: "/properties/create", color: "emerald" },
  { icon: Building2, label: "Proyek Konstruksi", href: "/projects/create", color: "blue" },
  { icon: UserPlus, label: "Tambah Lead", href: "/crm/leads/create", color: "purple" },
  { icon: FileText, label: "Buat Quotation", href: "/quotations/create", color: "amber" },
  { icon: Calendar, label: "Jadwalkan Survey", href: "/surveys/create", color: "rose" },
  { icon: Image, label: "Upload Media", href: "/media/upload", color: "cyan" },
  { icon: Receipt, label: "Buat Invoice", href: "/invoices/create", color: "orange" },
];

export function DashboardToolbar() {
  const router = useRouter();

  return (
    <div className="flex flex-wrap items-center gap-2 py-3 border-b border-slate-200 dark:border-slate-800">
      {actions.map((action) => (
        <Button
          key={action.label}
          variant="outline"
          size="sm"
          className="gap-2 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
          onClick={() => router.push(action.href)}
        >
          <action.icon className="h-4 w-4" />
          <span className="hidden sm:inline">{action.label}</span>
        </Button>
      ))}
    </div>
  );
}