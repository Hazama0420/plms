// components/dashboard/AgentPipelineStrip.tsx
"use client";

import Link from "next/link";
import { ChevronRight, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

interface PipelineStageItem {
  id: string;
  label: string;
  count: number;
  color: string;
  dotBg: string;
}

interface AgentPipelineStripProps {
  totalLeads?: number;
  stages?: PipelineStageItem[];
}

export function AgentPipelineStrip({
  totalLeads = 0,
  stages,
}: AgentPipelineStripProps) {
  // Fallback sample distribution if stages not explicitly calculated
  const displayStages: PipelineStageItem[] = stages || [
    { id: "new", label: "Baru", count: 0, color: "text-blue-600 dark:text-blue-400", dotBg: "bg-blue-500" },
    { id: "contacted", label: "Dihubungi", count: 0, color: "text-amber-600 dark:text-amber-400", dotBg: "bg-amber-500" },
    { id: "qualified", label: "Kualifikasi", count: 0, color: "text-cyan-600 dark:text-cyan-400", dotBg: "bg-cyan-500" },
    { id: "proposal", label: "Proposal", count: 0, color: "text-purple-600 dark:text-purple-400", dotBg: "bg-purple-500" },
    { id: "won", label: "Closing / Deal", count: 0, color: "text-emerald-600 dark:text-emerald-400", dotBg: "bg-emerald-500" },
  ];

  return (
    <div className="bg-card border border-border/80 shadow-2xs rounded-xl p-3 sm:px-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
      {/* Label */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          Pipeline Prospek
        </span>
        <span className="text-xs font-mono font-bold text-foreground">
          ({totalLeads} Total)
        </span>
      </div>

      {/* Horizontal Scannable Stages Strip */}
      <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none flex-1 justify-start md:justify-center">
        {displayStages.map((stage, idx) => (
          <Link
            key={stage.id}
            href={`/crm`}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border/60 bg-muted/30 hover:bg-muted/70 transition-colors shrink-0 text-xs cursor-pointer group"
            title={`Lihat prospek tahap ${stage.label}`}
          >
            <span className={cn("w-2 h-2 rounded-full shrink-0", stage.dotBg)} />
            <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground">
              {stage.label}
            </span>
            <span className={cn("font-mono font-bold text-[11px]", stage.color)}>
              {stage.count}
            </span>
          </Link>
        ))}
      </div>

      {/* Right Link */}
      <Link
        href="/crm"
        className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 flex items-center gap-0.5 shrink-0 self-end md:self-auto"
      >
        <span>Papan Kanban</span>
        <ChevronRight className="w-3 h-3" />
      </Link>
    </div>
  );
}
