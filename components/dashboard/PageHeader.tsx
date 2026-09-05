"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  badge,
  children,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "relative w-full overflow-hidden mb-6 sm:mb-8 rounded-3xl shadow-md border border-inland-gold/25",
        className
      )}
    >
      {/* Background Image & Architectural Shading */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <img
          src="/bg-header.webp"
          alt="Header Background"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/45 to-slate-950/25" />
      </div>

      <div className="relative z-10 px-4 py-8 sm:px-8 sm:py-12 flex flex-col items-center text-center">
        {/* Badge */}
        {badge && <div className="mb-3">{badge}</div>}

        {/* Title */}
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight drop-shadow-sm max-w-3xl leading-tight">
          {title}
        </h1>

        {/* Gold Hairline Institutional Accent */}
        <div className="w-16 h-0.5 bg-inland-gold/80 rounded-full mx-auto my-2.5 sm:my-3" />

        {/* Subtitle */}
        {subtitle && (
          <p className="text-xs sm:text-sm lg:text-base text-emerald-100/90 font-medium max-w-2xl drop-shadow-sm leading-relaxed">
            {subtitle}
          </p>
        )}

        {/* Search / Children */}
        {children && (
          <div className="w-full mt-6 sm:mt-8 flex flex-col items-center">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
