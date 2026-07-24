"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Building2, Users, FileText, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t bg-background md:hidden h-16 z-50 flex items-center justify-around">
      {[
        { icon: Home, label: "Dashboard", href: "/dashboard" },
        { icon: Building2, label: "Properti", href: "/properties" },
        { icon: Users, label: "Leads", href: "/crm/leads" },
        { icon: FileText, label: "Invoice", href: "/invoices" },
        { icon: Settings, label: "Lainnya", href: "/settings" },
      ].map(({ icon: Icon, label, href }) => {
        const isActive = pathname?.startsWith(href) || (href === "/dashboard" && pathname === "/");
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-col items-center gap-0.5 text-[10px] text-muted-foreground transition-colors",
              isActive && "text-primary font-medium"
            )}
          >
            <Icon className="h-5 w-5" />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}