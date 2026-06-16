import { NextResponse } from "next/server";

import { requireAdminRequest } from "@/lib/supabase-admin";
import { query } from "@/lib/db";

type CndsPayload = {
  name?: string;
  description?: string | null;
  pricing_type?: "unit" | "fixed";
  is_active?: boolean;
  tiers?: Array<{
    min_qty?: number;
    max_qty?: number | null;
    price?: number;
    sort_order?: number;
  }>;
};

async function getProfile(id: string) {
  const [profileResult, tiersResult] = await Promise.all([
    query("select * from public.cnds_shipping_profiles where id = $1 limit 1", [id]),
    query("select * from public.cnds_shipping_tiers where profile_id = $1 order by sort_order asc, min_qty asc", [id]),
  ]);

  return profileResult.rows[0] ? { ...profileResult.rows[0], tiers: tiersResult.rows } : null;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminRequest(request);

  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  try {
    const { id } = await params;
    const payload = (await request.json().catch(() => null)) as CndsPayload | null;

    if (!payload?.name?.trim()) {
      return NextResponse.json({ error: "Profile name is required." }, { status: 400 });
    }

    await query(
      `
        update public.cnds_shipping_profiles
        set name = $1, description = $2, pricing_type = $3, is_active = $4
        where id = $5
      `,
      [payload.name.trim(), payload.description || null, payload.pricing_type || "fixed", payload.is_active ?? true, id],
    );
    await query("delete from public.cnds_shipping_tiers where profile_id = $1", [id]);

    for (const [index, tier] of (payload.tiers ?? []).entries()) {
      await query(
        `
          insert into public.cnds_shipping_tiers (profile_id, min_qty, max_qty, price, sort_order)
          values ($1, $2, $3, $4, $5)
        `,
        [
          id,
          Math.max(1, Number(tier.min_qty) || 1),
          tier.max_qty === null || tier.max_qty === undefined ? null : Math.max(1, Number(tier.max_qty) || 1),
          Math.max(0, Number(tier.price) || 0),
          Number(tier.sort_order) || index,
        ],
      );
    }

    return NextResponse.json({ profile: await getProfile(id) });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to update the CNDS shipping profile.",
      },
      { status: 500 },
    );
  }
}
