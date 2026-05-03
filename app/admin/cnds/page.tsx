import { Suspense } from "react";

import CndsContent from "./cnds-content";

export default function Page() {
  return (
    <Suspense fallback={<div>Loading CNDS profiles...</div>}>
      <CndsContent />
    </Suspense>
  );
}
