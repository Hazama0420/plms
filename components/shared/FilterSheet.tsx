"use client";

import { ReactNode, useState } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { SlidersHorizontal, X } from "lucide-react";

interface FilterSheetProps {
  children: ReactNode;
  title?: string;
  trigger?: ReactNode;
  onApply?: () => void;
  onReset?: () => void;
}

export function FilterSheet({
  children,
  title = "Filter",
  trigger,
  onApply,
  onReset,
}: FilterSheetProps) {
  const [open, setOpen] = useState(false);

  const handleApply = () => {
    if (onApply) onApply();
    setOpen(false);
  };

  const handleReset = () => {
    if (onReset) onReset();
    setOpen(false);
  };

  return (
    <>
      {/* Trigger button di luar Sheet */}
      {trigger || (
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => setOpen(true)}
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span className="hidden sm:inline">Filter</span>
        </Button>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="h-[70vh] rounded-t-2xl p-0 flex flex-col">
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="font-semibold">{title}</h3>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {children}
          </div>
          <div className="p-4 border-t bg-muted/20 flex gap-3">
            {onReset && (
              <Button variant="outline" className="flex-1" onClick={handleReset}>
                Reset
              </Button>
            )}
            <Button className="flex-1" onClick={handleApply}>
              Terapkan Filter
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}