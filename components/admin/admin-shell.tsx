"use client";

import type { ReactNode } from "react";

import AdminHeader from "./admin-header";
import AdminSidebar from "./admin-sidebar";

export default function AdminShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f6f7fb] text-slate-900 md:flex">
      <AdminSidebar />
      <div className="min-w-0 flex-1">
        <AdminHeader />
        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
