// components/create-property/MassUploadCard.tsx
"use client";

import { Upload, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function MassUploadCard() {
  return (
    <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 rounded-2xl border border-blue-200/50 dark:border-blue-800/50 p-6 space-y-3">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
          <Upload className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h4 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
            Upload Iklan Banyak Sekaligus!
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Buat banyak iklan dalam 1 waktu dengan file CSV
          </p>
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="w-full border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/50 gap-2"
      >
        <Sparkles className="h-3.5 w-3.5" />
        Buat Mass Upload
      </Button>
    </div>
  );
}