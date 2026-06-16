import { NextResponse } from "next/server";

import {
  createHomepageBanner,
  listHomepageBanners,
  parseHomepageBannerInput,
} from "@/lib/homepage/admin";
import { getDatabaseServiceClient, requireAdminRequest } from "@/lib/auth/request";

export async function GET(request: Request) {
  const auth = await requireAdminRequest(request);

  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  const dataClient = getDatabaseServiceClient();
  const result = await listHomepageBanners(dataClient);

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
  const dataClient = getDatabaseServiceClient();
  const result = await createHomepageBanner(dataClient, payload);

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  return NextResponse.json({ banner: result.data });
}
