"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import ProductGrid from "@/components/product/product-grid";
import type { Product } from "@/types/product";
import type { ProductCategoryOption, ProductVendorOption } from "@/types/product-db";
import type { ProductBrowseSort } from "@/lib/products/queries";

type ProductBrowseShellProps = {
  title: string;
  description: string;
  products: Product[];
  categories: ProductCategoryOption[];
  vendors: ProductVendorOption[];
  currentFilters: {
    search: string;
    category: string;
    subcategory: string;
    min: string;
    max: string;
    moq: string;
    vendor: string;
    sort: ProductBrowseSort;
    page: string;
    limit: string;
  };
  totalCount: number;
  lockedCategory?: ProductCategoryOption | null;
  subcategories?: ProductCategoryOption[];
};

function toSearchParams(filters: ProductBrowseShellProps["currentFilters"]) {
  const params = new URLSearchParams();

  if (filters.search.trim()) params.set("search", filters.search.trim());
  if (filters.category.trim()) params.set("category", filters.category.trim());
  if (filters.subcategory.trim()) params.set("subcategory", filters.subcategory.trim());
  if (filters.min.trim()) params.set("min", filters.min.trim());
  if (filters.max.trim()) params.set("max", filters.max.trim());
  if (filters.moq.trim()) params.set("moq", filters.moq.trim());
  if (filters.vendor.trim()) params.set("vendor", filters.vendor.trim());
  if (filters.sort !== "newest") params.set("sort", filters.sort);
  if (filters.page.trim() && filters.page !== "1") params.set("page", filters.page.trim());
  if (filters.limit.trim() && filters.limit !== "12") params.set("limit", filters.limit.trim());

  return params;
}

export default function ProductBrowseShell({
  title,
  description,
  products,
  categories,
  vendors,
  currentFilters,
  totalCount,
  lockedCategory = null,
  subcategories = [],
}: ProductBrowseShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState(currentFilters);

  useEffect(() => {
    setFilters(currentFilters);
  }, [currentFilters]);

  const rootCategories = useMemo(
    () => categories.filter((category) => !category.parent_id).sort((left, right) => left.name.localeCompare(right.name)),
    [categories],
  );

  const visibleSubcategories = useMemo(() => {
    if (lockedCategory) {
      return subcategories;
    }

    if (!filters.category) {
      return [];
    }

    const selectedCategory = categories.find(
      (category) => category.id === filters.category || category.slug === filters.category,
    );

    if (!selectedCategory) {
      return [];
    }

    return categories
      .filter((category) => category.parent_id === selectedCategory.id)
      .sort((left, right) => left.name.localeCompare(right.name));
  }, [categories, filters.category, lockedCategory, subcategories]);

  const submitFilters = (nextFilters: ProductBrowseShellProps["currentFilters"]) => {
    const params = toSearchParams(nextFilters);
    const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.push(nextUrl);
  };

  const handleApply = () => {
    submitFilters({ ...filters, page: "1" });
  };

  const handleReset = () => {
    const resetFilters = {
      search: "",
      category: lockedCategory?.slug ?? "",
      subcategory: "",
      min: "",
      max: "",
      moq: "",
      vendor: "",
      sort: "newest" as ProductBrowseSort,
      page: "1",
      limit: currentFilters.limit || "12",
    };
    setFilters(resetFilters);
    submitFilters(resetFilters);
  };

  const currentPage = Math.max(1, Number(filters.page) || 1);
  const currentLimit = Math.max(1, Number(filters.limit) || 12);
  const totalPages = Math.max(1, Math.ceil(totalCount / currentLimit));
  const visiblePageNumbers = Array.from({ length: totalPages }, (_, index) => index + 1).slice(
    Math.max(0, currentPage - 3),
    Math.max(0, currentPage - 3) + 5,
  );

  const goToPage = (page: number) => {
    const nextFilters = { ...filters, page: String(page) };
    setFilters(nextFilters);
    submitFilters(nextFilters);
  };

  const updateLimit = (limit: string) => {
    const nextFilters = { ...filters, limit, page: "1" };
    setFilters(nextFilters);
    submitFilters(nextFilters);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#615FFF]">Browse Products</p>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{title}</h1>
        <p className="max-w-3xl text-sm text-slate-500">{description}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start">
        <aside className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="space-y-5">
            <div>
              <label htmlFor="catalog-search" className="mb-2 block text-sm font-medium text-slate-700">
                Search
              </label>
              <input
                id="catalog-search"
                type="search"
                value={filters.search}
                onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
                placeholder="Search products"
                className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition-colors focus:border-[#615FFF]"
              />
            </div>

            {!lockedCategory ? (
              <div>
                <label htmlFor="catalog-category" className="mb-2 block text-sm font-medium text-slate-700">
                  Category
                </label>
                <select
                  id="catalog-category"
                  value={filters.category}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      category: event.target.value,
                      subcategory: "",
                    }))
                  }
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition-colors focus:border-[#615FFF]"
                >
                  <option value="">All Categories</option>
                  {rootCategories.map((category) => (
                    <option key={category.id} value={category.slug ?? category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-[#615FFF]/25 bg-[#615FFF]/5 px-4 py-3 text-sm text-slate-600">
                Browsing inside <span className="font-semibold text-slate-900">{lockedCategory.name}</span>.
              </div>
            )}

            {visibleSubcategories.length > 0 ? (
              <div>
                <label htmlFor="catalog-subcategory" className="mb-2 block text-sm font-medium text-slate-700">
                  Subcategory
                </label>
                <select
                  id="catalog-subcategory"
                  value={filters.subcategory}
                  onChange={(event) => setFilters((current) => ({ ...current, subcategory: event.target.value }))}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition-colors focus:border-[#615FFF]"
                >
                  <option value="">All Subcategories</option>
                  {visibleSubcategories.map((subcategory) => (
                    <option key={subcategory.id} value={subcategory.slug ?? subcategory.id}>
                      {subcategory.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <div>
                <label htmlFor="catalog-min" className="mb-2 block text-sm font-medium text-slate-700">
                  Min Price
                </label>
                <input
                  id="catalog-min"
                  type="number"
                  min="0"
                  step="0.01"
                  value={filters.min}
                  onChange={(event) => setFilters((current) => ({ ...current, min: event.target.value }))}
                  placeholder="0"
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition-colors focus:border-[#615FFF]"
                />
              </div>

              <div>
                <label htmlFor="catalog-max" className="mb-2 block text-sm font-medium text-slate-700">
                  Max Price
                </label>
                <input
                  id="catalog-max"
                  type="number"
                  min="0"
                  step="0.01"
                  value={filters.max}
                  onChange={(event) => setFilters((current) => ({ ...current, max: event.target.value }))}
                  placeholder="0"
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition-colors focus:border-[#615FFF]"
                />
              </div>
            </div>

            <div>
              <label htmlFor="catalog-moq" className="mb-2 block text-sm font-medium text-slate-700">
                MOQ
              </label>
              <input
                id="catalog-moq"
                type="number"
                min="1"
                step="1"
                value={filters.moq}
                onChange={(event) => setFilters((current) => ({ ...current, moq: event.target.value }))}
                placeholder="Minimum MOQ"
                className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition-colors focus:border-[#615FFF]"
              />
            </div>

            {vendors.length > 0 ? (
              <div>
                <label htmlFor="catalog-vendor" className="mb-2 block text-sm font-medium text-slate-700">
                  Vendor
                </label>
                <select
                  id="catalog-vendor"
                  value={filters.vendor}
                  onChange={(event) => setFilters((current) => ({ ...current, vendor: event.target.value }))}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition-colors focus:border-[#615FFF]"
                >
                  <option value="">All Vendors</option>
                  {vendors.map((vendor) => (
                    <option key={vendor.id} value={vendor.id}>
                      {vendor.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleApply}
                className="inline-flex flex-1 items-center justify-center rounded-2xl bg-[#615FFF] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                Apply Filters
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:border-[#615FFF]/30 hover:text-slate-900"
              >
                Reset
              </button>
            </div>
          </div>
        </aside>

        <section className="space-y-4">
          <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              Showing {products.length} of {totalCount} active product{totalCount === 1 ? "" : "s"}
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:w-44">
                <label htmlFor="browse-limit" className="sr-only">
                  Items per page
                </label>
                <select
                  id="browse-limit"
                  value={filters.limit}
                  onChange={(event) => updateLimit(event.target.value)}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition-colors focus:border-[#615FFF]"
                >
                  <option value="12">12 per page</option>
                  <option value="24">24 per page</option>
                  <option value="36">36 per page</option>
                </select>
              </div>

              <div className="sm:w-64">
                <label htmlFor="browse-sort" className="sr-only">
                  Sort products
                </label>
                <select
                  id="browse-sort"
                  value={filters.sort}
                  onChange={(event) => {
                    const nextSort = event.target.value as ProductBrowseSort;
                    const nextFilters = { ...filters, sort: nextSort, page: "1" };
                    setFilters(nextFilters);
                    submitFilters(nextFilters);
                  }}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition-colors focus:border-[#615FFF]"
                >
                  <option value="newest">Newest</option>
                  <option value="price_low_high">Price: Low to High</option>
                  <option value="price_high_low">Price: High to Low</option>
                </select>
              </div>
            </div>
          </div>

          <ProductGrid products={products} viewMode="grid" />

          {totalPages > 1 ? (
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => goToPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-[#615FFF]/30 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Prev
              </button>

              {visiblePageNumbers.map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => goToPage(page)}
                  className={
                    page === currentPage
                      ? "rounded-xl bg-[#615FFF] px-3 py-2 text-sm font-semibold text-white"
                      : "rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-[#615FFF]/30 hover:text-slate-900"
                  }
                >
                  {page}
                </button>
              ))}

              <button
                type="button"
                onClick={() => goToPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-[#615FFF]/30 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
