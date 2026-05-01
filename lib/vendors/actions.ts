import { getSupabaseClient } from "@/lib/supabase-client";
import type { VendorRow, VendorUpsertPayload } from "@/types/product-db";

function normalizeVendorSlug(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return normalized || "vendor";
}

function isSlugConstraintError(message: string) {
  const normalizedMessage = message.toLowerCase();

  return normalizedMessage.includes("vendors_slug_unique_idx");
}

async function resolveUniqueVendorSlug(
  rawSlug: string,
  excludeId?: string,
) {
  const supabase = getSupabaseClient();
  const baseSlug = normalizeVendorSlug(rawSlug);
  const slugPattern = `${baseSlug}-%`;
  let query = supabase
    .from("vendors")
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
    ((data ?? []) as Array<{ id: string; slug: string | null }>)
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
  const normalizedMessage = message.toLowerCase();

  if (
    normalizedMessage.includes("vendors") ||
    normalizedMessage.includes("logo_url") ||
    normalizedMessage.includes("banner_url") ||
    normalizedMessage.includes("contact_email") ||
    normalizedMessage.includes("contact_phone")
  ) {
    return "The vendors table is missing or incomplete. Run the latest multivendor migration, then try saving again.";
  }

  return message;
}

export async function createVendor(payload: VendorUpsertPayload) {
  const slugResult = await resolveUniqueVendorSlug(payload.slug || payload.name);

  if (slugResult.error) {
    return {
      data: null as VendorRow | null,
      error: slugResult.error,
    };
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("vendors")
    .insert({
      ...payload,
      slug: slugResult.slug,
    } as never)
    .select("*")
    .single();

  if (error) {
    return {
      data: null as VendorRow | null,
      error: {
        ...error,
        message: isSlugConstraintError(error.message)
          ? "That vendor slug is already in use. Please try saving again or choose a different slug."
          : buildSchemaErrorMessage(error.message),
      },
    };
  }

  return {
    data: data as VendorRow,
    error: null,
  };
}

export async function updateVendor(id: string, payload: VendorUpsertPayload) {
  const slugResult = await resolveUniqueVendorSlug(payload.slug || payload.name, id);

  if (slugResult.error) {
    return {
      data: null as VendorRow | null,
      error: slugResult.error,
    };
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("vendors")
    .update({
      ...payload,
      slug: slugResult.slug,
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return {
      data: null as VendorRow | null,
      error: {
        ...error,
        message: isSlugConstraintError(error.message)
          ? "That vendor slug is already in use. Please choose a different slug."
          : buildSchemaErrorMessage(error.message),
      },
    };
  }

  return {
    data: data as VendorRow,
    error: null,
  };
}
