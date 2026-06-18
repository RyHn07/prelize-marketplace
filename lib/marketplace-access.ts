import type { PgDataClient } from "@/lib/postgres-data-client";

import { hasPgDataClientEnv } from "@/lib/browser-app-client";
import type { VendorMemberRole, VendorMemberStatus } from "@/types/product-db";

const PLATFORM_ADMIN_ROLE = "platform_admin";

type VendorMembership = {
  vendor_id: string;
  role: VendorMemberRole;
  status: VendorMemberStatus;
};

export type CurrentVendorMembership = VendorMembership | null;

export type MarketplaceAccessState = {
  userId: string | null;
  userEmail: string | null;
  hasPlatformAdminAccess: boolean;
  vendorMemberships: VendorMembership[];
};

export type ProductManagementAccessState = MarketplaceAccessState & {
  hasProductManagementAccess: boolean;
  manageableVendorIds: string[];
};

export type VendorWorkspaceAccessState = MarketplaceAccessState & {
  hasVendorWorkspaceAccess: boolean;
  activeVendorId: string | null;
  activeVendorRole: VendorMemberRole | null;
};

function isMissingRelationError(message: string) {
  const normalizedMessage = message.toLowerCase();

  return (
    normalizedMessage.includes("relation") ||
    normalizedMessage.includes("does not exist") ||
    normalizedMessage.includes("could not find")
  );
}

function normalizeVendorMemberRole(value: unknown): VendorMemberRole {
  return value === "staff" ? "staff" : "owner";
}

function normalizeVendorMemberStatus(value: unknown): VendorMemberStatus {
  return value === "invited" || value === "disabled" ? value : "active";
}

export async function getMarketplaceAccessState(
  dataClient: PgDataClient,
): Promise<MarketplaceAccessState> {
  if (typeof window !== "undefined") {
    const response = await fetch("/api/vendor/onboarding-status", { cache: "no-store" });
    const status = (await response.json().catch(() => null)) as {
      userId?: string | null;
      userEmail?: string | null;
      vendorId?: string | null;
      vendorRole?: VendorMemberRole | null;
      vendorMemberStatus?: VendorMemberStatus | null;
      vendorStatus?: string | null;
      canAccessVendorWorkspace?: boolean;
    } | null;

    if (!status?.userId) {
      return {
        userId: null,
        userEmail: null,
        hasPlatformAdminAccess: false,
        vendorMemberships: [],
      };
    }

    const hasActiveVendorMembership =
      Boolean(status.vendorId) &&
      status.canAccessVendorWorkspace === true &&
      status.vendorMemberStatus === "active" &&
      status.vendorStatus === "active";

    return {
      userId: status.userId,
      userEmail: status.userEmail ?? null,
      hasPlatformAdminAccess: false,
      vendorMemberships:
        hasActiveVendorMembership && status.vendorId
          ? [
              {
                vendor_id: status.vendorId,
                role: normalizeVendorMemberRole(status.vendorRole),
                status: "active",
              },
            ]
          : [],
    };
  }

  const { data: authData } = await dataClient.auth.getUser();
  const user = authData.user;
  const userId = user?.id ?? null;
  const userEmail = user?.email ?? null;

  if (!userId) {
    return {
      userId,
      userEmail,
      hasPlatformAdminAccess: false,
      vendorMemberships: [],
    };
  }

  const [platformRoleResult, vendorMembersResult] = await Promise.all([
    dataClient
      .from("platform_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", PLATFORM_ADMIN_ROLE)
      .maybeSingle(),
    dataClient
      .from("vendor_members")
      .select("vendor_id, role, status")
      .eq("user_id", userId)
      .in("status", ["active", "invited"]),
  ]);

  const hasPlatformAdminAccess = Boolean(!platformRoleResult.error && platformRoleResult.data);

  const vendorMemberships =
    vendorMembersResult.error && isMissingRelationError(vendorMembersResult.error.message)
      ? []
      : ((vendorMembersResult.data ?? []) as Array<{
          vendor_id: string;
          role: VendorMemberRole | null;
          status: VendorMemberStatus | null;
        }>).map((membership) => ({
          vendor_id: membership.vendor_id,
          role: normalizeVendorMemberRole(membership.role),
          status: normalizeVendorMemberStatus(membership.status),
        }));

  return {
    userId,
    userEmail,
    hasPlatformAdminAccess,
    vendorMemberships,
  };
}

export async function getProductManagementAccessState(
  dataClient: PgDataClient,
): Promise<ProductManagementAccessState> {
  const accessState = await getMarketplaceAccessState(dataClient);
  const manageableVendorIds = accessState.vendorMemberships
    .filter((membership) => membership.status === "active")
    .map((membership) => membership.vendor_id);

  return {
    ...accessState,
    manageableVendorIds,
    hasProductManagementAccess:
      accessState.hasPlatformAdminAccess || manageableVendorIds.length > 0,
  };
}

export async function getVendorWorkspaceAccessState(
  dataClient: PgDataClient,
): Promise<VendorWorkspaceAccessState> {
  const accessState = await getMarketplaceAccessState(dataClient);
  const activeMembership = getCurrentVendorMembershipFromAccessState(accessState);

  return {
    ...accessState,
    hasVendorWorkspaceAccess: activeMembership !== null,
    activeVendorId: activeMembership?.vendor_id ?? null,
    activeVendorRole: activeMembership?.role ?? null,
  };
}

export function getCurrentVendorMembershipFromAccessState(
  accessState: MarketplaceAccessState,
): CurrentVendorMembership {
  return accessState.vendorMemberships.find((membership) => membership.status === "active") ?? null;
}

export async function getCurrentVendorMembership(
  dataClient: PgDataClient,
): Promise<CurrentVendorMembership> {
  const accessState = await getMarketplaceAccessState(dataClient);
  return getCurrentVendorMembershipFromAccessState(accessState);
}
