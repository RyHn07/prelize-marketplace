"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import AdminEmptyState from "@/components/admin/admin-empty-state";
import { getCategoryProductCounts, getAdminCategories, type AdminCategoryRow } from "@/lib/categories/queries";
import { getVendorWorkspaceAccessState } from "@/lib/marketplace-access";
import { getSupabaseClient } from "@/lib/supabase-client";

type CategoryFilterMode = "all" | "main" | "sub";

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
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 text-slate-400">
      <path
        d="M17.5 17.5l-3.625-3.625m1.958-4.042a5.667 5.667 0 11-11.333 0 5.667 5.667 0 0111.333 0z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "Unknown";
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

export default function VendorCategoriesPage() {
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [hasVendorWorkspaceAccess, setHasVendorWorkspaceAccess] = useState(false);
  const [categories, setCategories] = useState<AdminCategoryRow[]>([]);
  const [productCounts, setProductCounts] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<CategoryFilterMode>("all");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;
    const supabase = getSupabaseClient();

    const loadPage = async () => {
      const access = await getVendorWorkspaceAccessState(supabase);

      if (!isMounted) {
        return;
      }

      setUserEmail(access.userEmail);
      setHasVendorWorkspaceAccess(access.hasVendorWorkspaceAccess);

      if (!access.userEmail || !access.hasVendorWorkspaceAccess) {
        setLoading(false);
        return;
      }

      const [categoryResult, countResult] = await Promise.all([getAdminCategories(), getCategoryProductCounts()]);

      if (!isMounted) {
        return;
      }

      if (categoryResult.error) {
        setErrorMessage(categoryResult.error.message);
        setCategories([]);
        setProductCounts({});
        setLoading(false);
        return;
      }

      if (countResult.error) {
        setErrorMessage(countResult.error.message);
      }

      setCategories(categoryResult.data);
      setProductCounts(countResult.data);
      setLoading(false);
    };

    void loadPage();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredCategories = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const categoryNameById = new Map(categories.map((category) => [category.id, category.name]));

    return categories.filter((category) => {
      const matchesType =
        filterMode === "all" ||
        (filterMode === "main" ? !category.parent_id : Boolean(category.parent_id));

      const matchesSearch =
        query.length === 0 ||
        category.name.toLowerCase().includes(query) ||
        category.slug.toLowerCase().includes(query) ||
        (category.parent_id ? (categoryNameById.get(category.parent_id) ?? "").toLowerCase().includes(query) : false);

      return matchesType && matchesSearch;
    });
  }, [categories, filterMode, searchQuery]);

  const categoryNameById = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories],
  );

  const orderedCategories = useMemo(() => {
    const topLevel = categories
      .filter((category) => !category.parent_id)
      .sort((left, right) => left.name.localeCompare(right.name));

    return topLevel.flatMap((category) => [
      category,
      ...categories
        .filter((child) => child.parent_id === category.id)
        .sort((left, right) => left.name.localeCompare(right.name)),
    ]);
  }, [categories]);

  const visibleOrderedCategories = useMemo(
    () => orderedCategories.filter((category) => filteredCategories.some((entry) => entry.id === category.id)),
    [filteredCategories, orderedCategories],
  );

  const handleClearFilters = () => {
    setSearchQuery("");
    setFilterMode("all");
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
        Loading categories...
      </div>
    );
  }

  if (!userEmail) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Vendor Categories</h1>
        <p className="mt-3 text-sm text-slate-500">Please login to access vendor categories.</p>
        <Link
          href="/login"
          className="mt-6 inline-flex items-center justify-center rounded-xl bg-[#615FFF] px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          Go to Login
        </Link>
      </div>
    );
  }

  if (!hasVendorWorkspaceAccess) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Vendor Categories</h1>
        <p className="mt-3 text-sm text-slate-500">No vendor account found.</p>
      </div>
    );
  }

  return (
    <section className="w-full space-y-6">
      {errorMessage ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-600">
          {errorMessage}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="flex flex-col gap-4 border-b border-gray-100 px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-base font-medium text-gray-800">Category List</h3>
            <p className="mt-1 text-sm text-gray-500">
              Browse marketplace categories and subcategories available for product assignment.
            </p>
          </div>

          <div className="rounded-lg bg-[#615FFF]/8 px-3 py-2 text-sm font-medium text-[#615FFF]">
            {visibleOrderedCategories.length} visible
          </div>
        </div>

        <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full max-w-[380px]">
            <label htmlFor="category-search" className="sr-only">
              Search categories
            </label>
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
              <SearchIcon />
            </span>
            <input
              id="category-search"
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by category name or slug"
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent py-2.5 pl-12 pr-4 text-sm text-gray-800 shadow-sm placeholder:text-gray-400 outline-none transition-colors focus:border-[#615FFF]/40 focus:ring-4 focus:ring-[#615FFF]/10"
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="w-full sm:w-56">
              <label htmlFor="category-filter" className="sr-only">
                Filter by category type
              </label>
              <select
                id="category-filter"
                value={filterMode}
                onChange={(event) => setFilterMode(event.target.value as CategoryFilterMode)}
                className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-800 outline-none transition-colors focus:border-[#615FFF]/40 focus:ring-4 focus:ring-[#615FFF]/10"
              >
                <option value="all">All Categories</option>
                <option value="main">Main Categories</option>
                <option value="sub">Subcategories</option>
              </select>
            </div>

            <button
              type="button"
              onClick={handleClearFilters}
              className="inline-flex h-11 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-slate-700 transition-colors hover:border-[#615FFF]/40 hover:text-slate-900"
            >
              Clear
            </button>
          </div>
        </div>

        {categories.length === 0 ? (
          <div className="p-6">
            <AdminEmptyState title="No categories yet" description="Marketplace categories will appear here after an admin creates them." />
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="p-6">
            <AdminEmptyState title="No matching categories" description="Try another search term." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="border-b border-gray-100">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 sm:px-6">
                    <div className="flex items-center gap-2">
                      <span>Name</span>
                      <SortIcon />
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Image</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Products</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Slug</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Created At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visibleOrderedCategories.map((category) => {
                  const linkedProductCount = productCounts[category.id] ?? 0;
                  const parentName = category.parent_id ? categoryNameById.get(category.parent_id) ?? "Unknown parent" : null;

                  return (
                    <tr key={category.id}>
                      <td className="px-5 py-5 text-left sm:px-6">
                        <div className={`flex min-w-0 items-center gap-3 ${parentName ? "pl-8" : ""}`}>
                          <span
                            className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold ${
                              parentName
                                ? "border-slate-200 bg-slate-50 text-slate-400"
                                : "border-[#465FFF]/20 bg-[#465FFF]/5 text-[#465FFF]"
                            }`}
                          >
                            {parentName ? "S" : "M"}
                          </span>
                          <div className={`min-w-0 ${parentName ? "border-l border-slate-200 pl-4" : ""}`}>
                            <p className="truncate text-sm font-medium text-slate-900">{category.name}</p>
                            <p className="truncate text-xs text-slate-500">{parentName ?? "Main category"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-5">
                        {category.image_url ? (
                          <div
                            role="img"
                            aria-label={category.name}
                            className="h-10 w-10 rounded-full border border-slate-200 bg-cover bg-center"
                            style={{ backgroundImage: `url("${category.image_url}")` }}
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-dashed border-slate-200 text-xs text-slate-400">
                            N/A
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-5 text-sm font-medium text-slate-700">
                        {linkedProductCount > 0 ? `${linkedProductCount} product${linkedProductCount === 1 ? "" : "s"}` : "-"}
                      </td>
                      <td className="px-4 py-5">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                            parentName
                              ? "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200"
                              : "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200"
                          }`}
                        >
                          {parentName ? "Subcategory" : "Main"}
                        </span>
                      </td>
                      <td className="px-4 py-5 text-sm text-slate-600">{category.slug}</td>
                      <td className="px-4 py-5 text-sm text-slate-600">{formatDate(category.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
