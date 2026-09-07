// components/admin/AdminDataHealth.tsx
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  dataHealthService,
  DataHealthSummary,
  DataHealthIssue,
  HealthSeverity,
  HealthCategory,
} from "@/services/data-health.service";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle,
  ShieldCheck,
  AlertCircle,
  Info,
  Building2,
  Users,
  Calendar,
  Receipt,
  ExternalLink,
  RefreshCw,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks/use-translation";

interface AdminDataHealthProps {
  onSummaryChange?: (summary: DataHealthSummary) => void;
}

export function AdminDataHealth({ onSummaryChange }: AdminDataHealthProps) {
  const router = useRouter();
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<DataHealthSummary | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<HealthCategory | "all">("all");
  const [selectedSeverity, setSelectedSeverity] = useState<HealthSeverity | "all">("all");

  const loadDataHealth = useCallback(async () => {
    setLoading(true);
    try {
      const res = await dataHealthService.runAudit();
      setSummary(res);
      if (onSummaryChange) onSummaryChange(res);
    } catch (err) {
      console.error("Gagal memuat Data Health:", err);
    } finally {
      setLoading(false);
    }
  }, [onSummaryChange]);

  useEffect(() => {
    loadDataHealth();
  }, [loadDataHealth]);

  const filteredIssues = useMemo(() => {
    if (!summary) return [];
    return summary.issues.filter((issue) => {
      const matchCat = selectedCategory === "all" || issue.category === selectedCategory;
      const matchSev = selectedSeverity === "all" || issue.severity === selectedSeverity;
      return matchCat && matchSev;
    });
  }, [summary, selectedCategory, selectedSeverity]);

  const getCategoryIcon = (category: HealthCategory) => {
    switch (category) {
      case "property":
        return <Building2 className="w-3.5 h-3.5 text-blue-500" />;
      case "crm":
        return <Users className="w-3.5 h-3.5 text-emerald-500" />;
      case "survey":
        return <Calendar className="w-3.5 h-3.5 text-purple-500" />;
      case "invoice":
        return <Receipt className="w-3.5 h-3.5 text-amber-500" />;
    }
  };

  const getSeverityBadge = (severity: HealthSeverity) => {
    switch (severity) {
      case "critical":
        return (
          <Badge
            variant="outline"
            className="text-[10px] font-bold px-2 py-0.5 border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 gap-1 shrink-0"
          >
            <AlertCircle className="w-3 h-3" /> Critical
          </Badge>
        );
      case "warning":
        return (
          <Badge
            variant="outline"
            className="text-[10px] font-semibold px-2 py-0.5 border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 gap-1 shrink-0"
          >
            <AlertTriangle className="w-3 h-3" /> Warning
          </Badge>
        );
      case "info":
        return (
          <Badge
            variant="outline"
            className="text-[10px] font-medium px-2 py-0.5 border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400 gap-1 shrink-0"
          >
            <Info className="w-3 h-3" /> Info
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. HEALTH STATUS OVERVIEW CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border border-border bg-card rounded-xl p-3.5 space-y-1 text-card-foreground">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Status Basis Data</span>
            {summary?.overallHealth === "critical" ? (
              <AlertCircle className="w-4 h-4 text-rose-500" />
            ) : summary?.overallHealth === "warning" ? (
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
            )}
          </div>
          <div className="text-base sm:text-lg font-bold capitalize text-foreground">
            {loading ? (
              <Skeleton className="h-6 w-20" />
            ) : summary?.overallHealth === "critical" ? (
              <span className="text-rose-600 dark:text-rose-400">Perlu Review</span>
            ) : summary?.overallHealth === "warning" ? (
              <span className="text-amber-600 dark:text-amber-400">Peringatan</span>
            ) : (
              <span className="text-emerald-600 dark:text-emerald-400">Sangat Sehat</span>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground">
            {summary?.totalIssues ?? 0} anomali terdeteksi
          </p>
        </Card>

        <Card className="border border-border bg-card rounded-xl p-3.5 space-y-1 text-card-foreground">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Critical Issues</span>
            <AlertCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-base sm:text-lg font-bold text-rose-600 dark:text-rose-400 font-mono">
            {loading ? <Skeleton className="h-6 w-12" /> : summary?.criticalCount ?? 0}
          </div>
          <p className="text-[10px] text-muted-foreground">Mengganggu alur transaksi</p>
        </Card>

        <Card className="border border-border bg-card rounded-xl p-3.5 space-y-1 text-card-foreground">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Warning (Incomplete)</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-base sm:text-lg font-bold text-amber-600 dark:text-amber-400 font-mono">
            {loading ? <Skeleton className="h-6 w-12" /> : summary?.warningCount ?? 0}
          </div>
          <p className="text-[10px] text-muted-foreground">Data belum terisi lengkap</p>
        </Card>

        <Card className="border border-border bg-card rounded-xl p-3.5 space-y-1 text-card-foreground">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Info & Catatan</span>
            <Info className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-base sm:text-lg font-bold text-sky-600 dark:text-sky-400 font-mono">
            {loading ? <Skeleton className="h-6 w-12" /> : summary?.infoCount ?? 0}
          </div>
          <p className="text-[10px] text-muted-foreground">Atribut opsional/nullable</p>
        </Card>
      </div>

      {/* 2. FILTERS & REFRESH BAR */}
      <Card className="border border-border bg-card rounded-xl p-3 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <Button
              variant={selectedCategory === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory("all")}
              className={cn(
                "h-7 text-xs px-2.5 rounded-lg shrink-0 cursor-pointer",
                selectedCategory === "all" && "bg-emerald-600 text-white"
              )}
            >
              Semua ({summary?.totalIssues ?? 0})
            </Button>
            <Button
              variant={selectedCategory === "property" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory("property")}
              className={cn(
                "h-7 text-xs px-2.5 rounded-lg shrink-0 cursor-pointer gap-1",
                selectedCategory === "property" && "bg-emerald-600 text-white"
              )}
            >
              <Building2 className="w-3 h-3" /> Properti ({summary?.byCategory.property ?? 0})
            </Button>
            <Button
              variant={selectedCategory === "crm" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory("crm")}
              className={cn(
                "h-7 text-xs px-2.5 rounded-lg shrink-0 cursor-pointer gap-1",
                selectedCategory === "crm" && "bg-emerald-600 text-white"
              )}
            >
              <Users className="w-3 h-3" /> CRM ({summary?.byCategory.crm ?? 0})
            </Button>
            <Button
              variant={selectedCategory === "survey" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory("survey")}
              className={cn(
                "h-7 text-xs px-2.5 rounded-lg shrink-0 cursor-pointer gap-1",
                selectedCategory === "survey" && "bg-emerald-600 text-white"
              )}
            >
              <Calendar className="w-3 h-3" /> Survei ({summary?.byCategory.survey ?? 0})
            </Button>
            <Button
              variant={selectedCategory === "invoice" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory("invoice")}
              className={cn(
                "h-7 text-xs px-2.5 rounded-lg shrink-0 cursor-pointer gap-1",
                selectedCategory === "invoice" && "bg-emerald-600 text-white"
              )}
            >
              <Receipt className="w-3 h-3" /> Invoices ({summary?.byCategory.invoice ?? 0})
            </Button>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {/* Severity Filter */}
            <div className="flex items-center gap-1">
              <Button
                variant={selectedSeverity === "all" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setSelectedSeverity("all")}
                className="h-7 text-[11px] px-2"
              >
                Semua Level
              </Button>
              <Button
                variant={selectedSeverity === "critical" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setSelectedSeverity("critical")}
                className="h-7 text-[11px] px-2 text-rose-600 dark:text-rose-400"
              >
                Critical
              </Button>
              <Button
                variant={selectedSeverity === "warning" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setSelectedSeverity("warning")}
                className="h-7 text-[11px] px-2 text-amber-600 dark:text-amber-400"
              >
                Warning
              </Button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={loadDataHealth}
              disabled={loading}
              className="h-7 text-xs px-2.5 gap-1 cursor-pointer"
            >
              <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} /> Refresh
            </Button>
          </div>
        </div>
      </Card>

      {/* 3. ISSUES LIST */}
      <Card className="border border-border bg-card rounded-xl overflow-hidden text-card-foreground">
        <CardHeader className="p-3.5 border-b border-border bg-muted/20 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xs sm:text-sm font-bold flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Daftar Temuan Inkonsistensi Data
            </CardTitle>
            <CardDescription className="text-[11px] text-muted-foreground">
              Mendeteksi data orphan, relasi kosong, atau spesifikasi minimal secara real-time.
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-[10px] font-mono border-border">
            {filteredIssues.length} Item
          </Badge>
        </CardHeader>

        <CardContent className="p-0 divide-y divide-border">
          {loading ? (
            <div className="p-8 space-y-3">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl bg-muted" />
              ))}
            </div>
          ) : filteredIssues.length === 0 ? (
            <div className="p-12 text-center space-y-2 text-muted-foreground">
              <ShieldCheck className="w-10 h-10 mx-auto text-emerald-600 dark:text-emerald-400 opacity-80" />
              <p className="text-sm font-bold text-foreground">Tidak Ada Anomali Ditemukan</p>
              <p className="text-xs max-w-sm mx-auto">
                Seluruh data pada kategori ini memenuhi kelayakan operasional PLMS.
              </p>
            </div>
          ) : (
            filteredIssues.map((issue) => (
              <div
                key={issue.id}
                className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/30 transition-colors"
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="p-1 rounded bg-muted/60 border border-border">
                      {getCategoryIcon(issue.category)}
                    </span>
                    {getSeverityBadge(issue.severity)}
                    <span className="text-xs font-bold text-foreground truncate">
                      {issue.entityName}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-foreground/90">{issue.title}</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {issue.description}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => router.push(issue.deepLink)}
                    className="h-9 px-3 text-xs gap-1.5 cursor-pointer border-border bg-background hover:bg-muted text-foreground min-h-[44px]"
                  >
                    <span>Periksa</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
