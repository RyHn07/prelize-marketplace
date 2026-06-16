import { getPgDataClient } from "@/lib/browser-app-client";
import type {
  PricingTierProfileOption,
  PricingTierProfileRow,
  PricingTierProfileRowRecord,
  ProductPricingType,
} from "@/types/product-db";

type RawPricingTierProfileRow = {
  id: string;
  vendor_id?: string | null;
  name: string;
  pricing_type?: string | null;
  is_active?: boolean | null;
  created_at?: string | null;
  pricing_tier_profile_rows?: RawPricingTierProfileRowRecord[] | null;
};

type RawPricingTierProfileRowRecord = {
  id: string;
  profile_id: string;
  min_qty: number | string;
  max_qty?: number | string | null;
  price: number | string;
  sort_order?: number | string | null;
  created_at?: string | null;
};

function isMissingRelationError(message: string) {
  const normalizedMessage = message.toLowerCase();

  return (
    normalizedMessage.includes("relation") ||
    normalizedMessage.includes("does not exist") ||
    normalizedMessage.includes("could not find")
  );
}

function normalizePricingType(value: unknown): ProductPricingType {
  return value === "fixed" ? "fixed" : "unit";
}

function normalizeRowRecord(row: RawPricingTierProfileRowRecord): PricingTierProfileRowRecord {
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
    price: Number.isFinite(price) && price >= 0 ? price : 0,
    sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
    created_at: row.created_at ?? null,
  };
}

function sortRows(rows: PricingTierProfileRowRecord[]) {
  return [...rows].sort((left, right) => {
    if (left.sort_order !== right.sort_order) {
      return left.sort_order - right.sort_order;
    }

    return left.min_qty - right.min_qty;
  });
}

export function normalizePricingTierProfile(row: RawPricingTierProfileRow): PricingTierProfileRow {
  const rows = Array.isArray(row.pricing_tier_profile_rows)
    ? sortRows(row.pricing_tier_profile_rows.map(normalizeRowRecord))
    : [];

  return {
    id: row.id,
    vendor_id: typeof row.vendor_id === "string" ? row.vendor_id : null,
    name: typeof row.name === "string" && row.name.trim().length > 0 ? row.name : "Pricing Profile",
    pricing_type: normalizePricingType(row.pricing_type),
    is_active: typeof row.is_active === "boolean" ? row.is_active : true,
    created_at: row.created_at ?? null,
    rows,
  };
}

function toOption(profile: PricingTierProfileRow): PricingTierProfileOption {
  return profile;
}

function getPricingTierProfileSelect() {
  return "id, vendor_id, name, pricing_type, is_active, created_at, pricing_tier_profile_rows(id, profile_id, min_qty, max_qty, price, sort_order, created_at)";
}

export async function getPricingTierProfilesForAdmin() {
  const dataClient = getPgDataClient();
  const { data, error } = await dataClient
    .from("pricing_tier_profiles")
    .select(getPricingTierProfileSelect())
    .order("created_at", { ascending: false });

  if (error && isMissingRelationError(error.message)) {
    return {
      data: [] as PricingTierProfileRow[],
      error: null,
    };
  }

  return {
    data: ((data ?? []) as unknown as RawPricingTierProfileRow[]).map(normalizePricingTierProfile),
    error,
  };
}

export async function getPricingTierProfilesForVendor(
  vendorId: string,
  options?: { includeInactive?: boolean; includeGlobal?: boolean },
) {
  if (!vendorId && !options?.includeGlobal) {
    return {
      data: [] as PricingTierProfileOption[],
      error: null,
    };
  }

  const dataClient = getPgDataClient();
  let query = dataClient
    .from("pricing_tier_profiles")
    .select(getPricingTierProfileSelect())
    .order("created_at", { ascending: false });

  if (options?.includeGlobal && vendorId) {
    query = query.or(`vendor_id.eq.${vendorId},vendor_id.is.null`);
  } else if (options?.includeGlobal) {
    query = query.is("vendor_id", null);
  } else {
    query = query.eq("vendor_id", vendorId);
  }

  if (!options?.includeInactive) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;

  if (error && isMissingRelationError(error.message)) {
    return {
      data: [] as PricingTierProfileOption[],
      error: null,
    };
  }

  return {
    data: ((data ?? []) as unknown as RawPricingTierProfileRow[]).map(normalizePricingTierProfile).map(toOption),
    error,
  };
}

export async function getPricingTierProfileById(id: string) {
  if (!id) {
    return {
      data: null as PricingTierProfileRow | null,
      error: null,
    };
  }

  const dataClient = getPgDataClient();
  const { data, error } = await dataClient
    .from("pricing_tier_profiles")
    .select(getPricingTierProfileSelect())
    .eq("id", id)
    .maybeSingle();

  if (error && isMissingRelationError(error.message)) {
    return {
      data: null as PricingTierProfileRow | null,
      error: null,
    };
  }

  return {
    data: data ? normalizePricingTierProfile(data as unknown as RawPricingTierProfileRow) : null,
    error,
  };
}

export async function getPricingTierProfileMapByIds(profileIds: string[]) {
  const uniqueIds = Array.from(new Set(profileIds.filter(Boolean)));

  if (uniqueIds.length === 0) {
    return {
      data: new Map<string, PricingTierProfileRow>(),
      error: null,
    };
  }

  const dataClient = getPgDataClient();
  const { data, error } = await dataClient
    .from("pricing_tier_profiles")
    .select(getPricingTierProfileSelect())
    .in("id", uniqueIds);

  if (error && isMissingRelationError(error.message)) {
    return {
      data: new Map<string, PricingTierProfileRow>(),
      error: null,
    };
  }

  if (error) {
    return {
      data: new Map<string, PricingTierProfileRow>(),
      error,
    };
  }

  return {
    data: new Map(
      ((data ?? []) as unknown as RawPricingTierProfileRow[]).map((row) => {
        const normalized = normalizePricingTierProfile(row);
        return [normalized.id, normalized] as const;
      }),
    ),
    error: null,
  };
}
