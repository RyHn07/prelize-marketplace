"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { getAdminAccessState } from "@/lib/admin-access";
import { getSupabaseClient } from "@/lib/supabase-client";
import { getVendorProductCounts, getVendors } from "@/lib/vendors/queries";
import type { VendorRow, VendorStatus } from "@/types/product-db";

function getStatusClasses(status: VendorStatus) {
  if (status === "active") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (status === "suspended") {
    return "bg-rose-100 text-rose-700";
  }

  return "bg-amber-100 text-amber-700";
}

function StatusBadge({ status }: { status: VendorStatus }) {
  const label = status.charAt(0).toUpperCase() + status.slice(1);

  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(status)}`}>{label}</span>;
}

export default function VendorsContent() {
  const searchParams = useSearchParams();
  const createdStatus = searchParams.get("status");

  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [hasAdminAccess, setHasAdminAccess] = useState(false);
  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [productCounts, setProductCounts] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | VendorStatus>("all");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    let isMounted = true;
    const supabase = getSupabaseClient();

    const loadVendors = async () => {
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

      const [vendorResult, productCountResult] = await Promise.all([
        getVendors(),
        getVendorProductCounts(),
      ]);

      if (!isMounted) {
        return;
      }

      if (vendorResult.error) {
        setErrorMessage(
          vendorResult.error.message.toLowerCase().includes("vendors")
            ? "Vendor tables are missing. Run the latest multivendor migration, then reload this page."
            : "Unable to load vendors right now.",
        );
        setVendors([]);
        setProductCounts({});
        setLoading(false);
        return;
      }

      setVendors(vendorResult.data);
      setProductCounts(productCountResult.data);
      setSuccessMessage(createdStatus === "created" ? "Vendor created successfully." : "");
      setLoading(false);
    };

    void loadVendors();

    return () => {
      isMounted = false;
    };
  }, [createdStatus]);

  const activeCount = useMemo(
    () => vendors.filter((vendor) => vendor.status === "active").length,
    [vendors],
  );
  const pendingCount = useMemo(
    () => vendors.filter((vendor) => vendor.status === "pending").length,
    [vendors],
  );
  const suspendedCount = useMemo(
    () => vendors.filter((vendor) => vendor.status === "suspended").length,
    [vendors],
  );
  const assignedProductsCount = useMemo(
    () => Object.values(productCounts).reduce((sum, count) => sum + count, 0),
    [productCounts],
  );
  const filteredVendors = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return vendors.filter((vendor) => {
      const matchesStatus = statusFilter === "all" || vendor.status === statusFilter;
      const matchesSearch =
        query.length === 0 ||
        vendor.name.toLowerCase().includes(query) ||
        vendor.slug.toLowerCase().includes(query) ||
        (vendor.contact_email ?? "").toLowerCase().includes(query) ||
        (vendor.contact_phone ?? "").toLowerCase().includes(query);

      return matchesStatus && matchesSearch;
    });
  }, [vendors, searchQuery, statusFilter]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
        Loading vendors...
      </div>
    );
  }

  if (!userEmail) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Admin Vendors</h1>
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
        <h1 className="text-2xl font-semibold text-slate-900">Admin Vendors</h1>
        <p className="mt-3 text-sm text-slate-500">You do not have admin access</p>
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-7xl">
      <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#615FFF]">Admin Dashboard</p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Vendors</h1>
          <p className="max-w-2xl text-sm text-slate-500">
            Manage vendor records, onboarding status, and product ownership for multivendor operations.
          </p>
        </div>

        <Link
          href="/admin/vendors/new"
          className="inline-flex items-center justify-center rounded-xl bg-[#615FFF] px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          Add Vendor
        </Link>
      </div>

      {errorMessage ? (
        <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-600">
          {errorMessage}
        </div>
      ) : null}

      {successMessage ? (
        <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-700">
          {successMessage}
        </div>
      ) : null}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Total Vendors</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{vendors.length}</p>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.16em] text-emerald-500">Active</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-700">{activeCount}</p>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.16em] text-amber-500">Pending</p>
          <p className="mt-2 text-2xl font-semibold text-amber-700">{pendingCount}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-100 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Assigned Products</p>
          <p className="mt-2 text-2xl font-semibold text-slate-700">{assignedProductsCount}</p>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex-1">
            <label htmlFor="vendor-search" className="sr-only">
              Search vendors
            </label>
            <input
              id="vendor-search"
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by vendor name, slug, email, or phone"
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition-colors focus:border-[#615FFF]"
            />
          </div>

          <div className="w-full lg:w-56">
            <label htmlFor="vendor-status-filter" className="sr-only">
              Filter vendors by status
            </label>
            <select
              id="vendor-status-filter"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as "all" | VendorStatus)}
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none transition-colors focus:border-[#615FFF]"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setStatusFilter("all");
            }}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition-colors hover:border-[#615FFF]/40 hover:text-slate-900"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#615FFF]">Directory</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-900">Vendor list</h2>
          </div>
          <p className="text-sm text-slate-500">{suspendedCount} suspended</p>
        </div>

        {vendors.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center">
            <h3 className="text-lg font-semibold text-slate-900">No vendors yet</h3>
            <p className="mt-2 text-sm text-slate-500">
              Create your first vendor to start assigning product ownership in the catalog.
            </p>
            <Link
              href="/admin/vendors/new"
              className="mt-5 inline-flex items-center justify-center rounded-xl bg-[#615FFF] px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              Add Vendor
            </Link>
          </div>
        ) : filteredVendors.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center">
            <h3 className="text-lg font-semibold text-slate-900">No matching vendors found</h3>
            <p className="mt-2 text-sm text-slate-500">
              Try a different search term or change the status filter.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredVendors.map((vendor) => (
              <article
                key={vendor.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 transition-colors hover:border-slate-300"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold text-slate-900">{vendor.name}</p>
                      <StatusBadge status={vendor.status} />
                    </div>
                    <p className="mt-1 truncate text-xs text-slate-500">{vendor.slug}</p>
                    <div className="mt-3 grid gap-2 text-xs text-slate-500 sm:grid-cols-2 lg:grid-cols-3">
                      <p>{vendor.contact_email ?? "No email yet"}</p>
                      <p>{vendor.contact_phone ?? "No phone yet"}</p>
                      <p>{productCounts[vendor.id] ?? 0} assigned product(s)</p>
                    </div>
                  </div>

                  <Link
                    href={`/admin/vendors/${vendor.id}/edit`}
                    className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-[#615FFF]/40 hover:text-slate-900"
                  >
                    Edit Vendor
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
