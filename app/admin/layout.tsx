import type { Metadata } from "next";
import { AdminGate } from "@/components/app/admin-gate";
import { AdminSidebar } from "@/components/app/admin-sidebar";
import { AppShell } from "@/components/app/app-shell";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · LendLoop Admin" },
};

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <AdminGate>
      <AppShell sidebar={<AdminSidebar />}>{children}</AppShell>
    </AdminGate>
  );
}
