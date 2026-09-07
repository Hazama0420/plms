// components/dashboard/AdminInventorySummary.tsx
"use client";

import Link from "next/link";
import { Building2, Plus, ArrowUpRight, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n/useTranslation";

interface AdminInventorySummaryProps {
  totalProperties: number;
  publishedProperties: number;
  draftProperties: number;
}

export function AdminInventorySummary({
  totalProperties = 0,
  publishedProperties = 0,
  draftProperties = 0,
}: AdminInventorySummaryProps) {
  const { t } = useTranslation();
  const publishedPercent = totalProperties > 0 ? Math.round((publishedProperties / totalProperties) * 100) : 0;
  const draftPercent = totalProperties > 0 ? Math.round((draftProperties / totalProperties) * 100) : 0;

  return (
    <Card className="rounded-2xl border-border/80 shadow-2xs bg-card overflow-hidden">
      <CardHeader className="p-3.5 sm:p-4 border-b border-border/60 flex flex-row items-center justify-between">
        <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          {t("dashboard.stats.inventoryStatus")}
        </CardTitle>

        <Link
          href="/properties"
          className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center"
        >
          <span>{t("dashboard.stats.allListings")}</span>
          <ChevronRight className="w-3 h-3 ml-0.5" />
        </Link>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Progress Bar Distribution */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-foreground">{t("dashboard.stats.totalInventoryUnits").replace("{total}", totalProperties.toString())}</span>
            <span className="text-muted-foreground font-mono">{publishedPercent}% {t("dashboard.stats.published")}</span>
          </div>

          <div className="h-2 w-full rounded-full bg-muted overflow-hidden flex">
            <div
              style={{ width: `${publishedPercent}%` }}
              className="bg-emerald-500 h-full transition-all"
              title={t("dashboard.stats.activePublishedTooltip").replace("{count}", publishedProperties.toString())}
            />
            <div
              style={{ width: `${draftPercent}%` }}
              className="bg-amber-500 h-full transition-all"
              title={t("dashboard.stats.draftReviewTooltip").replace("{count}", draftProperties.toString())}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              {publishedProperties} {t("dashboard.stats.publishedPublic")}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              {draftProperties} {t("dashboard.stats.draftReview")}
            </span>
          </div>
        </div>

        {/* Quick Add Button */}
        <Link href="/properties/create" className="block pt-1">
          <Button
            size="sm"
            className="w-full h-8.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t("dashboard.stats.addNewListing")}</span>
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
