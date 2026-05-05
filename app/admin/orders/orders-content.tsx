"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import AdminEmptyState from "@/components/admin/admin-empty-state";
import AdminPageHeader from "@/components/admin/admin-page-header";
import AdminStatCard from "@/components/admin/admin-stat-card";
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
  payment_status?: string | null;
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

function getPaymentStatusColor(status: string | null | undefined) {
  if (status === "Received") {
    return "bg-emerald-100 text-emerald-700";
  }

  return "bg-amber-100 text-amber-700";
}

function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusColor(status)}`}>
      {status}
    </span>
  );
}

function PaymentBadge({ status }: { status: string | null | undefined }) {
  const label = status === "Received" ? "Received" : "Pending";

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getPaymentStatusColor(status)}`}>
      {label}
    </span>
  );
}

export default function OrdersContent() {
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

      if (!access.userEmail || !access.hasAdminAccess) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false });

      if (!isMounted) {
        return;
      }

      if (error) {
        setErrorMessage("Admin database policy required to view all orders.");
        setOrders([]);
        setLoading(false);
        return;
      }

      setOrders((data ?? []) as AdminOrder[]);
      setLoading(false);
    };

    void loadAdminOrders();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    const supabase = getSupabaseClient();

    setUpdatingOrderId(orderId);
    setErrorMessage("");

    const { error } = await supabase.from("orders").update({ status: newStatus } as never).eq("id", orderId);

    if (error) {
      setErrorMessage("Unable to update order status right now.");
      setUpdatingOrderId(null);
      return;
    }

    setOrders((currentOrders) =>
      currentOrders.map((order) => (order.id === orderId ? { ...order, status: newStatus } : order)),
    );
    setUpdatingOrderId(null);
  };

  const pendingOrders = orders.filter((order) => order.status === "Pending").length;
  const processingOrders = orders.filter((order) => order.status === "Processing").length;
  const deliveredOrders = orders.filter((order) => order.status === "Delivered").length;
  const totalPayNowAmount = orders.reduce((sum, order) => sum + (order.summary?.payNow ?? 0), 0);

  const filteredOrders = useMemo(() => {
    const normalizedSearchQuery = searchQuery.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesSearch =
        normalizedSearchQuery.length === 0 ||
        order.order_number.toLowerCase().includes(normalizedSearchQuery) ||
        order.user_email.toLowerCase().includes(normalizedSearchQuery);

      const matchesStatus = statusFilter === "All Status" || order.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [orders, searchQuery, statusFilter]);

  if (loading) {
    return <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 shadow-sm">Loading orders...</div>;
  }

  if (!userEmail) {
    return (
      <div className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Admin Orders</h1>
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
        <h1 className="text-2xl font-semibold text-slate-900">Admin Orders</h1>
        <p className="mt-3 text-sm text-slate-500">You do not have admin access</p>
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        title="Orders"
        description="Review marketplace orders, update statuses, and keep payment tracking visible for the operations team."
      />

      {errorMessage ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-600">{errorMessage}</div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard label="Total Orders" value={orders.length} />
        <AdminStatCard label="Pending Orders" value={pendingOrders} tone="warning" />
        <AdminStatCard label="Processing" value={processingOrders} tone="accent" />
        <AdminStatCard label="Pay Now Volume" value={formatBDT(totalPayNowAmount)} tone="success" />
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
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
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-800 outline-none transition-colors focus:border-[#615FFF]"
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
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none transition-colors focus:border-[#615FFF]"
            >
              <option value="All Status">All Status</option>
              {ORDER_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {orders.length === 0 ? (
        <AdminEmptyState
          title="No orders found"
          description="New marketplace orders will appear here once customers place them."
        />
      ) : filteredOrders.length === 0 ? (
        <AdminEmptyState
          title="No matching orders found"
          description="Try changing the search text or status filter."
        />
      ) : (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  <th className="px-5 py-4">Order</th>
                  <th className="px-5 py-4">Customer</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Payment</th>
                  <th className="px-5 py-4">Pay Now</th>
                  <th className="px-5 py-4">Created</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="align-top">
                    <td className="px-5 py-4 font-semibold text-slate-900">{order.order_number}</td>
                    <td className="px-5 py-4 text-slate-600">{order.user_email}</td>
                    <td className="px-5 py-4">
                      <div className="space-y-3">
                        <StatusBadge status={order.status} />
                        <select
                          value={order.status}
                          onChange={(event) => handleStatusChange(order.id, event.target.value as OrderStatus)}
                          disabled={updatingOrderId === order.id}
                          className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none transition-colors focus:border-[#615FFF] disabled:cursor-not-allowed disabled:bg-slate-50"
                        >
                          {ORDER_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <PaymentBadge status={order.payment_status} />
                    </td>
                    <td className="px-5 py-4 font-semibold text-[#615FFF]">{formatBDT(order.summary.payNow)}</td>
                    <td className="px-5 py-4 text-slate-600">{formatOrderDate(order.created_at)}</td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-[#615FFF]/40 hover:text-slate-900"
                        >
                          View Details
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {deliveredOrders > 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Delivered orders</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{deliveredOrders}</p>
        </div>
      ) : null}
    </section>
  );
}
