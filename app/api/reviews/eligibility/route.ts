import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { listOrderReviewEligibility } from "@/lib/reviews";
import { getAuthenticatedUserFromRequest, getDatabaseServiceClient } from "@/lib/auth/request";

export async function GET(request: NextRequest) {
  const auth = await getAuthenticatedUserFromRequest(request);

  if (auth.error || !auth.user) {
    return NextResponse.json({ error: auth.error ?? "Unauthorized." }, { status: 401 });
  }

  try {
    const orderId = request.nextUrl.searchParams.get("orderId") ?? "";

    if (!orderId) {
      return NextResponse.json({ error: "orderId is required." }, { status: 400 });
    }

    const dataClient = getDatabaseServiceClient();
    const result = await listOrderReviewEligibility(auth.user.id, auth.user.email ?? null, orderId, dataClient);

    if (result.error) {
      return NextResponse.json(
        { error: result.error.message ?? "Unable to load review eligibility." },
        { status: 400 },
      );
    }

    return NextResponse.json({ data: result.data });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to load review eligibility.",
      },
      { status: 500 },
    );
  }
}
