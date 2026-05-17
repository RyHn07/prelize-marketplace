import { NextResponse } from "next/server";

import {
  listAdminNotifications,
  markAdminNotificationsRead,
  markAdminNotificationsReadUpTo,
} from "@/lib/admin-notifications";
import { getSupabaseServiceRoleClient, requireAdminRequest } from "@/lib/supabase-admin";

export async function GET(request: Request) {
  const auth = await requireAdminRequest(request);

  if (auth.errorResponse || !auth.user) {
    return auth.errorResponse;
  }

  try {
    const supabase = getSupabaseServiceRoleClient();
    const result = await listAdminNotifications(supabase, auth.user.id);

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to load notifications.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireAdminRequest(request);

  if (auth.errorResponse || !auth.user) {
    return auth.errorResponse;
  }

  try {
    const body = (await request.json().catch(() => ({}))) as { action?: string; occurredAt?: string };

    const supabase = getSupabaseServiceRoleClient();

    if (body.action === "mark_all_read") {
      const result = await markAdminNotificationsRead(supabase, auth.user.id);

      if (result.error) {
        return NextResponse.json({ error: result.error.message }, { status: 400 });
      }

      return NextResponse.json(result.data);
    }

    if (body.action === "mark_read_up_to") {
      const result = await markAdminNotificationsReadUpTo(
        supabase,
        auth.user.id,
        body.occurredAt ?? new Date().toISOString(),
      );

      if (result.error) {
        return NextResponse.json({ error: result.error.message }, { status: 400 });
      }

      return NextResponse.json(result.data);
    }

    {
      return NextResponse.json({ error: "Unsupported notification action." }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to update notifications.",
      },
      { status: 500 },
    );
  }
}
