import { NextResponse } from "next/server";

import {
  createAdminCndsProfile,
  listAdminCndsProfiles,
  parseCndsProfileInput,
  validateCndsProfileInput,
} from "@/lib/cnds/admin";
import { requireAdminRequest, getSupabaseServiceRoleClient } from "@/lib/supabase-admin";

export async function GET(request: Request) {
  const auth = await requireAdminRequest(request);

  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  try {
    const supabase = getSupabaseServiceRoleClient();
    const result = await listAdminCndsProfiles(supabase);

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    return NextResponse.json({ profiles: result.data });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to load CNDS shipping profiles.",
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
    const payload = parseCndsProfileInput(await request.json().catch(() => null));
    const validationError = validateCndsProfileInput(payload);

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const supabase = getSupabaseServiceRoleClient();
    const result = await createAdminCndsProfile(supabase, payload);

    if (result.error || !result.data) {
      return NextResponse.json(
        { error: result.error?.message ?? "Unable to create the CNDS shipping profile." },
        { status: 400 },
      );
    }

    return NextResponse.json({ profile: result.data });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to create the CNDS shipping profile.",
      },
      { status: 500 },
    );
  }
}
