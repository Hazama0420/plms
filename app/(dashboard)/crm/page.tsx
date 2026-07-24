// app/(dashboard)/crm/page.tsx
"use client";

import { useState, Suspense } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FollowUpList } from "@/components/crm/FollowUpList";
import { useSearchParams } from 'next/navigation';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Users, Calendar } from "lucide-react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";

function CRMContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get("tab") || "followups";
  const [activeTab, setActiveTab] = useState(defaultTab);

  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            💼 CRM & Manajemen Prospek
          </h1>
          <p className="text-sm text-muted-foreground">
            Kelola prospek lead pembeli, jadwal follow-up, dan aktivitas konversi.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => router.push("/crm/followups/create")}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 text-xs"
          >
            <Plus className="h-4 w-4" /> Buat Follow-up
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted p-1">
          <TabsTrigger value="followups" className="text-xs gap-2">
            <Calendar className="w-3.5 h-3.5" /> Jadwal Follow-up
          </TabsTrigger>
          <TabsTrigger value="leads" className="text-xs gap-2">
            <Users className="w-3.5 h-3.5" /> Daftar Leads
          </TabsTrigger>
        </TabsList>

        <TabsContent value="followups" className="space-y-4">
          <FollowUpList />
        </TabsContent>

        <TabsContent value="leads" className="space-y-4">
          <Card className="border shadow-xs">
            <CardContent className="p-8 text-center text-muted-foreground space-y-2">
              <Users className="w-8 h-8 mx-auto opacity-40" />
              <p className="text-sm font-semibold">Modul Data Leads Klien</p>
              <p className="text-xs">Data prospek lead terintegrasi langsung dengan database CRM.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function CRMPage() {
  return (
    <Suspense fallback={
      <div className="space-y-6 pb-16">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-9 w-32" />
        </div>
        <Skeleton className="h-[400px] w-full rounded-xl" />
      </div>
    }>
      <CRMContent />
    </Suspense>
  );
}