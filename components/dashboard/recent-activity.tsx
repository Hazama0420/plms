// components/dashboard/recent-activity.tsx

"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  Home,
  UserPlus,
  Mail,
  Megaphone,
  LogIn,
  Clock,
} from "lucide-react";

interface Activity {
  id: string;
  title: string;
  time: string;
  type: "property" | "developer" | "lead" | "listing" | "agent";
}

interface RecentActivityProps {
  activities: Activity[];
}

const iconMap: Record<Activity["type"], ReactNode> = {
  property: <Home size={16} className="text-blue-500" />,
  developer: <UserPlus size={16} className="text-emerald-500" />,
  lead: <Mail size={16} className="text-amber-500" />,
  listing: <Megaphone size={16} className="text-purple-500" />,
  agent: <LogIn size={16} className="text-rose-500" />,
};

const bgMap: Record<Activity["type"], string> = {
  property: "bg-blue-50",
  developer: "bg-emerald-50",
  lead: "bg-amber-50",
  listing: "bg-purple-50",
  agent: "bg-rose-50",
};

export function RecentActivity({ activities }: RecentActivityProps) {
  return (
    <div className="space-y-4">
      {activities.map((activity, index) => (
        <div
          key={activity.id}
          className={cn(
            "flex items-start gap-4 rounded-xl p-3 transition-all duration-200 hover:bg-slate-50",
            "border border-transparent hover:border-slate-200"
          )}
          style={{
            animationDelay: `${index * 80}ms`,
          }}
        >
          <div
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
              bgMap[activity.type]
            )}
          >
            {iconMap[activity.type]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-700">
              {activity.title}
            </p>
            <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-400">
              <Clock size={12} />
              <span>{activity.time}</span>
            </div>
          </div>
          <div className="mt-1.5 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-emerald-100" />
        </div>
      ))}
    </div>
  );
}