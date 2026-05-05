import { NextResponse } from "next/server";

import {
  parsePricingTierProfileInput,
  updateAdminPricingTierProfile,
  validatePricingTierProfileInput,
} from "@/lib/pricing-tiers/admin";
import { getSupabaseServiceRoleClient, requireAdminRequest } from "@/lib/supabase-admin";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminRequest(request);

  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  try {
    const { id } = await params;
    const input = parsePricingTierProfileInput(await request.json());
    const validationError = validatePricingTierProfileInput(input);

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const supabase = getSupabaseServiceRoleClient();
    const result = await updateAdminPricingTierProfile(supabase, id, input);

    if (result.error || !result.data) {
      return NextResponse.json(
        { error: result.error?.message ?? "Unable to update pricing tier profile." },
        { status: 400 },
      );
    }

    return NextResponse.json({ profile: result.data });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to update pricing tier profile.",
      },
      { status: 500 },
    );
  }
}
