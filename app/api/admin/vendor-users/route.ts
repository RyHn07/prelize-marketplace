import { NextResponse } from "next/server";

import { requireAdminRequest } from "@/lib/auth/request";
import { query } from "@/lib/db";
import type { VendorInvitationStatus, VendorMemberStatus } from "@/types/product-db";

type VendorInviteableUser = {
  id: string;
  email: string;
  name: string | null;
  invitationStatus: VendorInvitationStatus | null;
  vendorId: string | null;
  vendorMembershipStatus: VendorMemberStatus | null;
};

export async function GET(request: Request) {
  const adminRequest = await requireAdminRequest(request);

  if (adminRequest.errorResponse) {
    return adminRequest.errorResponse;
  }

  try {
    const result = await query<VendorInviteableUser>(
      `
        select
          users.id,
          users.email,
          nullif(users.name, '') as name,
          vendor_invitations.status as "invitationStatus",
          vendor_members.vendor_id as "vendorId",
          vendor_members.status as "vendorMembershipStatus"
        from public.users
        left join public.vendor_invitations
          on vendor_invitations.user_id = users.id
        left join public.vendor_members
          on vendor_members.user_id = users.id
        where nullif(users.email, '') is not null
        order by users.email asc
        limit 200
      `,
    );

    return NextResponse.json({ users: result.rows });
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
