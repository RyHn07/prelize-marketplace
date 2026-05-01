import type { SupabaseClient } from "@supabase/supabase-js";
import { getMarketplaceAccessState } from "@/lib/marketplace-access";

export const LEGACY_ADMIN_EMAILS = ["reaz1006@gmail.com"];
export const PLATFORM_ADMIN_ROLE = "platform_admin";

export type AdminAccessState = {
  userEmail: string | null;
  hasAdminAccess: boolean;
  accessSource: "platform_role" | "legacy_email" | "none";
};

export async function getAdminAccessState(
  supabase: SupabaseClient,
): Promise<AdminAccessState> {
  const accessState = await getMarketplaceAccessState(supabase);
  const email = accessState.userEmail;

  if (!email || !accessState.userId) {
    return {
      userEmail: email,
      hasAdminAccess: false,
      accessSource: "none",
    };
  }

  if (accessState.hasPlatformAdminAccess) {
    return {
      userEmail: email,
      hasAdminAccess: true,
      accessSource: "platform_role",
    };
  }

  if (LEGACY_ADMIN_EMAILS.includes(email)) {
    return {
      userEmail: email,
      hasAdminAccess: true,
      accessSource: "legacy_email",
    };
  }

  return {
    userEmail: email,
    hasAdminAccess: false,
    accessSource: "none",
  };
}
