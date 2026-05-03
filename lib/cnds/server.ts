import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";
import { normalizeCndsProfile } from "@/lib/cnds/queries";
import type { CndsShippingProfileRow } from "@/types/product-db";

type RawCndsProfileLookupRow = {
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

export async function getActiveCndsShippingProfileById(profileId: string | null | undefined) {
  if (!profileId) {
    return {
      data: null as CndsShippingProfileRow | null,
      error: null,
    };
  }

  const supabase = getSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("cnds_shipping_profiles")
    .select(
      "id, vendor_id, name, description, pricing_type, is_active, created_at, cnds_shipping_tiers(id, profile_id, min_qty, max_qty, price, sort_order, created_at)",
    )
    .eq("id", profileId)
    .eq("is_active", true)
    .maybeSingle();

  return {
    data: data ? normalizeCndsProfile(data as RawCndsProfileLookupRow) : null,
    error,
  };
}
