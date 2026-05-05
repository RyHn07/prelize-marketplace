"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import ProductFilters from "@/components/product/product-filters";
import ProductGrid from "@/components/product/product-grid";
import ProductToolbar from "@/components/product/product-toolbar";
import type { Product } from "@/types/product";
import type { ProductCategoryOption, ProductVendorOption } from "@/types/product-db";
import type { ProductBrowseSort } from "@/lib/products/queries";

interface ProductCatalogProps {
  products: Product[];
  totalCount: number;
  availableMinPrice: number;
  availableMaxPrice: number;
  currentFilters: {
    search: string;
    category: string;
    min: string;
    max: string;
    moq: string;
    vendor: string;
    sort: ProductBrowseSort;
    page: string;
    limit: string;
  };
  categories: ProductCategoryOption[];
  vendors: ProductVendorOption[];
}

function toParams(filters: ProductCatalogProps["currentFilters"]) {
  const params = new URLSearchParams();

  if (filters.search.trim()) params.set("search", filters.search.trim());
  if (filters.category.trim()) params.set("category", filters.category.trim());
  if (filters.min.trim()) params.set("min", filters.min.trim());
  if (filters.max.trim()) params.set("max", filters.max.trim());
  if (filters.moq.trim()) params.set("moq", filters.moq.trim());
  if (filters.vendor.trim()) params.set("vendor", filters.vendor.trim());
  if (filters.sort !== "newest") params.set("sort", filters.sort);
  if (filters.page !== "1") params.set("page", filters.page);
  if (filters.limit !== "12") params.set("limit", filters.limit);

  return params;
}

export default function ProductCatalog({
  products,
  totalCount,
  availableMinPrice,
  availableMaxPrice,
  currentFilters,
  categories,
  vendors,
}: ProductCatalogProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [filters, setFilters] = useState(currentFilters);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  useEffect(() => {
    setFilters(currentFilters);
  }, [currentFilters]);

  const minPriceLimit = availableMinPrice;
  const maxPriceLimit = availableMaxPrice;
  const currentPage = Math.max(1, Number(filters.page) || 1);
  const limit = Math.max(1, Number(filters.limit) || 12);
  const totalPages = Math.max(1, Math.ceil(totalCount / limit));
  const showingFrom = totalCount === 0 ? 0 : (currentPage - 1) * limit + 1;
  const showingTo = totalCount === 0 ? 0 : Math.min(currentPage * limit, totalCount);

  const visiblePages = useMemo(
    () =>
      Array.from({ length: totalPages }, (_, index) => index + 1).slice(
        Math.max(0, currentPage - 3),
        Math.max(0, currentPage - 3) + 5,
      ),
    [currentPage, totalPages],
  );

  const syncFilters = (nextFilters: ProductCatalogProps["currentFilters"]) => {
    setFilters(nextFilters);
    const params = toParams(nextFilters);
    router.push(params.toString() ? `${pathname}?${params.toString()}` : pathname);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[270px_minmax(0,1fr)] lg:items-start">
      <div className="space-y-3">
        <button className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 lg:hidden">
          Filters
        </button>

        <div className="hidden lg:block">
          <ProductFilters
            minPriceLimit={minPriceLimit}
            maxPriceLimit={maxPriceLimit}
            minPrice={filters.min}
            maxPrice={filters.max}
            selectedCategory={filters.category}
            selectedVendor={filters.vendor}
            selectedMoq={filters.moq}
            categories={categories}
            vendors={vendors}
            onMinPriceChange={(value) => syncFilters({ ...filters, min: value, page: "1" })}
            onMaxPriceChange={(value) => syncFilters({ ...filters, max: value, page: "1" })}
            onCategoryChange={(value) => syncFilters({ ...filters, category: value, page: "1" })}
            onVendorChange={(value) => syncFilters({ ...filters, vendor: value, page: "1" })}
            onMoqChange={(value) => syncFilters({ ...filters, moq: value, page: "1" })}
          />
        </div>
      </div>

      <div className="space-y-4">
        <ProductToolbar
          totalProducts={totalCount}
          totalResultsText={`Showing ${showingFrom}-${showingTo} of ${totalCount} products`}
          sortValue={
            filters.sort === "price_low_high"
              ? "price-low"
              : filters.sort === "price_high_low"
                ? "price-high"
                : "default"
          }
          onSortChange={(value) => {
            const nextSort: ProductBrowseSort =
              value === "price-low" ? "price_low_high" : value === "price-high" ? "price_high_low" : "newest";
            syncFilters({ ...filters, sort: nextSort, page: "1" });
          }}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
        <ProductGrid products={products} viewMode={viewMode} />

        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => syncFilters({ ...filters, page: String(Math.max(currentPage - 1, 1)) })}
            disabled={currentPage === 1}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </button>

          {visiblePages.map((page) => (
            <button
              key={page}
              type="button"
              onClick={() => syncFilters({ ...filters, page: String(page) })}
              className={
                page === currentPage
                  ? "rounded-lg bg-[#615FFF] px-3 py-2 text-sm font-semibold text-white"
                  : "rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-700"
              }
            >
              {page}
            </button>
          ))}

          <button
            type="button"
            onClick={() => syncFilters({ ...filters, page: String(Math.min(currentPage + 1, totalPages)) })}
            disabled={currentPage === totalPages}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
