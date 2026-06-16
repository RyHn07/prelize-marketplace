import { NextResponse } from "next/server";

import {
  deleteHomepageBanner,
  parseHomepageBannerInput,
  updateHomepageBanner,
} from "@/lib/homepage/admin";
import { getDatabaseServiceClient, requireAdminRequest } from "@/lib/auth/request";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdminRequest(request);

  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  const { id } = await context.params;
  const payload = parseHomepageBannerInput(await request.json());
  const dataClient = getDatabaseServiceClient();
  const result = await updateHomepageBanner(dataClient, id, payload);

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  return NextResponse.json({ banner: result.data });
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await requireAdminRequest(request);

  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  const { id } = await context.params;
  const dataClient = getDatabaseServiceClient();
  const error = await deleteHomepageBanner(dataClient, id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
