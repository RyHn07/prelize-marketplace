"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { getAdminAccessState } from "@/lib/admin-access";
import { formatBDT, formatOrderDate, getStatusColor, safeOrderStatus } from "@/lib/orders/utils";
import { getSupabaseClient } from "@/lib/supabase-client";
import { getVendorsByIds } from "@/lib/vendors/queries";
import type { OrderItemRow, ShippingMethodRow, VendorOrderRow, VendorRow } from "@/types/product-db";

type OrderStatus =
  | "Pending"
  | "Confirmed"
  | "Processing"
  | "Shipped"
  | "Delivered"
  | "Cancelled";

const ORDER_STATUSES: OrderStatus[] = [
  "Pending",
  "Confirmed",
  "Processing",
  "Shipped",
  "Delivered",
  "Cancelled",
];
const PAYMENT_STATUSES = ["Pending", "Received", "Failed", "Refunded"] as const;

type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

type OrderSummary = {
  quantity?: number;
  totalQuantity?: number;
  productPrice: number;
  cddCharge: number;
  payNow: number;
  payOnDelivery: number | string | null;
};

type BuyerInfo = Record<string, string | number | boolean | null>;

type OrderRow = {
  id: string;
  order_number: string;
  user_email: string;
  status: OrderStatus;
  payment_method: string | null;
  payment_status: PaymentStatus | null;
  buyer: BuyerInfo | null;
  admin_note: string | null;
  cnds_cost_total?: number | null;
  international_shipping_method_id?: string | null;
  international_shipping_method_name?: string | null;
  international_shipping_total?: number | null;
  international_shipping_status?: string | null;
  summary: OrderSummary;
  shipping_methods: ShippingMethodRow[] | null;
  created_at: string;
};

type GroupedOrderItem = {
  productId: string;
  name: string;
  image: string | null;
  items: OrderItemRow[];
  variantCount: number;
  totalQuantity: number;
  subtotal: number;
};

type VendorOrderWithContext = VendorOrderRow & {
  vendor: VendorRow | null;
  items: OrderItemRow[];
};

function SummaryRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-200 py-4 last:border-b-0">
      <span className={strong ? "text-sm font-semibold text-slate-900" : "text-sm text-slate-700"}>
        {label}
      </span>
      <span
        className={
          strong ? "text-sm font-semibold text-[#615FFF]" : "text-sm font-medium text-slate-700"
        }
      >
        {value}
      </span>
    </div>
  );
}

function DetailField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-700">{value}</p>
    </div>
  );
}

function ProductImage({ src, alt }: { src?: string | null; alt: string }) {
  if (!src) {
    return (
      <div className="flex h-[72px] w-[72px] items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-xs font-medium text-slate-400">
        No Image
      </div>
    );
  }

  return (
    <div className="relative h-[72px] w-[72px] overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
      <Image src={src} alt={alt} fill sizes="72px" className="object-cover" />
    </div>
  );
}

function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${getStatusColor(status)}`}
    >
      {status}
    </span>
  );
}

function PaymentBadge({ status }: { status: PaymentStatus | null | undefined }) {
  const isReceived = status === "Received";

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${
        isReceived ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
      }`}
    >
      {isReceived ? "Received" : "Pending"}
    </span>
  );
}

function groupOrderItems(items: OrderItemRow[]) {
  const groups = new Map<string, GroupedOrderItem>();

  items.forEach((item) => {
    const existingGroup = groups.get(item.product_id);

    if (existingGroup) {
      existingGroup.items.push(item);
      existingGroup.variantCount += 1;
      existingGroup.totalQuantity += item.quantity;
      existingGroup.subtotal += item.price * item.quantity;
      return;
    }

    groups.set(item.product_id, {
      productId: item.product_id,
      name: item.product_name,
      image: item.product_image,
      items: [item],
      variantCount: 1,
      totalQuantity: item.quantity,
      subtotal: item.price * item.quantity,
    });
  });

  return Array.from(groups.values());
}

export default function AdminOrderDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [hasAdminAccess, setHasAdminAccess] = useState(false);
  const [order, setOrder] = useState<OrderRow | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItemRow[]>([]);
  const [vendorOrders, setVendorOrders] = useState<VendorOrderWithContext[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isUpdatingPaymentStatus, setIsUpdatingPaymentStatus] = useState(false);
  const [adminNote, setAdminNote] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [noteMessage, setNoteMessage] = useState("");

  useEffect(() => {
    let isMounted = true;
    const supabase = getSupabaseClient();

    const loadOrder = async () => {
      const resolvedParams = await params;
      const orderId = resolvedParams.id;
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

      const [{ data: fetchedOrder, error: orderError }, { data: fetchedItems }, { data: fetchedVendorOrders }] =
        await Promise.all([
          supabase.from("orders").select("*").eq("id", orderId).single(),
          supabase.from("order_items").select("*").eq("order_id", orderId),
          supabase.from("vendor_orders").select("*").eq("order_id", orderId),
        ]);

      if (!isMounted) {
        return;
      }

      if (orderError || !fetchedOrder) {
        setOrder(null);
        setOrderItems([]);
        setVendorOrders([]);
        setLoading(false);
        return;
      }

      const normalizedOrder = {
        ...(fetchedOrder as Omit<OrderRow, "status"> & { status: unknown }),
        status: safeOrderStatus((fetchedOrder as { status?: unknown }).status),
      } satisfies OrderRow;

      const items = (fetchedItems ?? []) as OrderItemRow[];
      const normalizedVendorOrders = ((fetchedVendorOrders ?? []) as VendorOrderRow[]).map((vendorOrder) => ({
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

      const vendorIds = normalizedVendorOrders.map((vendorOrder) => vendorOrder.vendor_id);
      const vendorResult = await getVendorsByIds(vendorIds);

      if (!isMounted) {
        return;
      }

      const vendorById = new Map(vendorResult.data.map((vendor) => [vendor.id, vendor]));
      const itemsByVendorOrderId = new Map<string, OrderItemRow[]>();

      items.forEach((item) => {
        if (!item.vendor_order_id) {
          return;
        }

        const currentItems = itemsByVendorOrderId.get(item.vendor_order_id) ?? [];
        currentItems.push(item);
        itemsByVendorOrderId.set(item.vendor_order_id, currentItems);
      });

      setOrder(normalizedOrder);
      setAdminNote(normalizedOrder.admin_note ?? "");
      setOrderItems(items);
      setVendorOrders(
        normalizedVendorOrders.map((vendorOrder) => ({
          ...vendorOrder,
          vendor: vendorById.get(vendorOrder.vendor_id) ?? null,
          items: itemsByVendorOrderId.get(vendorOrder.id) ?? [],
        })),
      );
      setLoading(false);
    };

    void loadOrder();

    return () => {
      isMounted = false;
    };
  }, [params]);

  const groupedItems = useMemo(() => groupOrderItems(orderItems), [orderItems]);

  const handleStatusChange = async (newStatus: OrderStatus) => {
    if (!order) {
      return;
    }

    const supabase = getSupabaseClient();

    setIsUpdatingStatus(true);
    setErrorMessage("");

    const { error } = await supabase
      .from("orders")
      .update({ status: newStatus } as never)
      .eq("id", order.id);

    if (error) {
      setErrorMessage("Unable to update order status right now.");
      setIsUpdatingStatus(false);
      return;
    }

    setOrder({
      ...order,
      status: newStatus,
    });
    setIsUpdatingStatus(false);
  };

  const handleSaveNote = async () => {
    if (!order) {
      return;
    }

    const supabase = getSupabaseClient();

    setIsSavingNote(true);
    setErrorMessage("");
    setNoteMessage("");

    const { error } = await supabase
      .from("orders")
      .update({ admin_note: adminNote.trim() || null } as never)
      .eq("id", order.id);

    if (error) {
      setErrorMessage(
        error.message.toLowerCase().includes("admin_note")
          ? "The `admin_note` column is missing. Run: alter table orders add column admin_note text;"
          : "Unable to save admin note right now.",
      );
      setIsSavingNote(false);
      return;
    }

    setOrder({
      ...order,
      admin_note: adminNote.trim() || null,
    });
    setNoteMessage("Admin note saved");
    setIsSavingNote(false);
  };

  const handlePaymentStatusChange = async (newPaymentStatus: PaymentStatus) => {
    if (!order) {
      return;
    }

    const supabase = getSupabaseClient();

    setIsUpdatingPaymentStatus(true);
    setErrorMessage("");

    const { error } = await supabase
      .from("orders")
      .update({ payment_status: newPaymentStatus } as never)
      .eq("id", order.id);

    if (error) {
      setErrorMessage(
        error.message.toLowerCase().includes("payment_status")
          ? "Payment columns are missing. Run: alter table orders add column payment_method text default 'Bank Transfer'; alter table orders add column payment_status text default 'Pending';"
          : "Unable to update payment status right now.",
      );
      setIsUpdatingPaymentStatus(false);
      return;
    }

    setOrder({
      ...order,
      payment_status: newPaymentStatus,
    });
    setIsUpdatingPaymentStatus(false);
  };

  const customerNote =
    typeof order?.buyer?.customer_note === "string"
      ? order.buyer.customer_note
      : typeof order?.buyer?.note === "string"
        ? order.buyer.note
        : null;

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
        Loading...
      </div>
    );
  }

  if (!userEmail) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Admin Order Details</h1>
        <p className="mt-3 text-sm text-slate-500">Please login as admin</p>
        <Link
          href="/login"
          className="mt-6 inline-flex items-center justify-center rounded-xl bg-[#615FFF] px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          Go to Login
        </Link>
      </div>
    );
  }

  if (!hasAdminAccess) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Admin Order Details</h1>
        <p className="mt-3 text-sm text-slate-500">You do not have admin access</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Order not found</h1>
        <Link
          href="/admin"
          className="mt-6 inline-flex items-center justify-center rounded-xl bg-[#615FFF] px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          Back to Admin
        </Link>
      </div>
    );
  }

  return (
    <section className="w-full space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white">
        <div className="flex flex-col gap-4 border-b border-gray-100 px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-base font-medium text-gray-800">{order.order_number}</h3>
            <p className="mt-1 text-sm text-gray-500">Created {formatOrderDate(order.created_at)}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/admin/orders"
              className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:border-[#615FFF]/40 hover:text-slate-900"
            >
              Back to Orders
            </Link>
            <StatusBadge status={safeOrderStatus(order.status)} />
            <select
              value={safeOrderStatus(order.status)}
              onChange={(event) => handleStatusChange(event.target.value as OrderStatus)}
              disabled={isUpdatingStatus}
              className="h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-800 outline-none transition-colors focus:border-[#615FFF]/40 focus:ring-4 focus:ring-[#615FFF]/10 disabled:cursor-not-allowed disabled:bg-slate-50"
              aria-label={`Update status for ${order.order_number}`}
            >
              {ORDER_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {errorMessage ? (
        <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-600">
          {errorMessage}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Invoice Style View</p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-900">{order.order_number}</h2>
                  <p className="mt-1 text-sm text-slate-500">Marketplace order created on {formatOrderDate(order.created_at)}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Order Status</p>
                    <div className="mt-2">
                      <StatusBadge status={safeOrderStatus(order.status)} />
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Payment Status</p>
                    <div className="mt-2">
                      <PaymentBadge status={order.payment_status} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-6 px-5 py-5 sm:px-6 lg:grid-cols-2">
              <div className="rounded-xl border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-slate-900">Customer</h3>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <DetailField label="Customer Email" value={order.user_email} />
                  <DetailField label="Payment Method" value={order.payment_method ?? "Bank Transfer"} />
                  {order.buyer && Object.keys(order.buyer).length > 0 ? (
                    Object.entries(order.buyer)
                      .filter(([, value]) => value !== null && String(value).trim() !== "")
                      .slice(0, 6)
                      .map(([key, value]) => (
                        <DetailField key={key} label={key.replace(/_/g, " ")} value={String(value)} />
                      ))
                  ) : (
                    <DetailField label="Buyer Info" value="No buyer information available" />
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-slate-900">Operations</h3>
                <div className="mt-4 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Update Order Status</p>
                      <select
                        value={safeOrderStatus(order.status)}
                        onChange={(event) => handleStatusChange(event.target.value as OrderStatus)}
                        disabled={isUpdatingStatus}
                        className="mt-2 h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-800 outline-none transition-colors focus:border-[#615FFF]/40 focus:ring-4 focus:ring-[#615FFF]/10 disabled:cursor-not-allowed disabled:bg-slate-50"
                      >
                        {ORDER_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Update Payment</p>
                      <select
                        value={order.payment_status ?? "Pending"}
                        onChange={(event) => handlePaymentStatusChange(event.target.value as PaymentStatus)}
                        disabled={isUpdatingPaymentStatus}
                        className="mt-2 h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-800 outline-none transition-colors focus:border-[#615FFF]/40 focus:ring-4 focus:ring-[#615FFF]/10 disabled:cursor-not-allowed disabled:bg-slate-50"
                      >
                        {PAYMENT_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    {customerNote ? customerNote : "No customer note available."}
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 px-5 py-5 sm:px-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Order Items</h3>
                  <p className="mt-1 text-sm text-slate-500">Invoice-style breakdown of the ordered products and variations.</p>
                </div>
              </div>

              {groupedItems.length === 0 ? (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5">
                  <p className="text-sm text-slate-500">No ordered products found for this order.</p>
                </div>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Product</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Variants</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Quantity</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {groupedItems.map((group) => (
                        <tr key={group.productId}>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-4">
                              <ProductImage src={group.image} alt={group.name} />
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-slate-900">{group.name}</p>
                                <div className="mt-1 space-y-1">
                                  {group.items.slice(0, 3).map((item) => (
                                    <p key={item.id} className="text-xs text-slate-500">
                                      {item.variant_name ? `${item.variant_name}: ` : ""}{item.variant_value ?? item.variation}
                                    </p>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-sm text-slate-600">{group.variantCount} variant(s)</td>
                          <td className="px-4 py-4 text-sm text-slate-600">{group.totalQuantity}</td>
                          <td className="px-4 py-4 text-sm font-semibold text-[#615FFF]">{formatBDT(group.subtotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-slate-900">Admin Note</h2>
            <div className="mt-4 space-y-3">
              <textarea
                value={adminNote}
                onChange={(event) => setAdminNote(event.target.value)}
                placeholder="Write internal note for this order..."
                className="min-h-32 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition-colors focus:border-[#615FFF]"
              />
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSaveNote}
                  disabled={isSavingNote}
                  className="inline-flex items-center justify-center rounded-xl bg-[#615FFF] px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSavingNote ? "Saving..." : "Save Note"}
                </button>
                {noteMessage ? <p className="text-sm font-medium text-green-600">{noteMessage}</p> : null}
              </div>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="text-lg font-semibold text-slate-900">Shipping Methods</h2>
              <div className="mt-4 space-y-3">
                {order.shipping_methods && order.shipping_methods.length > 0 ? (
                  order.shipping_methods.map((shippingMethod) => (
                    <div
                      key={`${shippingMethod.productId}-${shippingMethod.shippingProfileId}`}
                      className="rounded-lg border border-slate-200 px-4 py-3"
                    >
                      <p className="text-sm font-semibold text-slate-900">{shippingMethod.productName}</p>
                      <p className="mt-1 text-sm text-slate-500">Shipping Method: {shippingMethod.shippingProfileName}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">No shipping method data available.</p>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="text-lg font-semibold text-slate-900">Vendor Breakdown</h2>
              <div className="mt-4 space-y-4">
                {vendorOrders.length === 0 ? (
                  <p className="text-sm text-slate-500">No vendor sub-orders are attached to this marketplace order yet.</p>
                ) : (
                  vendorOrders.map((vendorOrder) => (
                    <article key={vendorOrder.id} className="rounded-xl border border-slate-200 p-4">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <DetailField label="Vendor" value={vendorOrder.vendor?.name ?? "Assigned Vendor"} />
                        <DetailField label="Rows / Qty" value={`${vendorOrder.items.length} row(s) / ${vendorOrder.items.reduce((sum, item) => sum + item.quantity, 0)} qty`} />
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <StatusBadge status={safeOrderStatus(vendorOrder.status)} />
                        <p className="text-sm font-semibold text-[#615FFF]">{formatBDT(vendorOrder.summary.payNow ?? 0)}</p>
                      </div>
                      {vendorOrder.vendor_note ? (
                        <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                          <p className="text-xs uppercase tracking-[0.16em] text-emerald-600">Vendor Note</p>
                          <p className="mt-1 text-sm text-emerald-800">{vendorOrder.vendor_note}</p>
                        </div>
                      ) : null}
                    </article>
                  ))
                )}
              </div>
            </section>
          </div>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-6">
          <div className="space-y-0 rounded-2xl border border-slate-200 bg-white px-5">
            <SummaryRow label="Quantity" value={String(order.summary.quantity ?? order.summary.totalQuantity ?? 0)} />
            <SummaryRow label="Product Price" value={formatBDT(order.summary.productPrice ?? 0)} />
            <SummaryRow label="CNDS Cost" value={formatBDT(order.cnds_cost_total ?? order.summary.cddCharge ?? 0)} />
            <SummaryRow
              label="International Shipping"
              value={
                order.international_shipping_status === "calculated" &&
                typeof order.international_shipping_total === "number"
                  ? formatBDT(order.international_shipping_total)
                  : typeof order.summary.payOnDelivery === "number"
                    ? formatBDT(order.summary.payOnDelivery)
                    : "Pending review"
              }
            />
            <SummaryRow label="Pay Now" value={formatBDT(order.summary.payNow ?? 0)} strong />
          </div>

          <div className="rounded-2xl border border-dashed border-[#615FFF]/50 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2">
                <p className="text-base font-semibold text-slate-900">Pay on Delivery</p>
              </div>

              <div className="text-right">
                <p className="text-lg font-semibold text-slate-700">
                  {order.international_shipping_status === "calculated" &&
                  typeof order.international_shipping_total === "number"
                    ? formatBDT(order.international_shipping_total)
                    : typeof order.summary.payOnDelivery === "number"
                      ? formatBDT(order.summary.payOnDelivery)
                      : "Pending review"}
                </p>
                <p className="mt-2 whitespace-nowrap text-xs font-medium text-[#615FFF]">International shipping</p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
