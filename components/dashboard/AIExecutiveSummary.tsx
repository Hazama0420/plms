'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';

interface AIExecutiveSummaryProps {
  summary: string;
}

export function AIExecutiveSummary({ summary }: AIExecutiveSummaryProps) {
  if (!summary) return null;

  return (
    <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
      <CardHeader className="flex flex-row items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <CardTitle className="text-base">Ringkasan Eksekutif AI</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-relaxed text-muted-foreground">{summary}</p>
      </CardContent>
    </Card>
  );
}