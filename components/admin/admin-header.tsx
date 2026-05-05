"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ADMIN_NAV_ITEMS, isActiveAdminPath } from "./admin-sidebar";

function resolveSectionLabel(pathname: string) {
  const matchedItem =
    ADMIN_NAV_ITEMS.find((item) => isActiveAdminPath(pathname, item.href)) ?? ADMIN_NAV_ITEMS[0];

  if (pathname.includes("/new")) {
    return `New ${matchedItem.label.slice(0, -1) || matchedItem.label}`;
  }

  if (pathname.includes("/edit")) {
    return `Edit ${matchedItem.label.slice(0, -1) || matchedItem.label}`;
  }

  return matchedItem.label;
}

export default function AdminHeader() {
  const pathname = usePathname();
  const sectionLabel = resolveSectionLabel(pathname);

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="flex flex-col gap-3 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#615FFF]">Admin Workspace</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-900">{sectionLabel}</h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/products/new"
            className="inline-flex items-center justify-center rounded-2xl bg-[#615FFF] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            Add Product
          </Link>
          <Link
            href="/admin/orders"
            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:border-[#615FFF]/30 hover:text-slate-900"
          >
            View Orders
          </Link>
        </div>
      </div>
    </header>
  );
}
