// components/dashboard/RecentProjects.tsx
"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Building2, Calendar, Users, DollarSign, ChevronRight, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const projects = [
  {
    id: "1",
    name: "Villa Green Valley",
    location: "Puncak, Bogor",
    progress: 75,
    stage: "Finishing",
    deadline: "15 Des 2026",
    budget: "Rp 1.2 M",
    team: 8,
    status: "active",
  },
  {
    id: "2",
    name: "Ruko Sentra Bisnis",
    location: "Jakarta Selatan",
    progress: 40,
    stage: "Struktur",
    deadline: "30 Mar 2027",
    budget: "Rp 850 Jt",
    team: 5,
    status: "active",
  },
  {
    id: "3",
    name: "Apartemen Harmoni",
    location: "BSD, Tangerang",
    progress: 15,
    stage: "Pondasi",
    deadline: "15 Jun 2027",
    budget: "Rp 2.5 M",
    team: 12,
    status: "active",
  },
];

const stageColors: Record<string, string> = {
  "Pondasi": "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
  "Struktur": "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
  "Finishing": "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
};

export default function RecentProjects() {
  const router = useRouter();

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            🏗️ Proyek Konstruksi Terbaru
          </h3>
          <button 
            onClick={() => router.push("/projects")}
            className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
          >
            Lihat semua <ChevronRight className="h-3 w-3" />
          </button>
        </div>

        <div className="space-y-4">
          {projects.map((project, idx) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08 }}
              className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer group"
              onClick={() => router.push(`/projects/${project.id}`)}
            >
              <div className="flex flex-col md:flex-row md:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                      <Building2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-sm truncate">
                      {project.name}
                    </h4>
                    <Badge className={cn("text-xs border-0", stageColors[project.stage] || "bg-slate-100")}>
                      {project.stage}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> {project.deadline}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" /> {project.team} orang
                    </span>
                    <span className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3" /> {project.budget}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-28">
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

        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>{projects.length} proyek aktif</span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            1 proyek hampir selesai
          </span>
        </div>
      </CardContent>
    </Card>
  );
}