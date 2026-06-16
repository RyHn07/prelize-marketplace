import { NextResponse } from "next/server";

import { query } from "@/lib/db";
import { requireAdminRequest } from "@/lib/supabase-admin";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type MethodPayload = {
  name?: string;
  slug?: string;
  description?: string | null;
  delivery_min_days?: string | number | null;
  delivery_max_days?: string | number | null;
  minimum_weight_kg?: string | number | null;
  sort_order?: string | number | null;
  is_active?: boolean;
  tiers?: Array<{
    min_weight_kg?: string | number | null;
    max_weight_kg?: string | number | null;
    price_per_kg?: string | number | null;
    sort_order?: string | number | null;
  }>;
};

function toNumber(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toNullableNumber(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function getMethod(id: string) {
  const [methodResult, tiersResult] = await Promise.all([
    query("select * from public.international_shipping_methods where id = $1 limit 1", [id]),
    query("select * from public.international_shipping_tiers where method_id = $1 order by sort_order asc, min_weight_kg asc", [id]),
  ]);

  return methodResult.rows[0] ? { ...methodResult.rows[0], tiers: tiersResult.rows } : null;
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdminRequest(request);

  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  try {
    const { id } = await context.params;
    const payload = (await request.json()) as MethodPayload;

    if (!payload.name?.trim() || !payload.slug?.trim()) {
      return NextResponse.json({ error: "Name and slug are required." }, { status: 400 });
    }

    await query(
      `
        update public.international_shipping_methods
        set name = $1,
            slug = $2,
            description = $3,
            delivery_min_days = $4,
            delivery_max_days = $5,
            minimum_weight_kg = $6,
            sort_order = $7,
            is_active = $8
        where id = $9
      `,
      [
        payload.name.trim(),
        payload.slug.trim(),
        payload.description || null,
        toNullableNumber(payload.delivery_min_days),
        toNullableNumber(payload.delivery_max_days),
        toNumber(payload.minimum_weight_kg, 0.1),
        toNumber(payload.sort_order, 0),
        payload.is_active ?? true,
        id,
      ],
    );
    await query("delete from public.international_shipping_tiers where method_id = $1", [id]);

    for (const [index, tier] of (payload.tiers ?? []).entries()) {
      await query(
        `
          insert into public.international_shipping_tiers (
            method_id, min_weight_kg, max_weight_kg, price_per_kg, sort_order
          )
          values ($1, $2, $3, $4, $5)
        `,
        [
          id,
          toNumber(tier.min_weight_kg, 0.1),
          toNullableNumber(tier.max_weight_kg),
          toNumber(tier.price_per_kg, 0),
          toNumber(tier.sort_order, index),
        ],
      );
    }

    return NextResponse.json({ method: await getMethod(id) });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to update international shipping method.",
      },
      { status: 500 },
    );
  }
}
