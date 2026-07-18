// components/dashboard/FinancialOverview.tsx
"use client";

import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const finances = [
  { label: "Total Property Value", value: "Rp 2.8 M", change: "+8%", up: true },
  { label: "Active Project Value", value: "Rp 4.5 M", change: "+15%", up: true },
  { label: "Monthly Revenue", value: "Rp 850 JT", change: "+12%", up: true },
  { label: "Expenses", value: "Rp 320 JT", change: "-5%", up: false },
  { label: "Profit", value: "Rp 530 JT", change: "+20%", up: true },
  { label: "Outstanding Payments", value: "Rp 180 JT", change: "+3%", up: false },
];

export default function FinancialOverview() {
  return (
    <Card className="border-0 shadow-sm mt-6">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            💰 Ikhtisar Keuangan
          </h3>
          <button className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1">
            Laporan lengkap <ChevronRight className="h-3 w-3" />
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {finances.map((item, idx) => (
            <div key={idx} className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">{item.label}</p>
              <p className="text-lg font-bold text-slate-800 dark:text-white mt-1">{item.value}</p>
              <div className="flex items-center gap-1 mt-1">
                {item.up ? (
                  <TrendingUp className="h-3 w-3 text-emerald-500" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-rose-500" />
                )}
                <span className={cn("text-xs font-medium", item.up ? "text-emerald-600" : "text-rose-600")}>
                  {item.change}
                </span>
                <span className="text-xs text-slate-400">vs bulan lalu</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}