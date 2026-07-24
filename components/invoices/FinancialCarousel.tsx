'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface FinancialData {
  label: string;
  value: string;
  change?: string;
  color?: string;
}

interface FinancialCarouselProps {
  data: FinancialData[];
}

export function FinancialCarousel({ data }: FinancialCarouselProps) {
  return (
    <div className="overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory">
      <div className="flex gap-4" style={{ width: `${data.length * 180 + (data.length - 1) * 16}px` }}>
        {data.map((item, idx) => (
          <div key={idx} className="flex-shrink-0 w-[160px] snap-start">
            <Card className={cn('border-0 shadow-sm', item.color)}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{item.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-bold">{item.value}</p>
                {item.change && (
                  <p className="text-xs text-muted-foreground">{item.change}</p>
                )}
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}