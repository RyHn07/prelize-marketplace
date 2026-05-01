"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import Header from "@/components/Header";
import { getSupabaseClient } from "@/lib/supabase-client";

const ORDER_STEPS = ["Pending", "Confirmed", "Processing", "Shipped", "Delivered"] as const;

type OrderSummary = {
  quantity?: number;
  totalQuantity?: number;
  productPrice: number;
  cddCharge: number;
  payNow: number;
  payOnDelivery: number | string | null;
};

type ShippingMethod = {
  productId: string;
  productName: string;
  shippingProfileId: string;
  shippingProfileName: string;
};

type OrderRow = {
  id: string;
  order_number: string;
  user_id: string;
  user_email: string;
  status: "Pending";
  payment_method: string | null;
  payment_status: string | null;
  created_at: string;
  summary: OrderSummary;
  shipping_methods: ShippingMethod[] | null;
};

type OrderItemRow = {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  product_image: string;
  variation: string;
  price: number;
  quantity: number;
  weight: number | null;
};

type GroupedOrderItem = {
  productId: string;
  name: string;
  image?: string;
  items: OrderItemRow[];
  variantCount: number;
  totalQuantity: number;
  subtotal: number;
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

function StatusBadge({ status }: { status: OrderRow["status"] }) {
  return (
    <span className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
      {status}
    </span>
  );
}

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

function ProductImage({ src, alt }: { src?: string; alt: string }) {
  if (!src) {
    return (
      <div className="flex h-18 w-18 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium text-slate-400">
        No Image
      </div>
    );
  }

  return (
    <div className="relative h-18 w-18 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
      <Image src={src} alt={alt} fill sizes="72px" className="object-cover" />
    </div>
  );
}

function OrderProductGroup({ group }: { group: GroupedOrderItem }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex gap-4 border-b border-slate-200 pb-4">
        <ProductImage src={group.image} alt={group.name} />

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-slate-900">{group.name}</h2>
              <p className="text-sm text-slate-500">Marketplace Product</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                <span>Variants: {group.variantCount}</span>
                <span>Total Qty: {group.totalQuantity}</span>
              </div>
            </div>

            <div className="text-left sm:text-right">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                Product Subtotal
              </p>
              <p className="mt-1 text-base font-semibold text-[#615FFF]">
                {formatBDT(group.subtotal)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {group.items.map((item) => (
          <div
            key={item.id}
            className="rounded-lg border border-slate-200 px-4 py-3"
          >
            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-900">Variation: {item.variation}</p>
              <div className="grid gap-2 text-sm text-slate-600 sm:grid-cols-3">
                <p>Qty: {item.quantity}</p>
                <p>Unit Price: {formatBDT(item.price)}</p>
                <p className="font-medium text-slate-900">
                  Total: {formatBDT(item.price * item.quantity)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

export default function OrderDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [orderId, setOrderId] = useState("");
  const [order, setOrder] = useState<OrderRow | null>(null);
  const [items, setItems] = useState<OrderItemRow[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const supabase = getSupabaseClient();

    const loadOrder = async () => {
      const resolvedParams = await params;
      const currentOrderId = resolvedParams.id;

      if (!isMounted) {
        return;
      }

      setOrderId(currentOrderId);

      const { data: authData } = await supabase.auth.getUser();
      const currentUserId = authData.user?.id ?? null;
      const currentUserEmail = authData.user?.email ?? null;

      if (!currentUserId) {
        if (isMounted) {
          setIsAuthorized(false);
          setHasLoaded(true);
        }
        return;
      }

      const { data: fetchedOrder, error: orderError } = await supabase
        .from("orders")
        .select("*")
        .eq("id", currentOrderId)
        .single();

      if (!isMounted) {
        return;
      }

      if (orderError || !fetchedOrder) {
        setIsAuthorized(true);
        setOrder(null);
        setItems([]);
        setHasLoaded(true);
        return;
      }

      const orderRow = fetchedOrder as OrderRow;

      const matchesUserId = orderRow.user_id === currentUserId;
      const matchesUserEmail =
        currentUserEmail !== null &&
        typeof orderRow.user_email === "string" &&
        orderRow.user_email.toLowerCase() === currentUserEmail.toLowerCase();

      if (!matchesUserId && !matchesUserEmail) {
        setIsAuthorized(true);
        setOrder(null);
        setItems([]);
        setHasLoaded(true);
        return;
      }

      const { data: fetchedItems, error: itemsError } = await supabase
        .from("order_items")
        .select("*")
        .eq("order_id", currentOrderId);

      if (!isMounted) {
        return;
      }

      setIsAuthorized(true);
      setOrder(orderRow);
      setItems(itemsError || !fetchedItems ? [] : (fetchedItems as OrderItemRow[]));
      setHasLoaded(true);
    };

    loadOrder();

    return () => {
      isMounted = false;
    };
  }, [params]);

  useEffect(() => {
    if (hasLoaded && !isAuthorized) {
      router.push("/login");
    }
  }, [hasLoaded, isAuthorized, router]);

  const groupedItems = useMemo(() => {
    if (!order) {
      return [] as GroupedOrderItem[];
    }

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
  }, [items, order]);

  if (!hasLoaded || !isAuthorized) {
    return (
      <main className="min-h-screen bg-white">
        <Header />

        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center">
            <h1 className="text-2xl font-semibold text-slate-900">Loading...</h1>
            <p className="mt-2 text-sm text-slate-500">
              Checking your account before opening this order.
            </p>
          </div>
        </section>
      </main>
    );
  }

  if (hasLoaded && isAuthorized && !order) {
    return (
      <main className="min-h-screen bg-white">
        <Header />

        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center">
            <h1 className="text-2xl font-semibold text-slate-900">Order not found</h1>
            <p className="mt-2 text-sm text-slate-500">
              We could not find the order you were looking for.
            </p>
            <Link
              href="/orders"
              className="mt-6 inline-flex items-center justify-center rounded-full bg-[#615FFF] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#5552e6]"
            >
              Back to Orders
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white">
      <Header />

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <Link
              href="/orders"
              className="inline-flex text-sm font-medium text-[#615FFF] transition-colors hover:text-[#5552e6]"
            >
              Back to Orders
            </Link>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
              {order?.order_number ?? orderId}
            </h1>
            <p className="text-sm text-slate-500">
              Order Date: {order ? formatOrderDate(order.created_at) : "Loading..."}
            </p>
          </div>

          {order ? <StatusBadge status={order.status} /> : null}
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
          <div className="space-y-4">
            <section className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="text-lg font-semibold text-slate-900">Order Status</h2>
              <p className="mt-2 text-sm text-slate-500">
                Your order has been placed and is waiting for confirmation.
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-5">
                {ORDER_STEPS.map((step) => {
                  const isActive = step === "Pending";

                  return (
                    <div
                      key={step}
                      className={`rounded-lg border px-3 py-3 text-center text-sm font-medium ${
                        isActive
                          ? "border-[#615FFF]/30 bg-[#615FFF]/10 text-[#615FFF]"
                          : "border-slate-200 bg-white text-slate-400"
                      }`}
                    >
                      {step}
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-slate-900">Ordered Products</h2>
              {groupedItems.map((group) => (
                <OrderProductGroup key={group.productId} group={group} />
              ))}
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="text-lg font-semibold text-slate-900">Shipping Methods</h2>

              <div className="mt-4 space-y-3">
                {order?.shipping_methods && order.shipping_methods.length > 0 ? (
                  order.shipping_methods.map((shippingMethod) => (
                    <div
                      key={`${shippingMethod.productId}-${shippingMethod.shippingProfileId}`}
                      className="rounded-lg border border-slate-200 px-4 py-3"
                    >
                      <p className="text-sm font-semibold text-slate-900">
                        {shippingMethod.productName}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        Shipping Method: {shippingMethod.shippingProfileName}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">
                    Shipping method will be confirmed after review.
                  </p>
                )}
              </div>
            </section>

          </div>

          <aside className="space-y-5 lg:sticky lg:top-6">
            <div className="space-y-0 rounded-xl border border-slate-200 bg-white px-5">
              <SummaryRow
                label="Quantity"
                value={String(order?.summary.quantity ?? order?.summary.totalQuantity ?? 0)}
              />
              <SummaryRow
                label="Product Price"
                value={formatBDT(order?.summary.productPrice ?? 0)}
              />
              <SummaryRow
                label="CDD Charge"
                value={formatBDT(order?.summary.cddCharge ?? 0)}
              />
              <SummaryRow
                label="Pay Now"
                value={formatBDT(order?.summary.payNow ?? 0)}
                strong
              />
            </div>

            <div className="rounded-lg border border-dashed border-[#615FFF]/50 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2">
                  <p className="text-base font-semibold text-slate-900">Pay on Delivery</p>
                </div>

                <div className="text-right">
                  <p className="text-lg font-semibold text-slate-700">
                    {typeof order?.summary.payOnDelivery === "number"
                      ? formatBDT(order.summary.payOnDelivery)
                      : order?.summary.payOnDelivery ?? "Confirmed after review"}
                  </p>
                  <p className="mt-2 whitespace-nowrap text-xs font-medium text-[#615FFF]">
                    Estimated shipping charge
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-sm font-semibold text-slate-900">Payment Method</p>
              <p className="mt-2 text-base font-semibold text-[#615FFF]">
                {order?.payment_method ?? "Bank Transfer"}
              </p>
              <p className="mt-4 text-sm font-semibold text-slate-900">Payment Status</p>
              <p className="mt-2 text-sm font-medium text-slate-700">
                {order?.payment_status ?? "Pending"}
              </p>
            </div>

            <p className="text-sm leading-6 text-slate-500">
              Final shipping cost will be confirmed after order review.
            </p>
          </aside>
        </div>
      </section>
    </main>
  );
}
