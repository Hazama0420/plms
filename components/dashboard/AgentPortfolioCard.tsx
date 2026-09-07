// components/dashboard/AgentPortfolioCard.tsx
"use client";

import Link from "next/link";
import {
  Building2,
  Trophy,
  Calculator,
  Plus,
  ArrowUpRight,
  Briefcase,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface AgentPortfolioCardProps {
  myPropertiesCount: number;
  myPublishedCount: number;
  dealsWonCount: number;
}

export function AgentPortfolioCard({
  myPropertiesCount,
  myPublishedCount,
  dealsWonCount,
}: AgentPortfolioCardProps) {
  return (
    <Card className="rounded-2xl border-border/80 shadow-xs bg-card overflow-hidden">
      <CardHeader className="p-4 border-b border-border/60 pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Briefcase className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          Portofolio & Alat Agen
        </CardTitle>

        <Link
          href="/properties"
          className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center"
        >
          <span>Portofolio</span>
          <ChevronRight className="w-3 h-3 ml-0.5" />
        </Link>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Metric Summary Rows */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="p-3 rounded-xl bg-muted/30 border border-border/60">
            <span className="text-[10px] uppercase font-bold text-muted-foreground block">
              Listing Aktif
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-lg font-black text-foreground tabular-nums">
                {myPublishedCount}
              </span>
              <span className="text-[11px] text-muted-foreground">
                / {myPropertiesCount} total
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-muted/30 border border-border/60">
            <span className="text-[10px] uppercase font-bold text-muted-foreground block">
              Deals Won
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                {dealsWonCount}
              </span>
              <span className="text-[11px] text-muted-foreground">
                closing
              </span>
            </div>
          </div>
        </div>

        {/* Quick Utility Action Links */}
        <div className="space-y-1.5 pt-1">
          <Link href="/properties/create" className="block">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-between h-8.5 rounded-lg text-xs font-medium border-border/80 hover:bg-muted text-foreground cursor-pointer px-3"
            >
              <span className="flex items-center gap-2">
                <Plus className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Tambah Properti Baru</span>
              </span>
              <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground" />
            </Button>
          </Link>

          <Link href="/crm/leads/create" className="block">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-between h-8.5 rounded-lg text-xs font-medium border-border/80 hover:bg-muted text-foreground cursor-pointer px-3"
            >
              <span className="flex items-center gap-2">
                <Plus className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Input Lead Baru</span>
              </span>
              <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground" />
            </Button>
          </Link>

          <Link href="/kpr-calculator" className="block">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-between h-8.5 rounded-lg text-xs font-medium border-border/80 hover:bg-muted text-foreground cursor-pointer px-3"
            >
              <span className="flex items-center gap-2">
                <Calculator className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Kalkulator KPR Klien</span>
              </span>
              <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
