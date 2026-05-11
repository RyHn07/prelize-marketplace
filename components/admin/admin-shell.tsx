"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

import AdminBackdrop from "./admin-backdrop";
import AdminHeader from "./admin-header";
import AdminSidebar from "./admin-sidebar";
import { SidebarProvider, useSidebar } from "./admin-sidebar-context";
import { ThemeProvider } from "./admin-theme-context";

function AdminShellContent({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { isExpanded, isHovered, closeMobileSidebar, isMobileOpen } = useSidebar();

  useEffect(() => {
    if (isMobileOpen) {
      closeMobileSidebar();
    }
  }, [closeMobileSidebar, isMobileOpen, pathname]);

  return (
    <div className="min-h-screen bg-gray-50 text-slate-900">
      <AdminSidebar />
      <AdminBackdrop />

      <div
        className={`transition-all duration-300 ease-in-out ${
          isExpanded || isHovered ? "lg:ml-[290px]" : "lg:ml-[90px]"
        }`}
      >
        <AdminHeader />
        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

export default function AdminShell({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <SidebarProvider>
        <AdminShellContent>{children}</AdminShellContent>
      </SidebarProvider>
    </ThemeProvider>
  );
}
