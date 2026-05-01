"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { ORDER_STATUSES, formatBDT, formatOrderDate, getStatusColor, safeOrderStatus } from "@/lib/orders/utils";
import { getVendorWorkspaceAccessState } from "@/lib/marketplace-access";
import { getSupabaseClient } from "@/lib/supabase-client";
import type { OrderItemRow, VendorOrderRow } from "@/types/product-db";

type ParentOrderRow = {
  id: string;
  order_number: string;
  user_email: string;
  created_at: string;
};

type VendorOrderListRow = VendorOrderRow & {
  parentOrder: ParentOrderRow | null;
  itemCount: number;
  totalQuantity: number;
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusColor(status)}`}>
      {status}
    </span>
  );
}

export default function VendorOrdersPage() {
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [hasVendorWorkspaceAccess, setHasVendorWorkspaceAccess] = useState(false);
  const [activeVendorId, setActiveVendorId] = useState<string | null>(null);
  const [vendorOrders, setVendorOrders] = useState<VendorOrderListRow[]>([]);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;
    const supabase = getSupabaseClient();

    const loadVendorOrders = async () => {
      const access = await getVendorWorkspaceAccessState(supabase);

      if (!isMounted) {
        return;
      }

      setUserEmail(access.userEmail);
      setHasVendorWorkspaceAccess(access.hasVendorWorkspaceAccess);
      setActiveVendorId(access.activeVendorId);

      if (!access.userEmail || !access.hasVendorWorkspaceAccess || !access.activeVendorId) {
        setLoading(false);
        return;
      }

      const { data: fetchedVendorOrders, error: vendorOrdersError } = await supabase
        .from("vendor_orders")
        .select("*")
        .eq("vendor_id", access.activeVendorId)
        .order("created_at", { ascending: false });

      if (!isMounted) {
        return;
      }

      if (vendorOrdersError) {
        setErrorMessage(
          vendorOrdersError.message.toLowerCase().includes("vendor_orders")
            ? "Vendor order tables are missing. Run the latest multivendor migration, then reload this page."
            : "Unable to load vendor orders right now.",
        );
        setVendorOrders([]);
        setLoading(false);
        return;
      }

      const vendorOrderRows = ((fetchedVendorOrders ?? []) as VendorOrderRow[]).map((vendorOrder) => ({
        ...vendorOrder,
        status: safeOrderStatus(vendorOrder.status),
        shipping_method: Array.isArray(vendorOrder.shipping_method) ? vendorOrder.shipping_method : [],
        summary: vendorOrder.summary ?? {
          quantity: 0,
          totalQuantity: 0,
          productPrice: 0,
          cddCharge: 0,
          payNow: 0,
          payOnDelivery: 0,
        },
      }));

      if (vendorOrderRows.length === 0) {
        setVendorOrders([]);
        setLoading(false);
        return;
      }

      const orderIds = vendorOrderRows.map((vendorOrder) => vendorOrder.order_id);
      const vendorOrderIds = vendorOrderRows.map((vendorOrder) => vendorOrder.id);

      const [{ data: parentOrders }, { data: fetchedItems }] = await Promise.all([
        supabase.from("orders").select("id, order_number, user_email, created_at").in("id", orderIds),
        supabase.from("order_items").select("*").in("vendor_order_id", vendorOrderIds),
      ]);

      if (!isMounted) {
        return;
      }

      const parentOrderById = new Map(
        ((parentOrders ?? []) as ParentOrderRow[]).map((order) => [order.id, order]),
      );
      const itemsByVendorOrderId = new Map<string, OrderItemRow[]>();

      ((fetchedItems ?? []) as OrderItemRow[]).forEach((item) => {
        const vendorOrderId = item.vendor_order_id;

        if (!vendorOrderId) {
          return;
        }

        const currentItems = itemsByVendorOrderId.get(vendorOrderId) ?? [];
        currentItems.push(item);
        itemsByVendorOrderId.set(vendorOrderId, currentItems);
      });

      setVendorOrders(
        vendorOrderRows.map((vendorOrder) => {
          const items = itemsByVendorOrderId.get(vendorOrder.id) ?? [];

          return {
            ...vendorOrder,
            parentOrder: parentOrderById.get(vendorOrder.order_id) ?? null,
            itemCount: items.length,
            totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
          };
        }),
      );
      setLoading(false);
    };

    void loadVendorOrders();

    return () => {
      isMounted = false;
    };
  }, []);

  const pendingCount = useMemo(
    () => vendorOrders.filter((vendorOrder) => vendorOrder.status === "Pending").length,
    [vendorOrders],
  );
  const processingCount = useMemo(
    () => vendorOrders.filter((vendorOrder) => vendorOrder.status === "Processing").length,
    [vendorOrders],
  );
  const shippedCount = useMemo(
    () => vendorOrders.filter((vendorOrder) => vendorOrder.status === "Shipped").length,
    [vendorOrders],
  );

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
        Loading vendor orders...
      </div>
    );
  }

  if (!userEmail) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Vendor Orders</h1>
        <p className="mt-3 text-sm text-slate-500">Please login to access your vendor orders.</p>
        <Link
          href="/login"
          className="mt-6 inline-flex items-center justify-center rounded-xl bg-emerald-500 px-5 py-2 text-sm font-semibold text-slate-950 transition-opacity hover:opacity-90"
        >
          Go to Login
        </Link>
      </div>
    );
  }

  if (!hasVendorWorkspaceAccess || !activeVendorId) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Vendor Orders</h1>
        <p className="mt-3 text-sm text-slate-500">Your account does not have vendor order access yet.</p>
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-7xl">
      <div className="mb-6 space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-600">Vendor Dashboard</p>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Orders</h1>
        <p className="text-sm text-slate-500">Track the marketplace orders assigned to your vendor and update fulfillment progress.</p>
      </div>

      {errorMessage ? (
        <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-600">
          {errorMessage}
        </div>
      ) : null}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Total Vendor Orders</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{vendorOrders.length}</p>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.16em] text-amber-500">Pending</p>
          <p className="mt-2 text-2xl font-semibold text-amber-700">{pendingCount}</p>
        </div>
        <div className="rounded-2xl border border-purple-100 bg-purple-50 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.16em] text-purple-500">Processing</p>
          <p className="mt-2 text-2xl font-semibold text-purple-700">{processingCount}</p>
        </div>
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.16em] text-indigo-500">Shipped</p>
          <p className="mt-2 text-2xl font-semibold text-indigo-700">{shippedCount}</p>
        </div>
      </div>

      {vendorOrders.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">No vendor orders yet</h2>
          <p className="mt-2 text-sm text-slate-500">
            Orders containing your vendor-owned products will appear here after customers check out.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {vendorOrders.map((vendorOrder) => (
            <article key={vendorOrder.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="grid flex-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Marketplace Order</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {vendorOrder.parentOrder?.order_number ?? vendorOrder.order_id}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Customer</p>
                    <p className="mt-1 text-sm text-slate-700">{vendorOrder.parentOrder?.user_email ?? "Unknown customer"}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Status</p>
                    <div className="mt-1">
                      <StatusBadge status={safeOrderStatus(vendorOrder.status)} />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Vendor Total</p>
                    <p className="mt-1 text-sm font-semibold text-emerald-700">{formatBDT(vendorOrder.summary.payNow ?? 0)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Items</p>
                    <p className="mt-1 text-sm text-slate-700">
                      {vendorOrder.itemCount} row(s) / {vendorOrder.totalQuantity} qty
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-3 lg:w-64">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Created Date</p>
                    <p className="mt-1 text-sm text-slate-700">
                      {vendorOrder.parentOrder ? formatOrderDate(vendorOrder.parentOrder.created_at) : formatOrderDate(vendorOrder.created_at)}
                    </p>
                  </div>
                  <Link
                    href={`/vendor/orders/${vendorOrder.id}`}
                    className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-emerald-300 hover:text-slate-900"
                  >
                    View Vendor Order
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
