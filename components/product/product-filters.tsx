"use client";

import { useState } from "react";

import type { ProductCategoryOption, ProductVendorOption } from "@/types/product-db";

const MOQ_OPTIONS = [
  { label: "1 - 10 pcs", value: "1" },
  { label: "11 - 30 pcs", value: "11" },
  { label: "31 - 50 pcs", value: "31" },
  { label: "50+ pcs", value: "50" },
];

interface ProductFiltersProps {
  minPriceLimit: number;
  maxPriceLimit: number;
  minPrice: string;
  maxPrice: string;
  selectedCategory: string;
  selectedVendor: string;
  selectedMoq: string;
  categories: ProductCategoryOption[];
  vendors: ProductVendorOption[];
  onMinPriceChange: (value: string) => void;
  onMaxPriceChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onVendorChange: (value: string) => void;
  onMoqChange: (value: string) => void;
}

function SectionHeader({
  title,
  isOpen,
  onToggle,
}: {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center justify-between text-left text-sm font-semibold text-slate-900"
    >
      <span>{title}</span>
      <span className="text-base leading-none text-slate-400">{isOpen ? "-" : "+"}</span>
    </button>
  );
}

function RadioFilterSection({
  title,
  options,
  selectedValue,
  onChange,
  defaultOpen = false,
}: {
  title: string;
  options: Array<{ label: string; value: string }>;
  selectedValue: string;
  onChange: (value: string) => void;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [showAll, setShowAll] = useState(false);
  const hasMoreThanFour = options.length > 4;
  const visibleOptions = showAll ? options : options.slice(0, 4);

  return (
    <div className="border-b border-slate-200 pb-4 last:border-b-0 last:pb-0">
      <SectionHeader title={title} isOpen={isOpen} onToggle={() => setIsOpen((prev) => !prev)} />

      {isOpen ? (
        <div className="mt-3 space-y-2.5">
          {visibleOptions.map((option) => (
            <label key={option.value} className="flex items-center gap-3 text-sm text-slate-600">
              <input
                type="radio"
                name={`filter-${title}`}
                checked={selectedValue === option.value}
                onChange={() => onChange(option.value)}
                className="h-4 w-4 border-slate-300 text-[#615FFF] focus:ring-[#615FFF]/20"
              />
              <span>{option.label}</span>
            </label>
          ))}

          {selectedValue ? (
            <button
              type="button"
              onClick={() => onChange("")}
              className="pt-1 text-sm font-medium text-[#615FFF] transition-colors hover:text-[#5552e6]"
            >
              Clear
            </button>
          ) : null}

          {hasMoreThanFour ? (
            <button
              type="button"
              onClick={() => setShowAll((prev) => !prev)}
              className="pt-1 text-sm font-medium text-[#615FFF] transition-colors hover:text-[#5552e6]"
            >
              {showAll ? "Show Less" : "Show More"}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function PriceSection({
  minPriceLimit,
  maxPriceLimit,
  minPrice,
  maxPrice,
  onMinPriceChange,
  onMaxPriceChange,
}: Pick<
  ProductFiltersProps,
  "minPriceLimit" | "maxPriceLimit" | "minPrice" | "maxPrice" | "onMinPriceChange" | "onMaxPriceChange"
>) {
  const [isOpen, setIsOpen] = useState(true);
  const parsedMin = Number(minPrice);
  const parsedMax = Number(maxPrice);
  const rawMin = Number.isFinite(parsedMin) && minPrice.trim() ? parsedMin : minPriceLimit;
  const rawMax = Number.isFinite(parsedMax) && maxPrice.trim() ? parsedMax : maxPriceLimit;
  const safeMin = Math.min(Math.max(rawMin, minPriceLimit), maxPriceLimit);
  const safeMax = Math.max(Math.min(rawMax, maxPriceLimit), safeMin);
  const displayMinValue = minPrice.trim() ? minPrice : String(minPriceLimit);
  const displayMaxValue = maxPrice.trim() ? maxPrice : String(maxPriceLimit);
  const range = Math.max(maxPriceLimit - minPriceLimit, 1);
  const leftPercent = ((safeMin - minPriceLimit) / range) * 100;
  const rightPercent = ((safeMax - minPriceLimit) / range) * 100;

  return (
    <div className="border-b border-slate-200 pb-4">
      <SectionHeader title="Price" isOpen={isOpen} onToggle={() => setIsOpen((prev) => !prev)} />

      {isOpen ? (
        <div className="mt-3 space-y-4">
          <div className="relative pt-2">
            <div className="h-1.5 rounded-full bg-slate-100" />
            <div
              className="absolute top-2 h-1.5 rounded-full bg-[#615FFF]"
              style={{
                left: `${leftPercent}%`,
                width: `${Math.max(rightPercent - leftPercent, 0)}%`,
              }}
            />

            <input
              type="range"
              min={minPriceLimit}
              max={maxPriceLimit}
              value={safeMin}
              onChange={(event) => onMinPriceChange(event.target.value)}
              className="pointer-events-none absolute left-0 top-0 h-5 w-full appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-[#615FFF] [&::-webkit-slider-thumb]:shadow-sm"
            />
            <input
              type="range"
              min={minPriceLimit}
              max={maxPriceLimit}
              value={safeMax}
              onChange={(event) => onMaxPriceChange(event.target.value)}
              className="pointer-events-none absolute left-0 top-0 h-5 w-full appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-[#615FFF] [&::-webkit-slider-thumb]:shadow-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1 text-xs text-slate-500">
              <span>Min</span>
              <input
                type="number"
                min={minPriceLimit}
                max={safeMax}
                value={displayMinValue}
                onChange={(event) => onMinPriceChange(event.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none transition-colors focus:border-[#615FFF]/50"
              />
            </label>
            <label className="space-y-1 text-xs text-slate-500">
              <span>Max</span>
              <input
                type="number"
                min={safeMin}
                max={maxPriceLimit}
                value={displayMaxValue}
                onChange={(event) => onMaxPriceChange(event.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none transition-colors focus:border-[#615FFF]/50"
              />
            </label>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function ProductFilters({
  categories,
  vendors,
  selectedCategory,
  selectedVendor,
  selectedMoq,
  onCategoryChange,
  onVendorChange,
  onMoqChange,
  ...priceProps
}: ProductFiltersProps) {
  const categoryOptions = categories
    .filter((category) => !category.parent_id)
    .map((category) => ({
      label: category.name,
      value: category.slug ?? category.id,
    }));
  const vendorOptions = vendors.map((vendor) => ({
    label: vendor.name,
    value: vendor.id,
  }));

  return (
    <aside className="bg-white">
      <div className="border-b border-slate-200 pr-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">Filters</h2>
      </div>

      <div className="space-y-4 pr-4 py-4">
        <PriceSection {...priceProps} />

        <RadioFilterSection
          title="Brands"
          options={vendorOptions}
          selectedValue={selectedVendor}
          onChange={onVendorChange}
          defaultOpen
        />

        <RadioFilterSection
          title="MOQ"
          options={MOQ_OPTIONS}
          selectedValue={selectedMoq}
          onChange={onMoqChange}
          defaultOpen
        />

        <RadioFilterSection
          title="Category"
          options={categoryOptions}
          selectedValue={selectedCategory}
          onChange={onCategoryChange}
          defaultOpen={false}
        />
      </div>
    </aside>
  );
}
