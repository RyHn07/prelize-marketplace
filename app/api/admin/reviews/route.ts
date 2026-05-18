import { NextResponse } from "next/server";

import { listAdminReviewRows } from "@/lib/reviews";
import { getSupabaseServiceRoleClient, requireAdminRequest } from "@/lib/supabase-admin";

export async function GET(request: Request) {
  const auth = await requireAdminRequest(request);

  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  try {
    const supabase = getSupabaseServiceRoleClient();
    const result = await listAdminReviewRows(supabase);

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 400 });
    }

    return NextResponse.json({ data: result.data });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to load product reviews.",
      },
      { status: 500 },
    );
  }
}
