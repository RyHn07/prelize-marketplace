import { NextResponse } from "next/server";

import { getSupabaseServiceRoleClient, requireAdminRequest } from "@/lib/supabase-admin";
import type { VendorInvitationStatus } from "@/types/product-db";

type InviteBody = {
  userId?: string;
};

export async function POST(request: Request) {
  const adminRequest = await requireAdminRequest(request);

  if (adminRequest.errorResponse || !adminRequest.user) {
    return adminRequest.errorResponse;
  }

  try {
    const body = (await request.json()) as InviteBody;
    const userId = typeof body.userId === "string" ? body.userId.trim() : "";

    if (!userId) {
      return NextResponse.json({ error: "User ID is required." }, { status: 400 });
    }

    const supabase = getSupabaseServiceRoleClient();
    const { data: existingMembership } = await supabase
      .from("vendor_members")
      .select("id")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();

    if (existingMembership) {
      return NextResponse.json({ error: "This user already has a vendor membership." }, { status: 400 });
    }

    const { error } = await supabase
      .from("vendor_invitations")
      .upsert(
        {
          user_id: userId,
          invited_by: adminRequest.user.id,
          status: "pending" satisfies VendorInvitationStatus,
        } as never,
        { onConflict: "user_id" },
      );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      invitationStatus: "pending" satisfies VendorInvitationStatus,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to create the vendor invitation.",
      },
      { status: 500 },
    );
  }
}
