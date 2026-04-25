import { Suspense } from "react";

import ProductsContent from "./products-content";

export default function Page() {
  return (
    <Suspense fallback={<div>Loading products...</div>}>
      <ProductsContent />
    </Suspense>
  );
}
