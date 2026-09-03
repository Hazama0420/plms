"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
} from "@/components/ui/pagination";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface NumberedPaginationProps {
  currentPage: number;
  totalPages: number;
}

export function NumberedPagination({ currentPage, totalPages }: NumberedPaginationProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Create a URL for a specific page by keeping all other query params
  const createPageURL = (pageNumber: number | string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", pageNumber.toString());
    return `${pathname}?${params.toString()}`;
  };

  // Helper to generate page numbers with ellipses
  const generatePagination = (current: number, total: number) => {
    // If 5 or less pages, just show all
    if (total <= 5) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    // Always show first, last, current, and adjacent to current
    if (current <= 3) {
      return [1, 2, 3, 4, "...", total];
    }

    if (current >= total - 2) {
      return [1, "...", total - 3, total - 2, total - 1, total];
    }

    return [1, "...", current - 1, current, current + 1, "...", total];
  };

  const pages = generatePagination(currentPage, totalPages);

  if (totalPages <= 1) return null;

  return (
    <Pagination className="justify-center sm:justify-start pt-4 w-full">
      <PaginationContent className="flex flex-wrap items-center gap-1.5 sm:gap-2">
        <PaginationItem>
          {currentPage > 1 ? (
            <Link 
              href={createPageURL(currentPage - 1)} 
              className="flex items-center h-9 sm:h-10 px-2.5 sm:px-4 rounded-xl text-xs sm:text-sm font-semibold cursor-pointer hover:bg-emerald-50 hover:text-emerald-700 text-muted-foreground border-transparent hover:border-emerald-200 border transition-colors"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Sebelumnya</span>
            </Link>
          ) : (
            <div className="flex items-center h-9 sm:h-10 px-2.5 sm:px-4 rounded-xl text-xs sm:text-sm font-semibold border-transparent border opacity-50 pointer-events-none text-muted-foreground">
              <ChevronLeft className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Sebelumnya</span>
            </div>
          )}
        </PaginationItem>

        {pages.map((page, i) => {
          if (page === "...") {
            return (
              <PaginationItem key={`ellipsis-${i}`}>
                <PaginationEllipsis className="h-9 w-6 sm:h-10 sm:w-8 text-muted-foreground opacity-60" />
              </PaginationItem>
            );
          }

          const pageNum = page as number;
          const isActive = pageNum === currentPage;

          return (
            <PaginationItem key={pageNum}>
              <Link 
                href={createPageURL(pageNum)} 
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex items-center justify-center h-9 min-w-9 sm:h-10 sm:min-w-10 rounded-xl text-xs sm:text-sm font-bold cursor-pointer border px-1 transition-colors",
                  isActive 
                    ? "bg-emerald-50 text-emerald-700 border-emerald-500 hover:bg-emerald-100 hover:text-emerald-800" 
                    : "text-muted-foreground hover:bg-muted/80 border-transparent hover:border-border/60"
                )}
              >
                {pageNum}
              </Link>
            </PaginationItem>
          );
        })}

        <PaginationItem>
          {currentPage < totalPages ? (
            <Link 
              href={createPageURL(currentPage + 1)}
              className="flex items-center h-9 sm:h-10 px-2.5 sm:px-4 rounded-xl text-xs sm:text-sm font-semibold cursor-pointer hover:bg-emerald-50 hover:text-emerald-700 text-muted-foreground border-transparent hover:border-emerald-200 border transition-colors"
            >
              <span className="hidden sm:inline">Berikutnya</span>
              <ChevronRight className="w-4 h-4 ml-1" />
            </Link>
          ) : (
            <div className="flex items-center h-9 sm:h-10 px-2.5 sm:px-4 rounded-xl text-xs sm:text-sm font-semibold border-transparent border opacity-50 pointer-events-none text-muted-foreground">
              <span className="hidden sm:inline">Berikutnya</span>
              <ChevronRight className="w-4 h-4 ml-1" />
            </div>
          )}
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
