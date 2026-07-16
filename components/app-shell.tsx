"use client";

import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";

import { AppSidebar } from "./dashboard/app-sidebar";
import AppHeader from "./app-header";

interface Props {
  children: React.ReactNode;
}

export function AppShell({
  children,
}: Props) {
  return (
    <SidebarProvider>

      <AppSidebar />

      <SidebarInset>

        <AppHeader />

        <main className="p-6">

          {children}

        </main>

      </SidebarInset>

    </SidebarProvider>
  );
}