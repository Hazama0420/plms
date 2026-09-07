// components/dashboard/AdminTeamSummary.tsx
"use client";

import Link from "next/link";
import { Users, UserCheck, ChevronRight, ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface AgentItem {
  id: string;
  full_name?: string | null;
  email?: string | null;
  role?: string | null;
  avatar_url?: string | null;
}

interface AdminTeamSummaryProps {
  agents: AgentItem[];
}

export function AdminTeamSummary({ agents }: AdminTeamSummaryProps) {
  const roleLabel = (role?: string | null) => {
    switch (role?.toLowerCase()) {
      case "super_admin":
        return "Super Admin";
      case "admin":
        return "Admin";
      case "agent":
        return "Agen Staf";
      case "marketing":
        return "Marketing";
      default:
        return "Staf";
    }
  };

  return (
    <Card className="rounded-2xl border-border/80 shadow-2xs bg-card overflow-hidden">
      <CardHeader className="p-3.5 sm:p-4 border-b border-border/60 flex flex-row items-center justify-between">
        <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          Tim & Keanggotaan Agen
        </CardTitle>

        <Link
          href="/admin/users"
          className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center"
        >
          <span>Kelola Tim</span>
          <ChevronRight className="w-3 h-3 ml-0.5" />
        </Link>
      </CardHeader>

      <CardContent className="p-0 divide-y divide-border/60">
        {agents.length === 0 ? (
          <div className="p-5 text-center text-xs text-muted-foreground">
            Belum ada agen terdaftar.
          </div>
        ) : (
          agents.slice(0, 5).map((agent) => (
            <div
              key={agent.id}
              className="p-3 sm:px-4 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
                  {agent.full_name?.charAt(0) || "A"}
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-bold text-foreground truncate">
                    {agent.full_name || "Agen Properti"}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {agent.email || "Email internal"}
                  </p>
                </div>
              </div>

              <Badge
                variant="outline"
                className="text-[9px] font-semibold px-2 py-0.5 border-border/80 bg-muted text-muted-foreground shrink-0"
              >
                {roleLabel(agent.role)}
              </Badge>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
