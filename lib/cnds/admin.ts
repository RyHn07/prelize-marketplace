import type { SupabaseClient } from "@supabase/supabase-js";

import { normalizeCndsProfile } from "@/lib/cnds/queries";
import type {
  CndsShippingPricingType,
  CndsShippingProfileRow,
  CndsShippingTierRow,
} from "@/types/product-db";

type CndsProfileInput = {
  name: string;
  description: string | null;
  pricing_type: CndsShippingPricingType;
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

export function parseCndsProfileInput(payload: unknown): CndsProfileInput {
  const source = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const rawTiers = Array.isArray(source.tiers) ? source.tiers : [];

  return {
    name: normalizeText(source.name) ?? "",
    description: normalizeText(source.description),
    pricing_type: source.pricing_type === "unit" ? "unit" : "fixed",
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

export type ParsedCndsProfileInput = CndsProfileInput;

export function validateCndsProfileInput(input: CndsProfileInput) {
  if (!input.name.trim()) {
    return "Profile name is required.";
  }

  if (input.tiers.length === 0) {
    return "Add at least one CNDS shipping tier.";
  }

  const invalidTier = input.tiers.find(
    (tier) => tier.min_qty < 1 || (tier.max_qty !== null && tier.max_qty < tier.min_qty) || tier.price < 0,
  );

  if (invalidTier) {
    return "Each CNDS tier needs a valid quantity range and non-negative price.";
  }

  return null;
}

async function fetchProfileById(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase
    .from("cnds_shipping_profiles")
    .select(
      "id, vendor_id, name, description, pricing_type, is_active, created_at, cnds_shipping_tiers(id, profile_id, min_qty, max_qty, price, sort_order, created_at)",
    )
    .eq("id", id)
    .single();

  return {
    data: data ? normalizeCndsProfile(data as RawProfileQueryRow) : null,
    error,
  };
}

export async function listAdminCndsProfiles(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("cnds_shipping_profiles")
    .select(
      "id, vendor_id, name, description, pricing_type, is_active, created_at, cnds_shipping_tiers(id, profile_id, min_qty, max_qty, price, sort_order, created_at)",
    )
    .order("created_at", { ascending: false });

  return {
    data: ((data ?? []) as RawProfileQueryRow[]).map(normalizeCndsProfile),
    error,
  };
}

export async function listCndsProfilesForVendor(
  supabase: SupabaseClient,
  vendorId: string,
  options?: { includeInactive?: boolean },
) {
  let query = supabase
    .from("cnds_shipping_profiles")
    .select(
      "id, vendor_id, name, description, pricing_type, is_active, created_at, cnds_shipping_tiers(id, profile_id, min_qty, max_qty, price, sort_order, created_at)",
    )
    .eq("vendor_id", vendorId)
    .order("created_at", { ascending: false });

  if (!options?.includeInactive) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;

  return {
    data: ((data ?? []) as RawProfileQueryRow[]).map(normalizeCndsProfile),
    error,
  };
}

async function replaceProfileTiers(
  supabase: SupabaseClient,
  profileId: string,
  tiers: CndsProfileInput["tiers"],
) {
  const { error: deleteError } = await supabase.from("cnds_shipping_tiers").delete().eq("profile_id", profileId);

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
  })) satisfies Array<Pick<CndsShippingTierRow, "profile_id" | "min_qty" | "max_qty" | "price" | "sort_order">>;

  const { error: insertError } = await supabase.from("cnds_shipping_tiers").insert(rows as never);
  return insertError;
}

export async function createAdminCndsProfile(supabase: SupabaseClient, input: CndsProfileInput) {
  const { data, error } = await supabase
    .from("cnds_shipping_profiles")
    .insert({
      vendor_id: null,
      name: input.name.trim(),
      description: input.description,
      pricing_type: input.pricing_type,
      is_active: input.is_active,
    } as never)
    .select("id")
    .single();

  if (error || !data) {
    return {
      data: null as CndsShippingProfileRow | null,
      error,
    };
  }

  const tiersError = await replaceProfileTiers(supabase, (data as { id: string }).id, input.tiers);
  if (tiersError) {
    return {
      data: null as CndsShippingProfileRow | null,
      error: tiersError,
    };
  }

  return fetchProfileById(supabase, (data as { id: string }).id);
}

export async function createCndsProfileForVendor(
  supabase: SupabaseClient,
  vendorId: string,
  input: CndsProfileInput,
) {
  const { data, error } = await supabase
    .from("cnds_shipping_profiles")
    .insert({
      vendor_id: vendorId,
      name: input.name.trim(),
      description: input.description,
      pricing_type: input.pricing_type,
      is_active: input.is_active,
    } as never)
    .select("id")
    .single();

  if (error || !data) {
    return {
      data: null as CndsShippingProfileRow | null,
      error,
    };
  }

  const tiersError = await replaceProfileTiers(supabase, (data as { id: string }).id, input.tiers);
  if (tiersError) {
    return {
      data: null as CndsShippingProfileRow | null,
      error: tiersError,
    };
  }

  return fetchProfileById(supabase, (data as { id: string }).id);
}

export async function updateAdminCndsProfile(
  supabase: SupabaseClient,
  id: string,
  input: CndsProfileInput,
) {
  const { error } = await supabase
    .from("cnds_shipping_profiles")
    .update({
      name: input.name.trim(),
      description: input.description,
      pricing_type: input.pricing_type,
      is_active: input.is_active,
    } as never)
    .eq("id", id);

  if (error) {
    return {
      data: null as CndsShippingProfileRow | null,
      error,
    };
  }

  const tiersError = await replaceProfileTiers(supabase, id, input.tiers);
  if (tiersError) {
    return {
      data: null as CndsShippingProfileRow | null,
      error: tiersError,
    };
  }

  return fetchProfileById(supabase, id);
}

export async function updateCndsProfileForVendor(
  supabase: SupabaseClient,
  id: string,
  vendorId: string,
  input: CndsProfileInput,
) {
  const { error } = await supabase
    .from("cnds_shipping_profiles")
    .update({
      name: input.name.trim(),
      description: input.description,
      pricing_type: input.pricing_type,
      is_active: input.is_active,
    } as never)
    .eq("id", id)
    .eq("vendor_id", vendorId);

  if (error) {
    return {
      data: null as CndsShippingProfileRow | null,
      error,
    };
  }

  const tiersError = await replaceProfileTiers(supabase, id, input.tiers);
  if (tiersError) {
    return {
      data: null as CndsShippingProfileRow | null,
      error: tiersError,
    };
  }

  return fetchProfileById(supabase, id);
}
