import { NextResponse } from "next/server";

import { getAuthenticatedUserFromRequest, getSupabaseServiceRoleClient } from "@/lib/supabase-admin";
import { createProductReview, ensureCustomerRole, listOrderReviewEligibility } from "@/lib/reviews";

type CreateReviewRequest = {
  productId?: string;
  orderId?: string;
  rating?: number;
  title?: string;
  comment?: string;
};

function normalizeOptionalText(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export async function POST(request: Request) {
  const auth = await getAuthenticatedUserFromRequest(request);

  if (auth.error || !auth.user) {
    return NextResponse.json({ error: auth.error ?? "Unauthorized." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as CreateReviewRequest;
    const productId = typeof body.productId === "string" ? body.productId : "";
    const orderId = typeof body.orderId === "string" ? body.orderId : "";
    const comment = typeof body.comment === "string" ? body.comment.trim() : "";
    const rating = Number(body.rating);
    const title = normalizeOptionalText(body.title);

    if (!productId || !orderId) {
      return NextResponse.json({ error: "Product and order are required." }, { status: 400 });
    }

    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Rating must be between 1 and 5." }, { status: 400 });
    }

    if (comment.length < 8) {
      return NextResponse.json({ error: "Review comment must be at least 8 characters long." }, { status: 400 });
    }

    const supabase = getSupabaseServiceRoleClient();
    const eligibilityResult = await listOrderReviewEligibility(
      auth.user.id,
      auth.user.email ?? null,
      orderId,
      supabase,
    );

    if (eligibilityResult.error) {
      return NextResponse.json(
        { error: eligibilityResult.error.message ?? "Unable to validate review eligibility." },
        { status: 400 },
      );
    }

    const eligibleItem = eligibilityResult.data.find((item) => item.product_id === productId) ?? null;

    if (!eligibleItem) {
      return NextResponse.json({ error: "This order does not contain the selected product." }, { status: 400 });
    }

    if (!eligibleItem.can_review) {
      return NextResponse.json(
        { error: "Reviews are only available after the product has been delivered." },
        { status: 400 },
      );
    }

    if (eligibleItem.review) {
      return NextResponse.json({ error: "You have already reviewed this product for this order." }, { status: 400 });
    }

    const roleResult = await ensureCustomerRole(auth.user.id, supabase);

    if (roleResult.error) {
      return NextResponse.json({ error: roleResult.error.message }, { status: 400 });
    }

    const reviewResult = await createProductReview(
      {
        product_id: eligibleItem.product_id,
        vendor_id: eligibleItem.vendor_id,
        order_id: eligibleItem.order_id,
        order_item_id: eligibleItem.order_item_id,
        user_id: auth.user.id,
        user_email: auth.user.email ?? null,
        rating,
        title,
        comment,
      },
      supabase,
    );

    if (reviewResult.error) {
      return NextResponse.json({ error: reviewResult.error.message }, { status: 400 });
    }

    return NextResponse.json({ data: reviewResult.data });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to submit the review.",
      },
      { status: 500 },
    );
  }
}
