"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, useUser } from "@clerk/nextjs";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useViewer } from "./use-viewer";

export type NavItem = {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  /** Match only the exact path (for section index pages). */
  exact?: boolean;
};

export function NavGroup({ label, items }: { label?: string; items: NavItem[] }) {
  const pathname = usePathname();
  const isActive = (item: NavItem) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  return (
    <SidebarGroup>
      {label && <SidebarGroupLabel>{label}</SidebarGroupLabel>}
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton asChild isActive={isActive(item)} tooltip={item.title}>
                <Link href={item.href}>
                  <item.icon />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
              {!!item.badge && (
                <SidebarMenuBadge className="rounded-full bg-primary px-1.5 text-primary-foreground peer-data-active/menu-button:text-primary-foreground">
                  {item.badge}
                </SidebarMenuBadge>
              )}
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

/** A single quiet link used to switch between the lending app and the admin console. */
export function SwitchLink({
  href,
  icon: Icon,
  children,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  children: string;
}) {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton asChild tooltip={children} className="text-muted-foreground">
          <Link href={href}>
            <Icon />
            <span>{children}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

export function ViewerCard() {
  const { user } = useUser();
  const viewer = useViewer();

  return (
    <div className="flex items-center gap-2 p-1 group-data-[collapsible=icon]:p-0">
      <UserButton appearance={{ elements: { avatarBox: "size-7" } }} />
      <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
        <p className="truncate text-sm font-medium">
          {user?.fullName ?? user?.username ?? user?.primaryEmailAddress?.emailAddress ?? "Account"}
        </p>
        <p className="truncate text-xs text-muted-foreground capitalize">{viewer.role}</p>
      </div>
    </div>
  );
}
