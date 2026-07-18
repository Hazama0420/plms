// components/dashboard/ConstructionProgress.tsx
"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Calendar, User, DollarSign, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const projects = [
  {
    id: 1,
    name: "Villa Green Valley",
    progress: 75,
    stage: "Finishing",
    deadline: "15 Des 2026",
    manager: "Budi Santoso",
    budget: "Rp 1.2 M",
    spent: "Rp 900 Jt",
  },
  {
    id: 2,
    name: "Ruko Sentra Bisnis",
    progress: 40,
    stage: "Struktur",
    deadline: "30 Mar 2027",
    manager: "Siti Rahayu",
    budget: "Rp 850 Jt",
    spent: "Rp 340 Jt",
  },
  {
    id: 3,
    name: "Apartemen Harmoni",
    progress: 15,
    stage: "Pondasi",
    deadline: "15 Jun 2027",
    manager: "Agus Wijaya",
    budget: "Rp 2.5 M",
    spent: "Rp 375 Jt",
  },
];

const stageColors: Record<string, string> = {
  "Pondasi": "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
  "Struktur": "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
  "Finishing": "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
};

export default function ConstructionProgress() {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            🏗️ Progres Konstruksi
          </h3>
          <button className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1">
            Lihat semua <ChevronRight className="h-3 w-3" />
          </button>
        </div>
        <div className="space-y-4">
          {projects.map((project, idx) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-slate-800 dark:text-slate-200">{project.name}</h4>
                    <Badge className={stageColors[project.stage] || "bg-slate-100"} variant="secondary">
                      {project.stage}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> {project.deadline}
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" /> {project.manager}
                    </span>
                    <span className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3" /> {project.spent} / {project.budget}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-32">
                    <Progress value={project.progress} className="h-2" />
                  </div>
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 min-w-[40px] text-right">
                    {project.progress}%
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}