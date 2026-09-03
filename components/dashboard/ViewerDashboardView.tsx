// components/dashboard/ViewerDashboardView.tsx
"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, Building2, Calculator, ShieldCheck, User, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "./PageHeader";
import { DashboardPropertySection, type PropertyCategoryFilter } from "./DashboardPropertySection";
import { DashboardPropertySearch } from "./DashboardPropertySearch";
import type { DashboardPropertyItem } from "./DashboardPropertyCard";

interface ViewerDashboardViewProps {
  featuredProperties: DashboardPropertyItem[];
  latestProperties: DashboardPropertyItem[];
  loadingFeatured?: boolean;
  loadingLatest?: boolean;
  featuredFilter: PropertyCategoryFilter;
  setFeaturedFilter: (f: PropertyCategoryFilter) => void;
  agents: any[];
  onPropertyClick: (id: string) => void;
}

export function ViewerDashboardView({
  featuredProperties,
  latestProperties,
  loadingFeatured = false,
  loadingLatest = false,
  featuredFilter,
  setFeaturedFilter,
  agents,
  onPropertyClick,
}: ViewerDashboardViewProps) {
  const router = useRouter();

  return (
    <div className="space-y-10">
      {/* 1. Hero Search Banner */}
      <PageHeader
        title="Temukan Hunian & Investasi Terbaik Bersama Inland Property"
        badge={
          <Badge className="bg-emerald-500/10 text-emerald-100 border-emerald-400/30 text-xs font-semibold px-3 py-1 backdrop-blur-md">
            ✨ Platform Properti Terpercaya
          </Badge>
        }
      >
        <div className="w-full max-w-4xl">
          {/* Global Multi-Search Bar */}
          <DashboardPropertySearch />
        </div>
      </PageHeader>

      {/* 2. Featured Properties Section */}
      <DashboardPropertySection
        title="Pilihan Properti Unggulan"
        subtitle="Rekomendasi terbaik dengan legalitas lengkap dan harga terbaik"
        properties={featuredProperties}
        loading={loadingFeatured}
        activeFilter={featuredFilter}
        onFilterChange={setFeaturedFilter}
        onSeeAll={() => router.push("/properties")}
        onPropertyClick={onPropertyClick}
      />

      {/* 3. KPR Simulator CTA Card */}
      <Card className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-slate-900 text-white rounded-3xl overflow-hidden border-0 shadow-lg p-6 sm:p-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <Badge className="bg-white/20 text-white border-0 text-xs font-semibold">
              Simulasi Kredit Rumah
            </Badge>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-white">
              Rencanakan Pembelian Rumah Impian Anda Sekarang
            </h2>
            <p className="text-xs sm:text-sm text-white/80 leading-relaxed">
              Gunakan kalkulator KPR interaktif kami untuk menghitung estimasi angsuran bulanan, uang muka (DP), dan syarat gaji bersih secara transparan.
            </p>
          </div>

          <Link href="/kpr-calculator" className="shrink-0 w-full sm:w-auto">
            <Button
              size="lg"
              className="w-full sm:w-auto h-12 px-6 rounded-2xl bg-white text-emerald-950 hover:bg-white/90 font-extrabold text-sm shadow-md cursor-pointer flex items-center justify-center gap-2"
            >
              <Calculator className="w-5 h-5 text-emerald-600" />
              <span>Buka Kalkulator KPR</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      </Card>

      {/* 4. Verified Agents Showcase */}
      {agents.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-foreground tracking-tight flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Konsultan Properti Resmi</span>
              </h2>
              <p className="text-xs text-muted-foreground">
                Didampingi oleh agen profesional berlisensi Inland Property
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {agents.slice(0, 4).map((agent) => (
              <Card
                key={agent.id}
                className="bg-card border-border/80 shadow-xs rounded-2xl p-4 text-center space-y-3 hover:border-emerald-500/40 transition-colors"
              >
                <div className="w-16 h-16 rounded-full overflow-hidden mx-auto bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center border-2 border-emerald-500/30">
                  {agent.avatar_url ? (
                    <img src={agent.avatar_url} alt={agent.full_name} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-8 h-8 text-emerald-600" />
                  )}
                </div>

                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-foreground truncate">
                    {agent.full_name}
                  </h4>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold uppercase tracking-wider mt-0.5">
                    Official Consultant
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
