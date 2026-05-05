import { WorkspaceLoading } from "@/components/loading/route-loading";

export default function Loading() {
  return (
    <WorkspaceLoading
      tone="admin"
      title="Admin Workspace"
      description="Loading the latest products, orders, and marketplace controls."
    />
  );
}
