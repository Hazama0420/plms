// components/dashboard/WeatherWidget.tsx
"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Sun } from "lucide-react";

export default function WeatherWidget() {
  const weather = {
    temp: 32,
    condition: "Cerah",
    icon: Sun,
    humidity: 65,
    wind: 12,
    rain: 10,
    recommendation: "Kondisi cerah, cocok untuk konstruksi dan survey lapangan.",
  };

  return (
    <Card className="border-0 shadow-sm h-full">
      <CardContent className="p-6">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">
          🌤️ Cuaca & Rekomendasi
        </h3>
        <div className="flex items-center gap-4">
          <div className="text-center">
            <weather.icon className="h-12 w-12 text-amber-500 mx-auto" />
            <p className="text-2xl font-bold text-slate-800 dark:text-white">{weather.temp}°C</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{weather.condition}</p>
          </div>
          <div className="flex-1 space-y-1 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">Kelembaban</span>
              <span className="font-medium text-slate-700 dark:text-slate-300">{weather.humidity}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">Angin</span>
              <span className="font-medium text-slate-700 dark:text-slate-300">{weather.wind} km/h</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">Hujan</span>
              <span className="font-medium text-slate-700 dark:text-slate-300">{weather.rain}%</span>
            </div>
          </div>
        </div>
        <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-100 dark:border-emerald-800/50">
          <p className="text-xs text-emerald-700 dark:text-emerald-300">
            💡 {weather.recommendation}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}