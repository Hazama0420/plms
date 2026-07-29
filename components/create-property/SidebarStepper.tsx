// components/create-property/SidebarStepper.tsx
"use client";

import { cn } from "@/lib/utils";
import { Check, LucideIcon } from "lucide-react";
import * as Icons from "lucide-react";

interface Step {
  id: string;
  label: string;
  icon: string;
}

interface SidebarStepperProps {
  steps: Step[];
  currentStep: number;
  onStepClick: (index: number) => void;
}

export function SidebarStepper({ steps, currentStep, onStepClick }: SidebarStepperProps) {
  // Hitung persentase progres wizard
  const progressPercentage = Math.round(((currentStep + 1) / steps.length) * 100);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-200/80 dark:border-slate-800 p-6 space-y-6">
      {/* HEADER & PROGRESS BAR KESELURUHAN */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Tahapan Pasang Iklan
          </h3>
          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">
            {progressPercentage}% Selesai
          </span>
        </div>
        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-gradient-to-r from-emerald-500 to-teal-500 h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* NAVIGASI STEPPER VERTIKAL */}
      <nav className="relative space-y-2">
        {steps.map((step, index) => {
          const isActive = index === currentStep;
          const isCompleted = index < currentStep;
          const Icon = Icons[step.icon as keyof typeof Icons] as LucideIcon;

          return (
            <div key={step.id} className="relative">
              {/* Garis konektor vertikal antar tahapan */}
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "absolute left-4 top-10 bottom-[-8px] w-0.5 transition-colors duration-200",
                    index < currentStep
                      ? "bg-emerald-500/60"
                      : "bg-slate-200 dark:bg-slate-800"
                  )}
                />
              )}

              <button
                type="button"
                onClick={() => onStepClick(index)}
                className={cn(
                  "w-full flex items-center gap-3.5 p-3 rounded-2xl text-left transition-all duration-200 group relative z-10",
                  isActive
                    ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 border border-emerald-500/30 shadow-sm"
                    : isCompleted
                    ? "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    : "text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                )}
              >
                {/* ICON / NOMOR TAHAPAN */}
                <span
                  className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-xl text-xs font-bold shrink-0 transition-all shadow-xs",
                    isActive
                      ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-4 ring-emerald-500/20"
                      : isCompleted
                      ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500"
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4 stroke-[2.5]" />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </span>

                {/* LABEL TEKS */}
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      "text-xs truncate font-semibold",
                      isActive
                        ? "text-emerald-900 dark:text-emerald-200 font-bold"
                        : isCompleted
                        ? "text-slate-800 dark:text-slate-200"
                        : "text-slate-500 dark:text-slate-400"
                    )}
                  >
                    {step.label}
                  </p>
                </div>

                {/* IKON LUCIDE */}
                {Icon && (
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0 transition-colors",
                      isActive
                        ? "text-emerald-600 dark:text-emerald-400"
                        : isCompleted
                        ? "text-slate-500 dark:text-slate-400"
                        : "text-slate-300 dark:text-slate-600"
                    )}
                  />
                )}
              </button>
            </div>
          );
        })}
      </nav>
    </div>
  );
}