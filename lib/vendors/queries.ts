import { getSupabaseClient } from "@/lib/supabase-client";
import type { ProductVendorOption, VendorMemberRow, VendorRow, VendorStatus } from "@/types/product-db";

function normalizeVendorStatus(value: unknown): VendorStatus {
  return value === "active" || value === "suspended" ? value : "pending";
}

function isMissingRelationError(message: string) {
  const normalizedMessage = message.toLowerCase();

  return (
    normalizedMessage.includes("relation") ||
    normalizedMessage.includes("does not exist") ||
    normalizedMessage.includes("could not find")
  );
}

function normalizeVendor(row: VendorRow): VendorRow {
  return {
    ...row,
    slug: typeof row.slug === "string" && row.slug.trim().length > 0 ? row.slug : String(row.id),
    logo_url: typeof row.logo_url === "string" ? row.logo_url : null,
    banner_url: typeof row.banner_url === "string" ? row.banner_url : null,
    description: typeof row.description === "string" ? row.description : null,
    contact_email: typeof row.contact_email === "string" ? row.contact_email : null,
    contact_phone: typeof row.contact_phone === "string" ? row.contact_phone : null,
    address: typeof row.address === "string" ? row.address : null,
    status: normalizeVendorStatus(row.status),
  };
}

export async function getVendors() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("vendors").select("*").order("name", { ascending: true });

  if (error && isMissingRelationError(error.message)) {
    return {
      data: [] as VendorRow[],
      error: null,
    };
  }

  return {
    data: ((data ?? []) as VendorRow[]).map(normalizeVendor),
    error,
  };
}

export async function getVendorById(id: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("vendors").select("*").eq("id", id).maybeSingle();

  if (error && isMissingRelationError(error.message)) {
    return {
      data: null as VendorRow | null,
      error: null,
    };
  }

  return {
    data: data ? normalizeVendor(data as VendorRow) : null,
    error,
  };
}

export async function getVendorsByIds(ids: string[]) {
  const scopedIds = Array.from(new Set(ids.filter(Boolean)));

  if (scopedIds.length === 0) {
    return {
      data: [] as VendorRow[],
      error: null,
    };
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("vendors").select("*").in("id", scopedIds);

  if (error && isMissingRelationError(error.message)) {
    return {
      data: [] as VendorRow[],
      error: null,
    };
  }

  return {
    data: ((data ?? []) as VendorRow[]).map(normalizeVendor),
    error,
  };
}

export async function getVendorOptions() {
  const result = await getVendors();

  return {
    data: result.data.map((vendor) => ({
      id: vendor.id,
      name: vendor.name,
      slug: vendor.slug,
      status: vendor.status,
    })) satisfies ProductVendorOption[],
    error: result.error,
  };
}

export async function getVendorProductCounts() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("products").select("vendor_id").not("vendor_id", "is", null);

  if (error && isMissingRelationError(error.message)) {
    return {
      data: {} as Record<string, number>,
      error: null,
    };
  }

  if (error) {
    return {
      data: {} as Record<string, number>,
      error,
    };
  }

  const counts: Record<string, number> = {};

  for (const row of (data ?? []) as Array<{ vendor_id: string | null }>) {
    if (!row.vendor_id) {
      continue;
    }

    counts[row.vendor_id] = (counts[row.vendor_id] ?? 0) + 1;
  }

  return {
    data: counts,
    error: null,
  };
}

export async function getVendorMemberships() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("vendor_members")
    .select("id, vendor_id, user_id, role, status, created_at")
    .order("created_at", { ascending: false });

  if (error && isMissingRelationError(error.message)) {
    return {
      data: [] as VendorMemberRow[],
      error: null,
    };
  }

  return {
    data: (data ?? []) as VendorMemberRow[],
    error,
  };
}

export type VendorOwnedProductDebugRow = {
  id: string;
  name: string;
  slug: string;
  vendor_id: string | null;
  status?: string | null;
  created_at?: string | null;
};

export async function getVendorOwnedProductsDebug() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("products")
    .select("id, name, slug, vendor_id, status, created_at")
    .not("vendor_id", "is", null)
    .order("created_at", { ascending: false });

  if (error && isMissingRelationError(error.message)) {
    return {
      data: [] as VendorOwnedProductDebugRow[],
      error: null,
    };
  }

  return {
    data: (data ?? []) as VendorOwnedProductDebugRow[],
    error,
  };
}
