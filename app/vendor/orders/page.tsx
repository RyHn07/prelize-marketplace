"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import AdminEmptyState from "@/components/admin/admin-empty-state";
import {
  ORDER_STATUSES,
  formatBDT,
  formatOrderDate,
  getAllowedVendorStatusTransitions,
  getStatusColor,
  getVendorStatusTransitionError,
  safeOrderStatus,
} from "@/lib/orders/utils";
import { getVendorWorkspaceAccessState } from "@/lib/marketplace-access";
import { getPgDataClient } from "@/lib/browser-app-client";
import type { VendorOrderRow, VendorOrderStatus } from "@/types/product-db";

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

type VendorOrdersResponse = {
  vendorId?: string | null;
  orders?: VendorOrderListRow[];
  error?: string;
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusColor(status)}`}>
      {status}
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

export default function VendorOrdersPage() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [hasVendorWorkspaceAccess, setHasVendorWorkspaceAccess] = useState(false);
  const [activeVendorId, setActiveVendorId] = useState<string | null>(null);
  const [vendorOrders, setVendorOrders] = useState<VendorOrderListRow[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [updatingVendorOrderId, setUpdatingVendorOrderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const statusFilter = useMemo<"All Status" | VendorOrderStatus>(() => {
    const currentStatus = searchParams.get("status");

    if (currentStatus && ORDER_STATUSES.includes(currentStatus as VendorOrderStatus)) {
      return currentStatus as VendorOrderStatus;
    }

    return "All Status";
  }, [searchParams]);

  useEffect(() => {
    let isMounted = true;
    const dataClient = getPgDataClient();

    const loadVendorOrders = async () => {
      const access = await getVendorWorkspaceAccessState(dataClient);

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

      const response = await fetch("/api/vendor/orders", { cache: "no-store" });
      const result = (await response.json().catch(() => null)) as VendorOrdersResponse | null;

      if (!isMounted) {
        return;
      }

      if (!response.ok || !result) {
        setErrorMessage(result?.error ?? "Unable to load vendor orders right now.");
        setVendorOrders([]);
        setLoading(false);
        return;
      }

      const vendorOrderRows = (result.orders ?? []).map((vendorOrder) => ({
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

      setVendorOrders(vendorOrderRows);
      setLoading(false);
    };

    void loadVendorOrders();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredVendorOrders = useMemo(() => {
    const normalizedSearchQuery = searchQuery.trim().toLowerCase();

    return vendorOrders.filter((vendorOrder) => {
      const orderNumber = vendorOrder.parentOrder?.order_number ?? vendorOrder.order_id;
      const customerEmail = vendorOrder.parentOrder?.user_email ?? "";
      const matchesSearch =
        normalizedSearchQuery.length === 0 ||
        orderNumber.toLowerCase().includes(normalizedSearchQuery) ||
        customerEmail.toLowerCase().includes(normalizedSearchQuery);
      const matchesStatus = statusFilter === "All Status" || safeOrderStatus(vendorOrder.status) === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [vendorOrders, searchQuery, statusFilter]);

  const updateStatusFilter = (nextStatus: "All Status" | VendorOrderStatus) => {
    const nextParams = new URLSearchParams(searchParams.toString());

    if (nextStatus === "All Status") {
      nextParams.delete("status");
    } else {
      nextParams.set("status", nextStatus);
    }

    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname);
  };

  const handleStatusChange = async (vendorOrder: VendorOrderListRow, nextStatus: VendorOrderStatus) => {
    const currentStatus = safeOrderStatus(vendorOrder.status);
    const transitionError = getVendorStatusTransitionError(currentStatus, nextStatus);

    if (transitionError) {
      setErrorMessage(transitionError);
      return;
    }

    setUpdatingVendorOrderId(vendorOrder.id);
    setErrorMessage("");

    const response = await fetch("/api/vendor/orders", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        vendorOrderId: vendorOrder.id,
        status: nextStatus,
      }),
    });
    const result = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      setErrorMessage(result?.error ?? "Unable to update vendor order status right now.");
      setUpdatingVendorOrderId(null);
      return;
    }

    setVendorOrders((currentVendorOrders) =>
      currentVendorOrders.map((currentVendorOrder) =>
        currentVendorOrder.id === vendorOrder.id ? { ...currentVendorOrder, status: nextStatus } : currentVendorOrder,
      ),
    );
    setUpdatingVendorOrderId(null);
  };

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
          className="mt-6 inline-flex items-center justify-center rounded-xl bg-[#615FFF] px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
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
    <section className="w-full space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white">
        <div className="flex flex-col gap-4 border-b border-gray-100 px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-base font-medium text-gray-800">Orders List</h3>
            <p className="mt-1 text-sm text-gray-500">
              Track assigned marketplace orders, update fulfillment status, and review vendor totals from one workspace.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-lg bg-[#615FFF]/8 px-3 py-2 text-sm font-medium text-[#615FFF]">
              {filteredVendorOrders.length} visible
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full max-w-[380px]">
            <label htmlFor="vendor-order-search" className="sr-only">
              Search vendor orders
            </label>
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
              <SearchIcon />
            </span>
            <input
              id="vendor-order-search"
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by order number or customer email"
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent py-2.5 pl-12 pr-4 text-sm text-gray-800 shadow-sm placeholder:text-gray-400 outline-none transition-colors focus:border-[#615FFF]/40 focus:ring-4 focus:ring-[#615FFF]/10"
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="w-full sm:w-56">
              <label htmlFor="vendor-status-filter" className="sr-only">
                Filter by status
              </label>
              <select
                id="vendor-status-filter"
                value={statusFilter}
                onChange={(event) => updateStatusFilter(event.target.value as "All Status" | VendorOrderStatus)}
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

        {vendorOrders.length === 0 ? (
          <div className="p-6">
            <AdminEmptyState
              title="No vendor orders found"
              description="Orders containing your vendor-owned products will appear here after customers check out."
            />
          </div>
        ) : filteredVendorOrders.length === 0 ? (
          <div className="p-6">
            <AdminEmptyState
              title="No matching vendor orders found"
              description="Try changing the search text or status filter."
            />
          </div>
        ) : (
          <div className="max-w-full overflow-x-auto">
            <div className="min-w-[1180px]">
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
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Vendor Total</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Items</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Created At</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredVendorOrders.map((vendorOrder) => {
                    const currentStatus = safeOrderStatus(vendorOrder.status);
                    const selectableStatuses = [currentStatus, ...getAllowedVendorStatusTransitions(currentStatus)];

                    return (
                      <tr key={vendorOrder.id}>
                        <td className="px-5 py-5 text-left sm:px-6">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-gray-800">
                              {vendorOrder.parentOrder?.order_number ?? vendorOrder.order_id}
                            </p>
                            <span className="mt-1 block truncate text-xs text-gray-500">Vendor order</span>
                          </div>
                        </td>
                        <td className="px-4 py-5 text-sm text-gray-500">
                          {vendorOrder.parentOrder?.user_email ?? "Unknown customer"}
                        </td>
                        <td className="px-4 py-5">
                          <div className="space-y-3">
                            <StatusBadge status={currentStatus} />
                            <select
                              value={currentStatus}
                              onChange={(event) => handleStatusChange(vendorOrder, event.target.value as VendorOrderStatus)}
                              disabled={updatingVendorOrderId === vendorOrder.id || selectableStatuses.length === 1}
                              className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-800 outline-none transition-colors focus:border-[#615FFF]/40 focus:ring-4 focus:ring-[#615FFF]/10 disabled:cursor-not-allowed disabled:bg-slate-50"
                            >
                              {selectableStatuses.map((status) => (
                                <option key={status} value={status}>
                                  {status}
                                </option>
                              ))}
                            </select>
                          </div>
                        </td>
                        <td className="px-4 py-5 text-sm font-semibold text-[#615FFF]">
                          {formatBDT(vendorOrder.summary.payNow ?? 0)}
                        </td>
                        <td className="px-4 py-5 text-sm text-gray-500">
                          {vendorOrder.itemCount} row(s) / {vendorOrder.totalQuantity} qty
                        </td>
                        <td className="px-4 py-5 text-sm text-gray-500">
                          {vendorOrder.parentOrder
                            ? formatOrderDate(vendorOrder.parentOrder.created_at)
                            : formatOrderDate(vendorOrder.created_at)}
                        </td>
                        <td className="px-4 py-5 text-right">
                          <Link
                            href={`/vendor/orders/${vendorOrder.id}`}
                            className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-[#615FFF]/40 hover:text-slate-900"
                          >
                            View Details
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
