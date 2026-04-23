"use client";

import { useState } from "react";

const filterSections = [
  {
    title: "Brands",
    options: [
      "Prelize Select",
      "Guangzhou Source",
      "Shenzhen Factory",
      "Yiwu Direct",
      "Hangzhou Goods",
      "Ningbo Traders",
    ],
    defaultOpen: true,
  },
  {
    title: "MOQ",
    options: ["1 - 10 pcs", "11 - 30 pcs", "31 - 50 pcs", "50+ pcs"],
    defaultOpen: true,
  },
  {
    title: "Weight",
    options: ["Below 0.5 kg", "0.5 - 1 kg", "1 - 2 kg", "2 kg and above", "5 kg and above"],
    defaultOpen: true,
  },
  {
    title: "Shipping Type",
    options: ["Air Shipping", "Sea Shipping", "Express Sample", "Warehouse Pickup"],
    defaultOpen: false,
  },
  {
    title: "Delivery Time",
    options: ["7 - 15 days", "15 - 25 days", "25 - 35 days", "35+ days"],
    defaultOpen: false,
  },
  {
    title: "Category",
    options: ["Fashion", "Bags", "Shoes", "Beauty", "Electronics", "Home Decor"],
    defaultOpen: false,
  },
  {
    title: "Color / Finish",
    options: ["Black", "White", "Gold", "Matte", "Mixed Colors", "Silver"],
    defaultOpen: false,
  },
];

interface ProductFiltersProps {
  minPriceLimit: number;
  maxPriceLimit: number;
  minPrice: number;
  maxPrice: number;
  onMinPriceChange: (value: number) => void;
  onMaxPriceChange: (value: number) => void;
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

function FilterSection({
  title,
  options,
  defaultOpen = false,
}: {
  title: string;
  options: string[];
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
            <label key={option} className="flex items-center gap-3 text-sm text-slate-600">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-[#615FFF] focus:ring-[#615FFF]/20"
              />
              <span>{option}</span>
            </label>
          ))}

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
}: ProductFiltersProps) {
  const [isOpen, setIsOpen] = useState(true);

  const range = Math.max(maxPriceLimit - minPriceLimit, 1);
  const leftPercent = ((minPrice - minPriceLimit) / range) * 100;
  const rightPercent = ((maxPrice - minPriceLimit) / range) * 100;

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
              value={minPrice}
              onChange={(event) => onMinPriceChange(Number(event.target.value))}
              className="pointer-events-none absolute left-0 top-0 h-5 w-full appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-[#615FFF] [&::-webkit-slider-thumb]:shadow-sm"
            />
            <input
              type="range"
              min={minPriceLimit}
              max={maxPriceLimit}
              value={maxPrice}
              onChange={(event) => onMaxPriceChange(Number(event.target.value))}
              className="pointer-events-none absolute left-0 top-0 h-5 w-full appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-[#615FFF] [&::-webkit-slider-thumb]:shadow-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1 text-xs text-slate-500">
              <span>Min</span>
              <input
                type="number"
                min={minPriceLimit}
                max={maxPrice}
                value={minPrice}
                onChange={(event) => onMinPriceChange(Number(event.target.value || minPriceLimit))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none transition-colors focus:border-[#615FFF]/50"
              />
            </label>
            <label className="space-y-1 text-xs text-slate-500">
              <span>Max</span>
              <input
                type="number"
                min={minPrice}
                max={maxPriceLimit}
                value={maxPrice}
                onChange={(event) => onMaxPriceChange(Number(event.target.value || maxPriceLimit))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none transition-colors focus:border-[#615FFF]/50"
              />
            </label>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function ProductFilters(props: ProductFiltersProps) {
  return (
    <aside className="bg-white">
      <div className="border-b border-slate-200 pr-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">Filters</h2>
      </div>

      <div className="space-y-4 pr-4 py-4">
        <PriceSection {...props} />

        {filterSections.map((section) => (
          <FilterSection
            key={section.title}
            title={section.title}
            options={section.options}
            defaultOpen={section.defaultOpen}
          />
        ))}
      </div>
    </aside>
  );
}
