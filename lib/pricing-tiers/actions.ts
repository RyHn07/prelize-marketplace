"use client";

import {
  createAdminPricingTierProfile,
  createPricingTierProfileForVendor,
  listPricingTierProfilesForVendor,
  updateAdminPricingTierProfile,
  updatePricingTierProfileForVendor,
} from "@/lib/pricing-tiers/admin";
import type { PricingTierProfileRow, ProductPricingType } from "@/types/product-db";
import { getPgDataClient } from "@/lib/browser-app-client";

export type PricingTierProfileEditorPayload = {
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

async function getAccessToken() {
  const dataClient = getPgDataClient();
  const { data } = await dataClient.auth.getSession();
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

export async function fetchAdminPricingTierProfiles() {
  return authorizedAdminJsonFetch<{ profiles: PricingTierProfileRow[] }>("/api/admin/pricing-tiers");
}

export async function createAdminPricingTierProfileRequest(payload: PricingTierProfileEditorPayload) {
  return authorizedAdminJsonFetch<{ profile: PricingTierProfileRow }>("/api/admin/pricing-tiers", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateAdminPricingTierProfileRequest(id: string, payload: PricingTierProfileEditorPayload) {
  return authorizedAdminJsonFetch<{ profile: PricingTierProfileRow }>(`/api/admin/pricing-tiers/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function fetchVendorPricingTierProfiles(vendorId: string, options?: { includeInactive?: boolean }) {
  const dataClient = getPgDataClient();
  const result = await listPricingTierProfilesForVendor(dataClient, vendorId, options);

  if (result.error) {
    throw new Error(result.error.message);
  }

  return {
    profiles: result.data,
  };
}

export async function createVendorPricingTierProfileRequest(
  vendorId: string,
  payload: PricingTierProfileEditorPayload,
) {
  const dataClient = getPgDataClient();
  const result = await createPricingTierProfileForVendor(dataClient, vendorId, payload);

  if (result.error || !result.data) {
    throw new Error(result.error?.message ?? "Unable to create the pricing tier profile.");
  }

  return {
    profile: result.data,
  };
}

export async function updateVendorPricingTierProfileRequest(
  vendorId: string,
  id: string,
  payload: PricingTierProfileEditorPayload,
) {
  const dataClient = getPgDataClient();
  const result = await updatePricingTierProfileForVendor(dataClient, id, vendorId, payload);

  if (result.error || !result.data) {
    throw new Error(result.error?.message ?? "Unable to update the pricing tier profile.");
  }

  return {
    profile: result.data,
  };
}
