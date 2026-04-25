"use client";

import { useMemo, useState } from "react";

import ProductFilters from "@/components/product/product-filters";
import ProductGrid from "@/components/product/product-grid";
import ProductToolbar from "@/components/product/product-toolbar";
import type { Product } from "@/types/product";

interface ProductCatalogProps {
  products: Product[];
}

const PRODUCTS_PER_PAGE = 12;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getPopularityScore(product: Product) {
  const seed = Number(product.id.replace(/\D/g, "")) || 1;
  const soldCounts = [2600, 1900, 3100, 980];
  return soldCounts[(seed - 1) % soldCounts.length];
}

export default function ProductCatalog({ products }: ProductCatalogProps) {
  const minPriceLimit = products.length > 0 ? Math.min(...products.map((product) => product.priceFrom)) : 0;
  const maxPriceLimit = products.length > 0 ? Math.max(...products.map((product) => product.priceFrom)) : 0;

  const [minPrice, setMinPrice] = useState(minPriceLimit);
  const [maxPrice, setMaxPrice] = useState(maxPriceLimit);
  const [sortValue, setSortValue] = useState("default");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [currentPage, setCurrentPage] = useState(1);

  const filteredProducts = useMemo(() => {
    const priceFilteredProducts = products.filter(
      (product) => product.priceFrom >= minPrice && product.priceFrom <= maxPrice,
    );

    const sortedProducts = [...priceFilteredProducts];

    if (sortValue === "popular") {
      sortedProducts.sort((a, b) => getPopularityScore(b) - getPopularityScore(a));
    }

    if (sortValue === "price-low") {
      sortedProducts.sort((a, b) => a.priceFrom - b.priceFrom);
    }

    if (sortValue === "price-high") {
      sortedProducts.sort((a, b) => b.priceFrom - a.priceFrom);
    }

    return sortedProducts;
  }, [maxPrice, minPrice, products, sortValue]);

  const handleMinPriceChange = (value: number) => {
    const nextValue = clamp(value, minPriceLimit, maxPrice);
    setMinPrice(nextValue);
    setCurrentPage(1);
  };

  const handleMaxPriceChange = (value: number) => {
    const nextValue = clamp(value, minPrice, maxPriceLimit);
    setMaxPrice(nextValue);
    setCurrentPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * PRODUCTS_PER_PAGE;
  const endIndex = startIndex + PRODUCTS_PER_PAGE;
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);
  const showingFrom = filteredProducts.length === 0 ? 0 : startIndex + 1;
  const showingTo = filteredProducts.length === 0 ? 0 : Math.min(endIndex, filteredProducts.length);

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
            minPrice={minPrice}
            maxPrice={maxPrice}
            onMinPriceChange={handleMinPriceChange}
            onMaxPriceChange={handleMaxPriceChange}
          />
        </div>
      </div>

      <div className="space-y-4">
        <ProductToolbar
          totalProducts={filteredProducts.length}
          totalResultsText={`Showing ${showingFrom}-${showingTo} of ${filteredProducts.length} products`}
          sortValue={sortValue}
          onSortChange={(value) => {
            setSortValue(value);
            setCurrentPage(1);
          }}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
        <ProductGrid products={paginatedProducts} viewMode={viewMode} />

        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
            disabled={safeCurrentPage === 1}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </button>

          {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
            <button
              key={page}
              type="button"
              onClick={() => setCurrentPage(page)}
              className={
                page === safeCurrentPage
                  ? "rounded-lg bg-[#615FFF] px-3 py-2 text-sm font-semibold text-white"
                  : "rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-700"
              }
            >
              {page}
            </button>
          ))}

          <button
            type="button"
            onClick={() => setCurrentPage((page) => Math.min(page + 1, totalPages))}
            disabled={safeCurrentPage === totalPages}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
