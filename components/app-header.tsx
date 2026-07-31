"use client";

import { useEffect, useState } from "react";
import { Bell, Search, User } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function AppHeader() {
  const [userName, setUserName] = useState<string>("User");
  const [userRole, setUserRole] = useState<string>("Administrator");
  const [avatarUrl, setAvatarUrl] = useState<string>("");

  // Mengambil data user yang sedang login secara dinamis dari Supabase
  useEffect(() => {
    async function getUserData() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from("users")
          .select("full_name, role, avatar_url")
          .eq("id", user.id)
          .maybeSingle();

        if (profile) {
          setUserName(profile.full_name || user.email?.split("@")[0] || "User");
          setUserRole(profile.role ? profile.role.replace("_", " ") : "User");
          setAvatarUrl(profile.avatar_url || "");
        } else {
          setUserName(user.email?.split("@")[0] || "User");
        }
      }
    }

    getUserData();
  }, []);

  const getInitials = (name: string) => {
    if (!name) return "IP";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border/60 bg-card/95 px-4 sm:px-6 backdrop-blur-md select-none">
      {/* 1. BRAND TITLE: Inland (Hijau Emerald) Property (Gelap/Putih) */}
      <div className="flex items-center gap-3">
        <h1 className="text-lg sm:text-xl font-extrabold tracking-tight flex items-center gap-1.5">
          <span className="text-emerald-600 dark:text-emerald-400">Inland</span>
          <span className="text-slate-900 dark:text-white">Property</span>
        </h1>
      </div>

      {/* 2. SISI KANAN (Search, Notifikasi & Profil User) */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Search Property Bar */}
        <div className="relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Cari Properti..."
            className="w-56 lg:w-72 rounded-xl border border-border/70 bg-muted/30 pl-9 pr-4 py-1.5 text-xs text-foreground outline-none transition-all focus:border-emerald-500 focus:bg-background focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>

        {/* Tombol Notifikasi Lonceng */}
        <button
          type="button"
          aria-label="Notifikasi"
          className="relative rounded-xl border border-border/60 p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer"
        >
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-emerald-600 shadow-2xs" />
        </button>

        {/* User Profile Card Header */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-border/60">
          <Avatar className="h-9 w-9 border border-emerald-500/30 shadow-2xs">
            <AvatarImage src={avatarUrl || undefined} />
            <AvatarFallback className="bg-emerald-600 text-white text-xs font-bold">
              {getInitials(userName)}
            </AvatarFallback>
          </Avatar>

          <div className="hidden md:flex flex-col text-left leading-tight">
            <p className="text-xs font-bold text-foreground truncate max-w-[120px]">
              {userName}
            </p>
            <p className="text-[10px] text-muted-foreground capitalize truncate max-w-[120px]">
              {userRole}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}