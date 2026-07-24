"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";

interface QuickActionProps {
  icon: LucideIcon;
  label: string;
  href: string;
}

export function QuickAction({ icon: Icon, label, href }: QuickActionProps) {
  return (
    <Link href={href} className="inline-block">
      <Button
        variant="outline"
        className="flex flex-col items-center justify-center w-16 h-16 gap-1 rounded-2xl border-dashed hover:border-primary hover:bg-primary/5 transition-colors"
      >
        <Icon className="h-5 w-5 text-primary" />
        <span className="text-[9px] text-muted-foreground">{label}</span>
      </Button>
    </Link>
  );
}