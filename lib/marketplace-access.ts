import type { SupabaseClient } from "@supabase/supabase-js";

import type { VendorMemberRole, VendorMemberStatus } from "@/types/product-db";

const PLATFORM_ADMIN_ROLE = "platform_admin";

type VendorMembership = {
  vendor_id: string;
  role: VendorMemberRole;
  status: VendorMemberStatus;
};

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
  supabase: SupabaseClient,
): Promise<MarketplaceAccessState> {
  const { data: authData } = await supabase.auth.getUser();
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
    supabase
      .from("platform_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", PLATFORM_ADMIN_ROLE)
      .maybeSingle(),
    supabase
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
  supabase: SupabaseClient,
): Promise<ProductManagementAccessState> {
  const accessState = await getMarketplaceAccessState(supabase);
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
