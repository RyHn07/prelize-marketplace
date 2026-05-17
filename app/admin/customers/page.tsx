"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { getAdminAccessState } from "@/lib/admin-access";
import { getAdminCustomers, type AdminCustomerRow } from "@/lib/customers/queries";
import { getSupabaseClient } from "@/lib/supabase-client";

function formatBDT(amount: number) {
  return `\u09F3${Number.isFinite(amount) ? amount.toLocaleString() : "0"}`;
}

function formatDate(value: string) {
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

function SortIcon() {
  return (
    <svg width="10" height="12" viewBox="0 0 10 12" fill="none" aria-hidden="true" className="text-slate-300">
      <path d="M5 1 8 4H2L5 1Z" fill="currentColor" />
      <path d="M5 11 2 8h6l-3 3Z" fill="currentColor" />
    </svg>
  );
}

function getCustomerInitials(customer: AdminCustomerRow) {
  const source = customer.fullName?.trim() || customer.email.trim();
  const parts = source.split(/\s+/).filter(Boolean).slice(0, 2);

  if (parts.length === 0) {
    return "C";
  }

  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}

export default function AdminCustomersPage() {
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [hasAdminAccess, setHasAdminAccess] = useState(false);
  const [customers, setCustomers] = useState<AdminCustomerRow[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    let isMounted = true;
    const supabase = getSupabaseClient();

    const loadPage = async () => {
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

      const result = await getAdminCustomers();

      if (!isMounted) {
        return;
      }

      if (result.error) {
        setErrorMessage(result.error.message);
        setCustomers([]);
        setLoading(false);
        return;
      }

      setCustomers(result.data);
      setLoading(false);
    };

    void loadPage();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredCustomers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return customers.filter((customer) => {
      if (query.length === 0) {
        return true;
      }

      return (
        customer.email.toLowerCase().includes(query) ||
        (customer.fullName ?? "").toLowerCase().includes(query) ||
        (customer.phone ?? "").toLowerCase().includes(query) ||
        (customer.city ?? "").toLowerCase().includes(query) ||
        (customer.country ?? "").toLowerCase().includes(query)
      );
    });
  }, [customers, searchQuery]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
        Loading customers...
      </div>
    );
  }

  if (!userEmail) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Admin Customers</h1>
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
        <h1 className="text-2xl font-semibold text-slate-900">Admin Customers</h1>
        <p className="mt-3 text-sm text-slate-500">You do not have admin access</p>
      </div>
    );
  }

  return (
    <section className="w-full space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white">
        <div className="flex flex-col gap-4 border-b border-gray-100 px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-base font-medium text-gray-800">Customers List</h3>
            <p className="mt-1 text-sm text-gray-500">
              Review active buyers based on real marketplace order history without changing auth or account ownership.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-lg bg-[#615FFF]/8 px-3 py-2 text-sm font-medium text-[#615FFF]">
              {filteredCustomers.length} visible
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full max-w-[380px]">
            <label htmlFor="customer-search" className="sr-only">
              Search customers
            </label>
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
              <SearchIcon />
            </span>
            <input
              id="customer-search"
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by email, name, phone, city, or country"
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent py-2.5 pl-12 pr-4 text-sm text-gray-800 shadow-sm placeholder:text-gray-400 outline-none transition-colors focus:border-[#615FFF]/40 focus:ring-4 focus:ring-[#615FFF]/10"
            />
          </div>
        </div>

        {errorMessage ? (
          <div className="border-b border-rose-100 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-600 sm:px-6">
            {errorMessage}
          </div>
        ) : null}

        {customers.length === 0 ? (
          <div className="p-6">
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
              <h3 className="text-lg font-semibold text-slate-900">No customers yet</h3>
              <p className="mt-2 text-sm text-slate-500">Customer records will appear here after orders are placed.</p>
            </div>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="p-6">
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
              <h3 className="text-lg font-semibold text-slate-900">No matching customers</h3>
              <p className="mt-2 text-sm text-slate-500">Try another search term.</p>
            </div>
          </div>
        ) : (
          <div className="max-w-full overflow-x-auto">
            <div className="min-w-[1180px]">
              <table className="min-w-full">
                <thead className="border-b border-gray-100">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 sm:px-6">
                      <div className="flex items-center gap-2">
                        <span>Customer</span>
                        <SortIcon />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                      <div className="flex items-center gap-2">
                        <span>Contact</span>
                        <SortIcon />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Orders</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Pay Now Total</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Latest Order</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredCustomers.map((customer) => (
                    <tr key={customer.key}>
                      <td className="px-5 py-5 text-left sm:px-6">
                        <div className="flex min-w-0 items-center gap-4">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#615FFF]/12 text-sm font-semibold text-[#615FFF]">
                            {getCustomerInitials(customer)}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-gray-800">{customer.fullName ?? "Unnamed buyer"}</p>
                            <span className="mt-1 block truncate text-xs text-gray-500">{customer.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-5 text-sm text-gray-500">
                        <div className="space-y-1">
                          <p>{customer.phone ?? "No phone saved"}</p>
                          <p>{[customer.city, customer.country].filter(Boolean).join(", ") || "No location saved"}</p>
                        </div>
                      </td>
                      <td className="px-4 py-5 text-sm font-medium text-gray-700">{customer.orderCount}</td>
                      <td className="px-4 py-5 text-sm font-semibold text-[#615FFF]">{formatBDT(customer.totalPayNow)}</td>
                      <td className="px-4 py-5 text-sm text-gray-500">
                        <div className="space-y-1">
                          <p className="font-medium text-slate-900">{customer.latestOrderNumber}</p>
                          <p>{formatDate(customer.latestOrderDate)}</p>
                        </div>
                      </td>
                      <td className="px-4 py-5 text-right">
                        <Link
                          href={`/admin/customers/${encodeURIComponent(customer.key)}`}
                          className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-[#615FFF]/40 hover:text-slate-900"
                        >
                          View All Orders
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
