import { getSupabaseClient } from "@/lib/supabase-client";
import type { AdminBrandRow } from "@/lib/brands/queries";

export type BrandUpsertPayload = {
  name: string;
  slug: string;
  image_url: string | null;
};

function normalizeBrandSlug(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return normalized || "brand";
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

  return normalizedMessage.includes("brands_slug_key") || normalizedMessage.includes("brands_slug_unique_idx");
}

async function resolveUniqueBrandSlug(
  supabase: ReturnType<typeof getSupabaseClient>,
  rawSlug: string,
  excludeId?: string,
) {
  const baseSlug = normalizeBrandSlug(rawSlug);
  const slugPattern = `${baseSlug}-%`;
  let query = supabase
    .from("brands")
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
    return "The brands table is missing. Run the required database migration before managing brands.";
  }

  return message;
}

export async function createBrand(payload: BrandUpsertPayload) {
  const supabase = getSupabaseClient();
  const slugResult = await resolveUniqueBrandSlug(supabase, payload.slug || payload.name);

  if (slugResult.error) {
    return {
      data: null as AdminBrandRow | null,
      error: slugResult.error,
    };
  }

  const { data, error } = await supabase
    .from("brands")
    .insert({
      name: payload.name.trim(),
      slug: slugResult.slug,
      image_url: payload.image_url,
    } as never)
    .select("id, name, slug, image_url, created_at")
    .single();

  if (error || !data) {
    return {
      data: null as AdminBrandRow | null,
      error: {
        ...error,
        message:
          error && isSlugConstraintError(error.message)
            ? "That brand slug is already in use. Please try again."
            : buildSchemaErrorMessage(error?.message ?? "Unable to create the brand."),
      },
    };
  }

  return {
    data: data as AdminBrandRow,
    error: null,
  };
}

export async function updateBrand(id: string, payload: BrandUpsertPayload) {
  const supabase = getSupabaseClient();
  const slugResult = await resolveUniqueBrandSlug(supabase, payload.slug || payload.name, id);

  if (slugResult.error) {
    return {
      data: null as AdminBrandRow | null,
      error: slugResult.error,
    };
  }

  const { data, error } = await supabase
    .from("brands")
    .update({
      name: payload.name.trim(),
      slug: slugResult.slug,
      image_url: payload.image_url,
    } as never)
    .eq("id", id)
    .select("id, name, slug, image_url, created_at")
    .single();

  if (error || !data) {
    return {
      data: null as AdminBrandRow | null,
      error: {
        ...error,
        message:
          error && isSlugConstraintError(error.message)
            ? "That brand slug is already in use. Please choose a different slug."
            : buildSchemaErrorMessage(error?.message ?? "Unable to update the brand."),
      },
    };
  }

  return {
    data: data as AdminBrandRow,
    error: null,
  };
}

export async function deleteBrand(id: string) {
  const supabase = getSupabaseClient();
  const { count, error: linkedProductsError } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("brand_id", id);

  if (linkedProductsError) {
    return {
      error: {
        ...linkedProductsError,
        message: "Unable to confirm whether products are linked to this brand right now.",
      },
    };
  }

  if ((count ?? 0) > 0) {
    return {
      error: {
        message: "This brand is still assigned to products. Set those products to Non Brand or reassign them first.",
      },
    };
  }

  const { error } = await supabase.from("brands").delete().eq("id", id);

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
