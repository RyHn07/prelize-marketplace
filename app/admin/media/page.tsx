import { Suspense } from "react";

import MediaContent from "./media-content";

export default function Page() {
  return (
    <Suspense fallback={<div>Loading media...</div>}>
      <MediaContent />
    </Suspense>
  );
}
