"use client";

import {
  ActivityIcon,
  ArrowLeftIcon,
  BoxesIcon,
  GaugeIcon,
  HandshakeIcon,
  UsersIcon,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { NavGroup, SwitchLink, ViewerCard, type NavItem } from "./sidebar-parts";

const items: NavItem[] = [
  { title: "Overview", href: "/admin", icon: GaugeIcon, exact: true },
  { title: "Listings", href: "/admin/listings", icon: BoxesIcon },
  { title: "Loans", href: "/admin/loans", icon: HandshakeIcon },
  { title: "Members", href: "/admin/members", icon: UsersIcon },
  { title: "Automations", href: "/admin/automations", icon: ActivityIcon },
];

/** Sidebar for the admin console (/admin). Only rendered for admins. */
export function AdminSidebar() {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-14 flex-row items-center gap-2 px-4 group-data-[collapsible=icon]:px-2">
        <Logo href="/admin" className="text-sm group-data-[collapsible=icon]:[&>span]:hidden" />
        <span className="rounded-full border border-primary/30 bg-accent px-1.5 py-px text-[10px] font-medium tracking-wide text-accent-foreground uppercase group-data-[collapsible=icon]:hidden">
          Admin
        </span>
      </SidebarHeader>

      <SidebarContent>
        <NavGroup items={items} />
      </SidebarContent>

      <SidebarFooter className="border-t">
        <SwitchLink href="/dashboard" icon={ArrowLeftIcon}>
          Back to lending
        </SwitchLink>
        <ViewerCard />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
