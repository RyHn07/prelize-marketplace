"use client";

import type { ProductDbRow, ProductEditorRecord } from "@/types/product-db";
import type { ProductEditorSavePayload } from "@/lib/products/actions";
import { getSupabaseClient } from "@/lib/supabase-client";

type SaveProductResponse = {
  data: ProductDbRow | null;
  error: { message: string } | null;
};

async function getAccessToken() {
  const supabase = getSupabaseClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

async function authorizedProductFetch<T>(input: string, init?: RequestInit) {
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

  const body = (await response.json().catch(() => null)) as { error?: string; data?: T | null } | null;

  if (!response.ok) {
    return {
      data: null,
      error: {
        message: body?.error ?? "Unable to save the vendor product.",
      },
    } as { data: T | null; error: { message: string } | null };
  }

  return {
    data: body?.data ?? null,
    error: null,
  } as { data: T | null; error: { message: string } | null };
}

export async function createVendorProductRecord(payload: ProductEditorSavePayload) {
  return authorizedProductFetch<SaveProductResponse>("/api/vendor/products", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateVendorProductRecord(id: string, payload: ProductEditorSavePayload) {
  return authorizedProductFetch<SaveProductResponse>(`/api/vendor/products/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteVendorProductRecord(id: string) {
  return authorizedProductFetch<ProductDbRow>(`/api/vendor/products/${id}`, {
    method: "DELETE",
  });
}

export async function getVendorProductEditorRecord(id: string) {
  return authorizedProductFetch<ProductEditorRecord>(`/api/vendor/products/${id}`, {
    method: "GET",
  });
}
