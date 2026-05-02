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

  const repeatCustomers = useMemo(
    () => customers.filter((customer) => customer.orderCount > 1).length,
    [customers],
  );
  const totalOrders = useMemo(
    () => customers.reduce((sum, customer) => sum + customer.orderCount, 0),
    [customers],
  );
  const totalPayNow = useMemo(
    () => customers.reduce((sum, customer) => sum + customer.totalPayNow, 0),
    [customers],
  );

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
    <section className="mx-auto max-w-7xl space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#615FFF]">Admin Dashboard</p>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Customers</h1>
        <p className="text-sm text-slate-500">
          Review active buyers based on real marketplace order history without changing auth or account ownership.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Total Customers</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{customers.length}</p>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.16em] text-emerald-500">Repeat Customers</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-700">{repeatCustomers}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Tracked Orders</p>
          <p className="mt-2 text-2xl font-semibold text-slate-700">{totalOrders}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Pay Now Total</p>
          <p className="mt-2 text-2xl font-semibold text-[#615FFF]">{formatBDT(totalPayNow)}</p>
        </div>
      </div>

      {errorMessage ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-600">
          {errorMessage}
        </div>
      ) : null}

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#615FFF]">Customer Directory</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-900">Order-based customer records</h2>
          </div>

          <div className="w-full lg:w-80">
            <label htmlFor="customer-search" className="sr-only">
              Search customers
            </label>
            <input
              id="customer-search"
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by email, name, phone, city, or country"
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition-colors focus:border-[#615FFF]"
            />
          </div>
        </div>

        {customers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
            <h3 className="text-lg font-semibold text-slate-900">No customers yet</h3>
            <p className="mt-2 text-sm text-slate-500">Customer records will appear here after orders are placed.</p>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
            <h3 className="text-lg font-semibold text-slate-900">No matching customers</h3>
            <p className="mt-2 text-sm text-slate-500">Try another search term.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredCustomers.map((customer) => (
              <article
                key={customer.key}
                className="rounded-2xl border border-slate-200 bg-white p-4"
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div className="grid flex-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Customer</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{customer.fullName ?? "Unnamed buyer"}</p>
                      <p className="mt-1 break-all text-sm text-slate-500">{customer.email}</p>
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Contact</p>
                      <p className="mt-1 text-sm text-slate-700">{customer.phone ?? "No phone saved"}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {[customer.city, customer.country].filter(Boolean).join(", ") || "No location saved"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Orders</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{customer.orderCount}</p>
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Pay Now Total</p>
                      <p className="mt-1 text-sm font-semibold text-[#615FFF]">{formatBDT(customer.totalPayNow)}</p>
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Latest Order</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{customer.latestOrderNumber}</p>
                      <p className="mt-1 text-sm text-slate-500">{formatDate(customer.latestOrderDate)}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 xl:justify-end">
                    <Link
                      href={`/admin/orders/${customer.latestOrderId}`}
                      className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-[#615FFF]/40 hover:text-slate-900"
                    >
                      View Latest Order
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
