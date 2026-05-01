import { Suspense } from "react";

import VendorsContent from "./vendors-content";

export default function Page() {
  return (
    <Suspense fallback={<div>Loading vendors...</div>}>
      <VendorsContent />
    </Suspense>
  );
}
