import { NextResponse } from "next/server";

import { query } from "@/lib/db";
import { requireAdminRequest } from "@/lib/supabase-admin";

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

async function listMethods() {
  const [methodsResult, tiersResult] = await Promise.all([
    query<{ id: string }>("select * from public.international_shipping_methods order by sort_order asc, created_at desc"),
    query("select * from public.international_shipping_tiers order by sort_order asc, min_weight_kg asc"),
  ]);
  const tiersByMethod = new Map<string, unknown[]>();

  for (const tier of tiersResult.rows as Array<{ method_id: string }>) {
    const current = tiersByMethod.get(tier.method_id) ?? [];
    current.push(tier);
    tiersByMethod.set(tier.method_id, current);
  }

  return methodsResult.rows.map((method) => ({
    ...method,
    tiers: tiersByMethod.get(method.id) ?? [],
  }));
}

export async function GET(request: Request) {
  const auth = await requireAdminRequest(request);

  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  try {
    return NextResponse.json({ methods: await listMethods() });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load international shipping methods.",
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
    const payload = (await request.json()) as MethodPayload;

    if (!payload.name?.trim() || !payload.slug?.trim()) {
      return NextResponse.json({ error: "Name and slug are required." }, { status: 400 });
    }

    const methodResult = await query<{ id: string }>(
      `
        insert into public.international_shipping_methods (
          name, slug, description, delivery_min_days, delivery_max_days,
          minimum_weight_kg, sort_order, is_active
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8)
        returning id
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
      ],
    );
    const methodId = methodResult.rows[0].id;

    for (const [index, tier] of (payload.tiers ?? []).entries()) {
      await query(
        `
          insert into public.international_shipping_tiers (
            method_id, min_weight_kg, max_weight_kg, price_per_kg, sort_order
          )
          values ($1, $2, $3, $4, $5)
        `,
        [
          methodId,
          toNumber(tier.min_weight_kg, 0.1),
          toNullableNumber(tier.max_weight_kg),
          toNumber(tier.price_per_kg, 0),
          toNumber(tier.sort_order, index),
        ],
      );
    }

    const methods = await listMethods();
    return NextResponse.json({ method: methods.find((method: { id: string }) => method.id === methodId) ?? null }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to create international shipping method.",
      },
      { status: 500 },
    );
  }
}
