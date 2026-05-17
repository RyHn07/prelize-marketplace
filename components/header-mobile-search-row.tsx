"use client";

import { useState } from "react";
import type { ReactNode } from "react";

type HeaderMobileSearchRowProps = {
  categoriesLabel: string;
  searchPlaceholder: string;
  categoriesIcon: ReactNode;
  dropdownIcon: ReactNode;
  searchIcon: ReactNode;
};

export default function HeaderMobileSearchRow({
  categoriesLabel,
  searchPlaceholder,
  categoriesIcon,
  dropdownIcon,
  searchIcon,
}: HeaderMobileSearchRowProps) {
  const [isSearchActive, setIsSearchActive] = useState(false);

  return (
    <div className="flex items-center gap-3 lg:hidden">
      {!isSearchActive ? (
        <button
          type="button"
          className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full bg-slate-950 px-4 text-xs font-semibold text-white transition-colors hover:bg-slate-800"
        >
          {categoriesIcon}
          <span>{categoriesLabel}</span>
          {dropdownIcon}
        </button>
      ) : null}

      <form
        className={isSearchActive ? "w-full" : "min-w-0 flex-1"}
        role="search"
        action="/products"
        method="GET"
      >
        <label htmlFor="header-search-mobile" className="sr-only">
          Search products
        </label>
        <div className="flex h-10 items-center rounded-full border border-slate-200/90 bg-white pl-4 pr-[1px] shadow-[0_8px_24px_rgba(15,23,42,0.06)] transition-all focus-within:border-[#615FFF]/50 focus-within:ring-4 focus-within:ring-[#615FFF]/10">
          <input
            id="header-search-mobile"
            name="search"
            type="search"
            placeholder={searchPlaceholder}
            onFocus={() => setIsSearchActive(true)}
            onBlur={(event) => {
              if (!event.currentTarget.value.trim()) {
                setIsSearchActive(false);
              }
            }}
            className="w-full border-0 bg-transparent py-2 pr-3 text-xs text-slate-900 outline-none placeholder:text-slate-400"
          />
          <button
            type="submit"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#615FFF] text-white shadow-sm transition-colors hover:bg-[#5552e6]"
            aria-label="Search"
          >
            {searchIcon}
          </button>
        </div>
      </form>
    </div>
  );
}
