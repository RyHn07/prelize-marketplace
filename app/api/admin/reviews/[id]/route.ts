import { NextResponse } from "next/server";

import { deleteProductReview } from "@/lib/reviews";
import { getSupabaseServiceRoleClient, requireAdminRequest } from "@/lib/supabase-admin";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminRequest(request);

  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  try {
    const { id } = await params;
    const supabase = getSupabaseServiceRoleClient();
    const result = await deleteProductReview(id, supabase);

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 400 });
    }

    return NextResponse.json({ data: result.data });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to delete the review.",
      },
      { status: 500 },
    );
  }
}
