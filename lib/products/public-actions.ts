"use client";

import type { ResolvedProductPricingConfig } from "@/types/product-db";

type PricingMapResponse = {
  data: Record<string, ResolvedProductPricingConfig>;
  error: { message: string } | null;
};

export async function fetchResolvedProductPricingMap(productIds: string[]) {
  const uniqueIds = Array.from(new Set(productIds.filter(Boolean)));

  if (uniqueIds.length === 0) {
    return {
      data: {},
      error: null,
    } satisfies PricingMapResponse;
  }

  const params = new URLSearchParams();
  params.set("ids", uniqueIds.join(","));

  const response = await fetch(`/api/public/products/pricing?${params.toString()}`, {
    method: "GET",
    cache: "no-store",
  });

  const body = (await response.json().catch(() => null)) as
    | { error?: string; data?: Record<string, ResolvedProductPricingConfig> }
    | null;

  if (!response.ok) {
    return {
      data: {},
      error: {
        message: body?.error ?? "Unable to load product pricing.",
      },
    } satisfies PricingMapResponse;
  }

  return {
    data: body?.data ?? {},
    error: null,
  } satisfies PricingMapResponse;
}
