"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import AdminEmptyState from "@/components/admin/admin-empty-state";
import { getAdminAccessState } from "@/lib/admin-access";
import { getSupabaseClient } from "@/lib/supabase-client";
import { updateVendorApprovalStatus } from "@/lib/vendor-onboarding";
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
  const label =
    status === "active"
      ? "Approved"
      : status === "suspended"
        ? "Rejected"
        : "Pending";

  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(status)}`}>{label}</span>;
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

function formatCreatedAt(value: string | null | undefined) {
  if (!value) {
    return "Not available";
  }

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
  const [updatingVendorId, setUpdatingVendorId] = useState<string | null>(null);
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

  const suspendedCount = useMemo(
    () => vendors.filter((vendor) => vendor.status === "suspended").length,
    [vendors],
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

  const handleUpdateVendorStatus = async (vendorId: string, status: "active" | "suspended") => {
    setUpdatingVendorId(vendorId);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await updateVendorApprovalStatus(vendorId, status);
      const refreshedVendors = await getVendors();

      if (refreshedVendors.error) {
        throw refreshedVendors.error;
      }

      setVendors(refreshedVendors.data);
      setSuccessMessage(status === "active" ? "Vendor approved." : "Vendor rejected.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to update vendor status.");
    } finally {
      setUpdatingVendorId(null);
    }
  };

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
    <section className="w-full space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white">
        <div className="flex flex-col gap-4 border-b border-gray-100 px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-base font-medium text-gray-800">Vendors List</h3>
            <p className="mt-1 text-sm text-gray-500">
              Manage vendor records, onboarding status, and product ownership from one workspace.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-lg bg-[#615FFF]/8 px-3 py-2 text-sm font-medium text-[#615FFF]">
              {filteredVendors.length} visible
            </div>
            <Link
              href="/admin/vendors/new"
              className="inline-flex items-center justify-center rounded-lg bg-[#615FFF] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              Add Vendor
            </Link>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full max-w-[380px]">
            <label htmlFor="vendor-search" className="sr-only">
              Search vendors
            </label>
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
              <SearchIcon />
            </span>
            <input
              id="vendor-search"
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by vendor name, slug, email, or phone"
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent py-2.5 pl-12 pr-4 text-sm text-gray-800 shadow-sm placeholder:text-gray-400 outline-none transition-colors focus:border-[#615FFF]/40 focus:ring-4 focus:ring-[#615FFF]/10"
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="w-full sm:w-56">
              <label htmlFor="vendor-status-filter" className="sr-only">
                Filter vendors by status
              </label>
              <select
                id="vendor-status-filter"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as "all" | VendorStatus)}
                className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-800 outline-none transition-colors focus:border-[#615FFF]/40 focus:ring-4 focus:ring-[#615FFF]/10"
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
              className="inline-flex h-11 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-slate-700 transition-colors hover:border-[#615FFF]/40 hover:text-slate-900"
            >
              Clear
            </button>
          </div>
        </div>

        {successMessage ? (
          <div className="border-b border-emerald-100 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-700 sm:px-6">
            {successMessage}
          </div>
        ) : null}

        {errorMessage ? (
          <div className="border-b border-rose-100 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-600 sm:px-6">
            {errorMessage}
          </div>
        ) : null}

        {vendors.length === 0 ? (
          <div className="p-6">
            <AdminEmptyState
              title="No vendors yet"
              description="Create your first vendor to start assigning product ownership in the catalog."
              action={
                <Link
                  href="/admin/vendors/new"
                  className="inline-flex items-center justify-center rounded-xl bg-[#615FFF] px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                >
                  Add Vendor
                </Link>
              }
            />
          </div>
        ) : filteredVendors.length === 0 ? (
          <div className="p-6">
            <AdminEmptyState
              title="No matching vendors found"
              description="Try a different search term or change the status filter."
            />
          </div>
        ) : (
          <div className="max-w-full overflow-x-auto">
            <div className="min-w-[1100px]">
              <table className="min-w-full">
                <thead className="border-b border-gray-100">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 sm:px-6">
                      <div className="flex items-center gap-2">
                        <span>Vendor</span>
                        <SortIcon />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                      <div className="flex items-center gap-2">
                        <span>Contact</span>
                        <SortIcon />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Assigned Products</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Created At</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredVendors.map((vendor) => (
                    <tr key={vendor.id}>
                      <td className="px-5 py-5 text-left sm:px-6">
                        <div className="flex min-w-0 items-center gap-4">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-gray-200 bg-slate-50">
                            {vendor.logo_url ? (
                              <div
                                role="img"
                                aria-label={vendor.name}
                                className="h-full w-full bg-cover bg-center"
                                style={{ backgroundImage: `url("${vendor.logo_url}")` }}
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-slate-500">
                                {vendor.name.slice(0, 2).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-gray-800">{vendor.name}</p>
                            <span className="mt-1 block truncate text-xs text-gray-500">{vendor.slug}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-5 text-sm text-gray-500">
                        <div className="space-y-1">
                          <p>{vendor.contact_email ?? "No email yet"}</p>
                          <p>{vendor.contact_phone ?? "No phone yet"}</p>
                        </div>
                      </td>
                      <td className="px-4 py-5 text-sm font-semibold text-[#615FFF]">{productCounts[vendor.id] ?? 0}</td>
                      <td className="px-4 py-5">
                        <StatusBadge status={vendor.status} />
                      </td>
                      <td className="px-4 py-5 text-sm text-gray-500">{formatCreatedAt(vendor.created_at)}</td>
                      <td className="px-4 py-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/admin/vendors/${vendor.id}/edit`}
                            className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-[#615FFF]/40 hover:text-slate-900"
                          >
                            Edit
                          </Link>
                          <button
                            type="button"
                            disabled={updatingVendorId === vendor.id || vendor.status === "active"}
                            onClick={() => void handleUpdateVendorStatus(vendor.id, "active")}
                            className="inline-flex items-center justify-center rounded-lg bg-[#615FFF] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:bg-slate-300"
                          >
                            {updatingVendorId === vendor.id && vendor.status !== "suspended" ? "Saving..." : "Approve"}
                          </button>
                          <button
                            type="button"
                            disabled={updatingVendorId === vendor.id || vendor.status === "suspended"}
                            onClick={() => void handleUpdateVendorStatus(vendor.id, "suspended")}
                            className="inline-flex items-center justify-center rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-600 transition-colors hover:border-rose-300 hover:text-rose-700 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                          >
                            {updatingVendorId === vendor.id && vendor.status !== "active" ? "Saving..." : "Reject"}
                          </button>
                        </div>
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
