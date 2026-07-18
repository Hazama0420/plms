// components/dashboard/dashboard-header.tsx
"use client";

import { useState, useEffect } from "react";
import { useUser } from "@/hooks/use-user";
import { Sparkles, Building2 } from "lucide-react";

export default function DashboardHeader() {
  const { user } = useUser();
  const [greeting, setGreeting] = useState("Selamat datang");
  const [timeStr, setTimeStr] = useState("");

  useEffect(() => {
    const now = new Date();
    const hour = now.getHours();

    if (hour < 12) setGreeting("☀️ Selamat pagi");
    else if (hour < 15) setGreeting("🌤️ Selamat siang");
    else if (hour < 18) setGreeting("🌅 Selamat sore");
    else setGreeting("🌙 Selamat malam");

    setTimeStr(
      now.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      })
    );
  }, []);

  const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Pengguna";

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 p-6 text-white shadow-lg">
      <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-blue-400/20 blur-3xl" />
      <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-yellow-400/10 blur-2xl" />

      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-yellow-300" />
            <span className="text-sm font-medium text-blue-200">{timeStr}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl mt-1">
            {greeting}, {userName}! 👋
          </h1>
          <p className="text-sm text-blue-100/80 mt-1 flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Selamat datang di Inland Property — Kelola properti Anda dengan lebih mudah
          </p>
        </div>

        <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/10">
          <div className="text-center">
            <p className="text-xs text-blue-200">Hari Ini</p>
            <p className="text-sm font-semibold">
              {new Date().toLocaleDateString("id-ID", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}