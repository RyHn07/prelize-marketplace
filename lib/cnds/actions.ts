"use client";

import {
  createCndsProfileForVendor,
  listCndsProfilesForVendor,
  updateCndsProfileForVendor,
} from "@/lib/cnds/admin";
import type { CndsShippingPricingType, CndsShippingProfileRow } from "@/types/product-db";
import { getSupabaseClient } from "@/lib/supabase-client";

export type CndsProfileEditorPayload = {
  name: string;
  description: string;
  pricing_type: CndsShippingPricingType;
  is_active: boolean;
  tiers: Array<{
    min_qty: number;
    max_qty: number | null;
    price: number;
    sort_order: number;
  }>;
};

async function getAccessToken() {
  const supabase = getSupabaseClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

async function authorizedAdminJsonFetch<T>(input: string, init?: RequestInit) {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    throw new Error("Please login first.");
  }

  const response = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...(init?.headers ?? {}),
    },
  });

  const body = (await response.json().catch(() => null)) as { error?: string } | T | null;

  if (!response.ok) {
    throw new Error((body as { error?: string } | null)?.error ?? "Request failed.");
  }

  return body as T;
}

export async function fetchAdminCndsProfiles() {
  return authorizedAdminJsonFetch<{ profiles: CndsShippingProfileRow[] }>("/api/admin/cnds");
}

export async function createAdminCndsProfileRequest(payload: CndsProfileEditorPayload) {
  return authorizedAdminJsonFetch<{ profile: CndsShippingProfileRow }>("/api/admin/cnds", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateAdminCndsProfileRequest(id: string, payload: CndsProfileEditorPayload) {
  return authorizedAdminJsonFetch<{ profile: CndsShippingProfileRow }>(`/api/admin/cnds/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function fetchVendorCndsProfiles(vendorId: string, options?: { includeInactive?: boolean }) {
  const supabase = getSupabaseClient();
  const result = await listCndsProfilesForVendor(supabase, vendorId, options);

  if (result.error) {
    throw new Error(result.error.message);
  }

  return {
    profiles: result.data,
  };
}

export async function createVendorCndsProfileRequest(vendorId: string, payload: CndsProfileEditorPayload) {
  const supabase = getSupabaseClient();
  const result = await createCndsProfileForVendor(supabase, vendorId, payload);

  if (result.error || !result.data) {
    throw new Error(result.error?.message ?? "Unable to create the CNDS profile.");
  }

  return {
    profile: result.data,
  };
}

export async function updateVendorCndsProfileRequest(
  vendorId: string,
  id: string,
  payload: CndsProfileEditorPayload,
) {
  const supabase = getSupabaseClient();
  const result = await updateCndsProfileForVendor(supabase, id, vendorId, payload);

  if (result.error || !result.data) {
    throw new Error(result.error?.message ?? "Unable to update the CNDS profile.");
  }

  return {
    profile: result.data,
  };
}

export async function fetchCndsProfilesForCart(profileIds: string[]) {
  return authorizedAdminJsonFetch<{ profiles: CndsShippingProfileRow[] }>("/api/cnds/profiles", {
    method: "POST",
    body: JSON.stringify({ ids: profileIds }),
  });
}
