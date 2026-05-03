import { NextResponse } from "next/server";

import { getAuthenticatedUserFromRequest, getSupabaseServiceRoleClient } from "@/lib/supabase-admin";
import { normalizeCndsProfile } from "@/lib/cnds/queries";

type RawCndsProfileLookupRow = {
  id: string;
  vendor_id?: string | null;
  name: string;
  description?: string | null;
  pricing_type?: string | null;
  is_active?: boolean | null;
  created_at?: string | null;
  cnds_shipping_tiers?: Array<{
    id: string;
    profile_id: string;
    min_qty: number | string;
    max_qty?: number | string | null;
    price: number | string;
    sort_order?: number | string | null;
    created_at?: string | null;
  }> | null;
};

export async function POST(request: Request) {
  const authResult = await getAuthenticatedUserFromRequest(request);

  if (authResult.error || !authResult.user) {
    return NextResponse.json({ error: authResult.error ?? "Unauthorized." }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as { ids?: unknown };
    const ids = Array.isArray(body.ids)
      ? Array.from(new Set(body.ids.filter((value): value is string => typeof value === "string" && value.length > 0)))
      : [];

    if (ids.length === 0) {
      return NextResponse.json({ profiles: [] });
    }

    const supabase = getSupabaseServiceRoleClient();
    const { data, error } = await supabase
      .from("cnds_shipping_profiles")
      .select(
        "id, vendor_id, name, description, pricing_type, is_active, created_at, cnds_shipping_tiers(id, profile_id, min_qty, max_qty, price, sort_order, created_at)",
      )
      .in("id", ids)
      .eq("is_active", true)
      .not("vendor_id", "is", null);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      profiles: ((data ?? []) as RawCndsProfileLookupRow[]).map(normalizeCndsProfile),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to load CNDS profiles.",
      },
      { status: 500 },
    );
  }
}
