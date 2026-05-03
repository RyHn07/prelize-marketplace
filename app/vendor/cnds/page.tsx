import { Suspense } from "react";

import VendorCndsContent from "./vendor-cnds-content";

export default function Page() {
  return (
    <Suspense fallback={<div>Loading CNDS profiles...</div>}>
      <VendorCndsContent />
    </Suspense>
  );
}
