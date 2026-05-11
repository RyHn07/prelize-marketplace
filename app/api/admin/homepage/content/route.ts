import { NextResponse } from "next/server";

import {
  listHomepageContentBlocks,
  parseHomepageContentBlockInput,
  upsertHomepageContentBlock,
  validateHomepageContentBlockInput,
} from "@/lib/homepage/admin";
import { getSupabaseServiceRoleClient, requireAdminRequest } from "@/lib/supabase-admin";

export async function GET(request: Request) {
  const auth = await requireAdminRequest(request);

  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  const supabase = getSupabaseServiceRoleClient();
  const result = await listHomepageContentBlocks(supabase);

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  return NextResponse.json({ blocks: result.data });
}

export async function PUT(request: Request) {
  const auth = await requireAdminRequest(request);

  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  const body = await request.json();
  const rawBlocks = Array.isArray(body?.blocks) ? body.blocks : [];
  const supabase = getSupabaseServiceRoleClient();
  const savedBlocks = [];

  for (const rawBlock of rawBlocks) {
    const payload = parseHomepageContentBlockInput(rawBlock);
    const validationError = validateHomepageContentBlockInput(payload);

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const result = await upsertHomepageContentBlock(supabase, payload);

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    if (result.data) {
      savedBlocks.push(result.data);
    }
  }

  return NextResponse.json({ blocks: savedBlocks });
}
