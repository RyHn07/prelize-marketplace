"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import AdminEmptyState from "@/components/admin/admin-empty-state";
import AdminPageHeader from "@/components/admin/admin-page-header";
import AdminStatCard from "@/components/admin/admin-stat-card";
import { getAdminAccessState } from "@/lib/admin-access";
import { getProducts } from "@/lib/products/queries";
import { getSupabaseClient } from "@/lib/supabase-client";
import { getVendors } from "@/lib/vendors/queries";
import type { ProductDbRow, VendorRow } from "@/types/product-db";

type DashboardOrder = {
  id: string;
  order_number: string;
  user_email: string;
  status: string;
  created_at: string;
  summary: {
    payNow?: number;
  };
};

function formatBDT(amount: number) {
  return `\u09F3${amount.toLocaleString()}`;
}

function formatOrderDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-BD", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getStatusClass(status: string) {
  switch (status) {
    case "Pending":
      return "bg-amber-100 text-amber-700";
    case "Confirmed":
      return "bg-sky-100 text-sky-700";
    case "Processing":
      return "bg-violet-100 text-violet-700";
    case "Shipped":
      return "bg-indigo-100 text-indigo-700";
    case "Delivered":
      return "bg-emerald-100 text-emerald-700";
    case "Cancelled":
      return "bg-rose-100 text-rose-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [hasAdminAccess, setHasAdminAccess] = useState(false);
  const [products, setProducts] = useState<ProductDbRow[]>([]);
  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [orders, setOrders] = useState<DashboardOrder[]>([]);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;
    const supabase = getSupabaseClient();

    const loadDashboard = async () => {
      const access = await getAdminAccessState(supabase);

      if (!isMounted) {
        return;
      }

      setUserEmail(access.userEmail);
      setHasAdminAccess(access.hasAdminAccess);

      if (!access.userEmail || !access.hasAdminAccess) {
        setLoading(false);
        return;
      }

      const [{ data: ordersData, error: ordersError }, productResult, vendorResult] = await Promise.all([
        supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(8),
        getProducts(),
        getVendors(),
      ]);

      if (!isMounted) {
        return;
      }

      if (ordersError) {
        setErrorMessage("Unable to load dashboard data right now.");
      }

      if (productResult.error && !ordersError) {
        setErrorMessage(productResult.error.message);
      }

      if (vendorResult.error && !ordersError && !productResult.error) {
        setErrorMessage(vendorResult.error.message);
      }

      setOrders((ordersData ?? []) as DashboardOrder[]);
      setProducts(productResult.data ?? []);
      setVendors(vendorResult.data ?? []);
      setLoading(false);
    };

    void loadDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  const totalProducts = products.length;
  const totalOrders = orders.length;
  const pendingOrders = useMemo(() => orders.filter((order) => order.status === "Pending").length, [orders]);
  const activeVendors = useMemo(() => vendors.filter((vendor) => vendor.status === "active").length, [vendors]);
  const recentOrders = orders.slice(0, 5);
  const payNowVolume = useMemo(
    () => orders.reduce((sum, order) => sum + (order.summary?.payNow ?? 0), 0),
    [orders],
  );

  if (loading) {
    return <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 shadow-sm">Loading dashboard...</div>;
  }

  if (!userEmail) {
    return (
      <div className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Admin Dashboard</h1>
        <p className="mt-3 text-sm text-slate-500">Please login as admin</p>
        <Link href="/login" className="mt-6 inline-flex items-center justify-center rounded-2xl bg-[#615FFF] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90">
          Go to Login
        </Link>
      </div>
    );
  }

  if (!hasAdminAccess) {
    return (
      <div className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Admin Dashboard</h1>
        <p className="mt-3 text-sm text-slate-500">You do not have admin access</p>
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        title="Dashboard"
        description="Monitor products, orders, and vendor activity from one clean control center."
        actions={
          <>
            <Link
              href="/admin/products/new"
              className="inline-flex items-center justify-center rounded-2xl bg-[#615FFF] px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              Add Product
            </Link>
            <Link
              href="/admin/orders"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition-colors hover:border-[#615FFF]/30 hover:text-slate-900"
            >
              View All Orders
            </Link>
          </>
        }
      />

      {errorMessage ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-600">{errorMessage}</div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard label="Total Products" value={totalProducts} />
        <AdminStatCard label="Total Orders" value={totalOrders} tone="accent" />
        <AdminStatCard label="Pending Orders" value={pendingOrders} tone="warning" />
        <AdminStatCard label="Active Vendors" value={activeVendors} tone="success" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#615FFF]">Recent Orders</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-900">Latest activity</h2>
            </div>
            <Link
              href="/admin/orders"
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-[#615FFF]/30 hover:text-slate-900"
            >
              Open Orders
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <div className="mt-5">
              <AdminEmptyState title="No recent orders" description="Recent marketplace orders will appear here after customers start checking out." />
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {recentOrders.map((order) => (
                <article key={order.id} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">{order.order_number}</p>
                      <p className="truncate text-sm text-slate-500">{order.user_email}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(order.status)}`}>
                        {order.status}
                      </span>
                      <span className="text-sm font-semibold text-[#615FFF]">{formatBDT(order.summary?.payNow ?? 0)}</span>
                      <span className="text-xs text-slate-500">{formatOrderDate(order.created_at)}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#615FFF]">Operations Snapshot</p>
            <div className="mt-4 space-y-4 text-sm text-slate-600">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-slate-500">Pay Now volume from recent orders</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{formatBDT(payNowVolume)}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-slate-500">Vendor records loaded</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{vendors.length}</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#615FFF]">Quick Links</p>
            <div className="mt-4 grid gap-3">
              {[
                { href: "/admin/products", label: "Manage products" },
                { href: "/admin/categories", label: "Review categories" },
                { href: "/admin/vendors", label: "Approve vendors" },
                { href: "/admin/media", label: "Open media library" },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="inline-flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:border-[#615FFF]/30 hover:bg-white hover:text-slate-900"
                >
                  {item.label}
                  <span className="text-[#615FFF]">Open</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
