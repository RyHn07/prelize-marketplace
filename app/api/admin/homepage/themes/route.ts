import { NextResponse } from "next/server";

import {
  createHomepageTheme,
  listHomepageThemes,
  parseHomepageThemeInput,
  validateHomepageThemeInput,
} from "@/lib/homepage/admin";
import { getSupabaseServiceRoleClient, requireAdminRequest } from "@/lib/supabase-admin";

export async function GET(request: Request) {
  const auth = await requireAdminRequest(request);

  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  const supabase = getSupabaseServiceRoleClient();
  const result = await listHomepageThemes(supabase);

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  return NextResponse.json({ themes: result.data });
}

export async function POST(request: Request) {
  const auth = await requireAdminRequest(request);

  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  const payload = parseHomepageThemeInput(await request.json());
  const validationError = validateHomepageThemeInput(payload);

  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const supabase = getSupabaseServiceRoleClient();
  const result = await createHomepageTheme(supabase, payload);

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  return NextResponse.json({ record: result.data });
}
