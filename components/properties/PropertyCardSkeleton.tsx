// components/properties/PropertyCardSkeleton.tsx
"use client";

export function PropertyCardSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm animate-pulse">
      <div className="aspect-[4/3] bg-slate-200 dark:bg-slate-700" />
      <div className="p-4 space-y-3">
        <div className="flex justify-between">
          <div className="space-y-2">
            <div className="h-6 w-32 bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded" />
          </div>
          <div className="h-6 w-16 bg-slate-200 dark:bg-slate-700 rounded" />
        </div>
        <div className="space-y-2">
          <div className="h-5 w-48 bg-slate-200 dark:bg-slate-700 rounded" />
          <div className="h-4 w-40 bg-slate-200 dark:bg-slate-700 rounded" />
        </div>
        <div className="flex gap-3">
          <div className="h-4 w-10 bg-slate-200 dark:bg-slate-700 rounded" />
          <div className="h-4 w-10 bg-slate-200 dark:bg-slate-700 rounded" />
          <div className="h-4 w-12 bg-slate-200 dark:bg-slate-700 rounded" />
        </div>
        <div className="flex justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700" />
            <div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded" />
          </div>
          <div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded" />
        </div>
        <div className="flex gap-1 pt-1">
          <div className="h-8 w-8 bg-slate-200 dark:bg-slate-700 rounded" />
          <div className="h-8 w-8 bg-slate-200 dark:bg-slate-700 rounded" />
          <div className="h-8 w-8 bg-slate-200 dark:bg-slate-700 rounded" />
          <div className="h-8 w-8 bg-slate-200 dark:bg-slate-700 rounded" />
        </div>
      </div>
    </div>
  );
}