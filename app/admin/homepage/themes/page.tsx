import { Suspense } from "react";

import { WorkspaceLoading } from "@/components/loading/route-loading";
import ThemesContent from "./themes-content";

export default function Page() {
  return (
    <Suspense
      fallback={
        <WorkspaceLoading
          tone="admin"
          title="Homepage Themes"
          description="Loading homepage themes, activation state, and preview tools."
        />
      }
    >
      <ThemesContent />
    </Suspense>
  );
}
