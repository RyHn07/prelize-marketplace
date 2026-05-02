import { NextResponse } from "next/server";

import { getAuthenticatedUserFromRequest, getSupabaseServiceRoleClient } from "@/lib/supabase-admin";
import type { VendorInvitationStatus, VendorMemberRole, VendorMemberStatus, VendorStatus } from "@/types/product-db";

export async function GET(request: Request) {
  const authResult = await getAuthenticatedUserFromRequest(request);

  if (authResult.error || !authResult.user) {
    return NextResponse.json(
      {
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
      },
      { status: 200 },
    );
  }

  try {
    const supabase = getSupabaseServiceRoleClient();
    const [{ data: invitation }, { data: membership }] = await Promise.all([
      supabase
        .from("vendor_invitations")
        .select("status")
        .eq("user_id", authResult.user.id)
        .maybeSingle(),
      supabase
        .from("vendor_members")
        .select("vendor_id, role, status")
        .eq("user_id", authResult.user.id)
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
      userId: authResult.user.id,
      userEmail: authResult.user.email ?? null,
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
