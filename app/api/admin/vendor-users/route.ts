import type { User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { getSupabaseServiceRoleClient, requireAdminRequest } from "@/lib/supabase-admin";
import type { VendorInvitationStatus, VendorMemberStatus } from "@/types/product-db";

type VendorInviteableUser = {
  id: string;
  email: string;
  name: string | null;
  invitationStatus: VendorInvitationStatus | null;
  vendorId: string | null;
  vendorMembershipStatus: VendorMemberStatus | null;
};

function getUserDisplayName(user: User) {
  const metadata = user.user_metadata;

  if (typeof metadata?.full_name === "string" && metadata.full_name.trim().length > 0) {
    return metadata.full_name.trim();
  }

  if (typeof metadata?.name === "string" && metadata.name.trim().length > 0) {
    return metadata.name.trim();
  }

  return null;
}

export async function GET(request: Request) {
  const adminRequest = await requireAdminRequest(request);

  if (adminRequest.errorResponse) {
    return adminRequest.errorResponse;
  }

  try {
    const supabase = getSupabaseServiceRoleClient();
    const [{ data: userResult, error: userError }, { data: invitationRows, error: invitationError }, { data: membershipRows, error: membershipError }] =
      await Promise.all([
        supabase.auth.admin.listUsers({ page: 1, perPage: 200 }),
        supabase.from("vendor_invitations").select("user_id, status"),
        supabase.from("vendor_members").select("user_id, vendor_id, status"),
      ]);

    if (userError) {
      return NextResponse.json({ error: userError.message }, { status: 500 });
    }

    if (invitationError) {
      return NextResponse.json({ error: invitationError.message }, { status: 500 });
    }

    if (membershipError) {
      return NextResponse.json({ error: membershipError.message }, { status: 500 });
    }

    const invitationStatusByUserId = new Map(
      ((invitationRows ?? []) as Array<{ user_id: string; status: VendorInvitationStatus }>)
        .map((row) => [row.user_id, row.status]),
    );
    const membershipByUserId = new Map(
      ((membershipRows ?? []) as Array<{ user_id: string; vendor_id: string; status: VendorMemberStatus }>)
        .map((row) => [row.user_id, row]),
    );

    const users = (userResult.users ?? [])
      .filter((user) => typeof user.email === "string" && user.email.length > 0)
      .map((user) => {
        const membership = membershipByUserId.get(user.id);

        return {
          id: user.id,
          email: user.email ?? "",
          name: getUserDisplayName(user),
          invitationStatus: invitationStatusByUserId.get(user.id) ?? null,
          vendorId: membership?.vendor_id ?? null,
          vendorMembershipStatus: membership?.status ?? null,
        } satisfies VendorInviteableUser;
      })
      .sort((left, right) => left.email.localeCompare(right.email));

    return NextResponse.json({ users });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load registered users for vendor invites.",
      },
      { status: 500 },
    );
  }
}
