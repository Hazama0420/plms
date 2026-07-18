// components/dashboard/CalendarWidget.tsx
"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

const events = [
  { time: "09:00", title: "Site Visit - Villa Green Valley", location: "Puncak, Bogor", type: "visit" },
  { time: "11:00", title: "Meeting with Client - Budi Santoso", location: "Virtual Meeting", type: "meeting" },
  { time: "14:00", title: "Survey - Ruko Sentra Bisnis", location: "Jakarta Selatan", type: "survey" },
  { time: "16:00", title: "Follow-up Lead - Siti Rahayu", location: "Call", type: "followup" },
];

const typeColors: Record<string, string> = {
  visit: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
  meeting: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
  survey: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
  followup: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
};

export default function CalendarWidget() {
  const [currentMonth, setCurrentMonth] = useState("Juli 2026");

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              📅 Jadwal Hari Ini
            </h3>
            <Badge variant="secondary" className="text-xs">4 event</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{currentMonth}</span>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="space-y-3">
          {events.map((event, idx) => (
            <div key={idx} className="flex items-start gap-4 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
              <div className="text-center min-w-[50px]">
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{event.time}</p>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{event.title}</p>
                  <Badge className={cn("text-xs border-0", typeColors[event.type] || "bg-slate-100")}>
                    {event.type}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                  <MapPin className="h-3 w-3" /> {event.location}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}