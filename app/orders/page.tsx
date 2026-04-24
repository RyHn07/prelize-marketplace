"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import Header from "@/components/Header";
import { getSupabaseClient } from "@/lib/supabase-client";

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
  image: string;
  sellerLabel: string;
  items: OrderItemRow[];
  variantCount: number;
  totalQuantity: number;
  subtotal: number;
};

type OrderWithItems = OrderRow & {
  items: OrderItemRow[];
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
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex gap-4 border-b border-slate-200 pb-4">
        <ProductImage src={group.image} alt={group.name} />

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-slate-900">{group.name}</h3>
              <p className="text-sm text-slate-500">Seller: {group.sellerLabel}</p>
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
    </div>
  );
}

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const supabase = getSupabaseClient();

    const loadOrdersForUser = async (userId: string) => {
      const { data: fetchedOrders, error: ordersError } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (!isMounted) {
        return;
      }

      if (ordersError || !fetchedOrders) {
        setOrders([]);
        return;
      }

      const orderRows = fetchedOrders as OrderRow[];

      if (orderRows.length === 0) {
        setOrders([]);
        return;
      }

      const orderIds = orderRows.map((order) => order.id);
      const { data: fetchedItems, error: itemsError } = await supabase
        .from("order_items")
        .select("*")
        .in("order_id", orderIds);

      if (!isMounted) {
        return;
      }

      if (itemsError || !fetchedItems) {
        setOrders(orderRows.map((order) => ({ ...order, items: [] })));
        return;
      }

      const itemsByOrderId = new Map<string, OrderItemRow[]>();

      (fetchedItems as OrderItemRow[]).forEach((item) => {
        const currentItems = itemsByOrderId.get(item.order_id) ?? [];
        currentItems.push(item);
        itemsByOrderId.set(item.order_id, currentItems);
      });

      setOrders(
        orderRows.map((order) => ({
          ...order,
          items: itemsByOrderId.get(order.id) ?? [],
        })),
      );
    };

    supabase.auth.getUser().then(async ({ data }) => {
      if (!isMounted) {
        return;
      }

      const userId = data.user?.id ?? null;
      setCurrentUserId(userId);
      setHasCheckedAuth(true);

      if (userId) {
        await loadOrdersForUser(userId);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isMounted) {
        return;
      }

      const userId = session?.user?.id ?? null;
      setCurrentUserId(userId);
      setHasCheckedAuth(true);

      if (!userId) {
        setOrders([]);
        return;
      }

      await loadOrdersForUser(userId);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (hasCheckedAuth && !currentUserId) {
      router.push("/login");
    }
  }, [currentUserId, hasCheckedAuth, router]);

  const groupedOrders = useMemo(() => {
    return orders.map((order) => {
      const groups = new Map<string, GroupedOrderItem>();

      order.items.forEach((item) => {
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
          sellerLabel: "Prelize Select",
          items: [item],
          variantCount: 1,
          totalQuantity: item.quantity,
          subtotal: item.price * item.quantity,
        });
      });

      return {
        ...order,
        groupedItems: Array.from(groups.values()),
      };
    });
  }, [orders]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <main className="min-h-screen bg-white">
      <div className="print-hidden">
        <Header />
      </div>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">My Orders</h1>
            <p className="text-sm text-slate-500">Track and manage your orders</p>
          </div>

          {groupedOrders.length > 0 ? (
            <button
              type="button"
              onClick={handlePrint}
              className="print-hidden inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:text-slate-900"
            >
              Print / Save Orders
            </button>
          ) : null}
        </div>

        {!hasCheckedAuth || !currentUserId ? (
          <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center">
            <h2 className="text-2xl font-semibold text-slate-900">Loading...</h2>
            <p className="mt-2 text-sm text-slate-500">
              Checking your account before showing your orders.
            </p>
          </div>
        ) : groupedOrders.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center">
            <h2 className="text-2xl font-semibold text-slate-900">No orders yet</h2>
            <p className="mt-2 text-sm text-slate-500">
              Place your first order to start tracking it here.
            </p>
            <Link
              href="/products"
              className="mt-6 inline-flex items-center justify-center rounded-full bg-[#615FFF] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#5552e6]"
            >
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {groupedOrders.map((order) => (
              <article
                key={order.id}
                className="rounded-xl border border-slate-200 bg-white p-5"
              >
                <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-900">{order.order_number}</p>
                    <p className="text-sm text-slate-500">
                      Order Date: {formatOrderDate(order.created_at)}
                    </p>
                  </div>

                  <StatusBadge status={order.status} />
                </div>

                <div className="grid gap-4 border-b border-slate-200 py-4 sm:grid-cols-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                      Total Quantity
                    </p>
                    <p className="mt-1 text-base font-semibold text-slate-900">
                      {order.summary.quantity ?? order.summary.totalQuantity ?? 0}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Pay Now</p>
                    <p className="mt-1 text-base font-semibold text-[#615FFF]">
                      {formatBDT(order.summary.payNow)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                      Pay on Delivery
                    </p>
                    <p className="mt-1 text-base font-semibold text-slate-900">
                      {typeof order.summary.payOnDelivery === "number"
                        ? formatBDT(order.summary.payOnDelivery)
                        : order.summary.payOnDelivery ?? "Confirmed after review"}
                    </p>
                  </div>
                </div>

                <div className="py-4">
                  <p className="text-sm font-semibold text-slate-900">Order Items</p>
                  <div className="mt-3 space-y-3">
                    {order.groupedItems.map((group) => (
                      <OrderProductGroup key={`${order.id}-${group.productId}`} group={group} />
                    ))}
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <Link
                    href={`/orders/${order.id}`}
                    className="print-hidden inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-slate-400 hover:text-slate-900"
                  >
                    View Details
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <style jsx global>{`
        @media print {
          @page {
            size: portrait;
            margin: 12mm;
          }

          .print-hidden {
            display: none !important;
          }

          body {
            background: #ffffff !important;
          }
        }
      `}</style>
    </main>
  );
}
