import { getPgDataClient } from "@/lib/browser-app-client";

export type AdminBrandRow = {
  id: string;
  name: string;
  slug: string;
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

function normalizeBrand(row: AdminBrandRow): AdminBrandRow {
  return {
    ...row,
    slug: typeof row.slug === "string" && row.slug.trim().length > 0 ? row.slug : String(row.id),
    image_url: typeof row.image_url === "string" && row.image_url.trim().length > 0 ? row.image_url : null,
  };
}

export async function getAdminBrands() {
  const dataClient = getPgDataClient();
  const { data, error } = await dataClient
    .from("brands")
    .select("id, name, slug, image_url, created_at")
    .order("name", { ascending: true });

  if (error && isMissingRelationError(error.message)) {
    return {
      data: [] as AdminBrandRow[],
      error: null,
    };
  }

  return {
    data: ((data ?? []) as AdminBrandRow[]).map(normalizeBrand),
    error,
  };
}

export async function getBrandProductCounts() {
  const dataClient = getPgDataClient();
  const { data, error } = await dataClient.from("products").select("brand_id").not("brand_id", "is", null);

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

  for (const row of (data ?? []) as Array<{ brand_id: string | null }>) {
    if (!row.brand_id) {
      continue;
    }

    counts[row.brand_id] = (counts[row.brand_id] ?? 0) + 1;
  }

  return {
    data: counts,
    error: null,
  };
}
