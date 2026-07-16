// components/dashboard/quick-actions.tsx
"use client";

import { useRouter } from "next/navigation";
import { Plus, UserPlus, Building2, FileBarChart, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { usePermissions } from "@/hooks/use-permissions";

interface QuickAction {
  label: string;
  icon: React.ElementType;
  href: string;
  color?: string;
  roles?: ("super_admin" | "admin" | "agent" | "marketing" | "viewer")[];
}

const ACTIONS: QuickAction[] = [
  {
    label: "Tambah Property",
    icon: Plus,
    href: "/properties/create",
    color: "bg-blue-500 hover:bg-blue-600",
    roles: ["super_admin", "admin", "agent"],
  },
  {
    label: "Tambah Agent",
    icon: UserPlus,
    href: "/admin/users",
    color: "bg-emerald-500 hover:bg-emerald-600",
    roles: ["super_admin", "admin"],
  },
  {
    label: "Tambah Developer",
    icon: Building2,
    href: "/developers/create",
    color: "bg-purple-500 hover:bg-purple-600",
    roles: ["super_admin", "admin"],
  },
  {
    label: "Lihat Report",
    icon: FileBarChart,
    href: "/reports",
    color: "bg-amber-500 hover:bg-amber-600",
    roles: ["super_admin", "admin", "agent", "marketing"],
  },
];

export function QuickActions() {
  const router = useRouter();
  const { userRole } = usePermissions();

  // Filter actions berdasarkan role
  const visibleActions = ACTIONS.filter(
    (action) => !action.roles || (userRole && action.roles.includes(userRole))
  );

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          ⚡ Aksi Cepat
        </CardTitle>
        <CardDescription>Tombol cepat untuk aksi yang sering dilakukan</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {visibleActions.map((action) => (
            <Button
              key={action.label}
              variant="default"
              className={`h-auto flex-col items-center justify-center gap-2 py-6 px-4 text-white shadow-md transition-all hover:scale-105 hover:shadow-lg ${action.color || "bg-slate-600 hover:bg-slate-700"}`}
              onClick={() => router.push(action.href)}
            >
              <action.icon size={24} className="shrink-0" />
              <span className="text-xs font-medium text-center leading-tight">
                {action.label}
              </span>
            </Button>
          ))}
        </div>
        {visibleActions.length === 0 && (
          <p className="text-center text-muted-foreground py-4 text-sm">
            Tidak ada aksi cepat yang tersedia untuk role Anda.
          </p>
        )}
      </CardContent>
    </Card>
  );
}