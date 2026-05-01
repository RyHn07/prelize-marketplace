"use client";

import { useState } from "react";

import type { Product } from "@/types/product";

type ProductDetailsTabsProps = {
  product: Product;
};

type TabKey = "specifications" | "description" | "reviews";

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: "specifications", label: "Product Specifications" },
  { key: "description", label: "Product Description" },
  { key: "reviews", label: "Customer Review" },
];

export default function ProductDetailsTabs({ product }: ProductDetailsTabsProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("specifications");
  const reviews = product.reviews ?? [];

  return (
    <div className="mt-10 space-y-6">
      <nav className="flex flex-wrap gap-6 border-b border-slate-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={
              activeTab === tab.key
                ? "border-b-2 border-[#615FFF] px-0 py-3 text-sm font-semibold text-[#615FFF] transition-colors"
                : "border-b-2 border-transparent px-0 py-3 text-sm font-semibold text-slate-600 transition-colors hover:text-slate-900"
            }
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {activeTab === "specifications" ? (
        <section className="bg-white">
          <h2 className="text-xl font-semibold text-slate-900">Product Specifications</h2>
          <div className="mt-5 overflow-hidden rounded-lg border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <tbody className="divide-y divide-slate-200 bg-white">
                {product.specifications.map((specification) => (
                  <tr key={specification.label}>
                    <th className="w-40 bg-slate-50 px-5 py-4 font-semibold text-slate-700 sm:w-56">
                      {specification.label}
                    </th>
                    <td className="px-5 py-4 text-slate-600">{specification.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {activeTab === "description" ? (
        <section className="bg-white">
          <h2 className="text-xl font-semibold text-slate-900">Product Description</h2>
          <div className="mt-5 bg-white">
            <p className="text-sm leading-8 text-slate-600 sm:text-base">{product.description}</p>
          </div>
        </section>
      ) : null}

      {activeTab === "reviews" ? (
        <section className="bg-white">
          <h2 className="text-xl font-semibold text-slate-900">Customer Review</h2>
          <div className="mt-5 space-y-4">
            {reviews.length > 0 ? (
              reviews.map((review, index) => (
                <div
                  key={`${review.reviewer}-${review.createdAt ?? index}`}
                  className="rounded-lg border border-slate-200 bg-white px-5 py-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700">
                        {review.reviewer.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{review.reviewer}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {review.title ?? "Verified marketplace buyer"}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm font-medium text-amber-500">
                      {typeof review.rating === "number" ? `${review.rating.toFixed(1)} / 5` : "Unrated"}
                    </p>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{review.comment}</p>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-5 py-6 text-sm text-slate-500">
                No reviews yet.
              </div>
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}
