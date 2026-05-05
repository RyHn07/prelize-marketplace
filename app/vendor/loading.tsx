import { WorkspaceLoading } from "@/components/loading/route-loading";

export default function Loading() {
  return (
    <WorkspaceLoading
      tone="vendor"
      title="Vendor Workspace"
      description="Loading your product, media, and order tools for this vendor account."
    />
  );
}
