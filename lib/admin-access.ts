import type { SupabaseClient } from "@supabase/supabase-js";
import { getMarketplaceAccessState } from "@/lib/marketplace-access";
import { hasSupabaseClientEnv } from "@/lib/supabase-client";

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
  if (!hasSupabaseClientEnv() && typeof window !== "undefined") {
    const response = await fetch("/api/auth/me", { cache: "no-store" });
    const data = (await response.json().catch(() => null)) as {
      user?: { email?: string | null; role?: string | null } | null;
    } | null;
    const email = data?.user?.email ?? null;

    if (!email) {
      return {
        userEmail: null,
        hasAdminAccess: false,
        accessSource: "none",
      };
    }

    if (LEGACY_ADMIN_EMAILS.includes(email) || data?.user?.role === PLATFORM_ADMIN_ROLE) {
      return {
        userEmail: email,
        hasAdminAccess: true,
        accessSource: data?.user?.role === PLATFORM_ADMIN_ROLE ? "platform_role" : "legacy_email",
      };
    }

    return {
      userEmail: email,
      hasAdminAccess: false,
      accessSource: "none",
    };
  }

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
