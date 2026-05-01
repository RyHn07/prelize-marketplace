"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { getVendorWorkspaceAccessState } from "@/lib/marketplace-access";
import { getSupabaseClient } from "@/lib/supabase-client";
import { getVendorById } from "@/lib/vendors/queries";

type VendorLayoutProps = {
  children: React.ReactNode;
};

const NAV_ITEMS = [
  { href: "/vendor", label: "Dashboard" },
  { href: "/vendor/orders", label: "Orders" },
  { href: "/vendor/products", label: "Products" },
  { href: "/vendor/media", label: "Media" },
  { href: "/vendor/categories", label: "Categories" },
  { href: "/vendor/shop-settings", label: "Shop Settings" },
] as const;

function isActivePath(pathname: string, href: string) {
  if (href === "/vendor") {
    return pathname === "/vendor";
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
          ? "bg-emerald-500 text-slate-950 shadow-sm"
          : "text-slate-300 hover:bg-slate-900 hover:text-white"
      }`}
    >
      {label}
    </Link>
  );
}

export default function VendorLayout({ children }: VendorLayoutProps) {
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [hasVendorWorkspaceAccess, setHasVendorWorkspaceAccess] = useState(false);
  const [vendorName, setVendorName] = useState("Vendor");
  const [vendorRole, setVendorRole] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const supabase = getSupabaseClient();

    const loadAccess = async () => {
      const access = await getVendorWorkspaceAccessState(supabase);

      if (!isMounted) {
        return;
      }

      setUserEmail(access.userEmail);
      setHasVendorWorkspaceAccess(access.hasVendorWorkspaceAccess);
      setVendorRole(access.activeVendorRole);

      if (!access.activeVendorId) {
        setLoading(false);
        return;
      }

      const vendorResult = await getVendorById(access.activeVendorId);

      if (!isMounted) {
        return;
      }

      if (vendorResult.data?.name) {
        setVendorName(vendorResult.data.name);
      }

      setLoading(false);
    };

    void loadAccess();

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 p-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
          Loading vendor dashboard...
        </div>
      </div>
    );
  }

  if (!userEmail) {
    return (
      <div className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-900">Vendor Dashboard</h1>
          <p className="mt-3 text-sm text-slate-500">Please login to access the vendor workspace.</p>
          <Link
            href="/login"
            className="mt-6 inline-flex items-center justify-center rounded-xl bg-emerald-500 px-5 py-2 text-sm font-semibold text-slate-950 transition-opacity hover:opacity-90"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  if (!hasVendorWorkspaceAccess) {
    return (
      <div className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-900">Vendor Dashboard</h1>
          <p className="mt-3 text-sm text-slate-500">
            Your account does not have vendor workspace access yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 md:flex">
      <aside className="hidden h-screen w-[260px] shrink-0 border-r border-slate-800 bg-slate-950 text-white md:sticky md:top-0 md:flex md:flex-col">
        <div className="border-b border-slate-800 px-6 py-6">
          <Link href="/vendor" className="block">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-400">
              Vendor Workspace
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">{vendorName}</h1>
            <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-400">
              {vendorRole ?? "vendor"}
            </p>
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
            <Link href="/vendor" className="block">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-600">
                Vendor Dashboard
              </p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{vendorName}</p>
            </Link>
          </div>

          <nav className="flex gap-2 overflow-x-auto px-4 pb-4">
            {NAV_ITEMS.map((item) => (
              <SidebarLink key={item.href} href={item.href} label={item.label} pathname={pathname} />
            ))}
            <Link
              href="/"
              className="inline-flex shrink-0 items-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:border-emerald-300 hover:text-slate-900"
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
