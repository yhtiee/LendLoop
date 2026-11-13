"use client";

import {
  ArrowDownToLineIcon,
  ArrowUpFromLineIcon,
  LayoutGridIcon,
  PackageIcon,
  SearchIcon,
  ShieldIcon,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { NavGroup, SwitchLink, ViewerCard, type NavItem } from "./sidebar-parts";
import { useViewer } from "./use-viewer";

/** Sidebar for the lending app (/dashboard). Every signed-in member gets this. */
export function AppSidebar() {
  const viewer = useViewer();
  const incoming = useQuery(api.loans.asLender, viewer.id ? {} : "skip");
  const incomingPending = incoming?.filter((l) => l.status === "pending").length ?? 0;

  const items: NavItem[] = [
    { title: "Overview", href: "/dashboard", icon: LayoutGridIcon, exact: true },
    { title: "Browse tools", href: "/dashboard/tools", icon: SearchIcon },
    { title: "My listings", href: "/dashboard/listings", icon: PackageIcon },
    { title: "My requests", href: "/dashboard/requests", icon: ArrowDownToLineIcon },
    { title: "Incoming", href: "/dashboard/incoming", icon: ArrowUpFromLineIcon, badge: incomingPending },
  ];

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-14 justify-center px-4 group-data-[collapsible=icon]:px-2">
        <Logo href="/dashboard" className="text-sm group-data-[collapsible=icon]:[&>span]:hidden" />
      </SidebarHeader>

      <SidebarContent>
        <NavGroup items={items} />
      </SidebarContent>

      <SidebarFooter className="border-t">
        {viewer.isAdmin && (
          <SwitchLink href="/admin" icon={ShieldIcon}>
            Admin console
          </SwitchLink>
        )}
        <ViewerCard />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
