"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type AdminLayoutProps = {
  children: React.ReactNode;
};

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/media", label: "Media" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/settings", label: "Settings" },
] as const;

function isActivePath(pathname: string, href: string) {
  if (href === "/admin") {
    return pathname === "/admin";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarLink({
  href,
  label,
  pathname,
}: {
  href: string;
  label: string;
  pathname: string;
}) {
  const isActive = isActivePath(pathname, href);

  return (
    <Link
      href={href}
      className={`inline-flex items-center rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
        isActive
          ? "bg-[#615FFF] text-white shadow-sm"
          : "text-slate-300 hover:bg-slate-900 hover:text-white"
      }`}
    >
      {label}
    </Link>
  );
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 md:flex">
      <aside className="hidden h-screen w-[250px] shrink-0 border-r border-slate-800 bg-slate-950 text-white md:sticky md:top-0 md:flex md:flex-col">
        <div className="border-b border-slate-800 px-6 py-6">
          <Link href="/admin" className="block">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8e8cff]">
              Prelize
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">Admin</h1>
          </Link>
        </div>

        <nav className="flex flex-1 flex-col gap-2 px-4 py-5">
          {NAV_ITEMS.map((item) => (
            <SidebarLink key={item.href} href={item.href} label={item.label} pathname={pathname} />
          ))}

          <div className="mt-auto border-t border-slate-800 pt-4">
            <Link
              href="/"
              className="inline-flex items-center rounded-xl px-4 py-3 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-900 hover:text-white"
            >
              Back to Website
            </Link>
          </div>
        </nav>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur md:hidden">
          <div className="px-4 py-4">
            <Link href="/admin" className="block">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#615FFF]">
                Prelize Admin
              </p>
              <p className="mt-1 text-lg font-semibold text-slate-900">Dashboard Menu</p>
            </Link>
          </div>

          <nav className="flex gap-2 overflow-x-auto px-4 pb-4">
            {NAV_ITEMS.map((item) => (
              <SidebarLink key={item.href} href={item.href} label={item.label} pathname={pathname} />
            ))}
            <Link
              href="/"
              className="inline-flex shrink-0 items-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:border-[#615FFF]/30 hover:text-slate-900"
            >
              Back to Website
            </Link>
          </nav>
        </div>

        <div className="p-4 sm:p-6 lg:p-8">{children}</div>
      </div>
    </div>
  );
}
