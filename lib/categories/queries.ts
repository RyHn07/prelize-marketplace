import { getPgDataClient } from "@/lib/browser-app-client";

export type AdminCategoryRow = {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  image_url: string | null;
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

function normalizeCategory(row: AdminCategoryRow): AdminCategoryRow {
  return {
    ...row,
    slug: typeof row.slug === "string" && row.slug.trim().length > 0 ? row.slug : String(row.id),
    parent_id: typeof row.parent_id === "string" ? row.parent_id : null,
    image_url: typeof row.image_url === "string" && row.image_url.trim().length > 0 ? row.image_url : null,
  };
}

export async function getAdminCategories() {
  const dataClient = getPgDataClient();
  const { data, error } = await dataClient.from("categories").select("id, name, slug, parent_id, image_url, created_at").order("name", {
    ascending: true,
  });

  if (error && isMissingRelationError(error.message)) {
    return {
      data: [] as AdminCategoryRow[],
      error: null,
    };
  }

  return {
    data: ((data ?? []) as AdminCategoryRow[]).map(normalizeCategory),
    error,
  };
}

export async function getCategoryProductCounts() {
  const dataClient = getPgDataClient();
  const { data, error } = await dataClient.from("products").select("category_id").not("category_id", "is", null);

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

  for (const row of (data ?? []) as Array<{ category_id: string | null }>) {
    if (!row.category_id) {
      continue;
    }

    counts[row.category_id] = (counts[row.category_id] ?? 0) + 1;
  }

  return {
    data: counts,
    error: null,
  };
}
