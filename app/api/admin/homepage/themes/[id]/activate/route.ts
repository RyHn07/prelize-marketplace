import { NextResponse } from "next/server";

import { activateHomepageTheme } from "@/lib/homepage/admin";
import { getSupabaseServiceRoleClient, requireAdminRequest } from "@/lib/supabase-admin";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireAdminRequest(request);

  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  const { id } = await context.params;
  const supabase = getSupabaseServiceRoleClient();
  const error = await activateHomepageTheme(supabase, id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
