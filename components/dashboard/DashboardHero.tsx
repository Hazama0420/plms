// components/dashboard/DashboardHero.tsx
"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sun, CloudRain } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useUser } from "@/hooks/use-user";

export default function DashboardHero() {
  const { user } = useUser();
  const [greeting, setGreeting] = useState("");
  const [time, setTime] = useState("");
  const [date, setDate] = useState("");

  useEffect(() => {
    const now = new Date();
    const hour = now.getHours();
    if (hour < 12) setGreeting("Selamat pagi");
    else if (hour < 18) setGreeting("Selamat siang");
    else setGreeting("Selamat malam");

    setTime(now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }));
    setDate(now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }));
  }, []);

  const weather = {
    temp: 32,
    condition: "Cerah",
    icon: Sun,
    rain: 10,
  };

  const summary = {
    listings: 4,
    projects: 2,
    leads: 0,
    revenue: "Rp 850.000.000",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-600 to-emerald-400 dark:from-emerald-800 dark:to-emerald-600 p-6 md:p-8 text-white shadow-xl shadow-emerald-600/30"
    >
      <div className="absolute inset-0 bg-[url('/pattern.svg')] opacity-10" />
      <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />

      <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm px-3 py-1">
              {time} WIB
            </Badge>
            <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm px-3 py-1">
              {date}
            </Badge>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold">
            {greeting}, {user?.full_name || "Pengguna"}! 👋
          </h1>
          <p className="text-white/80 text-sm md:text-base max-w-lg">
            Selamat datang di <span className="font-semibold">INLAND Property</span> — Kelola properti, proyek konstruksi, dan CRM Anda dari satu dasbor.
          </p>
        </div>

        <div className="flex flex-col items-end gap-3">
          <div className="flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-2xl px-5 py-3 border border-white/10">
            <div className="text-center">
              <div className="text-2xl font-bold">{weather.temp}°C</div>
              <div className="text-xs text-white/70">{weather.condition}</div>
            </div>
            <weather.icon className="h-10 w-10" />
            <div className="text-xs text-white/70 text-center">
              <CloudRain className="h-4 w-4 inline mr-1" />
              Hujan {weather.rain}%
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="text-center">
              <div className="font-bold text-lg">{summary.listings}</div>
              <div className="text-white/70 text-xs">Listing</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-lg">{summary.projects}</div>
              <div className="text-white/70 text-xs">Proyek</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-lg">{summary.leads}</div>
              <div className="text-white/70 text-xs">Leads</div>
            </div>
            <div className="text-center border-l border-white/20 pl-4">
              <div className="font-bold text-lg">{summary.revenue}</div>
              <div className="text-white/70 text-xs">Estimasi Revenue</div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}