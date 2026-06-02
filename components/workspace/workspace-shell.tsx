"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";

import AdminBackdrop from "@/components/admin/admin-backdrop";
import { SidebarProvider, useSidebar } from "@/components/admin/admin-sidebar-context";
import { ThemeProvider } from "@/components/admin/admin-theme-context";

import WorkspaceHeader from "./workspace-header";
import type { WorkspaceNavItem } from "./workspace-navigation";
import WorkspaceSidebar from "./workspace-sidebar";

type WorkspaceShellProps = {
  children: ReactNode;
  homeHref: string;
  navigation: WorkspaceNavItem[];
  searchAction: string;
  searchPlaceholder: string;
  userMenu: ReactNode;
  notificationHref?: string;
};

function WorkspaceShellContent({
  children,
  homeHref,
  navigation,
  searchAction,
  searchPlaceholder,
  userMenu,
  notificationHref,
}: WorkspaceShellProps) {
  const pathname = usePathname();
  const { isExpanded, isHovered, closeMobileSidebar, isMobileOpen } = useSidebar();

  useEffect(() => {
    if (isMobileOpen) {
      closeMobileSidebar();
    }
  }, [closeMobileSidebar, isMobileOpen, pathname]);

  return (
    <div className="min-h-screen bg-gray-50 text-slate-900">
      <WorkspaceSidebar key={pathname} homeHref={homeHref} navigation={navigation} />
      <AdminBackdrop />

      <div className={`transition-all duration-300 ease-in-out ${isExpanded || isHovered ? "lg:ml-[290px]" : "lg:ml-[90px]"}`}>
        <WorkspaceHeader
          homeHref={homeHref}
          searchAction={searchAction}
          searchPlaceholder={searchPlaceholder}
          userMenu={userMenu}
          notificationHref={notificationHref}
        />
        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

export default function WorkspaceShell(props: WorkspaceShellProps) {
  return (
    <ThemeProvider>
      <SidebarProvider>
        <WorkspaceShellContent {...props} />
      </SidebarProvider>
    </ThemeProvider>
  );
}
