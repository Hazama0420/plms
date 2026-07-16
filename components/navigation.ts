import {
  Home,
  Database,
  Building2,
  Users,
  Globe,
  BrainCircuit,
  BarChart3,
  Settings,
} from "lucide-react";

export interface NavigationItem {
  title: string;
  href: string;
  icon: React.ElementType;
}

export const navigation: NavigationItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: Home,
  },
  {
    title: "Master Data",
    href: "/master",
    icon: Database,
  },
  {
    title: "Property",
    href: "/property",
    icon: Building2,
  },
  {
    title: "CRM",
    href: "/crm",
    icon: Users,
  },
  {
    title: "Portal",
    href: "/portal",
    icon: Globe,
  },
  {
    title: "AI",
    href: "/ai",
    icon: BrainCircuit,
  },
  {
    title: "Report",
    href: "/report",
    icon: BarChart3,
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
  },
];