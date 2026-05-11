"use client";

import type { DashboardOverviewItem } from "./types";

export default function MarketplaceOverviewCard({ items }: { items: DashboardOverviewItem[] }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-800">Marketplace Overview</h3>
        <p className="mt-1 text-sm text-gray-500">Live admin-facing summary from products, vendors, and orders</p>
      </div>

      <div className="mt-6 space-y-5">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-gray-800 text-sm">{item.label}</p>
              <span className="block text-xs text-gray-500">{item.value}</span>
            </div>

            <div className="flex w-full max-w-[150px] items-center gap-3">
              <div className="relative block h-2 w-full rounded-sm bg-gray-200">
                <div
                  className="absolute left-0 top-0 flex h-full items-center justify-center rounded-sm bg-[#615FFF]"
                  style={{ width: `${Math.max(6, Math.min(item.progress, 100))}%` }}
                ></div>
              </div>
              <p className="w-10 text-right text-sm font-medium text-gray-800">{Math.round(item.progress)}%</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
