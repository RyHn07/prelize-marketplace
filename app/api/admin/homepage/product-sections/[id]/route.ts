import { NextResponse } from "next/server";

import {
  deleteHomepageProductSection,
  parseHomepageProductSectionInput,
  updateHomepageProductSection,
  validateHomepageProductSectionInput,
} from "@/lib/homepage/admin";
import { getSupabaseServiceRoleClient, requireAdminRequest } from "@/lib/supabase-admin";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdminRequest(request);

  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  const { id } = await context.params;
  const payload = parseHomepageProductSectionInput(await request.json());
  const validationError = validateHomepageProductSectionInput(payload);

  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const supabase = getSupabaseServiceRoleClient();
  const result = await updateHomepageProductSection(supabase, id, payload);

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  return NextResponse.json({ section: result.data });
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await requireAdminRequest(request);

  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  const { id } = await context.params;
  const supabase = getSupabaseServiceRoleClient();
  const error = await deleteHomepageProductSection(supabase, id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
