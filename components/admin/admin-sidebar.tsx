"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type AdminNavItem = {
  href: string;
  label: string;
  shortLabel?: string;
};

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/vendors", label: "Vendors" },
  { href: "/admin/media", label: "Media" },
  { href: "/admin/settings", label: "Settings" },
];

export function isActiveAdminPath(pathname: string, href: string) {
  if (href === "/admin") {
    return pathname === "/admin";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarLink({ item, compact = false }: { item: AdminNavItem; compact?: boolean }) {
  const pathname = usePathname();
  const isActive = isActiveAdminPath(pathname, item.href);

  return (
    <Link
      href={item.href}
      className={`inline-flex items-center rounded-2xl px-4 py-3 text-sm font-medium transition-all ${
        isActive
          ? "bg-[#615FFF] text-white shadow-[0_10px_30px_rgba(97,95,255,0.22)]"
          : compact
            ? "border border-slate-200 bg-white text-slate-600 hover:border-[#615FFF]/30 hover:text-slate-900"
            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      }`}
    >
      {compact ? item.shortLabel ?? item.label : item.label}
    </Link>
  );
}

export default function AdminSidebar() {
  return (
    <>
      <aside className="hidden h-screen w-[280px] shrink-0 border-r border-slate-200 bg-white/95 backdrop-blur md:sticky md:top-0 md:flex md:flex-col">
        <div className="border-b border-slate-200 px-6 py-6">
          <Link href="/admin" className="block">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#615FFF]">Prelize</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Admin Panel</h1>
            <p className="mt-2 text-sm text-slate-500">Wholesale marketplace operations</p>
          </Link>
        </div>

        <nav className="flex flex-1 flex-col gap-2 px-4 py-5">
          {ADMIN_NAV_ITEMS.map((item) => (
            <SidebarLink key={item.href} item={item} />
          ))}

          <div className="mt-auto border-t border-slate-200 pt-4">
            <Link
              href="/"
              className="inline-flex w-full items-center rounded-2xl px-4 py-3 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              Back to Website
            </Link>
          </div>
        </nav>
      </aside>

      <div className="border-b border-slate-200 bg-white px-4 py-4 md:hidden">
        <div className="mb-4">
          <Link href="/admin" className="block">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#615FFF]">Prelize Admin</p>
            <p className="mt-1 text-xl font-semibold text-slate-900">Control Center</p>
          </Link>
        </div>

        <nav className="flex gap-2 overflow-x-auto pb-1">
          {ADMIN_NAV_ITEMS.map((item) => (
            <SidebarLink key={item.href} item={item} compact />
          ))}
        </nav>
      </div>
    </>
  );
}
