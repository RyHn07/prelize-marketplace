"use client";

import { useMemo, useState } from "react";

import ProductGrid from "@/components/product/product-grid";
import type { Product } from "@/types/product";
import type { ProductCategoryOption } from "@/types/product-db";

type CategoryBrowseContentProps = {
  category: ProductCategoryOption;
  subcategories: ProductCategoryOption[];
  products: Product[];
};

function formatCategoryName(name: string) {
  return name.trim().length > 0 ? name : "Category";
}

export default function CategoryBrowseContent({
  category,
  subcategories,
  products,
}: CategoryBrowseContentProps) {
  const minPriceLimit = products.length > 0 ? Math.min(...products.map((product) => product.priceFrom)) : 0;
  const maxPriceLimit = products.length > 0 ? Math.max(...products.map((product) => product.priceFrom)) : 0;

  const [selectedSubcategory, setSelectedSubcategory] = useState<string>("all");
  const [minPrice, setMinPrice] = useState<string>(minPriceLimit > 0 ? String(minPriceLimit) : "");
  const [maxPrice, setMaxPrice] = useState<string>(maxPriceLimit > 0 ? String(maxPriceLimit) : "");
  const [sortValue, setSortValue] = useState<"newest" | "price-low" | "price-high">("newest");

  const filteredProducts = useMemo(() => {
    const min = Number(minPrice);
    const max = Number(maxPrice);
    const hasMin = Number.isFinite(min) && minPrice.trim().length > 0;
    const hasMax = Number.isFinite(max) && maxPrice.trim().length > 0;

    const nextProducts = products.filter((product) => {
      const matchesSubcategory =
        selectedSubcategory === "all" || product.category === selectedSubcategory;
      const matchesMin = !hasMin || product.priceFrom >= min;
      const matchesMax = !hasMax || product.priceFrom <= max;

      return matchesSubcategory && matchesMin && matchesMax;
    });

    if (sortValue === "price-low") {
      nextProducts.sort((left, right) => left.priceFrom - right.priceFrom);
    } else if (sortValue === "price-high") {
      nextProducts.sort((left, right) => right.priceFrom - left.priceFrom);
    }

    return nextProducts;
  }, [maxPrice, minPrice, products, selectedSubcategory, sortValue]);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#615FFF]">Category Browse</p>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{formatCategoryName(category.name)}</h1>
        <p className="text-sm text-slate-500">
          Browse published products from this category and any connected subcategories.
        </p>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr_0.85fr_0.8fr]">
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">Subcategories</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedSubcategory("all")}
                className={`rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                  selectedSubcategory === "all"
                    ? "bg-[#615FFF] text-white"
                    : "border border-slate-200 bg-white text-slate-700 hover:border-[#615FFF]/30"
                }`}
              >
                All
              </button>
              {subcategories.map((subcategory) => (
                <button
                  key={subcategory.id}
                  type="button"
                  onClick={() => setSelectedSubcategory(subcategory.slug ?? "")}
                  className={`rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                    selectedSubcategory === (subcategory.slug ?? "")
                      ? "bg-[#615FFF] text-white"
                      : "border border-slate-200 bg-white text-slate-700 hover:border-[#615FFF]/30"
                  }`}
                >
                  {subcategory.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="category-min-price" className="mb-2 block text-sm font-medium text-slate-700">
              Min Price
            </label>
            <input
              id="category-min-price"
              type="number"
              min="0"
              step="0.01"
              value={minPrice}
              onChange={(event) => setMinPrice(event.target.value)}
              placeholder="0"
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition-colors focus:border-[#615FFF]"
            />
          </div>

          <div>
            <label htmlFor="category-max-price" className="mb-2 block text-sm font-medium text-slate-700">
              Max Price
            </label>
            <input
              id="category-max-price"
              type="number"
              min="0"
              step="0.01"
              value={maxPrice}
              onChange={(event) => setMaxPrice(event.target.value)}
              placeholder="0"
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition-colors focus:border-[#615FFF]"
            />
          </div>

          <div>
            <label htmlFor="category-sort" className="mb-2 block text-sm font-medium text-slate-700">
              Sort By
            </label>
            <select
              id="category-sort"
              value={sortValue}
              onChange={(event) => setSortValue(event.target.value as "newest" | "price-low" | "price-high")}
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition-colors focus:border-[#615FFF]"
            >
              <option value="newest">Newest</option>
              <option value="price-low">Price Low to High</option>
              <option value="price-high">Price High to Low</option>
            </select>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-slate-500">{filteredProducts.length} published product(s)</p>
        </div>
        <ProductGrid products={filteredProducts} viewMode="grid" />
      </section>
    </div>
  );
}
