"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import AdminEmptyState from "@/components/admin/admin-empty-state";
import { ORDER_STATUSES, getStatusColor, safeOrderStatus } from "@/lib/orders/utils";
import type { VendorOrderStatus } from "@/types/product-db";

type OrderStatus = VendorOrderStatus;

type OrderSummary = {
  payNow: number;
  payOnDelivery: number | string | null;
};

type AdminOrder = {
  id: string;
  order_number: string;
  user_email: string;
  status: OrderStatus;
  payment_method?: string | null;
  payment_status?: string | null;
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

function StatusBadge({ status }: { status: OrderStatus }) {
  const safeStatus = safeOrderStatus(status);

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusColor(safeStatus)}`}>
      {safeStatus}
    </span>
  );
}

function SortIcon() {
  return (
    <svg width="10" height="12" viewBox="0 0 10 12" fill="none" aria-hidden="true" className="text-slate-300">
      <path d="M5 1 8 4H2L5 1Z" fill="currentColor" />
      <path d="M5 11 2 8h6l-3 3Z" fill="currentColor" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M3.04175 9.37363C3.04175 5.87693 5.87711 3.04199 9.37508 3.04199C12.8731 3.04199 15.7084 5.87693 15.7084 9.37363C15.7084 12.8703 12.8731 15.7053 9.37508 15.7053C5.87711 15.7053 3.04175 12.8703 3.04175 9.37363ZM9.37508 1.54199C5.04902 1.54199 1.54175 5.04817 1.54175 9.37363C1.54175 13.6991 5.04902 17.2053 9.37508 17.2053C11.2674 17.2053 13.003 16.5344 14.357 15.4176L17.177 18.238C17.4699 18.5309 17.9448 18.5309 18.2377 18.238C18.5306 17.9451 18.5306 17.4703 18.2377 17.1774L15.418 14.3573C16.5365 13.0033 17.2084 11.2669 17.2084 9.37363C17.2084 5.04817 13.7011 1.54199 9.37508 1.54199Z"
        fill="currentColor"
      />
    </svg>
  );
}

export default function OrdersContent() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [hasAdminAccess, setHasAdminAccess] = useState(false);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const statusFilter = useMemo<"All Status" | OrderStatus>(() => {
    const currentStatus = searchParams.get("status");

    if (currentStatus && ORDER_STATUSES.includes(currentStatus as OrderStatus)) {
      return currentStatus as OrderStatus;
    }

    return "All Status";
  }, [searchParams]);

  useEffect(() => {
    let isMounted = true;

    const loadAdminOrders = async () => {
      const response = await fetch("/api/admin/orders", { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        userEmail?: string | null;
        orders?: AdminOrder[];
      } | null;

      if (!isMounted) {
        return;
      }

      if (!response.ok || !payload) {
        setUserEmail(response.status === 401 ? null : "");
        setHasAdminAccess(response.status !== 403);
        setErrorMessage(payload?.error ?? "Unable to load orders right now.");
        setOrders([]);
        setLoading(false);
        return;
      }

      setUserEmail(payload.userEmail ?? null);
      setHasAdminAccess(true);
      setOrders((payload.orders ?? []).map((order) => ({ ...order, status: safeOrderStatus(order.status) })));
      setLoading(false);
    };

    void loadAdminOrders();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    setUpdatingOrderId(orderId);
    setErrorMessage("");

    const response = await fetch("/api/admin/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, status: newStatus }),
    });
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      setErrorMessage(payload?.error ?? "Unable to update order status right now.");
      setUpdatingOrderId(null);
      return;
    }

    setOrders((currentOrders) =>
      currentOrders.map((order) => (order.id === orderId ? { ...order, status: safeOrderStatus(newStatus) } : order)),
    );
    setUpdatingOrderId(null);
  };

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

  const updateStatusFilter = (nextStatus: "All Status" | OrderStatus) => {
    const nextParams = new URLSearchParams(searchParams.toString());

    if (nextStatus === "All Status") {
      nextParams.delete("status");
    } else {
      nextParams.set("status", nextStatus);
    }

    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname);
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
        Loading orders...
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
    <section className="w-full space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white">
        <div className="flex flex-col gap-4 border-b border-gray-100 px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-base font-medium text-gray-800">Orders List</h3>
            <p className="mt-1 text-sm text-gray-500">
              Review marketplace orders and update fulfillment statuses from one workspace.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-lg bg-[#615FFF]/8 px-3 py-2 text-sm font-medium text-[#615FFF]">
              {filteredOrders.length} visible
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full max-w-[380px]">
            <label htmlFor="admin-order-search" className="sr-only">
              Search orders
            </label>
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
              <SearchIcon />
            </span>
            <input
              id="admin-order-search"
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by order number or customer email"
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent py-2.5 pl-12 pr-4 text-sm text-gray-800 shadow-sm placeholder:text-gray-400 outline-none transition-colors focus:border-[#615FFF]/40 focus:ring-4 focus:ring-[#615FFF]/10"
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="w-full sm:w-56">
              <label htmlFor="admin-status-filter" className="sr-only">
                Filter by status
              </label>
              <select
                id="admin-status-filter"
                value={statusFilter}
                onChange={(event) => updateStatusFilter(event.target.value as "All Status" | OrderStatus)}
                className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-800 outline-none transition-colors focus:border-[#615FFF]/40 focus:ring-4 focus:ring-[#615FFF]/10"
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
                updateStatusFilter("All Status");
              }}
              className="inline-flex h-11 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-slate-700 transition-colors hover:border-[#615FFF]/40 hover:text-slate-900"
            >
              Clear
            </button>
          </div>
        </div>

        {errorMessage ? (
          <div className="border-b border-rose-100 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-600 sm:px-6">
            {errorMessage}
          </div>
        ) : null}

        {orders.length === 0 ? (
          <div className="p-6">
            <AdminEmptyState
              title="No orders found"
              description="New marketplace orders will appear here once customers place them."
            />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-6">
            <AdminEmptyState
              title="No matching orders found"
              description="Try changing the search text or status filter."
            />
          </div>
        ) : (
          <div className="max-w-full overflow-x-auto">
            <div className="min-w-[1040px]">
              <table className="min-w-full">
                <thead className="border-b border-gray-100">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 sm:px-6">
                      <div className="flex items-center gap-2">
                        <span>Order</span>
                        <SortIcon />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                      <div className="flex items-center gap-2">
                        <span>Customer</span>
                        <SortIcon />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Pay Now</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Created At</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredOrders.map((order) => (
                    <tr key={order.id}>
                      <td className="px-5 py-5 text-left sm:px-6">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-gray-800">{order.order_number}</p>
                          <span className="mt-1 block truncate text-xs text-gray-500">Marketplace order</span>
                        </div>
                      </td>
                      <td className="px-4 py-5 text-sm text-gray-500">{order.user_email}</td>
                      <td className="px-4 py-5">
                        <div className="space-y-3">
                          <StatusBadge status={order.status} />
                          <select
                            value={order.status}
                            onChange={(event) => handleStatusChange(order.id, event.target.value as OrderStatus)}
                            disabled={updatingOrderId === order.id}
                            className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-800 outline-none transition-colors focus:border-[#615FFF]/40 focus:ring-4 focus:ring-[#615FFF]/10 disabled:cursor-not-allowed disabled:bg-slate-50"
                          >
                            {ORDER_STATUSES.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>
                      <td className="px-4 py-5 text-sm font-semibold text-[#615FFF]">
                        {formatBDT(order.summary.payNow)}
                      </td>
                      <td className="px-4 py-5 text-sm text-gray-500">{formatOrderDate(order.created_at)}</td>
                      <td className="px-4 py-5 text-right">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-[#615FFF]/40 hover:text-slate-900"
                        >
                          View Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
