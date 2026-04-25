import type { Product } from "@/types/product";

import ProductCard from "@/components/product/product-card";

interface ProductGridProps {
  products: Product[];
  viewMode: "grid" | "list";
}

export default function ProductGrid({ products, viewMode }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
        <h3 className="text-lg font-semibold text-slate-900">No products found</h3>
        <p className="mt-2 text-sm text-slate-500">
          Try adjusting the category or price filters to see more results.
        </p>
      </div>
    );
  }

  return (
    <div
      className={
        viewMode === "grid"
          ? "grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3"
          : "grid grid-cols-1 gap-4"
      }
    >
      {products.map((product) => (
        <ProductCard key={product.id} product={product} viewMode={viewMode} />
      ))}
    </div>
  );
}
