import { NextResponse } from "next/server";

import { listAdminCndsProfiles } from "@/lib/cnds/admin";
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

  void request;

  return NextResponse.json(
    {
      error: "Global CNDS profiles are disabled. Vendors must create CNDS profiles inside the vendor dashboard.",
    },
    { status: 400 },
  );
}
