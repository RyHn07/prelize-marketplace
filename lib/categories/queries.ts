import { getSupabaseClient } from "@/lib/supabase-client";

export type AdminCategoryRow = {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
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
  };
}

export async function getAdminCategories() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("categories").select("id, name, slug, parent_id, created_at").order("name", {
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
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("products").select("category_id").not("category_id", "is", null);

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
