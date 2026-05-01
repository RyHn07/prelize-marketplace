"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { getAdminAccessState } from "@/lib/admin-access";
import { getSupabaseClient } from "@/lib/supabase-client";
const ORDER_STATUSES = [
  "Pending",
  "Confirmed",
  "Processing",
  "Shipped",
  "Delivered",
  "Cancelled",
] as const;

type OrderStatus = (typeof ORDER_STATUSES)[number];

type OrderSummary = {
  payNow: number;
  payOnDelivery: number | string | null;
};

type AdminOrder = {
  id: string;
  order_number: string;
  user_email: string;
  status: OrderStatus;
  created_at: string;
  summary: OrderSummary;
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

function getStatusColor(status: string) {
  switch (status) {
    case "Pending":
      return "bg-yellow-100 text-yellow-700";
    case "Confirmed":
      return "bg-blue-100 text-blue-700";
    case "Processing":
      return "bg-purple-100 text-purple-700";
    case "Shipped":
      return "bg-indigo-100 text-indigo-700";
    case "Delivered":
      return "bg-green-100 text-green-700";
    case "Cancelled":
      return "bg-red-100 text-red-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
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

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [hasAdminAccess, setHasAdminAccess] = useState(false);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");

  useEffect(() => {
    let isMounted = true;
    const supabase = getSupabaseClient();

    const loadAdminOrders = async () => {
      const access = await getAdminAccessState(supabase);

      if (!isMounted) {
        return;
      }

      setUserEmail(access.userEmail);
      setHasAdminAccess(access.hasAdminAccess);

      if (!access.userEmail) {
        setLoading(false);
        return;
      }

      if (!access.hasAdminAccess) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (!isMounted) {
        return;
      }

      if (error) {
        const nextMessage = error.message.toLowerCase().includes("permission")
          ? "Admin database policy required to view all orders."
          : "Admin database policy required to view all orders.";
        setErrorMessage(nextMessage);
        setOrders([]);
        setLoading(false);
        return;
      }

      setOrders((data ?? []) as AdminOrder[]);
      setLoading(false);
    };

    loadAdminOrders();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    const supabase = getSupabaseClient();

    setUpdatingOrderId(orderId);
    setErrorMessage("");

    const { error } = await supabase
      .from("orders")
      .update({ status: newStatus } as never)
      .eq("id", orderId);

    if (error) {
      setErrorMessage("Unable to update order status right now.");
      setUpdatingOrderId(null);
      return;
    }

    setOrders((currentOrders) =>
      currentOrders.map((order) =>
        order.id === orderId
          ? {
              ...order,
              status: newStatus,
            }
          : order,
      ),
    );
    setUpdatingOrderId(null);
  };

  const totalOrders = orders.length;
  const pendingOrders = orders.filter((order) => order.status === "Pending").length;
  const deliveredOrders = orders.filter((order) => order.status === "Delivered").length;
  const totalPayNowAmount = orders.reduce((sum, order) => sum + (order.summary?.payNow ?? 0), 0);
  const statusCounts = ORDER_STATUSES.map((status) => ({
    status,
    count: orders.filter((order) => order.status === status).length,
  }));
  const recentOrders = orders.slice(0, 5);
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      normalizedSearchQuery.length === 0 ||
      order.order_number.toLowerCase().includes(normalizedSearchQuery) ||
      order.user_email.toLowerCase().includes(normalizedSearchQuery);

    const matchesStatus = statusFilter === "All Status" || order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

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
        <h1 className="text-2xl font-semibold text-slate-900">Admin Orders</h1>
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
        <h1 className="text-2xl font-semibold text-slate-900">Admin Orders</h1>
        <p className="mt-3 text-sm text-slate-500">You do not have admin access</p>
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-7xl">
        <div className="mb-6 space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#615FFF]">
            Admin Dashboard
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Admin Orders</h1>
          <p className="text-sm text-slate-500">Manage customer orders and update statuses.</p>
        </div>

        {errorMessage ? (
          <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-600">
            {errorMessage}
          </div>
        ) : null}

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">Total Orders</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{totalOrders}</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">Pending Orders</p>
            <p className="mt-2 text-3xl font-semibold text-amber-600">{pendingOrders}</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">Delivered Orders</p>
            <p className="mt-2 text-3xl font-semibold text-green-600">{deliveredOrders}</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">Total Pay Now Amount</p>
            <p className="mt-2 text-3xl font-semibold text-[#615FFF]">
              {formatBDT(totalPayNowAmount)}
            </p>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#615FFF]">
                  Overview
                </p>
                <h2 className="mt-1 text-lg font-semibold text-slate-900">Orders by Status</h2>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              {statusCounts.map(({ status, count }) => (
                <div
                  key={status}
                  className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2"
                >
                  <StatusBadge status={status} />
                  <span className="text-sm font-semibold text-slate-900">{count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#615FFF]">
                Snapshot
              </p>
              <h2 className="mt-1 text-lg font-semibold text-slate-900">Recent Orders</h2>
            </div>

            {recentOrders.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">No recent orders available.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="rounded-xl border border-slate-200 px-4 py-3"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900">{order.order_number}</p>
                        <p className="truncate text-sm text-slate-500">{order.user_email}</p>
                      </div>

                      <div className="flex items-center gap-3 sm:justify-end">
                        <StatusBadge status={order.status} />
                        <p className="text-sm font-semibold text-[#615FFF]">
                          {formatBDT(order.summary.payNow)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="flex-1">
              <label htmlFor="admin-order-search" className="sr-only">
                Search orders
              </label>
              <input
                id="admin-order-search"
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by order number or customer email"
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition-colors focus:border-[#615FFF]"
              />
            </div>

            <div className="w-full lg:w-56">
              <label htmlFor="admin-status-filter" className="sr-only">
                Filter by status
              </label>
              <select
                id="admin-status-filter"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none transition-colors focus:border-[#615FFF]"
              >
                <option value="All Status">All Status</option>
                {ORDER_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("All Status");
              }}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition-colors hover:border-[#615FFF]/40 hover:text-slate-900"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {orders.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <h2 className="text-xl font-semibold text-slate-900">No orders found</h2>
            <p className="mt-2 text-sm text-slate-500">
              New marketplace orders will appear here once customers place them.
            </p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <h2 className="text-xl font-semibold text-slate-900">No matching orders found</h2>
            <p className="mt-2 text-sm text-slate-500">
              Try changing the search text or status filter.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <article
                key={order.id}
                className="rounded-2xl border border-slate-200 bg-white p-5"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="grid flex-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                        Order Number
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {order.order_number}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                        Customer Email
                      </p>
                      <p className="mt-1 text-sm font-medium text-slate-700">{order.user_email}</p>
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Status</p>
                      <div className="mt-1">
                        <StatusBadge status={order.status} />
                      </div>
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Pay Now</p>
                      <p className="mt-1 text-sm font-semibold text-[#615FFF]">
                        {formatBDT(order.summary.payNow)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                        Pay on Delivery
                      </p>
                      <p className="mt-1 text-sm font-medium text-slate-700">
                        {typeof order.summary.payOnDelivery === "number"
                          ? formatBDT(order.summary.payOnDelivery)
                          : order.summary.payOnDelivery ?? "Confirmed after review"}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 lg:w-64">
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                        Created Date
                      </p>
                      <p className="mt-1 text-sm font-medium text-slate-700">
                        {formatOrderDate(order.created_at)}
                      </p>
                    </div>

                    <select
                      value={order.status}
                      onChange={(event) =>
                        handleStatusChange(order.id, event.target.value as OrderStatus)
                      }
                      disabled={updatingOrderId === order.id}
                      className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none transition-colors focus:border-[#615FFF] disabled:cursor-not-allowed disabled:bg-slate-50"
                      aria-label={`Update status for ${order.order_number}`}
                    >
                      {ORDER_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>

                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-[#615FFF]/40 hover:text-slate-900"
                    >
                      View Details
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
