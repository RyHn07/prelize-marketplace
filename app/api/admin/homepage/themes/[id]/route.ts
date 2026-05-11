import { NextResponse } from "next/server";

import {
  deleteHomepageTheme,
  getHomepageThemeEditorRecord,
  parseHomepageThemeInput,
  updateHomepageTheme,
  validateHomepageThemeInput,
} from "@/lib/homepage/admin";
import { getSupabaseServiceRoleClient, requireAdminRequest } from "@/lib/supabase-admin";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const auth = await requireAdminRequest(request);

  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  const { id } = await context.params;
  const supabase = getSupabaseServiceRoleClient();
  const result = await getHomepageThemeEditorRecord(supabase, id);

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  if (!result.data) {
    return NextResponse.json({ error: "Theme not found." }, { status: 404 });
  }

  return NextResponse.json({ record: result.data });
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdminRequest(request);

  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  const { id } = await context.params;
  const payload = parseHomepageThemeInput(await request.json());
  const validationError = validateHomepageThemeInput(payload);

  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const supabase = getSupabaseServiceRoleClient();
  const result = await updateHomepageTheme(supabase, id, payload);

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  return NextResponse.json({ record: result.data });
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await requireAdminRequest(request);

  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  const { id } = await context.params;
  const supabase = getSupabaseServiceRoleClient();
  const error = await deleteHomepageTheme(supabase, id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
