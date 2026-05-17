"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { getProductsForVendors } from "@/lib/products/queries";
import { formatBDT, formatOrderDate, safeOrderStatus } from "@/lib/orders/utils";
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

type QuickAction = {
  title: string;
  description: string;
  href: string;
  tone: "emerald" | "blue" | "amber" | "slate";
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

function getOrderTone(status: string) {
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

function getSetupStateLabel(isReady: boolean) {
  return isReady ? "Ready" : "Needs setup";
}

function getSetupStateClasses(isReady: boolean) {
  return isReady
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-amber-200 bg-amber-50 text-amber-700";
}

function initialsFromName(value: string) {
  const parts = value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) {
    return "VW";
  }

  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}

function StatCard({
  label,
  value,
  hint,
  tone = "slate",
}: {
  label: string;
  value: string;
  hint: string;
  tone?: "slate" | "emerald" | "amber" | "blue";
}) {
  const classes =
    tone === "emerald"
      ? "border-emerald-200 bg-emerald-50"
      : tone === "amber"
        ? "border-amber-200 bg-amber-50"
        : tone === "blue"
          ? "border-sky-200 bg-sky-50"
          : "border-slate-200 bg-white";

  return (
    <article className={`rounded-[28px] border p-5 shadow-sm ${classes}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{hint}</p>
    </article>
  );
}

function QuickActionCard({ action }: { action: QuickAction }) {
  const toneClasses =
    action.tone === "emerald"
      ? "from-[#615FFF]/16 via-[#615FFF]/6 to-white"
      : action.tone === "blue"
        ? "from-sky-500/15 via-sky-500/5 to-white"
        : action.tone === "amber"
          ? "from-amber-500/15 via-amber-500/5 to-white"
          : "from-slate-900/8 via-slate-900/3 to-white";

  return (
    <Link
      href={action.href}
      className={`group rounded-3xl border border-slate-200 bg-gradient-to-br ${toneClasses} p-5 shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:border-[#615FFF]/30`}
    >
      <p className="text-lg font-semibold text-slate-950">{action.title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{action.description}</p>
      <span className="mt-5 inline-flex items-center text-sm font-semibold text-slate-900 transition-colors group-hover:text-[#615FFF]">
        Open workspace
      </span>
    </Link>
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

      if (currentStatus === "Pending" || currentStatus === "Confirmed" || currentStatus === "Processing") {
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
      dashboard.orders.slice(0, 4).map((order) => ({
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

  const quickActions: QuickAction[] = [
    {
      title: "Add a new product",
      description: "Create a fresh listing, upload media, and prepare pricing before you publish.",
      href: "/vendor/products/new",
      tone: "emerald",
    },
    {
      title: "Review incoming orders",
      description: "Open the vendor order queue and move fulfillment forward without leaving the workspace.",
      href: "/vendor/orders",
      tone: "blue",
    },
    {
      title: "Update shipping setup",
      description: "Keep your CNDS profiles accurate so checkout calculations stay reliable.",
      href: "/vendor/cnds",
      tone: "amber",
    },
    {
      title: "Refine shop identity",
      description: "Polish storefront details, contact data, and vendor-facing presentation.",
      href: "/vendor/shop-settings",
      tone: "slate",
    },
  ];

  const setupChecklist = [
    {
      title: "Catalog is live",
      ready: productCounts.active > 0,
      helper:
        productCounts.active > 0
          ? `${productCounts.active} active product${productCounts.active === 1 ? "" : "s"} visible to buyers.`
          : "Publish at least one product so your storefront can start converting visits.",
      href: "/vendor/products",
    },
    {
      title: "Shipping profiles are configured",
      ready: dashboard.cndsProfiles.length > 0,
      helper:
        dashboard.cndsProfiles.length > 0
          ? `${dashboard.cndsProfiles.length} CNDS profile${dashboard.cndsProfiles.length === 1 ? "" : "s"} ready for use.`
          : "Add a shipping profile to avoid manual operational follow-up later.",
      href: "/vendor/cnds",
    },
    {
      title: "Pricing tiers are prepared",
      ready: dashboard.pricingProfiles.length > 0,
      helper:
        dashboard.pricingProfiles.length > 0
          ? `${dashboard.pricingProfiles.length} pricing profile${dashboard.pricingProfiles.length === 1 ? "" : "s"} available.`
          : "Create quantity-based pricing rules for cleaner wholesale quoting.",
      href: "/vendor/pricing-tiers",
    },
  ];

  if (loading) {
    return (
      <section className="mx-auto max-w-7xl">
        <div className="rounded-[32px] border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
          Loading vendor entry...
        </div>
      </section>
    );
  }

  if (errorMessage) {
    return (
      <section className="mx-auto max-w-5xl">
        <div className="rounded-[32px] border border-rose-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-900">Vendor Program</h1>
          <p className="mt-3 text-sm font-medium text-rose-600">{errorMessage}</p>
        </div>
      </section>
    );
  }

  if (!status?.hasVendorMembership && !status?.hasPendingInvitation) {
    return (
      <section className="mx-auto max-w-5xl">
        <div className="rounded-[32px] border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#615FFF]">Vendor Program</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">You are not invited as a vendor</h1>
          <p className="mt-3 text-sm text-slate-500">
            Ask a platform admin to invite your account into the marketplace vendor program first.
          </p>
        </div>
      </section>
    );
  }

  if (status?.hasPendingInvitation && !status?.hasVendorMembership) {
    return (
      <section className="mx-auto max-w-5xl">
        <div className="rounded-[36px] border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#615FFF]">Vendor Program</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Welcome to the vendor program</h1>
          <p className="mt-3 max-w-2xl text-sm text-slate-500">
            Your account already has a pending vendor invitation. Finish the registration details to unlock the full workspace.
          </p>

          <div className="mt-6">
            <Link
              href="/vendor/register"
              className="inline-flex items-center justify-center rounded-2xl bg-[#615FFF] px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              Continue registration
            </Link>
          </div>
        </div>
      </section>
    );
  }

  if (status?.hasVendorMembership && status.vendorStatus !== "active") {
    return (
      <section className="mx-auto max-w-5xl">
        <div className="rounded-[32px] border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#615FFF]">Vendor Program</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Waiting for admin approval</h1>
          <p className="mt-3 text-sm text-slate-500">
            Your vendor registration has been submitted. The vendor workspace will unlock after admin approval.
          </p>
        </div>
      </section>
    );
  }

  const vendorName = dashboard.vendor?.name ?? status?.vendorName ?? "Vendor Workspace";
  const vendorDescription =
    dashboard.vendor?.description?.trim() ||
    "Keep your catalog, pricing, and fulfillment work organized from one workspace built for wholesale operations.";
  const vendorBadge = status?.vendorRole ? status.vendorRole.toUpperCase() : "VENDOR";
  const storefrontInitials = initialsFromName(vendorName);

  return (
    <section className="mx-auto max-w-7xl space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#615FFF]">Vendor Dashboard</p>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{vendorName}</h1>
        <p className="max-w-3xl text-sm text-slate-500">{vendorDescription}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start">
        <aside className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="space-y-5">
            <div>
              {dashboard.vendor?.logo_url ? (
                <div
                  className="h-20 w-20 rounded-[24px] border border-slate-200 bg-slate-50"
                  style={{
                    backgroundImage: `url("${dashboard.vendor.logo_url}")`,
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                    backgroundSize: "cover",
                  }}
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-[24px] bg-[#615FFF] text-xl font-semibold tracking-[0.18em] text-white">
                  {storefrontInitials}
                </div>
              )}

              <div className="mt-4 rounded-2xl border border-dashed border-[#615FFF]/25 bg-[#615FFF]/5 px-4 py-3 text-sm text-slate-600">
                Managing as <span className="font-semibold text-slate-900">{vendorBadge}</span>
              </div>
            </div>

            <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Vendor ID</p>
                <p className="mt-1 text-sm font-medium text-slate-900">{status?.vendorId ?? "Not available"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Contact Email</p>
                <p className="mt-1 text-sm text-slate-700">{dashboard.vendor?.contact_email ?? "Not added yet"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Phone</p>
                <p className="mt-1 text-sm text-slate-700">{dashboard.vendor?.contact_phone ?? "Not added yet"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Address</p>
                <p className="mt-1 text-sm text-slate-700">{dashboard.vendor?.address ?? "Complete shop settings to add this."}</p>
              </div>
            </div>

            <div className="space-y-3">
              <Link
                href="/vendor/products/new"
                className="inline-flex w-full items-center justify-center rounded-2xl bg-[#615FFF] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                Add Product
              </Link>
              <Link
                href="/vendor/orders"
                className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:border-[#615FFF]/30 hover:text-slate-900"
              >
                Open Orders
              </Link>
            </div>

            <div className="space-y-3">
              {setupChecklist.map((item) => (
                <Link
                  key={item.title}
                  href={item.href}
                  className="block rounded-2xl border border-slate-200 bg-white p-4 transition-colors hover:border-[#615FFF]/30"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getSetupStateClasses(item.ready)}`}>
                      {getSetupStateLabel(item.ready)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{item.helper}</p>
                </Link>
              ))}
            </div>
          </div>
        </aside>

        <div className="space-y-4">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-slate-500">
                  Showing your current vendor workspace summary and the latest operational data
                </p>
              </div>
              <div className="inline-flex rounded-2xl bg-[#615FFF]/8 px-3 py-2 text-sm font-medium text-[#615FFF]">
                {orderCounts.total} orders tracked
              </div>
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-4">
            <StatCard
              label="Live products"
              value={String(productCounts.active)}
              hint={`${productCounts.draft} draft and ${productCounts.archived} archived in your catalog.`}
              tone="emerald"
            />
            <StatCard
              label="Orders needing attention"
              value={String(orderCounts.attention)}
              hint={`${orderCounts.total} total vendor order${orderCounts.total === 1 ? "" : "s"} assigned to this workspace.`}
              tone="amber"
            />
            <StatCard
              label="Revenue in pipeline"
              value={formatBDT(revenueInPipeline)}
              hint={`${orderCounts.shipped} shipped and ${orderCounts.delivered} delivered so far.`}
              tone="blue"
            />
            <StatCard
              label="Operational setup"
              value={`${dashboard.cndsProfiles.length + dashboard.pricingProfiles.length}`}
              hint={`${dashboard.cndsProfiles.length} shipping profile and ${dashboard.pricingProfiles.length} pricing profile configured.`}
            />
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#615FFF]">Quick Actions</p>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Keep the workspace moving</h2>
              </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              {quickActions.map((action) => (
                <QuickActionCard key={action.href} action={action} />
              ))}
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#615FFF]">Recent Orders</p>
                  <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Latest vendor order activity</h2>
                </div>
                <Link href="/vendor/orders" className="text-sm font-semibold text-[#615FFF] hover:opacity-80">
                  View all
                </Link>
              </div>

              {recentOrders.length === 0 ? (
                <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                  Orders that contain your products will appear here after checkout starts flowing through the marketplace.
                </div>
              ) : (
                <div className="mt-6 space-y-4">
                  {recentOrders.map((order) => (
                    <Link
                      key={order.id}
                      href={`/vendor/orders/${order.id}`}
                      className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 transition-colors hover:border-[#615FFF]/25 hover:bg-white sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-950">{order.orderNumber}</p>
                        <p className="mt-1 text-sm text-slate-500">
                          Created {formatOrderDate(order.createdAt)} for vendor order {order.orderId.slice(0, 8)}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getOrderTone(order.status)}`}>
                          {order.status}
                        </span>
                        <span className="text-sm font-semibold text-slate-950">{formatBDT(order.payNow)}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#615FFF]">Operational Snapshot</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Where the business stands today</h2>

              <div className="mt-6 space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-950">Catalog health</p>
                    <span className="text-sm font-semibold text-slate-600">{productCounts.total} items</span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {productCounts.active > 0
                      ? `${productCounts.active} products are already published. Keep drafts moving so buyers always see a fresh assortment.`
                      : "No live products yet. Publish your first product to start appearing across the marketplace."}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-950">Fulfillment pipeline</p>
                    <span className="text-sm font-semibold text-slate-600">{orderCounts.attention} active</span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {orderCounts.attention > 0
                      ? `${orderCounts.attention} order${orderCounts.attention === 1 ? "" : "s"} still need attention across pending, confirmed, or processing states.`
                      : "No orders currently waiting on action. This is a good moment to review products, pricing, and shipping rules."}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-950">Storefront setup</p>
                    <span className="text-sm font-semibold text-slate-600">{dashboard.vendor?.status ?? "active"}</span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {dashboard.vendor?.address
                      ? `Business location saved: ${dashboard.vendor.address}`
                      : "Add your business address in shop settings so marketplace operations have a complete vendor profile."}
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}
