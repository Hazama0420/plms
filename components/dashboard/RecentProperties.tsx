// components/dashboard/RecentProperties.tsx
"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Eye, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const properties = [
  {
    id: "1",
    title: "Rumah Komplek Menteri Rasuna Said",
    location: "Patra Kuningan, Jakarta Selatan",
    price: "Rp 850.000.000",
    status: "published",
    agent: "Mardian Gilang",
    updated: "2 hari lalu",
  },
  {
    id: "2",
    title: "Copy of Rumah Komplek Menteri Rasuna Said",
    location: "Patra Kuningan, Jakarta Selatan",
    price: "Rp 60.000.000",
    status: "draft",
    agent: "Mardian Gilang",
    updated: "3 hari lalu",
  },
  {
    id: "3",
    title: "Villa Green Valley",
    location: "Puncak, Bogor",
    price: "Rp 1.200.000.000",
    status: "published",
    agent: "Siti Rahayu",
    updated: "5 hari lalu",
  },
];

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: "Draft", color: "text-slate-600", bg: "bg-slate-100 dark:bg-slate-800" },
  published: { label: "Published", color: "text-emerald-600", bg: "bg-emerald-100 dark:bg-emerald-900/30" },
  sold: { label: "Sold", color: "text-blue-600", bg: "bg-blue-100 dark:bg-blue-900/30" },
};

export default function RecentProperties() {
  const router = useRouter();

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            🏠 Properti Terbaru
          </h3>
          <button 
            onClick={() => router.push("/properties")}
            className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
          >
            Lihat semua <ChevronRight className="h-3 w-3" />
          </button>
        </div>
        <div className="space-y-3">
          {properties.map((property, idx) => {
            const status = statusConfig[property.status] || statusConfig.draft;
            return (
              <motion.div
                key={property.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.08 }}
                className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition cursor-pointer group"
                onClick={() => router.push(`/properties/${property.id}`)}
              >
                <div className="w-16 h-16 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-2xl flex-shrink-0">
                  🏠
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-slate-800 dark:text-slate-200 text-sm truncate">
                      {property.title}
                    </h4>
                    <Badge className={cn("text-xs border-0", status.bg, status.color)}>
                      {status.label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {property.location}
                    </span>
                    <span>{property.price}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    <span>{property.agent}</span>
                    <span>•</span>
                    <span>{property.updated}</span>
                  </div>
                </div>
                <Eye className="h-4 w-4 text-slate-400 opacity-0 group-hover:opacity-100 transition" />
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}