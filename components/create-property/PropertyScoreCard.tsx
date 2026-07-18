// components/create-property/PropertyScoreCard.tsx
"use client";

import { motion } from "framer-motion";
import { TrendingUp, AlertCircle, CheckCircle2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface PropertyScoreCardProps {
  score: number;
}

export function PropertyScoreCard({ score }: PropertyScoreCardProps) {
  const getScoreColor = (s: number) => {
    if (s >= 80) return "text-emerald-600 dark:text-emerald-400";
    if (s >= 50) return "text-amber-600 dark:text-amber-400";
    return "text-rose-600 dark:text-rose-400";
  };

  const getProgressColor = (s: number) => {
    if (s >= 80) return "bg-emerald-500";
    if (s >= 50) return "bg-amber-500";
    return "bg-rose-500";
  };

  const getMessage = (s: number) => {
    if (s >= 80) return "Iklan Anda siap tayang!";
    if (s >= 50) return "Tingkatkan beberapa bagian untuk hasil maksimal";
    return "Skor Anda masih jauh dari sempurna";
  };

  const improvements = [
    { done: score >= 15, label: "Pilih tipe properti" },
    { done: score >= 25, label: "Tentukan harga" },
    { done: score >= 40, label: "Isi lokasi lengkap" },
    { done: score >= 60, label: "Upload minimal 3 foto" },
    { done: score >= 75, label: "Tulis deskripsi detail" },
    { done: score >= 85, label: "Tambahkan fasilitas" },
  ];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-800/60 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-blue-600" />
          Tingkatkan Skor
        </h4>
        <span className={cn("text-2xl font-bold", getScoreColor(score))}>
          {score}%
        </span>
      </div>

      <Progress
        value={score}
        className="h-2 bg-slate-100 dark:bg-slate-800"
        indicatorClassName={cn("transition-all duration-700", getProgressColor(score))}
      />

      <p className="text-sm text-slate-500 dark:text-slate-400">
        {getMessage(score)}
      </p>

      <div className="space-y-1.5 pt-1">
        {improvements.map((item, idx) => (
          <div
            key={idx}
            className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400"
          >
            {item.done ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
            ) : (
              <AlertCircle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
            )}
            <span className={item.done ? "line-through text-slate-400" : ""}>
              {item.label}
            </span>
          </div>
        ))}
      </div>

      <button className="w-full mt-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">
        Tingkatkan Skor Iklan →
      </button>
    </div>
  );
}