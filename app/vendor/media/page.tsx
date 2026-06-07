import { Suspense } from "react";

import VendorMediaContent from "./vendor-media-content";

export default function VendorMediaPage() {
  return (
    <Suspense fallback={<div>Loading media...</div>}>
      <VendorMediaContent />
    </Suspense>
  );
}
