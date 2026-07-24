"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Loader2 } from "lucide-react";

interface ExecutiveSummaryProps {
  projectId: string;
}

export function ExecutiveSummary({ projectId }: ExecutiveSummaryProps) {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/ai/summarize?projectId=${projectId}`)
      .then((res) => res.json())
      .then((data) => {
        setSummary(data.summary || "Tidak ada ringkasan yang tersedia.");
        setLoading(false);
      })
      .catch(() => {
        setSummary("Gagal memuat ringkasan AI. Coba lagi nanti.");
        setLoading(false);
      });
  }, [projectId]);

  if (loading) {
    return (
      <Card className="border-indigo-200 bg-indigo-50/50 dark:bg-indigo-950/20">
        <CardContent className="p-4 flex items-center gap-3">
          <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
          <span className="text-sm text-muted-foreground">AI sedang merangkum proyek...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-indigo-200 bg-indigo-50/70 dark:bg-indigo-950/30">
      <CardContent className="p-4 flex gap-3 items-start">
        <Sparkles className="w-5 h-5 text-indigo-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-xs font-medium text-indigo-700 dark:text-indigo-300 uppercase tracking-wider">
            Ringkasan Eksekutif AI
          </p>
          <p className="text-sm text-foreground leading-relaxed">{summary}</p>
        </div>
      </CardContent>
    </Card>
  );
}