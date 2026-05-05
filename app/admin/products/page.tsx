import { Suspense } from "react";

import { WorkspaceLoading } from "@/components/loading/route-loading";
import ProductsContent from "./products-content";

export default function Page() {
  return (
    <Suspense
      fallback={
        <WorkspaceLoading
          tone="admin"
          title="Admin Products"
          description="Loading catalog records, vendor assignments, and product filters."
        />
      }
    >
      <ProductsContent />
    </Suspense>
  );
}
