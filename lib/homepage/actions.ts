"use client";

import type { HomepageThemeEditorRecord, HomepageThemeInput } from "@/lib/homepage/admin";
import { getSupabaseClient } from "@/lib/supabase-client";
import type {
  HomepageBannerRow,
  HomepageContentBlockRow,
  HomepageProductSectionRow,
  HomepageThemeRow,
} from "@/types/product-db";

type HomepageContentSavePayload = {
  blocks: Array<{
    content_key: string;
    title: string | null;
    subtitle: string | null;
    description: string | null;
    image_url: string | null;
    button_text: string | null;
    button_link: string | null;
    data_json: unknown;
    is_active: boolean;
  }>;
};

type HomepageBannerPayload = Omit<HomepageBannerRow, "id" | "created_at">;
type HomepageProductSectionPayload = Omit<HomepageProductSectionRow, "id" | "created_at">;

async function getAccessToken() {
  const supabase = getSupabaseClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

async function authorizedHomepageFetch<T>(input: string, init?: RequestInit) {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    throw new Error("Please login again.");
  }

  const response = await fetch(input, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
  });

  const rawBody = await response.text();
  const body = rawBody
    ? ((() => {
        try {
          return JSON.parse(rawBody) as { error?: string } & T;
        } catch {
          return null;
        }
      })())
    : null;

  if (!response.ok) {
    if (response.status === 401 || body?.error === "Missing bearer token.") {
      throw new Error("Please login again.");
    }

    const fallbackMessage =
      rawBody && !rawBody.trim().startsWith("<")
        ? rawBody
        : `Request failed (${response.status} ${response.statusText || "Server Error"}).`;

    throw new Error(body?.error ?? fallbackMessage);
  }

  return body as T;
}

export function fetchHomepageThemes() {
  return authorizedHomepageFetch<{ themes: HomepageThemeRow[] }>("/api/admin/homepage/themes");
}

export function createHomepageThemeRequest(payload: HomepageThemeInput) {
  return authorizedHomepageFetch<{ record: HomepageThemeEditorRecord | null }>(
    "/api/admin/homepage/themes",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export function updateHomepageThemeRequest(id: string, payload: HomepageThemeInput) {
  return authorizedHomepageFetch<{ record: HomepageThemeEditorRecord | null }>(
    `/api/admin/homepage/themes/${id}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}

export function activateHomepageThemeRequest(id: string) {
  return authorizedHomepageFetch<{ success: boolean }>(`/api/admin/homepage/themes/${id}/activate`, {
    method: "POST",
  });
}

export function duplicateHomepageThemeRequest(id: string) {
  return authorizedHomepageFetch<{ record: HomepageThemeEditorRecord | null }>(
    `/api/admin/homepage/themes/${id}/duplicate`,
    {
      method: "POST",
    },
  );
}

export function archiveHomepageThemeRequest(id: string) {
  return authorizedHomepageFetch<{ success: boolean }>(`/api/admin/homepage/themes/${id}/archive`, {
    method: "POST",
  });
}

export function fetchHomepageContentBlocks() {
  return authorizedHomepageFetch<{ blocks: HomepageContentBlockRow[] }>("/api/admin/homepage/content");
}

export function saveHomepageContentBlocks(payload: HomepageContentSavePayload) {
  return authorizedHomepageFetch<{ blocks: HomepageContentBlockRow[] }>("/api/admin/homepage/content", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function fetchHomepageBanners() {
  return authorizedHomepageFetch<{ banners: HomepageBannerRow[] }>("/api/admin/homepage/banners");
}

export function createHomepageBannerRequest(payload: HomepageBannerPayload) {
  return authorizedHomepageFetch<{ banner: HomepageBannerRow | null }>("/api/admin/homepage/banners", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateHomepageBannerRequest(id: string, payload: HomepageBannerPayload) {
  return authorizedHomepageFetch<{ banner: HomepageBannerRow | null }>(
    `/api/admin/homepage/banners/${id}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}

export function deleteHomepageBannerRequest(id: string) {
  return authorizedHomepageFetch<{ success: boolean }>(`/api/admin/homepage/banners/${id}`, {
    method: "DELETE",
  });
}

export function fetchHomepageProductSections() {
  return authorizedHomepageFetch<{ sections: HomepageProductSectionRow[] }>(
    "/api/admin/homepage/product-sections",
  );
}

export function createHomepageProductSectionRequest(payload: HomepageProductSectionPayload) {
  return authorizedHomepageFetch<{ section: HomepageProductSectionRow | null }>(
    "/api/admin/homepage/product-sections",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export function updateHomepageProductSectionRequest(
  id: string,
  payload: HomepageProductSectionPayload,
) {
  return authorizedHomepageFetch<{ section: HomepageProductSectionRow | null }>(
    `/api/admin/homepage/product-sections/${id}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}

export function deleteHomepageProductSectionRequest(id: string) {
  return authorizedHomepageFetch<{ success: boolean }>(`/api/admin/homepage/product-sections/${id}`, {
    method: "DELETE",
  });
}
