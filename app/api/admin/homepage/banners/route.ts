import { NextResponse } from "next/server";

import {
  createHomepageBanner,
  listHomepageBanners,
  parseHomepageBannerInput,
} from "@/lib/homepage/admin";
import { getSupabaseServiceRoleClient, requireAdminRequest } from "@/lib/supabase-admin";

export async function GET(request: Request) {
  const auth = await requireAdminRequest(request);

  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  const supabase = getSupabaseServiceRoleClient();
  const result = await listHomepageBanners(supabase);

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  return NextResponse.json({ banners: result.data });
}

export async function POST(request: Request) {
  const auth = await requireAdminRequest(request);

  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  const payload = parseHomepageBannerInput(await request.json());
  const supabase = getSupabaseServiceRoleClient();
  const result = await createHomepageBanner(supabase, payload);

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  return NextResponse.json({ banner: result.data });
}
