import { NextResponse } from "next/server";

import {
  parseCndsProfileInput,
  updateAdminCndsProfile,
  validateCndsProfileInput,
} from "@/lib/cnds/admin";
import { requireAdminRequest } from "@/lib/supabase-admin";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminRequest(request);

  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  try {
    const { id } = await params;
    const payload = parseCndsProfileInput(await request.json().catch(() => null));
    const validationError = validateCndsProfileInput(payload);

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const supabase = getSupabaseServiceRoleClient();
    const result = await updateAdminCndsProfile(supabase, id, payload);

    if (result.error || !result.data) {
      return NextResponse.json(
        { error: result.error?.message ?? "Unable to update the CNDS shipping profile." },
        { status: 400 },
      );
    }

    return NextResponse.json({ profile: result.data });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to update the CNDS shipping profile.",
      },
      { status: 500 },
    );
  }
}
