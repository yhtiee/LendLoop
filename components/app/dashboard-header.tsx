"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";

const labels: Record<string, string> = {
  dashboard: "Dashboard",
  tools: "Browse tools",
  listings: "Listings",
  requests: "My requests",
  incoming: "Incoming",
  admin: "Admin console",
  loans: "Loans",
  members: "Members",
  automations: "Automations",
};

export function DashboardHeader() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-1 data-[orientation=vertical]:h-4" />
      <Breadcrumb>
        <BreadcrumbList>
          {segments.map((seg, i) => {
            const href = "/" + segments.slice(0, i + 1).join("/");
            const label = labels[seg] ?? seg;
            const last = i === segments.length - 1;
            const linkable = !last;
            return (
              <Fragment key={href}>
                {i > 0 && <BreadcrumbSeparator className={i < segments.length - 1 ? "hidden sm:block" : undefined} />}
                <BreadcrumbItem className={!last ? "hidden sm:inline-flex" : undefined}>
                  {last ? (
                    <BreadcrumbPage>{label}</BreadcrumbPage>
                  ) : linkable ? (
                    <BreadcrumbLink asChild>
                      <Link href={href}>{label}</Link>
                    </BreadcrumbLink>
                  ) : (
                    <span>{label}</span>
                  )}
                </BreadcrumbItem>
              </Fragment>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>
      <div className="ml-auto">
        <ThemeToggle />
      </div>
    </header>
  );
}
