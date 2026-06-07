import { Suspense } from "react";

import { WorkspaceLoading } from "@/components/loading/route-loading";
import VendorProductsContent from "./vendor-products-content";

export default function VendorProductsPage() {
  return (
    <Suspense
      fallback={
        <WorkspaceLoading
          tone="vendor"
          title="Vendor Products"
          description="Loading your catalog records, product filters, and vendor product actions."
        />
      }
    >
      <VendorProductsContent />
    </Suspense>
  );
}
