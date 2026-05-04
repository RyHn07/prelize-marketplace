import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseClient } from "@/lib/supabase-client";
import type {
  ProductImageRow,
  ProductDbRow,
  ProductSpecRow,
  ProductType,
  ProductUpsertPayload,
} from "@/types/product-db";

export type ProductVariantUpsertPayload = {
  name: string;
  value: string | null;
  regular_price: number | null;
  discount_price: number | null;
  price: number;
  moq: number;
  stock: number;
  image_url: string | null;
  attribute_values: Record<string, string>;
};

export type ProductEditorSavePayload = {
  product: ProductUpsertPayload;
  variants: ProductVariantUpsertPayload[];
};

const REMOVABLE_LEGACY_COLUMNS = new Set([
  "attributes",
  "badge",
  "category_id",
  "cdd_shipping_profile",
  "cnds_profile_id",
  "description",
  "discount_price",
  "gallery_images",
  "product_type",
  "regular_price",
  "vendor_id",
  "weight",
]);

function buildSchemaErrorMessage(message: string) {
  const normalizedMessage = message.toLowerCase();

  if (
    normalizedMessage.includes("image_url") ||
    normalizedMessage.includes("price") ||
    normalizedMessage.includes("moq") ||
    normalizedMessage.includes("status") ||
    normalizedMessage.includes("product_type") ||
    normalizedMessage.includes("regular_price") ||
    normalizedMessage.includes("discount_price") ||
    normalizedMessage.includes("vendor_id") ||
    normalizedMessage.includes("gallery_images") ||
    normalizedMessage.includes("attributes") ||
    normalizedMessage.includes("cdd_shipping_profile") ||
    normalizedMessage.includes("cnds_profile_id")
  ) {
    return "The products table is missing one or more product editor columns. Add price, moq, image_url, status, product_type, regular_price, discount_price, vendor_id, gallery_images, attributes, cdd_shipping_profile, and cnds_profile_id before saving the full product editor data.";
  }

  if (normalizedMessage.includes("product_variants")) {
    return "The product_variants table is required for variable products. Create that table before saving variable products.";
  }

  return message;
}

function isMissingRelationError(message: string) {
  const normalizedMessage = message.toLowerCase();

  return (
    normalizedMessage.includes("relation") ||
    normalizedMessage.includes("does not exist") ||
    normalizedMessage.includes("could not find")
  );
}

function getMissingProductsColumn(message: string) {
  const quotedColumnMatch = message.match(/'([^']+)' column of 'products'/i);

  if (quotedColumnMatch?.[1]) {
    return quotedColumnMatch[1];
  }

  const plainColumnMatch = message.match(/column\s+"?([a-z0-9_]+)"?\s+of relation\s+"products"/i);

  if (plainColumnMatch?.[1]) {
    return plainColumnMatch[1];
  }

  const notExistMatch = message.match(/column\s+"?([a-z0-9_]+)"?\s+does not exist/i);

  if (notExistMatch?.[1]) {
    return notExistMatch[1];
  }

  const invalidColumnMatch = message.match(/Could not find the '?([a-z0-9_]+)'? column of '?products'?/i);

  if (invalidColumnMatch?.[1]) {
    return invalidColumnMatch[1];
  }

  const schemaCacheMatch = message.match(/schema cache.*column '?([a-z0-9_]+)'?/i);

  if (schemaCacheMatch?.[1]) {
    return schemaCacheMatch[1];
  }

  return null;
}

function normalizeProductSlug(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return normalized || "product";
}

function isSlugConstraintError(message: string) {
  const normalizedMessage = message.toLowerCase();

  return normalizedMessage.includes("products_slug_key") || normalizedMessage.includes("products_slug_unique_idx");
}

async function resolveUniqueProductSlug(
  supabase: SupabaseClient,
  rawSlug: string,
  excludeId?: string,
) {
  const baseSlug = normalizeProductSlug(rawSlug);
  const slugPattern = `${baseSlug}-%`;
  let query = supabase
    .from("products")
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

async function insertProductWithFallback(
  supabase: SupabaseClient,
  payload: ProductUpsertPayload & {
    price: number;
    moq: number;
    regular_price: number | null;
    discount_price: number | null;
    is_active: boolean;
  },
) {
  let nextPayload: Record<string, unknown> = payload;

  while (true) {
    const result = await supabase.from("products").insert(nextPayload as never).select("*").single();

    if (!result.error && result.data) {
      return result;
    }

    const errorMessage = result.error?.message ?? "";
    const missingColumn = getMissingProductsColumn(errorMessage);

    if (missingColumn && REMOVABLE_LEGACY_COLUMNS.has(missingColumn) && missingColumn in nextPayload) {
      const restPayload = { ...nextPayload };
      delete restPayload[missingColumn];
      nextPayload = restPayload;
      continue;
    }

    return result;
  }
}

async function updateProductWithFallback(
  supabase: SupabaseClient,
  id: string,
  payload: ProductUpsertPayload & {
    price: number;
    moq: number;
    regular_price: number | null;
    discount_price: number | null;
    is_active: boolean;
  },
) {
  let nextPayload: Record<string, unknown> = payload;

  while (true) {
    const result = await supabase.from("products").update(nextPayload as never).eq("id", id).select("*").single();

    if (!result.error && result.data) {
      return result;
    }

    const errorMessage = result.error?.message ?? "";
    const missingColumn = getMissingProductsColumn(errorMessage);

    if (missingColumn && REMOVABLE_LEGACY_COLUMNS.has(missingColumn) && missingColumn in nextPayload) {
      const restPayload = { ...nextPayload };
      delete restPayload[missingColumn];
      nextPayload = restPayload;
      continue;
    }

    return result;
  }
}

export function getEffectivePrice(regularPrice: number, discountPrice: number | null) {
  return discountPrice !== null && discountPrice > 0 && discountPrice < regularPrice
    ? discountPrice
    : regularPrice;
}

function getBaseProductMetrics(
  productType: ProductType,
  product: ProductUpsertPayload,
  variants: ProductVariantUpsertPayload[],
) {
  if (productType === "single") {
    const regularPrice = product.regular_price ?? product.price;
    const discountPrice = product.discount_price ?? null;

    return {
      price: getEffectivePrice(regularPrice, discountPrice),
      moq: product.moq,
      regular_price: regularPrice,
      discount_price: discountPrice,
    };
  }

  const effectivePrices = variants.map((variant) => variant.price);
  const moqs = variants.map((variant) => variant.moq);
  const regularPrices = variants.map((variant) => variant.regular_price ?? variant.price);

  return {
    price: effectivePrices.length > 0 ? Math.min(...effectivePrices) : 0,
    moq: moqs.length > 0 ? Math.min(...moqs) : 1,
    regular_price: regularPrices.length > 0 ? Math.min(...regularPrices) : null,
    discount_price: null,
  };
}

async function syncProductRelationTables(
  supabase: SupabaseClient,
  productId: string,
  payload: ProductUpsertPayload,
) {
  const imageRows = payload.gallery_images
    .filter(Boolean)
    .map((imageUrl, index) => ({
      product_id: productId,
      image_url: imageUrl,
      sort_order: index,
    })) satisfies Array<Pick<ProductImageRow, "product_id" | "image_url" | "sort_order">>;
  const specRows = payload.specifications
    .filter((spec) => spec.label.trim().length > 0 || spec.value.trim().length > 0)
    .map((spec, index) => ({
      product_id: productId,
      label: spec.label.trim(),
      value: spec.value.trim(),
      sort_order: index,
    })) satisfies Array<Pick<ProductSpecRow, "product_id" | "label" | "value" | "sort_order">>;

  const { error: deleteImagesError } = await supabase.from("product_images").delete().eq("product_id", productId);
  if (deleteImagesError && !isMissingRelationError(deleteImagesError.message)) {
    return deleteImagesError;
  }

  const { error: deleteSpecsError } = await supabase.from("product_specs").delete().eq("product_id", productId);
  if (deleteSpecsError && !isMissingRelationError(deleteSpecsError.message)) {
    return deleteSpecsError;
  }

  if (imageRows.length > 0) {
    const { error: insertImagesError } = await supabase.from("product_images").insert(imageRows as never);
    if (insertImagesError && !isMissingRelationError(insertImagesError.message)) {
      return insertImagesError;
    }
  }

  if (specRows.length > 0) {
    const { error: insertSpecsError } = await supabase.from("product_specs").insert(specRows as never);
    if (insertSpecsError && !isMissingRelationError(insertSpecsError.message)) {
      return insertSpecsError;
    }
  }

  return null;
}

export async function createProductEditorRecordWithClient(
  supabase: SupabaseClient,
  payload: ProductEditorSavePayload,
) {
  const baseMetrics = getBaseProductMetrics(payload.product.product_type, payload.product, payload.variants);
  const slugResult = await resolveUniqueProductSlug(supabase, payload.product.slug);

  if (slugResult.error) {
    return {
      data: null as ProductDbRow | null,
      error: slugResult.error,
    };
  }

  const productPayload = {
    ...payload.product,
    slug: slugResult.slug,
    price: baseMetrics.price,
    moq: baseMetrics.moq,
    regular_price: baseMetrics.regular_price,
    discount_price: baseMetrics.discount_price,
    is_active: payload.product.status === "active",
  };

  const { data, error } = await insertProductWithFallback(supabase, productPayload);

  if (error || !data) {
    if (error && isSlugConstraintError(error.message)) {
      return {
        data: null as ProductDbRow | null,
        error: {
          ...error,
          message: "That product slug is already in use. Please try saving again or choose a different slug.",
        },
      };
    }

    return {
      data: null as ProductDbRow | null,
      error: {
        ...error,
        message: buildSchemaErrorMessage(error?.message ?? "Unable to create the product."),
      },
    };
  }

  if (payload.product.product_type === "variable") {
    const variantsPayload = payload.variants.map((variant) => ({
      product_id: (data as ProductDbRow).id,
      ...variant,
    }));

    const { error: variantsError } = await supabase.from("product_variants").insert(variantsPayload as never);

    if (variantsError) {
      await supabase.from("products").delete().eq("id", (data as ProductDbRow).id);

      return {
        data: null as ProductDbRow | null,
        error: {
          ...variantsError,
          message: buildSchemaErrorMessage(variantsError.message),
        },
      };
    }
  }

  await syncProductRelationTables(supabase, (data as ProductDbRow).id, payload.product);

  return {
    data: data as ProductDbRow,
    error: null,
  };
}

export async function createProductEditorRecord(payload: ProductEditorSavePayload) {
  const supabase = getSupabaseClient();
  return createProductEditorRecordWithClient(supabase, payload);
}

export async function updateProductEditorRecordWithClient(
  supabase: SupabaseClient,
  id: string,
  payload: ProductEditorSavePayload,
) {
  const baseMetrics = getBaseProductMetrics(payload.product.product_type, payload.product, payload.variants);
  const slugResult = await resolveUniqueProductSlug(supabase, payload.product.slug, id);

  if (slugResult.error) {
    return {
      data: null as ProductDbRow | null,
      error: slugResult.error,
    };
  }

  const productPayload = {
    ...payload.product,
    slug: slugResult.slug,
    price: baseMetrics.price,
    moq: baseMetrics.moq,
    regular_price: baseMetrics.regular_price,
    discount_price: baseMetrics.discount_price,
    is_active: payload.product.status === "active",
  };

  const { data, error } = await updateProductWithFallback(supabase, id, productPayload);

  if (error || !data) {
    if (error && isSlugConstraintError(error.message)) {
      return {
        data: null as ProductDbRow | null,
        error: {
          ...error,
          message: "That product slug is already in use. Please choose a different slug.",
        },
      };
    }

    return {
      data: null as ProductDbRow | null,
      error: {
        ...error,
        message: buildSchemaErrorMessage(error?.message ?? "Unable to update the product."),
      },
    };
  }

  const { error: cleanupError } = await supabase.from("product_variants").delete().eq("product_id", id);

  if (cleanupError && !cleanupError.message.toLowerCase().includes("product_variants")) {
    return {
      data: null as ProductDbRow | null,
      error: {
        ...cleanupError,
        message: buildSchemaErrorMessage(cleanupError.message),
      },
    };
  }

  if (payload.product.product_type === "variable") {
    const variantsPayload = payload.variants.map((variant) => ({
      product_id: id,
      ...variant,
    }));

    const { error: variantsError } = await supabase.from("product_variants").insert(variantsPayload as never);

    if (variantsError) {
      return {
        data: null as ProductDbRow | null,
        error: {
          ...variantsError,
          message: buildSchemaErrorMessage(variantsError.message),
        },
      };
    }
  }

  await syncProductRelationTables(supabase, id, payload.product);

  return {
    data: data as ProductDbRow,
    error: null,
  };
}

export async function updateProductEditorRecord(
  id: string,
  payload: ProductEditorSavePayload,
) {
  const supabase = getSupabaseClient();
  return updateProductEditorRecordWithClient(supabase, id, payload);
}
