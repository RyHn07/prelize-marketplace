import { NextResponse } from "next/server";

import {
  getVendorReviewNotificationState,
  listVendorReviewRows,
  markVendorReviewNotificationsRead,
} from "@/lib/reviews";
import { getAuthenticatedUserFromRequest, getSupabaseServiceRoleClient } from "@/lib/supabase-admin";

async function getActiveVendorMembership(userId: string) {
  const supabase = getSupabaseServiceRoleClient();
  const { data, error } = await supabase
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

export async function GET(request: Request) {
  const auth = await getAuthenticatedUserFromRequest(request);

  if (auth.error || !auth.user) {
    return NextResponse.json({ error: auth.error ?? "Unauthorized." }, { status: 401 });
  }

  try {
    const membershipResult = await getActiveVendorMembership(auth.user.id);

    if (membershipResult.error) {
      return NextResponse.json({ error: membershipResult.error.message }, { status: 500 });
    }

    if (!membershipResult.data?.vendor_id) {
      return NextResponse.json({ error: "No vendor account found." }, { status: 403 });
    }

    const supabase = getSupabaseServiceRoleClient();
    const [reviewResult, stateResult] = await Promise.all([
      listVendorReviewRows(membershipResult.data.vendor_id, supabase),
      getVendorReviewNotificationState(auth.user.id, membershipResult.data.vendor_id, supabase),
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
  const auth = await getAuthenticatedUserFromRequest(request);

  if (auth.error || !auth.user) {
    return NextResponse.json({ error: auth.error ?? "Unauthorized." }, { status: 401 });
  }

  try {
    const membershipResult = await getActiveVendorMembership(auth.user.id);

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

    const supabase = getSupabaseServiceRoleClient();
    const result = await markVendorReviewNotificationsRead(auth.user.id, membershipResult.data.vendor_id, supabase);

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
