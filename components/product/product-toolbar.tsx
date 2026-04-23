interface ProductToolbarProps {
  totalProducts: number;
  totalResultsText?: string;
  sortValue: string;
  onSortChange: (value: string) => void;
  viewMode: "grid" | "list";
  onViewModeChange: (value: "grid" | "list") => void;
}

function GridIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect x="4" y="4" width="6" height="6" rx="1.2" />
      <rect x="14" y="4" width="6" height="6" rx="1.2" />
      <rect x="4" y="14" width="6" height="6" rx="1.2" />
      <rect x="14" y="14" width="6" height="6" rx="1.2" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M8 7h12" strokeLinecap="round" />
      <path d="M8 12h12" strokeLinecap="round" />
      <path d="M8 17h12" strokeLinecap="round" />
      <circle cx="4.5" cy="7" r="1" fill="currentColor" stroke="none" />
      <circle cx="4.5" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="4.5" cy="17" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export default function ProductToolbar({
  totalProducts,
  totalResultsText,
  sortValue,
  onSortChange,
  viewMode,
  onViewModeChange,
}: ProductToolbarProps) {
  const resultsText = totalResultsText ?? `Showing 1-12 of 380 products`;

  return (
    <section className="rounded-lg bg-white pb-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <p className="text-sm text-slate-500">
          {resultsText.replace("380", totalProducts.toString())}
        </p>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="sm:w-52">
            <label htmlFor="sort-products" className="sr-only">
              Sort products
            </label>
            <select
              id="sort-products"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 pr-9 text-sm text-slate-700 outline-none transition-colors focus:border-[#615FFF]/50"
              value={sortValue}
              onChange={(event) => onSortChange(event.target.value)}
            >
              <option value="default">Default sorting</option>
              <option value="popular">Most popular</option>
              <option value="price-low">Price: Low to high</option>
              <option value="price-high">Price: High to low</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onViewModeChange("grid")}
              className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-colors ${
                viewMode === "grid"
                  ? "border-[#615FFF] bg-[#615FFF] text-white"
                  : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700"
              }`}
              aria-label="Grid view"
              aria-pressed={viewMode === "grid"}
            >
              <GridIcon />
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange("list")}
              className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-colors ${
                viewMode === "list"
                  ? "border-[#615FFF] bg-[#615FFF] text-white"
                  : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700"
              }`}
              aria-label="List view"
              aria-pressed={viewMode === "list"}
            >
              <ListIcon />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
