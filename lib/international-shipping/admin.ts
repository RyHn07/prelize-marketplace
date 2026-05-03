import type { SupabaseClient } from "@supabase/supabase-js";

import { normalizeInternationalShippingMethod } from "@/lib/international-shipping/queries";
import type { InternationalShippingMethodRow, InternationalShippingTierRow } from "@/types/product-db";

type RawMethodQueryRow = {
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
  international_shipping_tiers?: Array<{
    id: string;
    method_id: string;
    min_weight_kg: number | string;
    max_weight_kg?: number | string | null;
    price_per_kg: number | string;
    sort_order?: number | string | null;
    created_at?: string | null;
  }> | null;
};

type InternationalShippingMethodInput = {
  name: string;
  slug: string;
  description: string | null;
  delivery_min_days: number | null;
  delivery_max_days: number | null;
  minimum_weight_kg: number;
  is_active: boolean;
  sort_order: number;
  tiers: Array<{
    min_weight_kg: number;
    max_weight_kg: number | null;
    price_per_kg: number;
    sort_order: number;
  }>;
};

function normalizeText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeInteger(value: unknown, fallback: number | null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
}

function normalizeNonNegativeNumber(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export function parseInternationalShippingMethodInput(payload: unknown): InternationalShippingMethodInput {
  const source = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const rawTiers = Array.isArray(source.tiers) ? source.tiers : [];

  return {
    name: normalizeText(source.name) ?? "",
    slug: normalizeText(source.slug) ?? "",
    description: normalizeText(source.description),
    delivery_min_days: normalizeInteger(source.delivery_min_days, null),
    delivery_max_days: normalizeInteger(source.delivery_max_days, null),
    minimum_weight_kg: normalizeNonNegativeNumber(source.minimum_weight_kg, 0.1),
    is_active: typeof source.is_active === "boolean" ? source.is_active : true,
    sort_order: normalizeInteger(source.sort_order, 0) ?? 0,
    tiers: rawTiers.map((tier, index) => {
      const rawTier = tier && typeof tier === "object" ? (tier as Record<string, unknown>) : {};
      const maxWeightValue = rawTier.max_weight_kg;
      const normalizedMaxWeight =
        maxWeightValue === null || maxWeightValue === undefined || maxWeightValue === ""
          ? null
          : normalizeNonNegativeNumber(maxWeightValue, 0);

      return {
        min_weight_kg: normalizeNonNegativeNumber(rawTier.min_weight_kg, 0),
        max_weight_kg: normalizedMaxWeight !== null ? normalizedMaxWeight : null,
        price_per_kg: normalizeNonNegativeNumber(rawTier.price_per_kg, 0),
        sort_order: normalizeInteger(rawTier.sort_order, index) ?? index,
      };
    }),
  };
}

export function validateInternationalShippingMethodInput(input: InternationalShippingMethodInput) {
  if (!input.name.trim()) {
    return "Method name is required.";
  }

  if (!input.slug.trim()) {
    return "Method slug is required.";
  }

  if (input.delivery_min_days !== null && input.delivery_max_days !== null && input.delivery_max_days < input.delivery_min_days) {
    return "Delivery max days must be greater than or equal to min days.";
  }

  if (input.minimum_weight_kg < 0) {
    return "Minimum weight must be zero or greater.";
  }

  if (input.tiers.length === 0) {
    return "Add at least one international shipping tier.";
  }

  const invalidTier = input.tiers.find(
    (tier) => tier.min_weight_kg < 0 || (tier.max_weight_kg !== null && tier.max_weight_kg < tier.min_weight_kg) || tier.price_per_kg < 0,
  );

  if (invalidTier) {
    return "Each tier needs a valid weight range and non-negative price per kg.";
  }

  return null;
}

async function fetchMethodById(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase
    .from("international_shipping_methods")
    .select(
      "id, name, slug, description, delivery_min_days, delivery_max_days, minimum_weight_kg, is_active, sort_order, created_at, international_shipping_tiers(id, method_id, min_weight_kg, max_weight_kg, price_per_kg, sort_order, created_at)",
    )
    .eq("id", id)
    .single();

  return {
    data: data ? normalizeInternationalShippingMethod(data as RawMethodQueryRow) : null,
    error,
  };
}

async function replaceMethodTiers(
  supabase: SupabaseClient,
  methodId: string,
  tiers: InternationalShippingMethodInput["tiers"],
) {
  const { error: deleteError } = await supabase.from("international_shipping_tiers").delete().eq("method_id", methodId);

  if (deleteError) {
    return deleteError;
  }

  if (tiers.length === 0) {
    return null;
  }

  const rows = tiers.map((tier, index) => ({
    method_id: methodId,
    min_weight_kg: tier.min_weight_kg,
    max_weight_kg: tier.max_weight_kg,
    price_per_kg: tier.price_per_kg,
    sort_order: tier.sort_order ?? index,
  })) satisfies Array<
    Pick<InternationalShippingTierRow, "method_id" | "min_weight_kg" | "max_weight_kg" | "price_per_kg" | "sort_order">
  >;

  const { error: insertError } = await supabase.from("international_shipping_tiers").insert(rows as never);
  return insertError;
}

export async function createInternationalShippingMethod(
  supabase: SupabaseClient,
  input: InternationalShippingMethodInput,
) {
  const { data, error } = await supabase
    .from("international_shipping_methods")
    .insert({
      name: input.name.trim(),
      slug: input.slug.trim(),
      description: input.description,
      delivery_min_days: input.delivery_min_days,
      delivery_max_days: input.delivery_max_days,
      minimum_weight_kg: input.minimum_weight_kg,
      is_active: input.is_active,
      sort_order: input.sort_order,
    } as never)
    .select("id")
    .single();

  if (error || !data) {
    return {
      data: null as InternationalShippingMethodRow | null,
      error,
    };
  }

  const tiersError = await replaceMethodTiers(supabase, (data as { id: string }).id, input.tiers);

  if (tiersError) {
    return {
      data: null as InternationalShippingMethodRow | null,
      error: tiersError,
    };
  }

  return fetchMethodById(supabase, (data as { id: string }).id);
}

export async function updateInternationalShippingMethod(
  supabase: SupabaseClient,
  id: string,
  input: InternationalShippingMethodInput,
) {
  const { error } = await supabase
    .from("international_shipping_methods")
    .update({
      name: input.name.trim(),
      slug: input.slug.trim(),
      description: input.description,
      delivery_min_days: input.delivery_min_days,
      delivery_max_days: input.delivery_max_days,
      minimum_weight_kg: input.minimum_weight_kg,
      is_active: input.is_active,
      sort_order: input.sort_order,
    } as never)
    .eq("id", id);

  if (error) {
    return {
      data: null as InternationalShippingMethodRow | null,
      error,
    };
  }

  const tiersError = await replaceMethodTiers(supabase, id, input.tiers);

  if (tiersError) {
    return {
      data: null as InternationalShippingMethodRow | null,
      error: tiersError,
    };
  }

  return fetchMethodById(supabase, id);
}
