import type { SupabaseClient } from "@supabase/supabase-js";

import type { InternationalShippingMethodRow, InternationalShippingTierRow } from "@/types/product-db";

type RawTierRow = {
  id: string;
  method_id: string;
  min_weight_kg: number | string;
  max_weight_kg?: number | string | null;
  price_per_kg: number | string;
  sort_order?: number | string | null;
  created_at?: string | null;
};

type RawMethodRow = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  delivery_min_days?: number | string | null;
  delivery_max_days?: number | string | null;
  minimum_weight_kg?: number | string | null;
  is_active?: boolean | null;
  sort_order?: number | string | null;
  created_at?: string | null;
  international_shipping_tiers?: RawTierRow[] | null;
};

function toNumber(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toInteger(value: unknown, fallback: number | null) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.trunc(parsed);
}

function normalizeTier(row: RawTierRow): InternationalShippingTierRow {
  return {
    id: row.id,
    method_id: row.method_id,
    min_weight_kg: toNumber(row.min_weight_kg, 0),
    max_weight_kg: row.max_weight_kg === null || row.max_weight_kg === undefined ? null : toNumber(row.max_weight_kg, 0),
    price_per_kg: toNumber(row.price_per_kg, 0),
    sort_order: toInteger(row.sort_order, 0) ?? 0,
    created_at: row.created_at ?? null,
  };
}

export function normalizeInternationalShippingMethod(row: RawMethodRow): InternationalShippingMethodRow {
  const tiers = Array.isArray(row.international_shipping_tiers)
    ? row.international_shipping_tiers.map(normalizeTier).sort((left, right) => left.sort_order - right.sort_order)
    : [];

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? null,
    delivery_min_days: toInteger(row.delivery_min_days, null),
    delivery_max_days: toInteger(row.delivery_max_days, null),
    minimum_weight_kg: toNumber(row.minimum_weight_kg, 0.1),
    is_active: row.is_active ?? true,
    sort_order: toInteger(row.sort_order, 0) ?? 0,
    created_at: row.created_at ?? null,
    tiers,
  };
}

async function listMethods(
  supabase: SupabaseClient,
  options?: { activeOnly?: boolean },
) {
  let query = supabase
    .from("international_shipping_methods")
    .select(
      "id, name, slug, description, delivery_min_days, delivery_max_days, minimum_weight_kg, is_active, sort_order, created_at, international_shipping_tiers(id, method_id, min_weight_kg, max_weight_kg, price_per_kg, sort_order, created_at)",
    )
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (options?.activeOnly) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;

  return {
    data: ((data ?? []) as RawMethodRow[]).map(normalizeInternationalShippingMethod),
    error,
  };
}

export async function getActiveInternationalShippingMethods(supabase: SupabaseClient) {
  return listMethods(supabase, { activeOnly: true });
}

export async function getAdminInternationalShippingMethods(supabase: SupabaseClient) {
  return listMethods(supabase);
}
