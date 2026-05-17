"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";

import AdminEmptyState from "@/components/admin/admin-empty-state";
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

type BuyerInfo = Record<string, string | number | boolean | null> | null;

type AdminOrder = {
  id: string;
  order_number: string;
  user_id?: string | null;
  user_email: string;
  status: OrderStatus;
  created_at: string;
  payment_status?: string | null;
  summary: OrderSummary;
  buyer?: BuyerInfo;
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

function readBuyerString(buyer: BuyerInfo, keys: string[]) {
  if (!buyer) {
    return null;
  }

  for (const key of keys) {
    const value = buyer[key];

    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
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

function parseCustomerKey(rawKey: string) {
  if (rawKey.startsWith("user:")) {
    return { type: "user" as const, value: rawKey.slice(5) };
  }

  if (rawKey.startsWith("email:")) {
    return { type: "email" as const, value: rawKey.slice(6) };
  }

  return null;
}

export default function AdminCustomerOrdersPage() {
  const params = useParams<{ customerKey: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [hasAdminAccess, setHasAdminAccess] = useState(false);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [customerLabel, setCustomerLabel] = useState("Customer");

  const statusFilter = useMemo<"All Status" | OrderStatus>(() => {
    const currentStatus = searchParams.get("status");

    if (currentStatus && ORDER_STATUSES.includes(currentStatus as OrderStatus)) {
      return currentStatus as OrderStatus;
    }

    return "All Status";
  }, [searchParams]);

  useEffect(() => {
    let isMounted = true;
    const supabase = getSupabaseClient();

    const loadCustomerOrders = async () => {
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

      const rawCustomerKey =
        typeof params.customerKey === "string" ? decodeURIComponent(params.customerKey) : "";
      const parsedKey = parseCustomerKey(rawCustomerKey);

      if (!parsedKey?.value) {
        setErrorMessage("Invalid customer identifier.");
        setOrders([]);
        setLoading(false);
        return;
      }

      let query = supabase.from("orders").select("*").order("created_at", { ascending: false });

      query =
        parsedKey.type === "user"
          ? query.eq("user_id", parsedKey.value)
          : query.eq("user_email", parsedKey.value);

      const { data, error } = await query;

      if (!isMounted) {
        return;
      }

      if (error) {
        setErrorMessage("Unable to load customer orders right now.");
        setOrders([]);
        setLoading(false);
        return;
      }

      const nextOrders = (data ?? []) as AdminOrder[];
      setOrders(nextOrders);

      const firstOrder = nextOrders[0];
      if (firstOrder) {
        setCustomerLabel(
          readBuyerString(firstOrder.buyer ?? null, ["fullName", "name"]) ??
            firstOrder.user_email ??
            "Customer",
        );
      } else if (parsedKey.type === "email") {
        setCustomerLabel(parsedKey.value);
      }

      setLoading(false);
    };

    void loadCustomerOrders();

    return () => {
      isMounted = false;
    };
  }, [params.customerKey]);

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
        Loading customer orders...
      </div>
    );
  }

  if (!userEmail) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Customer Orders</h1>
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
        <h1 className="text-2xl font-semibold text-slate-900">Customer Orders</h1>
        <p className="mt-3 text-sm text-slate-500">You do not have admin access</p>
      </div>
    );
  }

  return (
    <section className="w-full space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white">
        <div className="flex flex-col gap-4 border-b border-gray-100 px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-base font-medium text-gray-800">Customer Orders</h3>
            <p className="mt-1 text-sm text-gray-500">
              Review every marketplace order placed by {customerLabel} from one workspace.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-lg bg-[#615FFF]/8 px-3 py-2 text-sm font-medium text-[#615FFF]">
              {filteredOrders.length} visible
            </div>
            <Link
              href="/admin/customers"
              className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:border-[#615FFF]/40 hover:text-slate-900"
            >
              Back to Customers
            </Link>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full max-w-[380px]">
            <label htmlFor="customer-order-search" className="sr-only">
              Search orders
            </label>
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
              <SearchIcon />
            </span>
            <input
              id="customer-order-search"
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by order number or customer email"
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent py-2.5 pl-12 pr-4 text-sm text-gray-800 shadow-sm placeholder:text-gray-400 outline-none transition-colors focus:border-[#615FFF]/40 focus:ring-4 focus:ring-[#615FFF]/10"
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="w-full sm:w-56">
              <label htmlFor="customer-order-status-filter" className="sr-only">
                Filter by status
              </label>
              <select
                id="customer-order-status-filter"
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
              description="This customer has not placed any orders yet."
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
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Payment</th>
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
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="px-4 py-5">
                        <PaymentBadge status={order.payment_status} />
                      </td>
                      <td className="px-4 py-5 text-sm font-semibold text-[#615FFF]">
                        {formatBDT(order.summary?.payNow ?? 0)}
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
