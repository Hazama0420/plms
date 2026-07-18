// components/dashboard/MaterialInventory.tsx
"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Package, 
  AlertTriangle, 
  CheckCircle, 
  Truck,
  ChevronRight,
  Gauge,
  Mountain,
  Box,
  Droplets
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MaterialItem {
  id: string;
  name: string;
  icon: React.ElementType;
  stock: number;
  unit: string;
  minStock: number;
  status: "充足" | "menipis" | "kritis";
  color: string;
}

const materials: MaterialItem[] = [
  {
    id: "1",
    name: "Semen",
    icon: Package,
    stock: 850,
    unit: "sak",
    minStock: 200,
    status: "充足",
    color: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
  },
  {
    id: "2",
    name: "Besi Beton",
    icon: Gauge,
    stock: 120,
    unit: "batang",
    minStock: 50,
    status: "充足",
    color: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  },
  {
    id: "3",
    name: "Pasir",
    icon: Mountain,
    stock: 45,
    unit: "m³",
    minStock: 30,
    status: "menipis",
    color: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
  },
  {
    id: "4",
    name: "Bata Ringan",
    icon: Box,
    stock: 1800,
    unit: "buah",
    minStock: 500,
    status: "充足",
    color: "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400",
  },
  {
    id: "5",
    name: "Cat Tembok",
    icon: Droplets,
    stock: 28,
    unit: "pail",
    minStock: 15,
    status: "menipis",
    color: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
  },
  {
    id: "6",
    name: "Keramik",
    icon: Package,
    stock: 350,
    unit: "box",
    minStock: 100,
    status: "kritis",
    color: "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400",
  },
];

const statusConfig = {
  "充足": { icon: CheckCircle, color: "text-emerald-500" },
  "menipis": { icon: AlertTriangle, color: "text-amber-500" },
  "kritis": { icon: AlertTriangle, color: "text-rose-500" },
};

// ✅ DEFAULT EXPORT
export default function MaterialInventory() {
  const lowStockCount = materials.filter(
    (m) => m.status === "menipis" || m.status === "kritis"
  ).length;

  const getStockPercentage = (stock: number, minStock: number) => {
    const max = stock + minStock * 2;
    return Math.min((stock / max) * 100, 100);
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              📦 Inventory Material
            </h3>
            {lowStockCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {lowStockCount} low stock
              </Badge>
            )}
          </div>
          <button className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1">
            Kelola <ChevronRight className="h-3 w-3" />
          </button>
        </div>

        <div className="space-y-3">
          {materials.map((item, idx) => {
            const StatusIcon = statusConfig[item.status].icon;
            const progressValue = getStockPercentage(item.stock, item.minStock);

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.06 }}
                className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <div className={cn("p-2 rounded-lg", item.color)}>
                  <item.icon className="h-4 w-4" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {item.name}
                      </span>
                      <span className="text-xs text-slate-400 dark:text-slate-500">
                        {item.stock} {item.unit}
                      </span>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs border-0",
                        item.status === "充足" && "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400",
                        item.status === "menipis" && "bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400",
                        item.status === "kritis" && "bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400"
                      )}
                    >
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {item.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <Progress
                      value={progressValue}
                      className="h-1.5 flex-1"
                      indicatorClassName={cn(
                        item.status === "充足" && "bg-emerald-500",
                        item.status === "menipis" && "bg-amber-500",
                        item.status === "kritis" && "bg-rose-500"
                      )}
                    />
                    <span className="text-xs text-slate-400 dark:text-slate-500 min-w-[40px] text-right">
                      {Math.round(progressValue)}%
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>Total {materials.length} material terdaftar</span>
          <span className="flex items-center gap-1">
            <Truck className="h-3 w-3" />
            Pesanan masuk: 2
          </span>
        </div>
      </CardContent>
    </Card>
  );
}