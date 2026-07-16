"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

import { navigation } from "@/components/navigation";

export default function NavMain() {
  const pathname = usePathname();

  return (
    <SidebarMenu>
      {navigation.map((item) => {
        const Icon = item.icon;

        return (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton
              isActive={pathname === item.href}
              render={
                <Link href={item.href}>
                  <Icon />
                  <span>{item.title}</span>
                </Link>
              }
            />
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}