"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import DashboardBadge from "@/components/admin/dashboard/dashboard-badge";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/admin/dashboard/dashboard-table";
import { EcommerceMetrics } from "@/components/admin/dashboard/ecommerce-metrics";
import type { DashboardMetricItem } from "@/components/admin/dashboard/types";
import { getProductsForVendors } from "@/lib/products/queries";
import { formatBDT, formatOrderDate, getStatusColor, safeOrderStatus } from "@/lib/orders/utils";
import { getSupabaseClient } from "@/lib/supabase-client";
import { fetchVendorOnboardingStatus } from "@/lib/vendor-onboarding";
import type {
  CndsShippingProfileRow,
  PricingTierProfileRow,
  ProductDbRow,
  VendorOrderRow,
  VendorRow,
} from "@/types/product-db";

type DashboardState = {
  vendor: VendorRow | null;
  products: ProductDbRow[];
  orders: VendorOrderRow[];
  cndsProfiles: CndsShippingProfileRow[];
  pricingProfiles: PricingTierProfileRow[];
};

type RecentVendorOrder = {
  id: string;
  orderId: string;
  orderNumber: string;
  status: string;
  createdAt: string;
  payNow: number;
};

function getProductStatus(product: ProductDbRow) {
  if (product.status === "active" || product.status === "disabled" || product.status === "draft") {
    return product.status;
  }

  return product.is_active ? "active" : "disabled";
}

function getStatusBadgeColor(status: string) {
  const colorClass = getStatusColor(safeOrderStatus(status));

  if (colorClass.includes("green")) {
    return "success";
  }

  if (colorClass.includes("yellow")) {
    return "warning";
  }

  if (colorClass.includes("red")) {
    return "error";
  }

  return "primary";
}

function VendorOnboardingShell({ children }: { children: React.ReactNode }) {
  return (
    <section className="mx-auto flex w-full justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
        {children}
      </div>
    </section>
  );
}

function VendorOnboardingHeader({
  title,
  description,
  centered = false,
}: {
  title: string;
  description: string;
  centered?: boolean;
}) {
  return (
    <div className={centered ? "text-center" : ""}>
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#615FFF]">Vendor Program</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{title}</h1>
      <p className={`mt-2 text-sm leading-6 text-slate-500 ${centered ? "mx-auto" : ""}`}>
        {description}
      </p>
    </div>
  );
}

export default function VendorDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<Awaited<ReturnType<typeof fetchVendorOnboardingStatus>> | null>(null);
  const [dashboard, setDashboard] = useState<DashboardState>({
    vendor: null,
    products: [],
    orders: [],
    cndsProfiles: [],
    pricingProfiles: [],
  });
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;
    const supabase = getSupabaseClient();

    const loadStatus = async () => {
      try {
        const onboardingStatus = await fetchVendorOnboardingStatus();

        if (!isMounted) {
          return;
        }

        setStatus(onboardingStatus);

        if (
          !onboardingStatus.hasVendorMembership ||
          onboardingStatus.vendorStatus !== "active" ||
          !onboardingStatus.vendorId
        ) {
          return;
        }

        const vendorId = onboardingStatus.vendorId;
        const [{ data: vendor }, productResult, { data: orders }, { data: cndsProfiles }, { data: pricingProfiles }, { data: parentOrders }] =
          await Promise.all([
            supabase.from("vendors").select("*").eq("id", vendorId).maybeSingle(),
            getProductsForVendors([vendorId], supabase),
            supabase.from("vendor_orders").select("*").eq("vendor_id", vendorId).order("created_at", { ascending: false }),
            supabase.from("cnds_shipping_profiles").select("*").eq("vendor_id", vendorId).order("created_at", { ascending: false }),
            supabase.from("pricing_tier_profiles").select("*").eq("vendor_id", vendorId).order("created_at", { ascending: false }),
            supabase.from("orders").select("id, order_number").order("created_at", { ascending: false }),
          ]);

        if (!isMounted) {
          return;
        }

        const normalizedOrders = ((orders ?? []) as VendorOrderRow[]).map((order) => ({
          ...order,
          status: safeOrderStatus(order.status),
          summary: order.summary ?? {
            quantity: 0,
            totalQuantity: 0,
            productPrice: 0,
            cddCharge: 0,
            shippingCost: 0,
            hasUnknownShipping: false,
            payNow: 0,
            payOnDelivery: 0,
          },
          shipping_method: Array.isArray(order.shipping_method) ? order.shipping_method : [],
        }));
        const orderNumberById = new Map(
          ((parentOrders ?? []) as Array<{ id: string; order_number: string }>).map((order) => [order.id, order.order_number]),
        );

        setDashboard({
          vendor: (vendor as VendorRow | null) ?? null,
          products: productResult.data,
          orders: normalizedOrders.map((order) => ({
            ...order,
            order_number: orderNumberById.get(order.order_id) ?? order.order_id,
          })) as VendorOrderRow[],
          cndsProfiles: (cndsProfiles ?? []) as CndsShippingProfileRow[],
          pricingProfiles: (pricingProfiles ?? []) as PricingTierProfileRow[],
        });
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setErrorMessage(error instanceof Error ? error.message : "Unable to open vendor entry.");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadStatus();

    return () => {
      isMounted = false;
    };
  }, []);

  const productCounts = useMemo(() => {
    const totals = {
      total: dashboard.products.length,
      active: 0,
      draft: 0,
      archived: 0,
    };

    dashboard.products.forEach((product) => {
      const currentStatus = getProductStatus(product);

      if (currentStatus === "active") {
        totals.active += 1;
        return;
      }

      if (currentStatus === "draft") {
        totals.draft += 1;
        return;
      }

      totals.archived += 1;
    });

    return totals;
  }, [dashboard.products]);

  const orderCounts = useMemo(() => {
    const totals = {
      total: dashboard.orders.length,
      attention: 0,
      shipped: 0,
      delivered: 0,
    };

    dashboard.orders.forEach((order) => {
      const currentStatus = safeOrderStatus(order.status);

      if (
        currentStatus === "Order Placed" ||
        currentStatus === "Payment Verified" ||
        currentStatus === "Processing" ||
        currentStatus === "Arrived in Warehouse"
      ) {
        totals.attention += 1;
      }

      if (currentStatus === "Shipped") {
        totals.shipped += 1;
      }

      if (currentStatus === "Delivered") {
        totals.delivered += 1;
      }
    });

    return totals;
  }, [dashboard.orders]);

  const revenueInPipeline = useMemo(
    () => dashboard.orders.reduce((sum, order) => sum + Number(order.summary?.payNow ?? 0), 0),
    [dashboard.orders],
  );

  const recentOrders = useMemo<RecentVendorOrder[]>(
    () =>
      dashboard.orders.slice(0, 5).map((order) => ({
        id: order.id,
        orderId: order.order_id,
        orderNumber:
          typeof (order as VendorOrderRow & { order_number?: string }).order_number === "string"
            ? ((order as VendorOrderRow & { order_number?: string }).order_number as string)
            : order.order_id,
        status: safeOrderStatus(order.status),
        createdAt: order.created_at,
        payNow: Number(order.summary?.payNow ?? 0),
      })),
    [dashboard.orders],
  );

  if (loading) {
    return (
      <VendorOnboardingShell>
        <div className="text-center text-sm text-slate-500">
          Loading vendor entry...
        </div>
      </VendorOnboardingShell>
    );
  }

  if (errorMessage) {
    return (
      <VendorOnboardingShell>
        <VendorOnboardingHeader
          title="Vendor program"
          description="We could not open the vendor onboarding workspace right now."
          centered
        />
        <p className="mt-5 text-center text-sm font-medium text-rose-600">{errorMessage}</p>
      </VendorOnboardingShell>
    );
  }

  if (!status?.hasVendorMembership && !status?.hasPendingInvitation) {
    return (
      <VendorOnboardingShell>
        <VendorOnboardingHeader
          title="You are not invited as a vendor"
          description="Ask a platform admin to invite your account into the marketplace vendor program first."
          centered
        />
      </VendorOnboardingShell>
    );
  }

  if (status?.hasPendingInvitation && !status?.hasVendorMembership) {
    return (
      <VendorOnboardingShell>
        <VendorOnboardingHeader
          title="Welcome to the vendor program"
          description="Your account already has a pending vendor invitation. Finish the registration details to unlock the full workspace."
        />

        <div className="mt-6">
          <Link
            href="/vendor/register"
            className="inline-flex h-11 w-full items-center justify-center rounded-full bg-[#615FFF] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#5552e6]"
          >
            Continue registration
          </Link>
        </div>
      </VendorOnboardingShell>
    );
  }

  if (status?.hasVendorMembership && status.vendorStatus !== "active") {
    return (
      <VendorOnboardingShell>
        <VendorOnboardingHeader
          title="Waiting for admin approval"
          description="Your vendor registration has been submitted. The vendor workspace will unlock after admin approval."
          centered
        />
      </VendorOnboardingShell>
    );
  }

  const vendorName = dashboard.vendor?.name ?? status?.vendorName ?? "Vendor Workspace";
  const setupItems = [
    {
      label: "Live Catalog",
      ready: productCounts.active > 0,
      value: `${productCounts.active} published`,
      href: "/vendor/products",
    },
    {
      label: "Shipping",
      ready: dashboard.cndsProfiles.length > 0,
      value: `${dashboard.cndsProfiles.length} profile${dashboard.cndsProfiles.length === 1 ? "" : "s"}`,
      href: "/vendor/cnds",
    },
    {
      label: "Pricing",
      ready: dashboard.pricingProfiles.length > 0,
      value: `${dashboard.pricingProfiles.length} profile${dashboard.pricingProfiles.length === 1 ? "" : "s"}`,
      href: "/vendor/pricing-tiers",
    },
  ];
  const readySetupCount = setupItems.filter((item) => item.ready).length;
  const setupProgress = Math.round((readySetupCount / setupItems.length) * 100);
  const metricItems: DashboardMetricItem[] = [
    {
      label: "Live Products",
      value: productCounts.active.toLocaleString(),
      changeLabel: `${productCounts.draft} draft`,
      trend: "neutral",
      icon: "products",
    },
    {
      label: "Orders",
      value: orderCounts.total.toLocaleString(),
      changeLabel: `${orderCounts.attention} active`,
      trend: orderCounts.attention > 0 ? "up" : "neutral",
      icon: "orders",
    },
    {
      label: "Revenue",
      value: formatBDT(revenueInPipeline),
      changeLabel: "Pipeline",
      trend: revenueInPipeline > 0 ? "up" : "neutral",
      icon: "vendors",
    },
    {
      label: "Setup",
      value: `${readySetupCount}/${setupItems.length}`,
      changeLabel: `${setupProgress}%`,
      trend: setupProgress === 100 ? "up" : "neutral",
      icon: "products",
    },
  ];

  return (
    <section className="grid w-full grid-cols-12 gap-4 md:gap-6">
      {errorMessage ? (
        <div className="col-span-12 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-600">
          {errorMessage}
        </div>
      ) : null}

      <div className="col-span-12 space-y-6 xl:col-span-8">
        <div className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#615FFF]">Vendor Dashboard</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{vendorName}</h1>
            <p className="mt-2 text-sm text-slate-500">Your catalog, orders, and setup status at a glance.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/vendor/products/new" className="inline-flex items-center justify-center rounded-xl bg-[#615FFF] px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90">
              Add Product
            </Link>
            <Link href="/vendor/orders" className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition-colors hover:border-[#615FFF]/30 hover:text-slate-900">
              View Orders
            </Link>
          </div>
        </div>

        <EcommerceMetrics items={metricItems} />
      </div>

      <div className="col-span-12 xl:col-span-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Store Setup</h3>
              <p className="mt-1 text-sm text-gray-500">Only the essentials needed to sell smoothly</p>
            </div>
            <DashboardBadge color={setupProgress === 100 ? "success" : "warning"}>{setupProgress}%</DashboardBadge>
          </div>

          <div className="mt-6 space-y-5">
            {setupItems.map((item) => (
              <Link key={item.label} href={item.href} className="flex items-center justify-between gap-4 rounded-xl px-1 py-1 transition-colors hover:bg-slate-50">
                <div>
                  <p className="text-sm font-semibold text-gray-800">{item.label}</p>
                  <span className="block text-xs text-gray-500">{item.value}</span>
                </div>
                <DashboardBadge color={item.ready ? "success" : "light"} size="sm">
                  {item.ready ? "Ready" : "Setup"}
                </DashboardBadge>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="col-span-12">
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-6 pb-4 pt-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-xl font-semibold text-gray-800">Recent Orders</h3>
            <Link href="/vendor/orders" className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 hover:text-gray-800">
              See all
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
              Orders that contain your products will appear here.
            </div>
          ) : (
            <div className="max-w-full overflow-x-auto">
              <Table>
                <TableHeader className="border-y border-gray-100">
                  <TableRow>
                    <TableCell isHeader className="py-3.5 text-start text-xs font-medium text-gray-500">Order</TableCell>
                    <TableCell isHeader className="py-3.5 text-start text-xs font-medium text-gray-500">Vendor Order</TableCell>
                    <TableCell isHeader className="py-3.5 text-start text-xs font-medium text-gray-500">Amount</TableCell>
                    <TableCell isHeader className="py-3.5 text-start text-xs font-medium text-gray-500">Status</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100">
                  {recentOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="py-5">
                        <Link href={`/vendor/orders/${order.id}`} className="text-sm font-medium text-gray-800 hover:text-[#615FFF]">
                          {order.orderNumber}
                        </Link>
                        <span className="block text-xs text-gray-500">{formatOrderDate(order.createdAt)}</span>
                      </TableCell>
                      <TableCell className="py-5 text-sm text-gray-500">{order.orderId.slice(0, 8)}</TableCell>
                      <TableCell className="py-5 text-sm text-gray-500">{formatBDT(order.payNow)}</TableCell>
                      <TableCell className="py-5 text-sm text-gray-500">
                        <DashboardBadge color={getStatusBadgeColor(order.status) as "success" | "warning" | "error" | "primary"} size="sm">
                          {order.status}
                        </DashboardBadge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
