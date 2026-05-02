import { getSupabaseClient } from "@/lib/supabase-client";
import type { AdminCategoryRow } from "@/lib/categories/queries";

export type CategoryUpsertPayload = {
  name: string;
  slug: string;
  parent_id: string | null;
};

function normalizeCategorySlug(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return normalized || "category";
}

function isMissingRelationError(message: string) {
  const normalizedMessage = message.toLowerCase();

  return (
    normalizedMessage.includes("relation") ||
    normalizedMessage.includes("does not exist") ||
    normalizedMessage.includes("could not find")
  );
}

function isSlugConstraintError(message: string) {
  const normalizedMessage = message.toLowerCase();

  return normalizedMessage.includes("categories_slug_key") || normalizedMessage.includes("categories_slug_unique_idx");
}

async function resolveUniqueCategorySlug(
  supabase: ReturnType<typeof getSupabaseClient>,
  rawSlug: string,
  excludeId?: string,
) {
  const baseSlug = normalizeCategorySlug(rawSlug);
  const slugPattern = `${baseSlug}-%`;
  let query = supabase
    .from("categories")
    .select("id, slug")
    .or(`slug.eq.${baseSlug},slug.like.${slugPattern}`);

  if (excludeId) {
    query = query.neq("id", excludeId);
  }

  const { data, error } = await query;

  if (error) {
    return {
      slug: baseSlug,
      error,
    };
  }

  const existingSlugs = new Set(
    ((data ?? []) as Array<{ slug: string | null }>)
      .map((row) => row.slug ?? "")
      .filter(Boolean),
  );

  if (!existingSlugs.has(baseSlug)) {
    return {
      slug: baseSlug,
      error: null,
    };
  }

  let suffix = 2;

  while (existingSlugs.has(`${baseSlug}-${suffix}`)) {
    suffix += 1;
  }

  return {
    slug: `${baseSlug}-${suffix}`,
    error: null,
  };
}

function buildSchemaErrorMessage(message: string) {
  if (isMissingRelationError(message)) {
    return "The categories table is missing. Run the required database migration before managing categories.";
  }

  return message;
}

export async function createCategory(payload: CategoryUpsertPayload) {
  const supabase = getSupabaseClient();
  const slugResult = await resolveUniqueCategorySlug(supabase, payload.slug || payload.name);

  if (slugResult.error) {
    return {
      data: null as AdminCategoryRow | null,
      error: slugResult.error,
    };
  }

  const { data, error } = await supabase
    .from("categories")
    .insert({
      name: payload.name.trim(),
      slug: slugResult.slug,
      parent_id: payload.parent_id,
    } as never)
    .select("id, name, slug, parent_id, created_at")
    .single();

  if (error || !data) {
    return {
      data: null as AdminCategoryRow | null,
      error: {
        ...error,
        message:
          error && isSlugConstraintError(error.message)
            ? "That category slug is already in use. Please try again."
            : buildSchemaErrorMessage(error?.message ?? "Unable to create the category."),
      },
    };
  }

  return {
    data: data as AdminCategoryRow,
    error: null,
  };
}

export async function updateCategory(id: string, payload: CategoryUpsertPayload) {
  const supabase = getSupabaseClient();
  const slugResult = await resolveUniqueCategorySlug(supabase, payload.slug || payload.name, id);

  if (slugResult.error) {
    return {
      data: null as AdminCategoryRow | null,
      error: slugResult.error,
    };
  }

  const { data, error } = await supabase
    .from("categories")
    .update({
      name: payload.name.trim(),
      slug: slugResult.slug,
      parent_id: payload.parent_id,
    } as never)
    .eq("id", id)
    .select("id, name, slug, parent_id, created_at")
    .single();

  if (error || !data) {
    return {
      data: null as AdminCategoryRow | null,
      error: {
        ...error,
        message:
          error && isSlugConstraintError(error.message)
            ? "That category slug is already in use. Please choose a different slug."
            : buildSchemaErrorMessage(error?.message ?? "Unable to update the category."),
      },
    };
  }

  return {
    data: data as AdminCategoryRow,
    error: null,
  };
}

export async function deleteCategory(id: string) {
  const supabase = getSupabaseClient();
  const [{ count, error: linkedProductsError }, { count: childCount, error: childCountError }] = await Promise.all([
    supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("category_id", id),
    supabase
      .from("categories")
      .select("id", { count: "exact", head: true })
      .eq("parent_id", id),
  ]);

  if (linkedProductsError) {
    return {
      error: {
        ...linkedProductsError,
        message: "Unable to confirm whether products are linked to this category right now.",
      },
    };
  }

  if (childCountError) {
    return {
      error: {
        ...childCountError,
        message: "Unable to confirm whether subcategories are linked to this category right now.",
      },
    };
  }

  if ((count ?? 0) > 0) {
    return {
      error: {
        message: "This category is still assigned to products. Reassign those products before deleting it.",
      },
    };
  }

  if ((childCount ?? 0) > 0) {
    return {
      error: {
        message: "This category still has subcategories. Move or remove those subcategories before deleting it.",
      },
    };
  }

  const { error } = await supabase.from("categories").delete().eq("id", id);

  if (error) {
    return {
      error: {
        ...error,
        message: buildSchemaErrorMessage(error.message),
      },
    };
  }

  return {
    error: null,
  };
}
