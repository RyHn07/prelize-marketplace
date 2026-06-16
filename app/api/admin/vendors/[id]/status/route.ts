import { NextResponse } from "next/server";

import { query } from "@/lib/db";
import { requireAdminRequest } from "@/lib/supabase-admin";
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

    await query("update public.vendors set status = $1, updated_at = now() where id = $2", [nextStatus, id]);

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
