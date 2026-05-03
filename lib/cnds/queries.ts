import { getSupabaseClient } from "@/lib/supabase-client";
import type {
  CndsShippingPricingType,
  CndsShippingProfileOption,
  CndsShippingProfileRow,
  CndsShippingTierRow,
} from "@/types/product-db";

type RawCndsProfileRow = {
  id: string;
  vendor_id?: string | null;
  name: string;
  description?: string | null;
  pricing_type?: string | null;
  is_active?: boolean | null;
  created_at?: string | null;
  cnds_shipping_tiers?: RawCndsTierRow[] | null;
};

type RawCndsTierRow = {
  id: string;
  profile_id: string;
  min_qty: number | string;
  max_qty?: number | string | null;
  price: number | string;
  sort_order?: number | string | null;
  created_at?: string | null;
};

function normalizePricingType(value: unknown): CndsShippingPricingType {
  return value === "unit" ? "unit" : "fixed";
}

function normalizeTier(row: RawCndsTierRow): CndsShippingTierRow {
  const minQty = Number(row.min_qty);
  const maxQty =
    row.max_qty === null || row.max_qty === undefined || row.max_qty === ""
      ? null
      : Number(row.max_qty);
  const price = Number(row.price);
  const sortOrder =
    row.sort_order === null || row.sort_order === undefined || row.sort_order === ""
      ? 0
      : Number(row.sort_order);

  return {
    id: row.id,
    profile_id: row.profile_id,
    min_qty: Number.isFinite(minQty) && minQty > 0 ? minQty : 1,
    max_qty: Number.isFinite(maxQty ?? NaN) && (maxQty ?? 0) > 0 ? (maxQty as number) : null,
    price: Number.isFinite(price) ? price : 0,
    sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
    created_at: row.created_at ?? null,
  };
}

function sortTiers(tiers: CndsShippingTierRow[]) {
  return [...tiers].sort((left, right) => {
    if (left.sort_order !== right.sort_order) {
      return left.sort_order - right.sort_order;
    }

    return left.min_qty - right.min_qty;
  });
}

export function normalizeCndsProfile(row: RawCndsProfileRow): CndsShippingProfileRow {
  const tiers = Array.isArray(row.cnds_shipping_tiers)
    ? sortTiers(row.cnds_shipping_tiers.map(normalizeTier))
    : [];

  return {
    id: row.id,
    vendor_id: typeof row.vendor_id === "string" ? row.vendor_id : null,
    name: typeof row.name === "string" ? row.name : "CNDS Profile",
    description: typeof row.description === "string" ? row.description : null,
    pricing_type: normalizePricingType(row.pricing_type),
    is_active: typeof row.is_active === "boolean" ? row.is_active : true,
    created_at: row.created_at ?? null,
    tiers,
  };
}

function toProfileOption(profile: CndsShippingProfileRow): CndsShippingProfileOption {
  return {
    id: profile.id,
    vendor_id: profile.vendor_id,
    name: profile.name,
    description: profile.description,
    pricing_type: profile.pricing_type,
    is_active: profile.is_active,
    tiers: profile.tiers,
  };
}

export async function getActiveCndsShippingProfiles() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("cnds_shipping_profiles")
    .select(
      "id, vendor_id, name, description, pricing_type, is_active, created_at, cnds_shipping_tiers(id, profile_id, min_qty, max_qty, price, sort_order, created_at)",
    )
    .is("vendor_id", null)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  return {
    data: ((data ?? []) as RawCndsProfileRow[]).map(normalizeCndsProfile).map(toProfileOption),
    error,
  };
}

export async function getActiveCndsShippingProfilesByIds(profileIds: string[]) {
  const uniqueProfileIds = Array.from(new Set(profileIds.filter(Boolean)));

  if (uniqueProfileIds.length === 0) {
    return {
      data: [] as CndsShippingProfileOption[],
      error: null,
    };
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("cnds_shipping_profiles")
    .select(
      "id, vendor_id, name, description, pricing_type, is_active, created_at, cnds_shipping_tiers(id, profile_id, min_qty, max_qty, price, sort_order, created_at)",
    )
    .in("id", uniqueProfileIds)
    .is("vendor_id", null)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  return {
    data: ((data ?? []) as RawCndsProfileRow[]).map(normalizeCndsProfile).map(toProfileOption),
    error,
  };
}

export async function getCndsShippingProfilesForVendor(
  vendorId: string,
  options?: { includeInactive?: boolean },
) {
  if (!vendorId) {
    return {
      data: [] as CndsShippingProfileOption[],
      error: null,
    };
  }

  const supabase = getSupabaseClient();
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
    data: ((data ?? []) as RawCndsProfileRow[]).map(normalizeCndsProfile).map(toProfileOption),
    error,
  };
}
