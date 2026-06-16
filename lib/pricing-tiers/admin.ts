import type { PgDataClient } from "@/lib/postgres-data-client";

import { normalizePricingTierProfile } from "@/lib/pricing-tiers/queries";
import type {
  PricingTierProfileRow,
  PricingTierProfileRowRecord,
  ProductPricingType,
} from "@/types/product-db";

type PricingTierProfileInput = {
  name: string;
  pricing_type: ProductPricingType;
  is_active: boolean;
  tiers: Array<{
    min_qty: number;
    max_qty: number | null;
    price: number;
    sort_order: number;
  }>;
};

type RawProfileQueryRow = {
  id: string;
  vendor_id?: string | null;
  name: string;
  pricing_type?: string | null;
  is_active?: boolean | null;
  created_at?: string | null;
  pricing_tier_profile_rows?: Array<{
    id: string;
    profile_id: string;
    min_qty: number | string;
    max_qty?: number | string | null;
    price: number | string;
    sort_order?: number | string | null;
    created_at?: string | null;
  }> | null;
};

function normalizeText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeInteger(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : fallback;
}

function normalizePositiveInteger(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 1 ? Math.trunc(parsed) : fallback;
}

function normalizePrice(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

export function parsePricingTierProfileInput(payload: unknown): PricingTierProfileInput {
  const source = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const rawTiers = Array.isArray(source.tiers) ? source.tiers : [];

  return {
    name: normalizeText(source.name) ?? "",
    pricing_type: source.pricing_type === "fixed" ? "fixed" : "unit",
    is_active: typeof source.is_active === "boolean" ? source.is_active : true,
    tiers: rawTiers.map((tier, index) => {
      const rawTier = tier && typeof tier === "object" ? (tier as Record<string, unknown>) : {};
      const maxQtyValue = rawTier.max_qty;
      const normalizedMaxQty =
        maxQtyValue === null || maxQtyValue === undefined || maxQtyValue === ""
          ? null
          : normalizePositiveInteger(maxQtyValue, 0);

      return {
        min_qty: normalizePositiveInteger(rawTier.min_qty, 1),
        max_qty: normalizedMaxQty && normalizedMaxQty > 0 ? normalizedMaxQty : null,
        price: normalizePrice(rawTier.price),
        sort_order: normalizeInteger(rawTier.sort_order, index),
      };
    }),
  };
}

export function validatePricingTierProfileInput(input: PricingTierProfileInput) {
  if (!input.name.trim()) {
    return "Profile name is required.";
  }

  if (input.tiers.length === 0) {
    return "Add at least one pricing tier row.";
  }

  const invalidTier = input.tiers.find(
    (tier) => tier.min_qty < 1 || (tier.max_qty !== null && tier.max_qty < tier.min_qty) || tier.price < 0,
  );

  if (invalidTier) {
    return "Each tier needs a valid quantity range and non-negative price.";
  }

  return null;
}

function getProfileSelect() {
  return "id, vendor_id, name, pricing_type, is_active, created_at, pricing_tier_profile_rows(id, profile_id, min_qty, max_qty, price, sort_order, created_at)";
}

async function fetchProfileById(dataClient: PgDataClient, id: string) {
  const { data, error } = await dataClient
    .from("pricing_tier_profiles")
    .select(getProfileSelect())
    .eq("id", id)
    .single();

  return {
    data: data ? normalizePricingTierProfile(data as unknown as RawProfileQueryRow) : null,
    error,
  };
}

export async function listAdminPricingTierProfiles(dataClient: PgDataClient) {
  const { data, error } = await dataClient
    .from("pricing_tier_profiles")
    .select(getProfileSelect())
    .order("created_at", { ascending: false });

  return {
    data: ((data ?? []) as unknown as RawProfileQueryRow[]).map(normalizePricingTierProfile),
    error,
  };
}

export async function listPricingTierProfilesForVendor(
  dataClient: PgDataClient,
  vendorId: string,
  options?: { includeInactive?: boolean },
) {
  let query = dataClient
    .from("pricing_tier_profiles")
    .select(getProfileSelect())
    .eq("vendor_id", vendorId)
    .order("created_at", { ascending: false });

  if (!options?.includeInactive) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;

  return {
    data: ((data ?? []) as unknown as RawProfileQueryRow[]).map(normalizePricingTierProfile),
    error,
  };
}

async function replaceProfileRows(
  dataClient: PgDataClient,
  profileId: string,
  tiers: PricingTierProfileInput["tiers"],
) {
  const { error: deleteError } = await dataClient
    .from("pricing_tier_profile_rows")
    .delete()
    .eq("profile_id", profileId);

  if (deleteError) {
    return deleteError;
  }

  if (tiers.length === 0) {
    return null;
  }

  const rows = tiers.map((tier, index) => ({
    profile_id: profileId,
    min_qty: tier.min_qty,
    max_qty: tier.max_qty,
    price: tier.price,
    sort_order: tier.sort_order ?? index,
  })) satisfies Array<Pick<PricingTierProfileRowRecord, "profile_id" | "min_qty" | "max_qty" | "price" | "sort_order">>;

  const { error: insertError } = await dataClient.from("pricing_tier_profile_rows").insert(rows as never);
  return insertError;
}

export async function createAdminPricingTierProfile(
  dataClient: PgDataClient,
  input: PricingTierProfileInput,
) {
  const { data, error } = await dataClient
    .from("pricing_tier_profiles")
    .insert({
      vendor_id: null,
      name: input.name.trim(),
      pricing_type: input.pricing_type,
      is_active: input.is_active,
    } as never)
    .select("id")
    .single();

  if (error || !data) {
    return {
      data: null as PricingTierProfileRow | null,
      error,
    };
  }

  const tiersError = await replaceProfileRows(dataClient, (data as { id: string }).id, input.tiers);
  if (tiersError) {
    return {
      data: null as PricingTierProfileRow | null,
      error: tiersError,
    };
  }

  return fetchProfileById(dataClient, (data as { id: string }).id);
}

export async function createPricingTierProfileForVendor(
  dataClient: PgDataClient,
  vendorId: string,
  input: PricingTierProfileInput,
) {
  const { data, error } = await dataClient
    .from("pricing_tier_profiles")
    .insert({
      vendor_id: vendorId,
      name: input.name.trim(),
      pricing_type: input.pricing_type,
      is_active: input.is_active,
    } as never)
    .select("id")
    .single();

  if (error || !data) {
    return {
      data: null as PricingTierProfileRow | null,
      error,
    };
  }

  const tiersError = await replaceProfileRows(dataClient, (data as { id: string }).id, input.tiers);
  if (tiersError) {
    return {
      data: null as PricingTierProfileRow | null,
      error: tiersError,
    };
  }

  return fetchProfileById(dataClient, (data as { id: string }).id);
}

export async function updateAdminPricingTierProfile(
  dataClient: PgDataClient,
  id: string,
  input: PricingTierProfileInput,
) {
  const { error } = await dataClient
    .from("pricing_tier_profiles")
    .update({
      name: input.name.trim(),
      pricing_type: input.pricing_type,
      is_active: input.is_active,
    } as never)
    .eq("id", id);

  if (error) {
    return {
      data: null as PricingTierProfileRow | null,
      error,
    };
  }

  const tiersError = await replaceProfileRows(dataClient, id, input.tiers);
  if (tiersError) {
    return {
      data: null as PricingTierProfileRow | null,
      error: tiersError,
    };
  }

  return fetchProfileById(dataClient, id);
}

export async function updatePricingTierProfileForVendor(
  dataClient: PgDataClient,
  id: string,
  vendorId: string,
  input: PricingTierProfileInput,
) {
  const { error } = await dataClient
    .from("pricing_tier_profiles")
    .update({
      name: input.name.trim(),
      pricing_type: input.pricing_type,
      is_active: input.is_active,
    } as never)
    .eq("id", id)
    .eq("vendor_id", vendorId);

  if (error) {
    return {
      data: null as PricingTierProfileRow | null,
      error,
    };
  }

  const tiersError = await replaceProfileRows(dataClient, id, input.tiers);
  if (tiersError) {
    return {
      data: null as PricingTierProfileRow | null,
      error: tiersError,
    };
  }

  return fetchProfileById(dataClient, id);
}
