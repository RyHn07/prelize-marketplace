import { getSupabaseClient } from "@/lib/supabase-client";
import type { InternationalShippingMethodRow } from "@/types/product-db";

async function parseResponse(response: Response) {
  const payload = (await response.json().catch(() => ({}))) as {
    error?: string;
    methods?: InternationalShippingMethodRow[];
    method?: InternationalShippingMethodRow;
  };

  if (!response.ok) {
    throw new Error(payload.error ?? "Unable to complete the shipping request.");
  }

  return payload;
}

async function getAccessToken() {
  const supabase = getSupabaseClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

async function authorizedJsonFetch(
  input: string,
  init?: RequestInit,
) {
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
    credentials: "include",
    cache: init?.cache ?? "no-store",
  });

  return parseResponse(response);
}

export async function fetchActiveInternationalShippingMethods() {
  const payload = await authorizedJsonFetch("/api/international-shipping/methods", {
    method: "GET",
  });

  return {
    methods: payload.methods ?? [],
  };
}

export async function fetchAdminInternationalShippingMethods() {
  const payload = await authorizedJsonFetch("/api/admin/international-shipping", {
    method: "GET",
  });

  return {
    methods: payload.methods ?? [],
  };
}

export async function createAdminInternationalShippingMethodRequest(payload: unknown) {
  const parsedPayload = await authorizedJsonFetch("/api/admin/international-shipping", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!parsedPayload.method) {
    throw new Error("The international shipping method response is missing.");
  }

  return parsedPayload.method;
}

export async function updateAdminInternationalShippingMethodRequest(id: string, payload: unknown) {
  const parsedPayload = await authorizedJsonFetch(`/api/admin/international-shipping/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

  if (!parsedPayload.method) {
    throw new Error("The international shipping method response is missing.");
  }

  return parsedPayload.method;
}
