import { NextResponse } from "next/server";

import { requireAdminRequest } from "@/lib/supabase-admin";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminRequest(request);

  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  void request;
  void params;

  return NextResponse.json(
    {
      error: "Vendor-owned CNDS profiles must be updated from the vendor dashboard.",
    },
    { status: 400 },
  );
}
