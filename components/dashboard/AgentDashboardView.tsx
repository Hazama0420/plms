// components/dashboard/AgentDashboardView.tsx
"use client";

import { useRouter } from "next/navigation";
import { AgentTodayPriority } from "./AgentTodayPriority";
import { DashboardActivityWidgets } from "./DashboardActivityWidgets";
import { AgentPipelineStrip } from "./AgentPipelineStrip";
import { AgentPortfolioCard } from "./AgentPortfolioCard";
import { DashboardPropertySection, type PropertyCategoryFilter } from "./DashboardPropertySection";
import type { DashboardLeadItem } from "./DashboardRecentLeads";
import type { DashboardPropertyItem } from "./DashboardPropertyCard";
import type { Survey } from "@/types/survey.types";

import { useTranslation } from "@/hooks/use-translation";

interface AgentDashboardViewProps {
  userName?: string | null;
  userRole?: string;
  stats: any;
  featuredProperties: DashboardPropertyItem[];
  latestProperties: DashboardPropertyItem[];
  loadingFeatured?: boolean;
  loadingLatest?: boolean;
  featuredFilter: PropertyCategoryFilter;
  setFeaturedFilter: (f: PropertyCategoryFilter) => void;
  recentLeads: DashboardLeadItem[];
  upcomingSurveys: Survey[];
  onPropertyClick: (id: string) => void;
  onOpenAiSummary?: () => void;
}

export function AgentDashboardView({
  userName,
  userRole,
  stats,
  featuredProperties,
  latestProperties,
  loadingFeatured = false,
  loadingLatest = false,
  featuredFilter,
  setFeaturedFilter,
  recentLeads,
  upcomingSurveys,
  onPropertyClick,
}: AgentDashboardViewProps) {
  const router = useRouter();
  const { t } = useTranslation();

  const overdueCount = stats?.overdueFollowupsCount || 0;
  const scheduledCount = stats?.scheduledFollowupsCount || 0;
  const newLeadsCount = stats?.newLeadsCount || 0;
  const myLeadsTotal = stats?.myLeadsCount || recentLeads.length || 0;
  const myPropertiesTotal = stats?.myPropertiesCount || latestProperties.length || 0;
  const myPublishedTotal = stats?.myPublishedCount || 0;
  const dealsWonTotal = stats?.dealsWonCount || 0;

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* 1. VISUALLY DOMINANT PRIORITY SURFACE & GREETING */}
      <AgentTodayPriority
        userName={userName}
        overdueFollowupsCount={overdueCount}
        scheduledFollowupsCount={scheduledCount}
        newLeadsCount={newLeadsCount}
        upcomingSurveysCount={upcomingSurveys.length}
      />

      {/* 2. COMPACT INTERACTIVE ACTIVITY WIDGETS (CRM | Follow Up | Survei) */}
      <DashboardActivityWidgets
        leads={recentLeads}
        surveys={upcomingSurveys}
        totalLeadsCount={myLeadsTotal}
        scheduledFollowupsCount={scheduledCount}
        overdueFollowupsCount={overdueCount}
        upcomingSurveysCount={upcomingSurveys.length}
      />

      {/* 3. COMPACT PIPELINE SUMMARY PROGRESS STRIP */}
      <AgentPipelineStrip totalLeads={myLeadsTotal} />

      {/* 4. AGENT PORTFOLIO & QUICK UTILITY ACTIONS */}
      <div className="grid grid-cols-1 gap-4">
        <AgentPortfolioCard
          myPropertiesCount={myPropertiesTotal}
          myPublishedCount={myPublishedTotal}
          dealsWonCount={dealsWonTotal}
        />
      </div>

      {/* 5. SUBORDINATE PROPERTY SHOWCASE (Compacted preview) */}
      <div className="pt-2">
        <DashboardPropertySection
          title={t("dashboard.agentListingTitle")}
          subtitle={t("dashboard.agentListingSubtitle")}
          properties={featuredProperties.slice(0, 6)}
          loading={loadingFeatured}
          activeFilter={featuredFilter}
          onFilterChange={setFeaturedFilter}
          onSeeAll={() => router.push("/properties")}
          onPropertyClick={onPropertyClick}
        />
      </div>
    </div>
  );
}
