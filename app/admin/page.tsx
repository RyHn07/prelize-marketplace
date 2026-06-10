"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { EcommerceMetrics } from "@/components/admin/dashboard/ecommerce-metrics";
import MarketplaceOverviewCard from "@/components/admin/dashboard/marketplace-overview-card";
import MonthlySalesChart from "@/components/admin/dashboard/monthly-sales-chart";
import MonthlyTarget from "@/components/admin/dashboard/monthly-target";
import RecentOrders from "@/components/admin/dashboard/recent-orders";
import StatisticsChart from "@/components/admin/dashboard/statistics-chart";
import type { DashboardMetricItem, DashboardOrderItem, DashboardOverviewItem } from "@/components/admin/dashboard/types";
import { getAdminAccessState } from "@/lib/admin-access";
import { safeOrderStatus } from "@/lib/orders/utils";
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
        supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(200),
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
  const pendingOrders = useMemo(() => orders.filter((order) => safeOrderStatus(order.status) === "Order Placed").length, [orders]);
  const completedOrders = useMemo(
    () => orders.filter((order) => safeOrderStatus(order.status) === "Delivered").length,
    [orders],
  );
  const activeVendors = useMemo(() => vendors.filter((vendor) => vendor.status === "active").length, [vendors]);
  const uniqueCustomers = useMemo(() => new Set(orders.map((order) => order.user_email).filter(Boolean)).size, [orders]);
  const recentOrders = useMemo<DashboardOrderItem[]>(
    () =>
      orders.slice(0, 5).map((order) => ({
        id: order.id,
        orderNumber: order.order_number,
        customerEmail: order.user_email,
        status: safeOrderStatus(order.status),
        createdAt: order.created_at,
        payNowAmount: order.summary?.payNow ?? 0,
      })),
    [orders],
  );
  const payNowVolume = useMemo(() => orders.reduce((sum, order) => sum + (order.summary?.payNow ?? 0), 0), [orders]);

  const monthOrderCounts = useMemo(() => {
    const counts = Array.from({ length: 12 }, () => 0);
    orders.forEach((order) => {
      const date = new Date(order.created_at);
      if (!Number.isNaN(date.getTime())) {
        counts[date.getMonth()] += 1;
      }
    });
    return counts;
  }, [orders]);

  const monthRevenueTotals = useMemo(() => {
    const totals = Array.from({ length: 12 }, () => 0);
    orders.forEach((order) => {
      const date = new Date(order.created_at);
      if (!Number.isNaN(date.getTime())) {
        totals[date.getMonth()] += order.summary?.payNow ?? 0;
      }
    });
    return totals;
  }, [orders]);

  const currentMonthIndex = new Date().getMonth();
  const previousMonthIndex = currentMonthIndex === 0 ? 11 : currentMonthIndex - 1;
  const currentMonthRevenue = monthRevenueTotals[currentMonthIndex] ?? 0;
  const previousMonthRevenue = monthRevenueTotals[previousMonthIndex] ?? 0;
  const currentMonthOrders = monthOrderCounts[currentMonthIndex] ?? 0;
  const previousMonthOrders = monthOrderCounts[previousMonthIndex] ?? 0;

  const todayRevenue = useMemo(() => {
    const todayKey = new Date().toDateString();
    return orders.reduce((sum, order) => {
      const date = new Date(order.created_at);
      return date.toDateString() === todayKey ? sum + (order.summary?.payNow ?? 0) : sum;
    }, 0);
  }, [orders]);

  const targetRevenue = Math.max(50000, Math.ceil(Math.max(currentMonthRevenue, 1) * 1.25 / 1000) * 1000);
  const targetProgress = Math.min(99.99, Number(((currentMonthRevenue / targetRevenue) * 100).toFixed(2)));

  function formatChange(current: number, previous: number): { label: string; trend: "up" | "down" | "neutral" } {
    if (previous === 0 && current === 0) {
      return { label: "0.00%", trend: "neutral" as const };
    }
    if (previous === 0) {
      return { label: "100.00%", trend: "up" as const };
    }
    const change = ((current - previous) / previous) * 100;
    const trend = change > 0 ? "up" : change < 0 ? "down" : "neutral";
    return {
      label: `${change > 0 ? "+" : ""}${change.toFixed(2)}%`,
      trend,
    };
  }

  const customerChange = formatChange(uniqueCustomers, Math.max(uniqueCustomers - 1, 0));
  const orderChange = formatChange(currentMonthOrders, previousMonthOrders);
  const productChange = formatChange(totalProducts, Math.max(totalProducts - 1, 0));
  const vendorChange = formatChange(activeVendors, Math.max(activeVendors - 1, 0));

  const metricItems: DashboardMetricItem[] = [
    {
      label: "Customers",
      value: uniqueCustomers.toLocaleString(),
      changeLabel: customerChange.label,
      trend: customerChange.trend,
      icon: "customers",
    },
    {
      label: "Orders",
      value: totalOrders.toLocaleString(),
      changeLabel: orderChange.label,
      trend: orderChange.trend,
      icon: "orders",
    },
    {
      label: "Products",
      value: totalProducts.toLocaleString(),
      changeLabel: productChange.label,
      trend: productChange.trend,
      icon: "products",
    },
    {
      label: "Active Vendors",
      value: activeVendors.toLocaleString(),
      changeLabel: vendorChange.label,
      trend: vendorChange.trend,
      icon: "vendors",
    },
  ];

  const overviewItems: DashboardOverviewItem[] = [
    {
      label: "Placed Orders",
      value: `${pendingOrders} waiting for action`,
      progress: totalOrders === 0 ? 0 : (pendingOrders / totalOrders) * 100,
    },
    {
      label: "Delivered Orders",
      value: `${completedOrders} delivered`,
      progress: totalOrders === 0 ? 0 : (completedOrders / totalOrders) * 100,
    },
    {
      label: "Vendor Activation",
      value: `${activeVendors} active vendors`,
      progress: vendors.length === 0 ? 0 : (activeVendors / vendors.length) * 100,
    },
    {
      label: "Catalog Coverage",
      value: `${totalProducts} total products`,
      progress: Math.min(100, totalProducts === 0 ? 0 : totalProducts / Math.max(totalProducts, 24) * 100),
    },
  ];

  const dateRangeLabel = useMemo(() => {
    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 6);
    return `${sevenDaysAgo.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${today.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })}`;
  }, []);

  if (loading) {
    return <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-sm text-slate-500">Loading dashboard...</div>;
  }

  if (!userEmail) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-gray-200 bg-white p-8 text-center">
        <h1 className="text-2xl font-semibold text-slate-900">Admin Dashboard</h1>
        <p className="mt-3 text-sm text-slate-500">Please login as admin</p>
        <Link href="/login" className="mt-6 inline-flex items-center justify-center rounded-xl bg-[#615FFF] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90">
          Go to Login
        </Link>
      </div>
    );
  }

  if (!hasAdminAccess) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-gray-200 bg-white p-8 text-center">
        <h1 className="text-2xl font-semibold text-slate-900">Admin Dashboard</h1>
        <p className="mt-3 text-sm text-slate-500">You do not have admin access</p>
      </div>
    );
  }

  return (
    <section className="grid w-full grid-cols-12 gap-4 md:gap-6">
      {errorMessage ? (
        <div className="col-span-12 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-600">{errorMessage}</div>
      ) : null}

      <div className="col-span-12 space-y-6 xl:col-span-8">
        <div className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#615FFF]">Admin Dashboard</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Marketplace pulse at a glance</h1>
            <p className="mt-2 text-sm text-slate-500">Monitor customers, orders, products, and vendors from the TailAdmin dashboard layout.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/admin/products/new" className="inline-flex items-center justify-center rounded-xl bg-[#615FFF] px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90">
              Add Product
            </Link>
            <Link href="/admin/orders" className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition-colors hover:border-[#615FFF]/30 hover:text-slate-900">
              View All Orders
            </Link>
          </div>
        </div>

        <EcommerceMetrics items={metricItems} />
        <MonthlySalesChart seriesData={monthOrderCounts} />
      </div>

      <div className="col-span-12 xl:col-span-4">
        <MonthlyTarget
          progress={targetProgress}
          targetValue={formatBDT(targetRevenue)}
          revenueValue={formatBDT(currentMonthRevenue)}
          todayValue={formatBDT(todayRevenue)}
          growthLabel={formatChange(currentMonthRevenue, previousMonthRevenue).label}
        />
      </div>

      <div className="col-span-12">
        <StatisticsChart
          orderSeries={monthOrderCounts}
          revenueSeries={monthRevenueTotals.map((value) => Number((value / 1000).toFixed(2)))}
          dateRangeLabel={dateRangeLabel}
        />
      </div>

      <div className="col-span-12 xl:col-span-4">
        <MarketplaceOverviewCard items={overviewItems} />
      </div>

      <div className="col-span-12 xl:col-span-8">
        <RecentOrders orders={recentOrders} formatAmount={formatBDT} formatDate={formatOrderDate} />
      </div>
    </section>
  );
}
