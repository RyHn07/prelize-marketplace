"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import VendorUserDropdown from "@/components/vendor/vendor-user-dropdown";
import WorkspaceShell from "@/components/workspace/workspace-shell";
import type { WorkspaceNavItem } from "@/components/workspace/workspace-navigation";
import { fetchVendorOnboardingStatus } from "@/lib/vendor-onboarding";

type VendorLayoutProps = {
  children: React.ReactNode;
};

const VENDOR_NAVIGATION: WorkspaceNavItem[] = [
  {
    name: "Dashboard",
    path: "/vendor",
    icon: "grid",
  },
  {
    name: "Products",
    icon: "package",
    subItems: [
      { label: "All Products", href: "/vendor/products" },
      { label: "Add Product", href: "/vendor/products/new" },
      { label: "Categories", href: "/vendor/categories" },
      { label: "Brands", href: "/vendor/brands" },
      { label: "Media Library", href: "/vendor/media" },
      { label: "Product Reviews", href: "/vendor/reviews" },
    ],
  },
  {
    name: "Orders",
    icon: "shoppingBag",
    subItems: [
      { label: "All Orders", href: "/vendor/orders" },
      { label: "Pending Orders", href: "/vendor/orders?status=Pending" },
      { label: "Completed Orders", href: "/vendor/orders?status=Delivered" },
      { label: "Cancelled Orders", href: "/vendor/orders?status=Cancelled" },
    ],
  },
  {
    name: "Shipping",
    icon: "truck",
    subItems: [{ label: "China Domestic Delivery", href: "/vendor/cnds" }],
  },
  {
    name: "Shop Settings",
    path: "/vendor/shop-settings",
    icon: "settings",
  },
];

export default function VendorLayout({ children }: VendorLayoutProps) {
  const pathname = usePathname();
  const isOnboardingPath = pathname === "/vendor" || pathname === "/vendor/register";
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [vendorName, setVendorName] = useState("Vendor");
  const [vendorRole, setVendorRole] = useState<string | null>(null);
  const [canAccessVendorWorkspace, setCanAccessVendorWorkspace] = useState(false);
  const [hasPendingInvitation, setHasPendingInvitation] = useState(false);
  const [hasVendorMembership, setHasVendorMembership] = useState(false);
  const [vendorStatus, setVendorStatus] = useState<"pending" | "active" | "suspended" | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadAccess = async () => {
      try {
        const onboardingStatus = await fetchVendorOnboardingStatus();

        if (!isMounted) {
          return;
        }

        setUserEmail(onboardingStatus.userEmail);
        setCanAccessVendorWorkspace(onboardingStatus.canAccessVendorWorkspace);
        setHasPendingInvitation(onboardingStatus.hasPendingInvitation);
        setHasVendorMembership(onboardingStatus.hasVendorMembership);
        setVendorRole(onboardingStatus.vendorRole);
        setVendorStatus(onboardingStatus.vendorStatus);

        if (onboardingStatus.vendorName) {
          setVendorName(onboardingStatus.vendorName);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
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

  if (!canAccessVendorWorkspace) {
    if (isOnboardingPath) {
      return <div className="min-h-screen bg-white">{children}</div>;
    }

    return (
      <div className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-900">Vendor Dashboard</h1>
          <p className="mt-3 text-sm text-slate-500">
            {hasVendorMembership || hasPendingInvitation || vendorStatus === "pending"
              ? "Waiting for admin approval"
              : "You are not invited as a vendor"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <WorkspaceShell
      homeHref="/vendor"
      navigation={VENDOR_NAVIGATION}
      searchAction="/vendor/products"
      searchPlaceholder="Search your products..."
      notificationHref="/vendor/reviews"
      userMenu={<VendorUserDropdown email={userEmail} vendorName={vendorName} vendorRole={vendorRole} />}
    >
      {children}
    </WorkspaceShell>
  );
}
