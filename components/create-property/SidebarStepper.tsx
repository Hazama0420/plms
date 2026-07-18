// components/create-property/SidebarStepper.tsx
"use client";

import { cn } from "@/lib/utils";
import { Check, Circle, LucideIcon } from "lucide-react";
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
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-800/60 p-6">
      <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-6">
        Tahapan Pasang Iklan
      </h3>
      <nav className="space-y-1">
        {steps.map((step, index) => {
          const isActive = index === currentStep;
          const isCompleted = index < currentStep;
          const Icon = Icons[step.icon as keyof typeof Icons] as LucideIcon;

          return (
            <button
              key={step.id}
              onClick={() => onStepClick(index)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200",
                isActive
                  ? "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-medium shadow-sm"
                  : isCompleted
                  ? "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  : "text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50"
              )}
            >
              <span
                className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold flex-shrink-0 transition-all",
                  isActive
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                    : isCompleted
                    ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500"
                )}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <span>{index + 1}</span>
                )}
              </span>
              <span className="flex-1 text-sm">{step.label}</span>
              {Icon && (
                <Icon
                  className={cn(
                    "h-4 w-4 flex-shrink-0",
                    isActive
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-slate-400 dark:text-slate-500"
                  )}
                />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}