"use client";

import type { ProductDbRow, ProductEditorRecord } from "@/types/product-db";
import type { ProductEditorSavePayload } from "@/lib/products/actions";
import { getPgDataClient } from "@/lib/browser-app-client";

type SaveProductResponse = {
  data: ProductDbRow | null;
  error: { message: string } | null;
};

type LoadProductResponse = {
  data: ProductEditorRecord | null;
  error: { message: string } | null;
};

async function getAccessToken() {
  const dataClient = getPgDataClient();
  const { data } = await dataClient.auth.getSession();
  return data.session?.access_token ?? null;
}

async function authorizedAdminProductFetch<T>(input: string, init?: RequestInit) {
  const accessToken = await getAccessToken();
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");

  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const response = await fetch(input, {
    ...init,
    headers,
  });

  const body = (await response.json().catch(() => null)) as { error?: string; data?: T | null } | null;

  if (!response.ok) {
    return {
      data: null,
      error: {
        message: body?.error ?? "Unable to save the product.",
      },
    } as { data: T | null; error: { message: string } | null };
  }

  return {
    data: body?.data ?? null,
    error: null,
  } as { data: T | null; error: { message: string } | null };
}

export async function createAdminProductRecord(payload: ProductEditorSavePayload) {
  return authorizedAdminProductFetch<ProductDbRow>("/api/admin/products", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateAdminProductRecord(id: string, payload: ProductEditorSavePayload) {
  return authorizedAdminProductFetch<ProductDbRow>(`/api/admin/products/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteAdminProductRecord(id: string) {
  return authorizedAdminProductFetch<ProductDbRow>(`/api/admin/products/${id}`, {
    method: "DELETE",
  });
}

export async function getAdminProductEditorRecord(id: string) {
  return authorizedAdminProductFetch<ProductEditorRecord>(`/api/admin/products/${id}`, {
    method: "GET",
  }) as Promise<LoadProductResponse>;
}
