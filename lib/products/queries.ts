import { mockCategories } from "@/data/mock-categories";
import { getSupabaseClient } from "@/lib/supabase-client";
import { getVendorOptions } from "@/lib/vendors/queries";
import type {
  ProductCategoryOption,
  ProductDbRow,
  ProductPricingSource,
  ResolvedProductPricingConfig,
  ProductPricingTierRow,
  ResolvedProductPricingTier,
  ProductDbVariantRow,
  ProductEditorRecord,
  ProductImageRow,
  ProductPricingTierSetRow,
  ProductPricingTierSetTierRow,
  ProductSpecRow,
  ProductStatus,
  ProductType,
  ResolvedVariantPricingAssignment,
  ResolvedVariantPricingTierSet,
  ProductVendorOption,
} from "@/types/product-db";

function normalizeStatus(value: unknown, isActive: boolean): ProductStatus {
  if (value === "active" || value === "disabled" || value === "draft") {
    return value;
  }

  return isActive ? "active" : "disabled";
}

function normalizeProductType(value: unknown): ProductType {
  return value === "variable" ? "variable" : "single";
}

function normalizeProductPricingSource(value: unknown): ProductPricingSource {
  if (value === "use_product_tier" || value === "use_pricing_tiers") {
    return "use_product_tier";
  }

  return "use_fixed_price";
}

function normalizeProduct(row: ProductDbRow): ProductDbRow {
  const parsedPrice = Number(row.price);
  const parsedMoq = Number(row.moq);

  return {
    ...row,
    vendor_id: typeof row.vendor_id === "string" ? row.vendor_id : null,
    slug: typeof row.slug === "string" && row.slug.trim().length > 0 ? row.slug : String(row.id),
    image_url: typeof row.image_url === "string" ? row.image_url : null,
    description: typeof row.description === "string" ? row.description : null,
    short_description: typeof row.short_description === "string" ? row.short_description : null,
    cnds_profile_id: typeof row.cnds_profile_id === "string" ? row.cnds_profile_id : null,
    pricing_tier_profile_id:
      typeof row.pricing_tier_profile_id === "string" ? row.pricing_tier_profile_id : null,
    price: Number.isFinite(parsedPrice) ? parsedPrice : 0,
    moq: Number.isFinite(parsedMoq) && parsedMoq > 0 ? parsedMoq : 1,
    is_active: typeof row.is_active === "boolean" ? row.is_active : true,
    status: normalizeStatus(row.status, row.is_active),
    product_type: normalizeProductType(row.product_type),
    pricing_source: normalizeProductPricingSource(row.pricing_source),
    gallery_images: Array.isArray(row.gallery_images) ? row.gallery_images : [],
    attributes: Array.isArray(row.attributes) ? row.attributes : [],
    specifications: Array.isArray(row.specifications) ? row.specifications : [],
    reviews: Array.isArray(row.reviews) ? row.reviews : [],
  };
}

function normalizeProductPricingType(value: unknown) {
  return value === "fixed" ? "fixed" : "unit";
}

function normalizeProductPricingTier(row: ProductPricingTierRow): ProductPricingTierRow {
  const parsedMinQty = Number(row.min_qty);
  const parsedMaxQty =
    row.max_qty === null || row.max_qty === undefined
      ? null
      : Number(row.max_qty);
  const parsedPrice = Number(row.price);

  return {
    ...row,
    pricing_type: normalizeProductPricingType(row.pricing_type),
    min_qty: Number.isFinite(parsedMinQty) && parsedMinQty > 0 ? parsedMinQty : 1,
    max_qty: Number.isFinite(parsedMaxQty ?? NaN) && (parsedMaxQty ?? 0) > 0 ? (parsedMaxQty as number) : null,
    price: Number.isFinite(parsedPrice) && parsedPrice >= 0 ? parsedPrice : 0,
    sort_order: typeof row.sort_order === "number" ? row.sort_order : null,
    created_at: typeof row.created_at === "string" ? row.created_at : null,
  };
}

function normalizeProductPricingTierSet(row: ProductPricingTierSetRow): ProductPricingTierSetRow {
  const parsedFallbackPrice = Number(row.fallback_price);

  return {
    ...row,
    pricing_type: normalizeProductPricingType(row.pricing_type),
    fallback_price: Number.isFinite(parsedFallbackPrice) && parsedFallbackPrice >= 0 ? parsedFallbackPrice : 0,
    sort_order: typeof row.sort_order === "number" ? row.sort_order : null,
    created_at: typeof row.created_at === "string" ? row.created_at : null,
  };
}

function normalizeProductPricingTierSetRow(row: ProductPricingTierSetTierRow): ProductPricingTierSetTierRow {
  const parsedMinQty = Number(row.min_qty);
  const parsedMaxQty =
    row.max_qty === null || row.max_qty === undefined ? null : Number(row.max_qty);
  const parsedPrice = Number(row.price);

  return {
    ...row,
    min_qty: Number.isFinite(parsedMinQty) && parsedMinQty > 0 ? parsedMinQty : 1,
    max_qty: Number.isFinite(parsedMaxQty ?? NaN) && (parsedMaxQty ?? 0) > 0 ? (parsedMaxQty as number) : null,
    price: Number.isFinite(parsedPrice) && parsedPrice >= 0 ? parsedPrice : 0,
    sort_order: typeof row.sort_order === "number" ? row.sort_order : null,
    created_at: typeof row.created_at === "string" ? row.created_at : null,
  };
}

export async function getProducts() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("products").select("*").order("created_at", { ascending: false });

  return {
    data: ((data ?? []) as ProductDbRow[]).map(normalizeProduct),
    error,
  };
}

export async function getProductsForVendors(vendorIds: string[]) {
  const scopedVendorIds = Array.from(new Set(vendorIds.filter(Boolean)));

  if (scopedVendorIds.length === 0) {
    return {
      data: [] as ProductDbRow[],
      error: null,
    };
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .in("vendor_id", scopedVendorIds)
    .order("created_at", { ascending: false });

  return {
    data: ((data ?? []) as ProductDbRow[]).map(normalizeProduct),
    error,
  };
}

function isPublicProduct(row: ProductDbRow) {
  const status = normalizeStatus(row.status, row.is_active);
  return row.is_active && status === "active";
}

export async function getPublicProducts() {
  const { data, error } = await getProducts();

  return {
    data: data.filter(isPublicProduct),
    error,
  };
}

export async function getProductById(id: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("products").select("*").eq("id", id).single();

  return {
    data: data ? normalizeProduct(data as ProductDbRow) : null,
    error,
  };
}

export async function getProductByIdForVendors(id: string, vendorIds: string[]) {
  const productResult = await getProductById(id);

  if (productResult.error || !productResult.data) {
    return productResult;
  }

  const scopedVendorIds = new Set(vendorIds.filter(Boolean));

  return {
    data:
      productResult.data.vendor_id && scopedVendorIds.has(productResult.data.vendor_id)
        ? productResult.data
        : null,
    error: null,
  };
}

export async function getProductsByIds(ids: string[]) {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));

  if (uniqueIds.length === 0) {
    return {
      data: [] as ProductDbRow[],
      error: null,
    };
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("products").select("*").in("id", uniqueIds);

  return {
    data: ((data ?? []) as ProductDbRow[]).map(normalizeProduct),
    error,
  };
}

export async function getPublicProductBySlug(slug: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("products").select("*").eq("slug", slug).maybeSingle();

  const normalizedProduct = data ? normalizeProduct(data as ProductDbRow) : null;

  return {
    data: normalizedProduct && isPublicProduct(normalizedProduct) ? normalizedProduct : null,
    error,
  };
}

function normalizeVariant(row: ProductDbVariantRow): ProductDbVariantRow {
  const parsedPrice = Number(row.price);
  const parsedMoq = Number(row.moq);
  const parsedStock = Number(row.stock);
  const parsedWeight = row.weight === null || row.weight === undefined ? null : Number(row.weight);
  const parsedRegularPrice =
    row.regular_price === null || row.regular_price === undefined ? null : Number(row.regular_price);
  const parsedDiscountPrice =
    row.discount_price === null || row.discount_price === undefined ? null : Number(row.discount_price);
  const parsedMinOrderQuantity =
    row.min_order_quantity === null || row.min_order_quantity === undefined ? null : Number(row.min_order_quantity);
  const normalizedMinOrderQuantity =
    parsedMinOrderQuantity !== null && Number.isFinite(parsedMinOrderQuantity) && parsedMinOrderQuantity > 0
      ? parsedMinOrderQuantity
      : row.moq;

  return {
    ...row,
    name: typeof row.name === "string" && row.name.trim().length > 0 ? row.name : "Default",
    value: typeof row.value === "string" && row.value.trim().length > 0 ? row.value : null,
    sku: typeof row.sku === "string" ? row.sku : null,
    price: Number.isFinite(parsedPrice) ? parsedPrice : 0,
    moq: Number.isFinite(parsedMoq) && parsedMoq > 0 ? parsedMoq : 1,
    stock: Number.isFinite(parsedStock) && parsedStock >= 0 ? parsedStock : 0,
    regular_price: Number.isFinite(parsedRegularPrice) ? parsedRegularPrice : null,
    discount_price: Number.isFinite(parsedDiscountPrice) ? parsedDiscountPrice : null,
    weight: Number.isFinite(parsedWeight) ? parsedWeight : null,
    image_url: typeof row.image_url === "string" ? row.image_url : null,
    min_order_quantity: normalizedMinOrderQuantity,
    is_active: typeof row.is_active === "boolean" ? row.is_active : true,
    sort_order: typeof row.sort_order === "number" ? row.sort_order : null,
    pricing_tier_set_id: typeof row.pricing_tier_set_id === "string" ? row.pricing_tier_set_id : null,
    attribute_values:
      row.attribute_values && typeof row.attribute_values === "object" ? row.attribute_values : {},
  };
}

function isMissingRelationError(message: string) {
  const normalizedMessage = message.toLowerCase();

  return (
    normalizedMessage.includes("relation") ||
    normalizedMessage.includes("does not exist") ||
    normalizedMessage.includes("could not find")
  );
}

export async function getProductPricingTiersByProductId(productId: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("product_pricing_tiers")
    .select("*")
    .eq("product_id", productId)
    .order("min_qty", { ascending: true })
    .order("sort_order", { ascending: true });

  if (error && isMissingRelationError(error.message)) {
    return {
      data: [] as ProductPricingTierRow[],
      error: null,
    };
  }

  return {
    data: ((data ?? []) as ProductPricingTierRow[]).map(normalizeProductPricingTier),
    error,
  };
}

export async function getProductPricingTierMapByProductIds(productIds: string[]) {
  const uniqueIds = Array.from(new Set(productIds.filter(Boolean)));

  if (uniqueIds.length === 0) {
    return {
      data: new Map<string, ProductPricingTierRow[]>(),
      error: null,
    };
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("product_pricing_tiers")
    .select("*")
    .in("product_id", uniqueIds)
    .order("min_qty", { ascending: true })
    .order("sort_order", { ascending: true });

  if (error && isMissingRelationError(error.message)) {
    return {
      data: new Map<string, ProductPricingTierRow[]>(),
      error: null,
    };
  }

  if (error) {
    return {
      data: new Map<string, ProductPricingTierRow[]>(),
      error,
    };
  }

  const tierMap = new Map<string, ProductPricingTierRow[]>();

  for (const rawRow of (data ?? []) as ProductPricingTierRow[]) {
    const row = normalizeProductPricingTier(rawRow);
    const current = tierMap.get(row.product_id) ?? [];
    current.push(row);
    tierMap.set(row.product_id, current);
  }

  return {
    data: tierMap,
    error: null,
  };
}

export async function getProductPricingTierSetsByProductIds(productIds: string[]) {
  const uniqueIds = Array.from(new Set(productIds.filter(Boolean)));

  if (uniqueIds.length === 0) {
    return {
      data: new Map<string, Array<{ set: ProductPricingTierSetRow; rows: ProductPricingTierSetTierRow[] }>>(),
      error: null,
    };
  }

  const supabase = getSupabaseClient();
  const [{ data: sets, error: setsError }, { data: rows, error: rowsError }] = await Promise.all([
    supabase
      .from("product_pricing_tier_sets")
      .select("*")
      .in("product_id", uniqueIds)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("product_pricing_tier_set_rows")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
  ]);

  const relationError =
    (setsError && !isMissingRelationError(setsError.message) ? setsError : null) ??
    (rowsError && !isMissingRelationError(rowsError.message) ? rowsError : null);

  if (relationError) {
    return {
      data: new Map<string, Array<{ set: ProductPricingTierSetRow; rows: ProductPricingTierSetTierRow[] }>>(),
      error: relationError,
    };
  }

  const rowsBySetId = new Map<string, ProductPricingTierSetTierRow[]>();
  ((rows ?? []) as ProductPricingTierSetTierRow[]).forEach((rawRow) => {
    const row = normalizeProductPricingTierSetRow(rawRow);
    const current = rowsBySetId.get(row.tier_set_id) ?? [];
    current.push(row);
    rowsBySetId.set(row.tier_set_id, current);
  });

  const setMap = new Map<string, Array<{ set: ProductPricingTierSetRow; rows: ProductPricingTierSetTierRow[] }>>();
  ((sets ?? []) as ProductPricingTierSetRow[]).forEach((rawSet) => {
    const set = normalizeProductPricingTierSet(rawSet);
    const current = setMap.get(set.product_id) ?? [];
    current.push({
      set,
      rows: rowsBySetId.get(set.id) ?? [],
    });
    setMap.set(set.product_id, current);
  });

  return {
    data: setMap,
    error: null,
  };
}

function mapLegacyTierToResolvedTier(row: ProductPricingTierRow): ResolvedProductPricingTier {
  return {
    id: row.id,
    min_qty: row.min_qty,
    max_qty: row.max_qty,
    price: row.price,
    sort_order: row.sort_order ?? null,
  };
}

function mapTierSetRowToResolvedTier(row: ProductPricingTierSetTierRow): ResolvedProductPricingTier {
  return {
    id: row.id,
    min_qty: row.min_qty,
    max_qty: row.max_qty,
    price: row.price,
    sort_order: row.sort_order ?? null,
  };
}

export async function getResolvedProductPricingMapByProducts(products: ProductDbRow[]) {
  if (products.length === 0) {
    return {
      data: new Map<string, ResolvedProductPricingConfig>(),
      error: null,
    };
  }

  const legacyTierResult = await getProductPricingTierMapByProductIds(products.map((product) => product.id));
  const tierSetResult = await getProductPricingTierSetsByProductIds(products.map((product) => product.id));
  const supabase = getSupabaseClient();
  const { data: variantRows, error: variantRowsError } = await supabase
    .from("product_variants")
    .select("id, product_id, pricing_tier_set_id")
    .in("product_id", products.map((product) => product.id));
  const data = new Map<string, ResolvedProductPricingConfig>();
  const variantAssignmentsByProductId = new Map<string, ResolvedVariantPricingAssignment[]>();

  if (!variantRowsError || isMissingRelationError(variantRowsError.message)) {
    ((variantRows ?? []) as Array<{ id: string; product_id: string; pricing_tier_set_id: string | null }>).forEach((row) => {
      const current = variantAssignmentsByProductId.get(row.product_id) ?? [];
      current.push({
        variant_id: row.id,
        tier_set_id: row.pricing_tier_set_id,
      });
      variantAssignmentsByProductId.set(row.product_id, current);
    });
  }

  products.forEach((product) => {
    const legacyTiers = legacyTierResult.data.get(product.id) ?? [];
    const tierSets = tierSetResult.data.get(product.id) ?? [];

    if (product.product_type === "variable" && tierSets.length > 0) {
      data.set(product.id, {
        source: "legacy",
        profile_id: null,
        profile_name: null,
        pricing_type: null,
        tiers: [],
        variant_tier_sets: tierSets.map(
          ({ set, rows }): ResolvedVariantPricingTierSet => ({
            id: set.id,
            name: set.name,
            fallback_price: set.fallback_price,
            pricing_type: set.pricing_type,
            tiers: rows.map(mapTierSetRowToResolvedTier),
            sort_order: set.sort_order ?? null,
          }),
        ),
        variant_assignments: variantAssignmentsByProductId.get(product.id) ?? [],
      });
      return;
    }

    if (legacyTiers.length > 0) {
      data.set(product.id, {
        source: "legacy",
        profile_id: null,
        profile_name: null,
        pricing_type: legacyTiers[0]?.pricing_type ?? null,
        tiers: legacyTiers.map(mapLegacyTierToResolvedTier),
        variant_tier_sets: [],
        variant_assignments: variantAssignmentsByProductId.get(product.id) ?? [],
      });
      return;
    }

    data.set(product.id, {
      source: null,
      profile_id: null,
      profile_name: null,
      pricing_type: null,
      tiers: [],
      variant_tier_sets: [],
      variant_assignments: variantAssignmentsByProductId.get(product.id) ?? [],
    });
  });

  return {
    data,
    error: legacyTierResult.error ?? tierSetResult.error ?? (variantRowsError && !isMissingRelationError(variantRowsError.message) ? variantRowsError : null),
  };
}

async function loadProductRelationRecords(productId: string) {
  const supabase = getSupabaseClient();
  const [{ data: imageRows, error: imageError }, { data: specRows, error: specError }] = await Promise.all([
    supabase
      .from("product_images")
      .select("id, product_id, image_url, sort_order, created_at")
      .eq("product_id", productId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("product_specs")
      .select("id, product_id, label, value, sort_order, created_at")
      .eq("product_id", productId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
  ]);

  return {
    imageRows: imageError && isMissingRelationError(imageError.message) ? [] : ((imageRows ?? []) as ProductImageRow[]),
    imageError: imageError && isMissingRelationError(imageError.message) ? null : imageError,
    specRows: specError && isMissingRelationError(specError.message) ? [] : ((specRows ?? []) as ProductSpecRow[]),
    specError: specError && isMissingRelationError(specError.message) ? null : specError,
  };
}

function mergeProductRelations(
  product: ProductDbRow,
  imageRows: ProductImageRow[],
  specRows: ProductSpecRow[],
) {
  const galleryImages =
    imageRows.length > 0
      ? imageRows.map((row) => row.image_url).filter(Boolean)
      : Array.isArray(product.gallery_images)
        ? product.gallery_images
        : [];
  const specifications =
    specRows.length > 0
      ? specRows
          .map((row) => ({
            label: row.label,
            value: row.value,
          }))
          .filter((row) => row.label.trim().length > 0 || row.value.trim().length > 0)
      : Array.isArray(product.specifications)
        ? product.specifications
        : [];

  return {
    ...product,
    gallery_images: galleryImages,
    specifications,
  };
}

export async function getPublicProductDetailBySlug(slug: string) {
  const productResult = await getPublicProductBySlug(slug);

  if (productResult.error || !productResult.data) {
    return {
      data: null as { product: ProductDbRow; variants: ProductDbVariantRow[] } | null,
      error: productResult.error,
    };
  }

  if (productResult.data.product_type !== "variable") {
    const relationResult = await loadProductRelationRecords(productResult.data.id);

    return {
      data: {
        product: mergeProductRelations(productResult.data, relationResult.imageRows, relationResult.specRows),
        variants: [] as ProductDbVariantRow[],
      },
      error: relationResult.imageError ?? relationResult.specError,
    };
  }

  const supabase = getSupabaseClient();
  const { data: variants, error: variantsError } = await supabase
    .from("product_variants")
    .select("*")
    .eq("product_id", productResult.data.id)
    .order("created_at", { ascending: true });

  if (variantsError) {
    const missingVariantsTable = variantsError.message.toLowerCase().includes("product_variants");
    const relationResult = await loadProductRelationRecords(productResult.data.id);

    return {
      data: {
        product: mergeProductRelations(productResult.data, relationResult.imageRows, relationResult.specRows),
        variants: missingVariantsTable ? [] : ((variants ?? []) as ProductDbVariantRow[]).map(normalizeVariant),
      },
      error: missingVariantsTable ? relationResult.imageError ?? relationResult.specError : variantsError,
    };
  }

  const relationResult = await loadProductRelationRecords(productResult.data.id);

  return {
    data: {
      product: mergeProductRelations(productResult.data, relationResult.imageRows, relationResult.specRows),
      variants: ((variants ?? []) as ProductDbVariantRow[]).map(normalizeVariant),
    },
    error: relationResult.imageError ?? relationResult.specError,
  };
}

export async function getProductEditorRecord(id: string) {
  const productResult = await getProductById(id);

  if (productResult.error || !productResult.data) {
    return {
      data: null as ProductEditorRecord | null,
      error: productResult.error,
    };
  }

  const supabase = getSupabaseClient();
  const [{ data: variants, error: variantsError }, pricingTiersResult, pricingTierSetsResult] = await Promise.all([
    supabase.from("product_variants").select("*").eq("product_id", id).order("created_at", { ascending: true }),
    getProductPricingTiersByProductId(id),
    getProductPricingTierSetsByProductIds([id]),
  ]);

  if (variantsError) {
    const missingVariantsTable = variantsError.message.toLowerCase().includes("product_variants");
    const relationResult = await loadProductRelationRecords(id);

    return {
      data: {
        product: mergeProductRelations(productResult.data, relationResult.imageRows, relationResult.specRows),
        variants: missingVariantsTable ? [] : ((variants ?? []) as ProductDbVariantRow[]).map(normalizeVariant),
        pricing_tiers: pricingTiersResult.data,
        pricing_tier_sets: pricingTierSetsResult.data.get(id) ?? [],
      },
      error:
        pricingTiersResult.error ??
        pricingTierSetsResult.error ??
        (missingVariantsTable ? relationResult.imageError ?? relationResult.specError : variantsError),
    };
  }

  const relationResult = await loadProductRelationRecords(id);

  return {
    data: {
      product: mergeProductRelations(productResult.data, relationResult.imageRows, relationResult.specRows),
      variants: ((variants ?? []) as ProductDbVariantRow[]).map(normalizeVariant),
      pricing_tiers: pricingTiersResult.data,
      pricing_tier_sets: pricingTierSetsResult.data.get(id) ?? [],
    },
    error: pricingTiersResult.error ?? pricingTierSetsResult.error ?? relationResult.imageError ?? relationResult.specError,
  };
}

export async function getProductEditorRecordForVendors(id: string, vendorIds: string[]) {
  const productResult = await getProductByIdForVendors(id, vendorIds);

  if (productResult.error || !productResult.data) {
    return {
      data: null as ProductEditorRecord | null,
      error: productResult.error,
    };
  }

  const supabase = getSupabaseClient();
  const [{ data: variants, error: variantsError }, pricingTiersResult, pricingTierSetsResult] = await Promise.all([
    supabase.from("product_variants").select("*").eq("product_id", id).order("created_at", { ascending: true }),
    getProductPricingTiersByProductId(id),
    getProductPricingTierSetsByProductIds([id]),
  ]);

  if (variantsError) {
    const missingVariantsTable = variantsError.message.toLowerCase().includes("product_variants");
    const relationResult = await loadProductRelationRecords(id);

    return {
      data: {
        product: mergeProductRelations(productResult.data, relationResult.imageRows, relationResult.specRows),
        variants: missingVariantsTable ? [] : ((variants ?? []) as ProductDbVariantRow[]).map(normalizeVariant),
        pricing_tiers: pricingTiersResult.data,
        pricing_tier_sets: pricingTierSetsResult.data.get(id) ?? [],
      },
      error:
        pricingTiersResult.error ??
        pricingTierSetsResult.error ??
        (missingVariantsTable ? relationResult.imageError ?? relationResult.specError : variantsError),
    };
  }

  const relationResult = await loadProductRelationRecords(id);

  return {
    data: {
      product: mergeProductRelations(productResult.data, relationResult.imageRows, relationResult.specRows),
      variants: ((variants ?? []) as ProductDbVariantRow[]).map(normalizeVariant),
      pricing_tiers: pricingTiersResult.data,
      pricing_tier_sets: pricingTierSetsResult.data.get(id) ?? [],
    },
    error: pricingTiersResult.error ?? pricingTierSetsResult.error ?? relationResult.imageError ?? relationResult.specError,
  };
}

export async function getProductCategoryOptions() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("categories").select("id, name, slug, parent_id").order("name", { ascending: true });

  if (error) {
    return {
      data: mockCategories.map((category) => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
        parent_id: null,
      })) satisfies ProductCategoryOption[],
      error: null,
    };
  }

  return {
    data: ((data ?? []) as ProductCategoryOption[]).length > 0
      ? ((data ?? []) as ProductCategoryOption[])
      : mockCategories.map((category) => ({
          id: category.id,
          name: category.name,
          slug: category.slug,
          parent_id: null,
        })),
    error: null,
  };
}

export async function getProductVendorOptions() {
  const { data, error } = await getVendorOptions();

  if (error) {
    return {
      data: [] as ProductVendorOption[],
      error,
    };
  }

  return {
    data,
    error: null,
  };
}

export async function getProductImagesByProductId(productId: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("product_images")
    .select("id, product_id, image_url, sort_order, created_at")
    .eq("product_id", productId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error && isMissingRelationError(error.message)) {
    return {
      data: [] as ProductImageRow[],
      error: null,
    };
  }

  return {
    data: (data ?? []) as ProductImageRow[],
    error,
  };
}

export async function getProductSpecsByProductId(productId: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("product_specs")
    .select("id, product_id, label, value, sort_order, created_at")
    .eq("product_id", productId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error && isMissingRelationError(error.message)) {
    return {
      data: [] as ProductSpecRow[],
      error: null,
    };
  }

  return {
    data: (data ?? []) as ProductSpecRow[],
    error,
  };
}

export async function getProductImageMapByProductIds(productIds: string[]) {
  const uniqueIds = Array.from(new Set(productIds.filter(Boolean)));

  if (uniqueIds.length === 0) {
    return {
      data: new Map<string, string[]>(),
      error: null,
    };
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("product_images")
    .select("product_id, image_url, sort_order, created_at")
    .in("product_id", uniqueIds)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error && isMissingRelationError(error.message)) {
    return {
      data: new Map<string, string[]>(),
      error: null,
    };
  }

  if (error) {
    return {
      data: new Map<string, string[]>(),
      error,
    };
  }

  const imageMap = new Map<string, string[]>();

  for (const row of (data ?? []) as Array<{ product_id: string; image_url: string | null }>) {
    if (!row.product_id || !row.image_url) {
      continue;
    }

    const current = imageMap.get(row.product_id) ?? [];
    current.push(row.image_url);
    imageMap.set(row.product_id, current);
  }

  return {
    data: imageMap,
    error: null,
  };
}
