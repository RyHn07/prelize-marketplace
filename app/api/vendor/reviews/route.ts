import { NextResponse } from "next/server";

import { getCurrentUserFromCookie, type AuthUser } from "@/lib/auth/session";
import { query } from "@/lib/db";
import {
  getVendorReviewNotificationState,
  listVendorReviewRows,
  markVendorReviewNotificationsRead,
} from "@/lib/reviews";
import { getAuthenticatedUserFromRequest, getDatabaseServiceClient } from "@/lib/auth/request";

async function getActiveVendorMembership(userId: string) {
  if (!process.env.DATABASE_URL || !process.env.DATABASE_URL) {
    const result = await query<{ vendor_id: string; status: string }>(
      `
        select vendor_id, status
        from public.vendor_members
        where user_id = $1 and status = 'active'
        order by created_at desc
        limit 1
      `,
      [userId],
    );

    return {
      data: result.rows[0] ?? null,
      error: null,
    };
  }

  const dataClient = getDatabaseServiceClient();
  const { data, error } = await dataClient
    .from("vendor_members")
    .select("vendor_id, status")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return {
      data: null as { vendor_id: string; status: string } | null,
      error,
    };
  }

  return {
    data: (data as { vendor_id: string; status: string } | null) ?? null,
    error: null,
  };
}

async function getRequestUser(request: Request): Promise<{ id: string; email?: string | null } | AuthUser | null> {
  const auth = await getAuthenticatedUserFromRequest(request);

  if (!auth.error && auth.user) {
    return auth.user;
  }

  return getCurrentUserFromCookie();
}

async function listVendorReviewsFromVps(userId: string, vendorId: string) {
  const [reviewsResult, stateResult] = await Promise.all([
    query<{
      id: string;
      product_name: string;
      product_slug: string;
      user_email: string | null;
      rating: number;
      title: string | null;
      comment: string;
      created_at: string;
    }>(
      `
        select
          product_reviews.id,
          products.name as product_name,
          products.slug as product_slug,
          product_reviews.user_email,
          product_reviews.rating,
          product_reviews.title,
          product_reviews.comment,
          product_reviews.created_at
        from public.product_reviews
        join public.products on products.id = product_reviews.product_id
        where product_reviews.vendor_id = $1
        order by product_reviews.created_at desc
      `,
      [vendorId],
    ),
    query<{ last_read_at: string }>(
      `
        select last_read_at
        from public.vendor_review_notification_states
        where user_id = $1 and vendor_id = $2
        limit 1
      `,
      [userId, vendorId],
    ),
  ]);
  const lastReadAt = stateResult.rows[0]?.last_read_at ?? "1970-01-01T00:00:00.000Z";
  const unreadBoundary = new Date(lastReadAt).getTime();
  const unreadCount = reviewsResult.rows.filter(
    (review) => new Date(review.created_at).getTime() > unreadBoundary,
  ).length;

  return {
    data: reviewsResult.rows,
    unreadCount,
    lastReadAt,
  };
}

async function markVendorReviewsReadInVps(userId: string, vendorId: string) {
  const now = new Date().toISOString();

  await query(
    `
      insert into public.vendor_review_notification_states (user_id, vendor_id, last_read_at, updated_at)
      values ($1, $2, $3, $3)
      on conflict (user_id, vendor_id)
      do update set last_read_at = excluded.last_read_at, updated_at = excluded.updated_at
    `,
    [userId, vendorId, now],
  );

  return { lastReadAt: now };
}

export async function GET(request: Request) {
  const user = await getRequestUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const membershipResult = await getActiveVendorMembership(user.id);

    if (membershipResult.error) {
      return NextResponse.json({ error: membershipResult.error.message }, { status: 500 });
    }

    if (!membershipResult.data?.vendor_id) {
      return NextResponse.json({ error: "No vendor account found." }, { status: 403 });
    }

    if (!process.env.DATABASE_URL || !process.env.DATABASE_URL) {
      return NextResponse.json(await listVendorReviewsFromVps(user.id, membershipResult.data.vendor_id));
    }

    const dataClient = getDatabaseServiceClient();
    const [reviewResult, stateResult] = await Promise.all([
      listVendorReviewRows(membershipResult.data.vendor_id, dataClient),
      getVendorReviewNotificationState(user.id, membershipResult.data.vendor_id, dataClient),
    ]);

    if (reviewResult.error) {
      return NextResponse.json({ error: reviewResult.error.message }, { status: 400 });
    }

    const unreadBoundary = new Date(stateResult.data.last_read_at).getTime();
    const unreadCount = reviewResult.data.filter(
      (review) => new Date(review.created_at).getTime() > unreadBoundary,
    ).length;

    return NextResponse.json({
      data: reviewResult.data,
      unreadCount,
      lastReadAt: stateResult.data.last_read_at,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to load vendor reviews.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const user = await getRequestUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const membershipResult = await getActiveVendorMembership(user.id);

    if (membershipResult.error) {
      return NextResponse.json({ error: membershipResult.error.message }, { status: 500 });
    }

    if (!membershipResult.data?.vendor_id) {
      return NextResponse.json({ error: "No vendor account found." }, { status: 403 });
    }

    const body = (await request.json().catch(() => ({}))) as { action?: string };

    if (body.action !== "mark_all_read") {
      return NextResponse.json({ error: "Unsupported review action." }, { status: 400 });
    }

    if (!process.env.DATABASE_URL || !process.env.DATABASE_URL) {
      return NextResponse.json(await markVendorReviewsReadInVps(user.id, membershipResult.data.vendor_id));
    }

    const dataClient = getDatabaseServiceClient();
    const result = await markVendorReviewNotificationsRead(user.id, membershipResult.data.vendor_id, dataClient);

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 400 });
    }

    return NextResponse.json(result.data);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to update vendor review notifications.",
      },
      { status: 500 },
    );
  }
}
