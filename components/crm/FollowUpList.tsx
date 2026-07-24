'use client';

import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Phone, Calendar, ChevronRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useFollowups } from '@/hooks/use-followups';

export function FollowUpList() {
  const { followups, loading } = useFollowups();

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (!followups || followups.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Tidak ada jadwal follow-up hari ini
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {followups.map((item) => (
        <Card key={item.id} className="overflow-hidden">
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 text-center min-w-[48px]">
                <p className="text-xs text-muted-foreground">
                  {format(new Date(item.scheduled_at), 'HH:mm')}
                </p>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{item.lead?.name || 'Klien'}</p>
                <p className="text-xs text-muted-foreground truncate">{item.note}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {item.status}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600">
                  <Phone className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Calendar className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}