import { NextResponse } from "next/server";

import {
  createAdminPricingTierProfile,
  listAdminPricingTierProfiles,
  parsePricingTierProfileInput,
  validatePricingTierProfileInput,
} from "@/lib/pricing-tiers/admin";
import { getDatabaseServiceClient, requireAdminRequest } from "@/lib/auth/request";

export async function GET(request: Request) {
  const auth = await requireAdminRequest(request);

  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  try {
    const dataClient = getDatabaseServiceClient();
    const result = await listAdminPricingTierProfiles(dataClient);

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    return NextResponse.json({ profiles: result.data });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to load pricing tier profiles.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireAdminRequest(request);

  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  try {
    const input = parsePricingTierProfileInput(await request.json());
    const validationError = validatePricingTierProfileInput(input);

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const dataClient = getDatabaseServiceClient();
    const result = await createAdminPricingTierProfile(dataClient, input);

    if (result.error || !result.data) {
      return NextResponse.json(
        { error: result.error?.message ?? "Unable to create pricing tier profile." },
        { status: 400 },
      );
    }

    return NextResponse.json({ profile: result.data });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to create pricing tier profile.",
      },
      { status: 500 },
    );
  }
}
