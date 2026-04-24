"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import Header from "@/components/Header";

const ORDERS_STORAGE_KEY = "prelize_orders";

type OrderItem = {
  productId: string;
  name: string;
  image: string;
  variation: string;
  price: number;
  quantity: number;
};

type StoredOrder = {
  id: string;
  status: "Pending";
  createdAt: string;
  items: OrderItem[];
  shippingMethods: {
    productId: string;
    productName: string;
    shippingProfileId: string;
    shippingProfileName: string;
  }[];
  summary: {
    quantity: number;
    productPrice: number;
    cddCharge: number;
    payNow: number;
    payOnDelivery: number | string;
  };
};

type GroupedOrderItem = {
  productId: string;
  name: string;
  image: string;
  sellerLabel: string;
  items: OrderItem[];
  variantCount: number;
  totalQuantity: number;
  subtotal: number;
};

function formatBDT(amount: number) {
  return `৳${amount.toLocaleString()}`;
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

function StatusBadge({ status }: { status: StoredOrder["status"] }) {
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
      <Image
        src={src}
        alt={alt}
        fill
        sizes="72px"
        className="object-cover"
      />
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
        {group.items.map((item, index) => (
          <div
            key={`${group.productId}-${item.variation}-${index}`}
            className="rounded-lg border border-slate-200 px-4 py-3"
          >
            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-900">
                Variation: {item.variation}
              </p>
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
  const [orders, setOrders] = useState<StoredOrder[]>([]);

  useEffect(() => {
    try {
      const storedOrders = window.localStorage.getItem(ORDERS_STORAGE_KEY);
      const parsedOrders = storedOrders ? JSON.parse(storedOrders) : [];

      setOrders(Array.isArray(parsedOrders) ? parsedOrders : []);
    } catch {
      setOrders([]);
    }
  }, []);

  const groupedOrders = useMemo(() => {
    return orders.map((order) => {
      const groups = new Map<string, GroupedOrderItem>();

      order.items.forEach((item) => {
        const existingGroup = groups.get(item.productId);

        if (existingGroup) {
          existingGroup.items.push(item);
          existingGroup.variantCount += 1;
          existingGroup.totalQuantity += item.quantity;
          existingGroup.subtotal += item.price * item.quantity;
          return;
        }

        groups.set(item.productId, {
          productId: item.productId,
          name: item.name,
          image: item.image,
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

        {groupedOrders.length === 0 ? (
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
                    <p className="text-sm font-semibold text-slate-900">{order.id}</p>
                    <p className="text-sm text-slate-500">
                      Order Date: {formatOrderDate(order.createdAt)}
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
                      {order.summary.quantity}
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
                        : order.summary.payOnDelivery}
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
                  <button
                    type="button"
                    className="print-hidden inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-slate-400 hover:text-slate-900"
                  >
                    View Details
                  </button>
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
