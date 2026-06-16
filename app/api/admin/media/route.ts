import { NextResponse } from "next/server";

import { getAdminMediaItems } from "@/lib/admin/vps-data";
import { requireAdminRequest } from "@/lib/supabase-admin";

export async function GET(request: Request) {
  const auth = await requireAdminRequest(request);

  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  try {
    const items = await getAdminMediaItems();
    return NextResponse.json({ userEmail: auth.user?.email ?? null, items });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load media library." },
      { status: 500 },
    );
  }
}
