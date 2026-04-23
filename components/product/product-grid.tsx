import type { Product } from "@/types/product";

import ProductCard from "@/components/product/product-card";

interface ProductGridProps {
  products: Product[];
  viewMode: "grid" | "list";
}

export default function ProductGrid({ products, viewMode }: ProductGridProps) {
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
