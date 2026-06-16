import type { PgDataClient } from "@/lib/postgres-data-client";

import {
  calculateProductProfitPricing,
  DEFAULT_CNY_TO_BDT_RATE,
  normalizeExchangeRate,
} from "@/lib/product-pricing";
import { getPgDataClient } from "@/lib/browser-app-client";
import type {
  ProductImageRow,
  ProductDbRow,
  ProductPricingType,
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
  buying_price_cny?: number | null;
  profit_amount_cny?: number | null;
  selling_price_cny?: number | null;
  moq: number;
  stock: number;
  weight: number | null;
  image_url: string | null;
  pricing_tier_set_id: string | null;
  attribute_values: Record<string, string>;
};

export type ProductPricingTierUpsertPayload = {
  pricing_type: ProductPricingType;
  min_qty: number;
  max_qty: number | null;
  price: number;
  sort_order: number;
};

export type ProductPricingTierSetUpsertPayload = {
  temp_id: string;
  name: string;
  fallback_price: number;
  pricing_type: ProductPricingType;
  sort_order: number;
  rows: ProductPricingTierUpsertPayload[];
};

export type ProductEditorSavePayload = {
  product: ProductUpsertPayload;
  variants: ProductVariantUpsertPayload[];
  pricing_tiers?: ProductPricingTierUpsertPayload[];
  pricing_tier_sets?: ProductPricingTierSetUpsertPayload[];
};

const REMOVABLE_LEGACY_COLUMNS = new Set([
  "attributes",
  "badge",
  "brand_id",
  "category_id",
  "cdd_shipping_profile",
  "cnds_profile_id",
  "description",
  "discount_price",
  "gallery_images",
  "product_type",
  "pricing_tier_profile_id",
  "pricing_source",
  "regular_price",
  "vendor_id",
  "weight",
]);

const REMOVABLE_VARIANT_COLUMNS = new Set([
  "pricing_tier_set_id",
]);

const PRODUCT_EDITOR_SCHEMA_COLUMNS = new Set([
  "price",
  "moq",
  "weight",
  "brand_id",
  "image_url",
  "status",
  "product_type",
  "regular_price",
  "discount_price",
  "vendor_id",
  "gallery_images",
  "attributes",
  "cdd_shipping_profile",
  "cnds_profile_id",
  "pricing_tier_profile_id",
  "pricing_source",
  "buying_price_cny",
  "profit_percent",
  "profit_amount_cny",
  "selling_price_cny",
  "exchange_rate_cny_to_bdt",
]);

function buildSchemaErrorMessage(message: string) {
  const normalizedMessage = message.toLowerCase();
  const missingProductColumn = getMissingProductsColumn(message);
  const missingVariantColumn = getMissingVariantColumn(message);

  if (normalizedMessage.includes("product_pricing_tier_sets") || normalizedMessage.includes("product_pricing_tier_set_rows")) {
    return "Variable pricing tier set tables are missing. Run the latest variable pricing tier migration to enable per-variant tier sets.";
  }

  if (
    missingVariantColumn === "pricing_tier_set_id" ||
    (normalizedMessage.includes("product_variants") && normalizedMessage.includes("pricing_tier_set_id"))
  ) {
    return "The product_variants table is missing the pricing_tier_set_id column. Run the latest variable pricing tier migration or save without per-variant tier set links.";
  }

  if (
    missingVariantColumn === "weight" ||
    (normalizedMessage.includes("product_variants") && normalizedMessage.includes("weight"))
  ) {
    return `The product_variants table is missing the "weight" column. Run the latest variable product weight migration, then try saving again. Original error: ${message}`;
  }

  if (missingProductColumn && PRODUCT_EDITOR_SCHEMA_COLUMNS.has(missingProductColumn)) {
    return `The products table is missing the "${missingProductColumn}" column. Run the latest product editor schema migration, then try saving again. Original error: ${message}`;
  }

  if (
    (normalizedMessage.includes("products") && normalizedMessage.includes("schema cache"))
  ) {
    return `DataClient schema cache still reports a products table editor column mismatch. If you just ran the migration, wait a few seconds and try again. Original error: ${message}`;
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

function isMissingColumnError(message: string) {
  const normalizedMessage = message.toLowerCase();

  return (
    normalizedMessage.includes("does not exist") ||
    normalizedMessage.includes("could not find") ||
    normalizedMessage.includes("schema cache") ||
    normalizedMessage.includes("column")
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

function getMissingVariantColumn(message: string) {
  const quotedColumnMatch = message.match(/'([^']+)' column of 'product_variants'/i);

  if (quotedColumnMatch?.[1]) {
    return quotedColumnMatch[1];
  }

  const plainColumnMatch = message.match(/column\s+"?([a-z0-9_]+)"?\s+of relation\s+"product_variants"/i);

  if (plainColumnMatch?.[1]) {
    return plainColumnMatch[1];
  }

  const notExistMatch = message.match(/column\s+"?([a-z0-9_]+)"?\s+does not exist/i);

  if (notExistMatch?.[1]) {
    return notExistMatch[1];
  }

  const invalidColumnMatch = message.match(/Could not find the '?([a-z0-9_]+)'? column of '?product_variants'?/i);

  if (invalidColumnMatch?.[1]) {
    return invalidColumnMatch[1];
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

function isPricingSourceConstraintError(message: string) {
  const normalizedMessage = message.toLowerCase();

  return normalizedMessage.includes("products_pricing_source_check");
}

function mapToLegacyPricingSource(value: unknown) {
  if (value === "use_product_tier") {
    return "use_pricing_tiers";
  }

  if (value === "use_fixed_price") {
    return "use_variant_price";
  }

  return value;
}

async function resolveUniqueProductSlug(
  dataClient: PgDataClient,
  rawSlug: string,
  excludeId?: string,
) {
  const baseSlug = normalizeProductSlug(rawSlug);
  const slugPattern = `${baseSlug}-%`;
  let query = dataClient
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

async function getCurrentCnyToBdtRate(dataClient: PgDataClient) {
  const { data, error } = await dataClient
    .from("platform_settings")
    .select("cny_to_bdt_rate")
    .eq("singleton_key", "default")
    .maybeSingle();

  if (error) {
    return DEFAULT_CNY_TO_BDT_RATE;
  }

  return normalizeExchangeRate((data as { cny_to_bdt_rate?: number | string | null } | null)?.cny_to_bdt_rate);
}

function applyProfitPricingToProduct(product: ProductUpsertPayload, exchangeRateCnyToBdt: number): ProductUpsertPayload {
  const pricing = calculateProductProfitPricing({
    buyingPriceCny: product.buying_price_cny,
    profitPercent: product.profit_percent,
    exchangeRateCnyToBdt,
  });

  return {
    ...product,
    buying_price_cny: pricing.buyingPriceCny,
    profit_percent: pricing.profitPercent,
    profit_amount_cny: pricing.profitAmountCny,
    selling_price_cny: pricing.sellingPriceCny,
    exchange_rate_cny_to_bdt: pricing.exchangeRateCnyToBdt,
    price: pricing.displayPriceBdt,
    regular_price: product.product_type === "single" ? pricing.displayPriceBdt : null,
    discount_price: null,
  };
}

function applyProfitPricingToVariant(
  variant: ProductVariantUpsertPayload,
  profitPercent: number,
  exchangeRateCnyToBdt: number,
): ProductVariantUpsertPayload {
  const buyingPriceCny = variant.buying_price_cny ?? variant.regular_price ?? variant.price;
  const pricing = calculateProductProfitPricing({
    buyingPriceCny,
    profitPercent,
    exchangeRateCnyToBdt,
  });

  return {
    ...variant,
    buying_price_cny: pricing.buyingPriceCny,
    profit_amount_cny: pricing.profitAmountCny,
    selling_price_cny: pricing.sellingPriceCny,
    regular_price: pricing.displayPriceBdt,
    discount_price: null,
    price: pricing.displayPriceBdt,
  };
}

async function insertProductWithFallback(
  dataClient: PgDataClient,
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
    const result = await dataClient.from("products").insert(nextPayload as never).select("*").single();

    if (!result.error && result.data) {
      return result;
    }

    const errorMessage = result.error?.message ?? "";

    if (isPricingSourceConstraintError(errorMessage) && "pricing_source" in nextPayload) {
      const legacyPricingSource = mapToLegacyPricingSource(nextPayload.pricing_source);

      if (legacyPricingSource !== nextPayload.pricing_source) {
        nextPayload = {
          ...nextPayload,
          pricing_source: legacyPricingSource,
        };
        continue;
      }
    }

    const missingColumn = getMissingProductsColumn(errorMessage);

    if (missingColumn && REMOVABLE_LEGACY_COLUMNS.has(missingColumn) && missingColumn in nextPayload) {
      const restPayload = { ...nextPayload };
      delete restPayload[missingColumn];
      nextPayload = restPayload;
      continue;
    }

    if (!missingColumn && isMissingColumnError(errorMessage)) {
      const removableKeys = Array.from(REMOVABLE_LEGACY_COLUMNS).filter((key) => key in nextPayload);

      if (removableKeys.length > 0) {
        const restPayload = { ...nextPayload };

        removableKeys.forEach((key) => {
          delete restPayload[key];
        });

        nextPayload = restPayload;
        continue;
      }
    }

    return result;
  }
}

async function updateProductWithFallback(
  dataClient: PgDataClient,
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
    const result = await dataClient.from("products").update(nextPayload as never).eq("id", id).select("*").single();

    if (!result.error && result.data) {
      return result;
    }

    const errorMessage = result.error?.message ?? "";

    if (isPricingSourceConstraintError(errorMessage) && "pricing_source" in nextPayload) {
      const legacyPricingSource = mapToLegacyPricingSource(nextPayload.pricing_source);

      if (legacyPricingSource !== nextPayload.pricing_source) {
        nextPayload = {
          ...nextPayload,
          pricing_source: legacyPricingSource,
        };
        continue;
      }
    }

    const missingColumn = getMissingProductsColumn(errorMessage);

    if (missingColumn && REMOVABLE_LEGACY_COLUMNS.has(missingColumn) && missingColumn in nextPayload) {
      const restPayload = { ...nextPayload };
      delete restPayload[missingColumn];
      nextPayload = restPayload;
      continue;
    }

    if (!missingColumn && isMissingColumnError(errorMessage)) {
      const removableKeys = Array.from(REMOVABLE_LEGACY_COLUMNS).filter((key) => key in nextPayload);

      if (removableKeys.length > 0) {
        const restPayload = { ...nextPayload };

        removableKeys.forEach((key) => {
          delete restPayload[key];
        });

        nextPayload = restPayload;
        continue;
      }
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
  pricingTierSets: ProductPricingTierSetUpsertPayload[] = [],
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
  const regularPrices =
    pricingTierSets.length > 0
      ? pricingTierSets.map((tierSet) => tierSet.fallback_price)
      : variants.map((variant) => variant.regular_price ?? variant.price);

  return {
    price: effectivePrices.length > 0 ? Math.min(...effectivePrices) : 0,
    moq: moqs.length > 0 ? Math.min(...moqs) : 1,
    regular_price: regularPrices.length > 0 ? Math.min(...regularPrices) : null,
    discount_price: null,
  };
}

async function syncProductRelationTables(
  dataClient: PgDataClient,
  productId: string,
  payload: ProductUpsertPayload,
) {
  const imageRows = Array.from(new Set(payload.gallery_images.map((imageUrl) => imageUrl.trim()).filter(Boolean)))
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

  const { error: deleteImagesError } = await dataClient.from("product_images").delete().eq("product_id", productId);
  if (deleteImagesError && !isMissingRelationError(deleteImagesError.message)) {
    return deleteImagesError;
  }

  const { error: deleteSpecsError } = await dataClient.from("product_specs").delete().eq("product_id", productId);
  if (deleteSpecsError && !isMissingRelationError(deleteSpecsError.message)) {
    return deleteSpecsError;
  }

  if (imageRows.length > 0) {
    const { error: insertImagesError } = await dataClient.from("product_images").insert(imageRows as never);
    if (insertImagesError && !isMissingRelationError(insertImagesError.message)) {
      return insertImagesError;
    }
  }

  if (specRows.length > 0) {
    const { error: insertSpecsError } = await dataClient.from("product_specs").insert(specRows as never);
    if (insertSpecsError && !isMissingRelationError(insertSpecsError.message)) {
      return insertSpecsError;
    }
  }

  return null;
}

async function syncProductPricingTiers(
  dataClient: PgDataClient,
  productId: string,
  tiers: ProductPricingTierUpsertPayload[],
  profitPercent: number,
  exchangeRateCnyToBdt: number,
) {
  const { error: deleteTiersError } = await dataClient.from("product_pricing_tiers").delete().eq("product_id", productId);

  if (deleteTiersError && !isMissingRelationError(deleteTiersError.message)) {
    return deleteTiersError;
  }

  const tierRows = tiers.map((tier) => {
    const pricing = calculateProductProfitPricing({
      buyingPriceCny: tier.price,
      profitPercent,
      exchangeRateCnyToBdt,
    });

    return {
      product_id: productId,
      pricing_type: tier.pricing_type,
      min_qty: tier.min_qty,
      max_qty: tier.max_qty,
      price: pricing.displayPriceBdt,
      buying_price_cny: pricing.buyingPriceCny,
      profit_amount_cny: pricing.profitAmountCny,
      selling_price_cny: pricing.sellingPriceCny,
      sort_order: tier.sort_order,
    };
  });

  if (tierRows.length === 0) {
    return null;
  }

  const { error: insertTiersError } = await dataClient.from("product_pricing_tiers").insert(tierRows as never);

  if (insertTiersError && !isMissingRelationError(insertTiersError.message)) {
    return insertTiersError;
  }

  return null;
}

async function syncProductPricingTierSets(
  dataClient: PgDataClient,
  productId: string,
  tierSets: ProductPricingTierSetUpsertPayload[],
  profitPercent: number,
  exchangeRateCnyToBdt: number,
) {
  const { data: existingSets, error: existingSetsError } = await dataClient
    .from("product_pricing_tier_sets")
    .select("id")
    .eq("product_id", productId);

  if (existingSetsError && !isMissingRelationError(existingSetsError.message)) {
    return {
      error: existingSetsError,
      setIdMap: new Map<string, string>(),
    };
  }

  const existingSetIds = ((existingSets ?? []) as Array<{ id: string }>).map((row) => row.id);

  if (existingSetIds.length > 0) {
    const { error: deleteRowsError } = await dataClient
      .from("product_pricing_tier_set_rows")
      .delete()
      .in("tier_set_id", existingSetIds);

    if (deleteRowsError && !isMissingRelationError(deleteRowsError.message)) {
      return {
        error: deleteRowsError,
        setIdMap: new Map<string, string>(),
      };
    }
  }

  const { error: deleteSetsError } = await dataClient.from("product_pricing_tier_sets").delete().eq("product_id", productId);

  if (deleteSetsError && !isMissingRelationError(deleteSetsError.message)) {
    return {
      error: deleteSetsError,
      setIdMap: new Map<string, string>(),
    };
  }

  if (tierSets.length === 0) {
    return {
      error: null,
      setIdMap: new Map<string, string>(),
    };
  }

  const insertPayload = tierSets.map((tierSet) => {
    const pricing = calculateProductProfitPricing({
      buyingPriceCny: tierSet.fallback_price,
      profitPercent,
      exchangeRateCnyToBdt,
    });

    return {
      product_id: productId,
      name: tierSet.name,
      fallback_price: pricing.displayPriceBdt,
      buying_price_cny: pricing.buyingPriceCny,
      profit_amount_cny: pricing.profitAmountCny,
      selling_price_cny: pricing.sellingPriceCny,
      pricing_type: tierSet.pricing_type,
      sort_order: tierSet.sort_order,
    };
  });

  const { data: insertedSets, error: insertSetsError } = await dataClient
    .from("product_pricing_tier_sets")
    .insert(insertPayload as never)
    .select("id, sort_order");

  if (insertSetsError && !isMissingRelationError(insertSetsError.message)) {
    return {
      error: insertSetsError,
      setIdMap: new Map<string, string>(),
    };
  }

  const sortOrderToId = new Map<number, string>();
  ((insertedSets ?? []) as Array<{ id: string; sort_order: number | null }>).forEach((row) => {
    if (typeof row.sort_order === "number") {
      sortOrderToId.set(row.sort_order, row.id);
    }
  });

  const setIdMap = new Map<string, string>();
  tierSets.forEach((tierSet) => {
    const persistedId = sortOrderToId.get(tierSet.sort_order);

    if (persistedId) {
      setIdMap.set(tierSet.temp_id, persistedId);
    }
  });

  const rowPayload = tierSets.flatMap((tierSet) => {
    const persistedId = setIdMap.get(tierSet.temp_id);

    if (!persistedId) {
      return [];
    }

    return tierSet.rows.map((row) => {
      const pricing = calculateProductProfitPricing({
        buyingPriceCny: row.price,
        profitPercent,
        exchangeRateCnyToBdt,
      });

      return {
        tier_set_id: persistedId,
        min_qty: row.min_qty,
        max_qty: row.max_qty,
        price: pricing.displayPriceBdt,
        buying_price_cny: pricing.buyingPriceCny,
        profit_amount_cny: pricing.profitAmountCny,
        selling_price_cny: pricing.sellingPriceCny,
        sort_order: row.sort_order,
      };
    });
  });

  if (rowPayload.length > 0) {
    const { error: insertRowsError } = await dataClient.from("product_pricing_tier_set_rows").insert(rowPayload as never);

    if (insertRowsError && !isMissingRelationError(insertRowsError.message)) {
      return {
        error: insertRowsError,
        setIdMap: new Map<string, string>(),
      };
    }
  }

  return {
    error: null,
    setIdMap,
  };
}

async function insertProductVariantsWithFallback(
  dataClient: PgDataClient,
  variantsPayload: Array<Record<string, unknown>>,
) {
  let nextPayload = variantsPayload;

  while (true) {
    const result = await dataClient.from("product_variants").insert(nextPayload as never);

    if (!result.error) {
      return result;
    }

    const missingColumn = getMissingVariantColumn(result.error.message ?? "");

    if (missingColumn && REMOVABLE_VARIANT_COLUMNS.has(missingColumn)) {
      nextPayload = nextPayload.map((variant) => {
        const nextVariant = { ...variant };
        delete nextVariant[missingColumn];
        return nextVariant;
      });
      continue;
    }

    return result;
  }
}

export async function createProductEditorRecordWithClient(
  dataClient: PgDataClient,
  payload: ProductEditorSavePayload,
) {
  const exchangeRateCnyToBdt = await getCurrentCnyToBdtRate(dataClient);
  const pricedProduct = applyProfitPricingToProduct(payload.product, exchangeRateCnyToBdt);
  const pricedVariants = payload.variants.map((variant) =>
    applyProfitPricingToVariant(variant, pricedProduct.profit_percent, exchangeRateCnyToBdt),
  );
  const baseMetrics = getBaseProductMetrics(
    pricedProduct.product_type,
    pricedProduct,
    pricedVariants,
    payload.pricing_tier_sets ?? [],
  );
  const slugResult = await resolveUniqueProductSlug(dataClient, pricedProduct.slug);

  if (slugResult.error) {
    return {
      data: null as ProductDbRow | null,
      error: slugResult.error,
    };
  }

  const productPayload = {
    ...pricedProduct,
    slug: slugResult.slug,
    price: baseMetrics.price,
    moq: baseMetrics.moq,
    regular_price: pricedProduct.product_type === "single" ? pricedProduct.regular_price : baseMetrics.regular_price,
    discount_price: null,
    is_active: pricedProduct.status === "active",
  };

  const { data, error } = await insertProductWithFallback(dataClient, productPayload);

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

  let pricingTierSetIdMap = new Map<string, string>();

  if (pricedProduct.product_type === "variable" && payload.pricing_tier_sets) {
    const tierSetResult = await syncProductPricingTierSets(
      dataClient,
      (data as ProductDbRow).id,
      payload.pricing_tier_sets,
      pricedProduct.profit_percent,
      exchangeRateCnyToBdt,
    );

    if (tierSetResult.error) {
      await dataClient.from("products").delete().eq("id", (data as ProductDbRow).id);

      return {
        data: null as ProductDbRow | null,
        error: {
          ...tierSetResult.error,
          message: buildSchemaErrorMessage(tierSetResult.error.message),
        },
      };
    }

    pricingTierSetIdMap = tierSetResult.setIdMap;
  }

  if (pricedProduct.product_type === "variable") {
    const variantsPayload = pricedVariants.map((variant) => ({
      product_id: (data as ProductDbRow).id,
      ...variant,
      pricing_tier_set_id: variant.pricing_tier_set_id ? pricingTierSetIdMap.get(variant.pricing_tier_set_id) ?? null : null,
    }));

    const { error: variantsError } = await insertProductVariantsWithFallback(dataClient, variantsPayload);

    if (variantsError) {
      await dataClient.from("products").delete().eq("id", (data as ProductDbRow).id);

      return {
        data: null as ProductDbRow | null,
        error: {
          ...variantsError,
          message: buildSchemaErrorMessage(variantsError.message),
        },
      };
    }
  }

  const relationError = await syncProductRelationTables(dataClient, (data as ProductDbRow).id, pricedProduct);
  if (relationError) {
    return {
      data: null as ProductDbRow | null,
      error: relationError,
    };
  }

  const pricingTierError = await syncProductPricingTiers(
    dataClient,
    (data as ProductDbRow).id,
    pricedProduct.product_type === "single" ? payload.pricing_tiers ?? [] : [],
    pricedProduct.profit_percent,
    exchangeRateCnyToBdt,
  );
  if (payload.pricing_tiers && pricingTierError) {
    return {
      data: null as ProductDbRow | null,
      error: {
        ...pricingTierError,
        message: buildSchemaErrorMessage(pricingTierError.message),
      },
    };
  }

  return {
    data: data as ProductDbRow,
    error: null,
  };
}

export async function createProductEditorRecord(payload: ProductEditorSavePayload) {
  const dataClient = getPgDataClient();
  return createProductEditorRecordWithClient(dataClient, payload);
}

function buildDeleteProductErrorMessage(message: string) {
  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes("foreign key")) {
    return "This product cannot be deleted because other records still depend on it.";
  }

  if (normalizedMessage.includes("order")) {
    return "This product cannot be deleted because it is already connected to existing order records.";
  }

  return buildSchemaErrorMessage(message);
}

export async function deleteProductRecordWithClient(
  dataClient: PgDataClient,
  id: string,
) {
  const { data, error } = await dataClient.from("products").delete().eq("id", id).select("*").maybeSingle();

  if (error) {
    return {
      data: null as ProductDbRow | null,
      error: {
        ...error,
        message: buildDeleteProductErrorMessage(error.message ?? "Unable to delete the product."),
      },
    };
  }

  if (!data) {
    return {
      data: null as ProductDbRow | null,
      error: {
        message: "Product not found or already deleted.",
      },
    };
  }

  return {
    data: data as ProductDbRow,
    error: null,
  };
}

export async function updateProductEditorRecordWithClient(
  dataClient: PgDataClient,
  id: string,
  payload: ProductEditorSavePayload,
) {
  const exchangeRateCnyToBdt = await getCurrentCnyToBdtRate(dataClient);
  const pricedProduct = applyProfitPricingToProduct(payload.product, exchangeRateCnyToBdt);
  const pricedVariants = payload.variants.map((variant) =>
    applyProfitPricingToVariant(variant, pricedProduct.profit_percent, exchangeRateCnyToBdt),
  );
  const baseMetrics = getBaseProductMetrics(
    pricedProduct.product_type,
    pricedProduct,
    pricedVariants,
    payload.pricing_tier_sets ?? [],
  );
  const slugResult = await resolveUniqueProductSlug(dataClient, pricedProduct.slug, id);

  if (slugResult.error) {
    return {
      data: null as ProductDbRow | null,
      error: slugResult.error,
    };
  }

  const productPayload = {
    ...pricedProduct,
    slug: slugResult.slug,
    price: baseMetrics.price,
    moq: baseMetrics.moq,
    regular_price: pricedProduct.product_type === "single" ? pricedProduct.regular_price : baseMetrics.regular_price,
    discount_price: null,
    is_active: pricedProduct.status === "active",
  };

  const { data, error } = await updateProductWithFallback(dataClient, id, productPayload);

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

  const { error: cleanupError } = await dataClient.from("product_variants").delete().eq("product_id", id);

  if (cleanupError && !cleanupError.message.toLowerCase().includes("product_variants")) {
    return {
      data: null as ProductDbRow | null,
      error: {
        ...cleanupError,
        message: buildSchemaErrorMessage(cleanupError.message),
      },
    };
  }

  const tierSetResult = await syncProductPricingTierSets(
    dataClient,
    id,
    pricedProduct.product_type === "variable" ? payload.pricing_tier_sets ?? [] : [],
    pricedProduct.profit_percent,
    exchangeRateCnyToBdt,
  );

  if (tierSetResult.error) {
    return {
      data: null as ProductDbRow | null,
      error: {
        ...tierSetResult.error,
        message: buildSchemaErrorMessage(tierSetResult.error.message),
      },
    };
  }

  if (pricedProduct.product_type === "variable") {
    const variantsPayload = pricedVariants.map((variant) => ({
      product_id: id,
      ...variant,
      pricing_tier_set_id: variant.pricing_tier_set_id ? tierSetResult.setIdMap.get(variant.pricing_tier_set_id) ?? null : null,
    }));

    const { error: variantsError } = await insertProductVariantsWithFallback(dataClient, variantsPayload);

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

  const relationError = await syncProductRelationTables(dataClient, id, pricedProduct);
  if (relationError) {
    return {
      data: null as ProductDbRow | null,
      error: relationError,
    };
  }

  const pricingTierError = payload.pricing_tiers
    ? await syncProductPricingTiers(
        dataClient,
        id,
        pricedProduct.product_type === "single" ? payload.pricing_tiers : [],
        pricedProduct.profit_percent,
        exchangeRateCnyToBdt,
      )
    : null;
  if (pricingTierError) {
    return {
      data: null as ProductDbRow | null,
      error: {
        ...pricingTierError,
        message: buildSchemaErrorMessage(pricingTierError.message),
      },
    };
  }

  return {
    data: data as ProductDbRow,
    error: null,
  };
}

export async function updateProductEditorRecord(
  id: string,
  payload: ProductEditorSavePayload,
) {
  const dataClient = getPgDataClient();
  return updateProductEditorRecordWithClient(dataClient, id, payload);
}
