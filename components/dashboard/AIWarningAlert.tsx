'use client';

import { AlertCircle, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

interface Alert {
  type: 'critical' | 'warning';
  title: string;
  description: string;
  details?: any;
}

interface AIWarningAlertProps {
  alerts: Alert[];
}

export function AIWarningAlert({ alerts }: AIWarningAlertProps) {
  if (!alerts || alerts.length === 0) return null;

  const critical = alerts.filter(a => a.type === 'critical');
  const warning = alerts.filter(a => a.type === 'warning');
  const displayAlerts = critical.length > 0 ? critical : warning.slice(0, 1);

  return (
    <div className="space-y-2">
      {displayAlerts.map((alert, idx) => (
        <Sheet key={idx}>
  <SheetTrigger>
    <Card className={cn(
      'cursor-pointer border-l-4 hover:shadow-md transition-shadow',
              alert.type === 'critical' ? 'border-l-red-500 bg-red-50/50 dark:bg-red-950/20' : 'border-l-yellow-500 bg-yellow-50/50 dark:bg-yellow-950/20'
            )}>
              <CardContent className="flex items-center gap-3 p-4">
                {alert.type === 'critical' ? (
                  <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{alert.title}</p>
                  <p className="text-sm text-muted-foreground truncate">{alert.description}</p>
                </div>
                <Button variant="ghost" size="sm" className="flex-shrink-0">
                  Lihat
                </Button>
              </CardContent>
            </Card>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[70vh]">
            <SheetHeader>
              <SheetTitle>{alert.title}</SheetTitle>
            </SheetHeader>
            <div className="mt-4 space-y-4">
              <p>{alert.description}</p>
              {alert.details && (
                <pre className="text-xs bg-muted p-4 rounded-lg overflow-auto max-h-60">
                  {JSON.stringify(alert.details, null, 2)}
                </pre>
              )}
              <div className="flex gap-2 mt-4">
                <Button variant="outline" className="flex-1">Tandai Selesai</Button>
                <Button className="flex-1">Tindak Lanjut</Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      ))}
    </div>
  );
}