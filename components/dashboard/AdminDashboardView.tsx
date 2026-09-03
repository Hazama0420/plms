// components/dashboard/AdminDashboardView.tsx
"use client";

import { useRouter } from "next/navigation";
import { DashboardHeader } from "./DashboardHeader";
import { AdminBusinessKpiGrid } from "./AdminBusinessKpiGrid";
import { AdminAttentionRequired } from "./AdminAttentionRequired";
import { DashboardActivityWidgets } from "./DashboardActivityWidgets";
import { AdminTeamSummary } from "./AdminTeamSummary";
import { AdminInventorySummary } from "./AdminInventorySummary";
import { DashboardPropertySection, type PropertyCategoryFilter } from "./DashboardPropertySection";
import type { DashboardLeadItem } from "./DashboardRecentLeads";
import type { DashboardPropertyItem } from "./DashboardPropertyCard";
import type { Survey } from "@/types/survey.types";

interface AdminDashboardViewProps {
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
  agents: any[];
  onPropertyClick: (id: string) => void;
  onOpenAiSummary?: () => void;
}

export function AdminDashboardView({
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
  agents,
  onPropertyClick,
  onOpenAiSummary,
}: AdminDashboardViewProps) {
  const router = useRouter();

  const totalProps = stats?.totalProperties || 0;
  const publishedProps = stats?.publishedProperties || 0;
  const draftProps = stats?.draftProperties || 0;
  const totalLeads = stats?.totalLeads || 0;
  const activeLeads = stats?.activeLeads || 0;
  const closedDeals = stats?.closedDealsCount || 0;
  const pipelineVal = stats?.pipelineValue || 0;
  const overdueFollowups = stats?.overdueFollowupsCount || 0;
  const newLeads = stats?.newLeadsCount || 0;

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* 1. OPERATIONAL CONTEXT HEADER */}
      <DashboardHeader
        userName={userName}
        userRole={userRole}
        onOpenAiSummary={onOpenAiSummary}
        canCreateProperty={true}
      />

      {/* 2. BUSINESS KPI GRID (Single coherent 4-column strip) */}
      <AdminBusinessKpiGrid
        totalProperties={totalProps}
        publishedProperties={publishedProps}
        draftProperties={draftProps}
        totalLeads={totalLeads}
        activeLeads={activeLeads}
        closedDealsCount={closedDeals}
        pipelineValue={pipelineVal}
        activeAgentsCount={agents.length || 0}
      />

      {/* 3. OPERATIONAL ATTENTION REQUIRED (Triage alerts banner) */}
      <AdminAttentionRequired
        overdueFollowupsCount={overdueFollowups}
        upcomingSurveysCount={upcomingSurveys.length}
        draftPropertiesCount={draftProps}
        newLeadsCount={newLeads}
      />

      {/* 4. COMPACT INTERACTIVE ACTIVITY WIDGETS (CRM | Follow Up | Survei) */}
      <DashboardActivityWidgets
        leads={recentLeads}
        surveys={upcomingSurveys}
        totalLeadsCount={totalLeads}
        scheduledFollowupsCount={stats?.scheduledFollowupsCount || 0}
        overdueFollowupsCount={overdueFollowups}
        upcomingSurveysCount={upcomingSurveys.length}
      />

      {/* 5. MANAGEMENT SUPERVISION & INVENTORY (2 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <AdminTeamSummary agents={agents} />
        <AdminInventorySummary
          totalProperties={totalProps}
          publishedProperties={publishedProps}
          draftProperties={draftProps}
        />
      </div>

      {/* 6. SUBORDINATE PROPERTY INVENTORY PREVIEW */}
      <div className="pt-2">
        <DashboardPropertySection
          title="Inventaris Properti Terbaru"
          subtitle="Daftar listing terverifikasi yang tayang aktif di katalog"
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
