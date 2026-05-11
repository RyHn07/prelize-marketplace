import { NextResponse } from "next/server";

import {
  createHomepageProductSection,
  listHomepageProductSections,
  parseHomepageProductSectionInput,
  validateHomepageProductSectionInput,
} from "@/lib/homepage/admin";
import { getSupabaseServiceRoleClient, requireAdminRequest } from "@/lib/supabase-admin";

export async function GET(request: Request) {
  const auth = await requireAdminRequest(request);

  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  const supabase = getSupabaseServiceRoleClient();
  const result = await listHomepageProductSections(supabase);

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  return NextResponse.json({ sections: result.data });
}

export async function POST(request: Request) {
  const auth = await requireAdminRequest(request);

  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  const payload = parseHomepageProductSectionInput(await request.json());
  const validationError = validateHomepageProductSectionInput(payload);

  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const supabase = getSupabaseServiceRoleClient();
  const result = await createHomepageProductSection(supabase, payload);

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  return NextResponse.json({ section: result.data });
}
