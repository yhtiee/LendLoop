import { AppShell } from "@/components/app/app-shell";
import { AppSidebar } from "@/components/app/app-sidebar";

export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return <AppShell sidebar={<AppSidebar />}>{children}</AppShell>;
}
