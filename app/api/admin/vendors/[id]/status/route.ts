import { NextResponse } from "next/server";

import { requireAdminRequest, getSupabaseServiceRoleClient } from "@/lib/supabase-admin";
import type { VendorStatus } from "@/types/product-db";

type StatusBody = {
  status?: VendorStatus;
};

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const adminRequest = await requireAdminRequest(request);

  if (adminRequest.errorResponse) {
    return adminRequest.errorResponse;
  }

  try {
    const { id } = await params;
    const body = (await request.json()) as StatusBody;
    const nextStatus = body.status;

    if (nextStatus !== "pending" && nextStatus !== "active" && nextStatus !== "suspended") {
      return NextResponse.json({ error: "A valid vendor status is required." }, { status: 400 });
    }

    const supabase = getSupabaseServiceRoleClient();
    const { error } = await supabase
      .from("vendors")
      .update({
        status: nextStatus,
        updated_at: new Date().toISOString(),
      } as never)
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, status: nextStatus });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to update vendor status.",
      },
      { status: 500 },
    );
  }
}
