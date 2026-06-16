import { NextResponse } from "next/server";

import { getCurrentUserFromCookie, type AuthUser } from "@/lib/auth/session";
import { query } from "@/lib/db";
import { getAuthenticatedUserFromRequest, getSupabaseServiceRoleClient } from "@/lib/supabase-admin";
import type { VendorInvitationStatus, VendorMemberRole, VendorMemberStatus, VendorStatus } from "@/types/product-db";

type OnboardingUser = {
  id: string;
  email?: string | null;
};

function emptyStatus() {
  return {
    userId: null,
    userEmail: null,
    invitationStatus: null,
    hasPendingInvitation: false,
    hasVendorMembership: false,
    vendorId: null,
    vendorName: null,
    vendorStatus: null,
    vendorRole: null,
    vendorMemberStatus: null,
    canAccessVendorWorkspace: false,
  };
}

async function getRequestUser(request: Request): Promise<OnboardingUser | AuthUser | null> {
  const authResult = await getAuthenticatedUserFromRequest(request);

  if (!authResult.error && authResult.user) {
    return authResult.user;
  }

  return getCurrentUserFromCookie();
}

async function getCookieVendorStatus(user: OnboardingUser | AuthUser) {
  const [{ rows: invitationRows }, { rows: membershipRows }] = await Promise.all([
    query<{ status: VendorInvitationStatus }>(
      `
        select status
        from public.vendor_invitations
        where user_id = $1
        order by created_at desc
        limit 1
      `,
      [user.id],
    ),
    query<{
      vendor_id: string;
      vendor_name: string | null;
      vendor_status: VendorStatus | null;
      role: VendorMemberRole | null;
      status: VendorMemberStatus | null;
    }>(
      `
        select
          vendor_members.vendor_id,
          vendors.name as vendor_name,
          vendors.status as vendor_status,
          vendor_members.role,
          vendor_members.status
        from public.vendor_members
        left join public.vendors on vendors.id = vendor_members.vendor_id
        where vendor_members.user_id = $1
        order by vendor_members.created_at desc
        limit 1
      `,
      [user.id],
    ),
  ]);

  const invitationStatus = invitationRows[0]?.status ?? null;
  const membership = membershipRows[0] ?? null;
  const vendorId = membership?.vendor_id ?? null;
  const vendorStatus = membership?.vendor_status ?? null;
  const vendorMemberStatus = membership?.status ?? null;
  const hasVendorMembership = Boolean(vendorId);

  return {
    userId: user.id,
    userEmail: user.email ?? null,
    invitationStatus,
    hasPendingInvitation: invitationStatus === "pending",
    hasVendorMembership,
    vendorId,
    vendorName: membership?.vendor_name ?? null,
    vendorStatus,
    vendorRole: membership?.role ?? null,
    vendorMemberStatus,
    canAccessVendorWorkspace:
      hasVendorMembership && vendorStatus === "active" && vendorMemberStatus === "active",
  };
}

export async function GET(request: Request) {
  const user = await getRequestUser(request);

  if (!user) {
    return NextResponse.json(emptyStatus(), { status: 200 });
  }

  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(await getCookieVendorStatus(user));
    }

    const supabase = getSupabaseServiceRoleClient();
    const [{ data: invitation }, { data: membership }] = await Promise.all([
      supabase
        .from("vendor_invitations")
        .select("status")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("vendor_members")
        .select("vendor_id, role, status")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const vendorId = (membership as { vendor_id?: string } | null)?.vendor_id ?? null;
    const vendorStatusResult = vendorId
      ? await supabase.from("vendors").select("name, status").eq("id", vendorId).maybeSingle()
      : { data: null, error: null };

    const invitationStatus = ((invitation as { status?: VendorInvitationStatus } | null)?.status ?? null) as VendorInvitationStatus | null;
    const vendorStatus = ((vendorStatusResult.data as { status?: VendorStatus } | null)?.status ?? null) as VendorStatus | null;
    const vendorName = (vendorStatusResult.data as { name?: string } | null)?.name ?? null;
    const vendorRole = ((membership as { role?: VendorMemberRole } | null)?.role ?? null) as VendorMemberRole | null;
    const vendorMemberStatus = ((membership as { status?: VendorMemberStatus } | null)?.status ?? null) as VendorMemberStatus | null;
    const hasVendorMembership = Boolean(vendorId);
    const canAccessVendorWorkspace =
      hasVendorMembership && vendorStatus === "active" && vendorMemberStatus === "active";

    return NextResponse.json({
      userId: user.id,
      userEmail: user.email ?? null,
      invitationStatus,
      hasPendingInvitation: invitationStatus === "pending",
      hasVendorMembership,
      vendorId,
      vendorName,
      vendorStatus,
      vendorRole,
      vendorMemberStatus,
      canAccessVendorWorkspace,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load vendor onboarding status.",
      },
      { status: 500 },
    );
  }
}
