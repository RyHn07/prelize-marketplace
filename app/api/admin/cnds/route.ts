import { NextResponse } from "next/server";

import { query } from "@/lib/db";
import { requireAdminRequest } from "@/lib/auth/request";

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

async function listProfiles() {
  const [profilesResult, tiersResult] = await Promise.all([
    query<{ id: string }>("select * from public.cnds_shipping_profiles order by created_at desc"),
    query("select * from public.cnds_shipping_tiers order by sort_order asc, min_qty asc"),
  ]);
  const tiersByProfile = new Map<string, unknown[]>();

  for (const tier of tiersResult.rows as Array<{ profile_id: string }>) {
    const current = tiersByProfile.get(tier.profile_id) ?? [];
    current.push(tier);
    tiersByProfile.set(tier.profile_id, current);
  }

  return profilesResult.rows.map((profile) => ({
    ...profile,
    tiers: tiersByProfile.get(profile.id) ?? [],
  }));
}

export async function GET(request: Request) {
  const auth = await requireAdminRequest(request);

  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  try {
    return NextResponse.json({ profiles: await listProfiles() });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to load CNDS shipping profiles.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireAdminRequest(request);

  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  try {
    const payload = (await request.json().catch(() => null)) as CndsPayload | null;

    if (!payload?.name?.trim()) {
      return NextResponse.json({ error: "Profile name is required." }, { status: 400 });
    }

    const profileResult = await query<{ id: string }>(
      `
        insert into public.cnds_shipping_profiles (vendor_id, name, description, pricing_type, is_active)
        values (null, $1, $2, $3, $4)
        returning id
      `,
      [payload.name.trim(), payload.description || null, payload.pricing_type || "fixed", payload.is_active ?? true],
    );
    const profileId = profileResult.rows[0].id;

    for (const [index, tier] of (payload.tiers ?? []).entries()) {
      await query(
        `
          insert into public.cnds_shipping_tiers (profile_id, min_qty, max_qty, price, sort_order)
          values ($1, $2, $3, $4, $5)
        `,
        [
          profileId,
          Math.max(1, Number(tier.min_qty) || 1),
          tier.max_qty === null || tier.max_qty === undefined ? null : Math.max(1, Number(tier.max_qty) || 1),
          Math.max(0, Number(tier.price) || 0),
          Number(tier.sort_order) || index,
        ],
      );
    }

    const profiles = await listProfiles();
    return NextResponse.json({ profile: profiles.find((profile: { id: string }) => profile.id === profileId) ?? null });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to create the CNDS shipping profile.",
      },
      { status: 500 },
    );
  }
}
