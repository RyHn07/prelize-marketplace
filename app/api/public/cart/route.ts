import { NextResponse } from "next/server";

import { query } from "@/lib/db";
import type {
  ProductDbRow,
  ProductDbVariantRow,
  ProductPricingTierRow,
  ProductPricingTierSetRow,
  ProductPricingTierSetTierRow,
  ProductPricingType,
  ProductStatus,
  ProductType,
  ResolvedProductPricingConfig,
  ResolvedProductPricingTier,
} from "@/types/product-db";

type VendorNameRow = {
  id: string;
  name: string;
};

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeStatus(value: unknown, isActive: boolean): ProductStatus {
  if (value === "active" || value === "disabled" || value === "draft") {
    return value;
  }

  return isActive ? "active" : "disabled";
}

function normalizeProductType(value: unknown): ProductType {
  return value === "variable" ? "variable" : "single";
}

function normalizePricingType(value: unknown): ProductPricingType {
  return value === "fixed" ? "fixed" : "unit";
}

function normalizeProduct(row: ProductDbRow): ProductDbRow {
  const isActive = row.is_active !== false;

  return {
    ...row,
    vendor_id: typeof row.vendor_id === "string" ? row.vendor_id : null,
    brand_id: typeof row.brand_id === "string" ? row.brand_id : null,
    image_url: typeof row.image_url === "string" ? row.image_url : null,
    price: toNumber(row.price),
    moq: Math.max(1, toNumber(row.moq, 1)),
    weight: row.weight ?? null,
    is_active: isActive,
    status: normalizeStatus(row.status, isActive),
    product_type: normalizeProductType(row.product_type),
    regular_price: row.regular_price === null || row.regular_price === undefined ? null : toNumber(row.regular_price),
    discount_price: row.discount_price === null || row.discount_price === undefined ? null : toNumber(row.discount_price),
    gallery_images: Array.isArray(row.gallery_images) ? row.gallery_images : [],
    attributes: Array.isArray(row.attributes) ? row.attributes : [],
    specifications: Array.isArray(row.specifications) ? row.specifications : [],
    reviews: Array.isArray(row.reviews) ? row.reviews : [],
  };
}

function normalizeVariant(row: ProductDbVariantRow): ProductDbVariantRow {
  return {
    ...row,
    name: typeof row.name === "string" && row.name.trim().length > 0 ? row.name : "Default",
    value: typeof row.value === "string" && row.value.trim().length > 0 ? row.value : null,
    sku: typeof row.sku === "string" ? row.sku : null,
    price: toNumber(row.price),
    regular_price: row.regular_price === null || row.regular_price === undefined ? null : toNumber(row.regular_price),
    discount_price: row.discount_price === null || row.discount_price === undefined ? null : toNumber(row.discount_price),
    moq: Math.max(1, toNumber(row.moq, 1)),
    stock: Math.max(0, toNumber(row.stock)),
    weight: row.weight === null || row.weight === undefined ? null : toNumber(row.weight),
    image_url: typeof row.image_url === "string" ? row.image_url : null,
    min_order_quantity:
      row.min_order_quantity === null || row.min_order_quantity === undefined
        ? null
        : Math.max(1, toNumber(row.min_order_quantity, 1)),
    is_active: row.is_active !== false,
    sort_order: row.sort_order ?? null,
    pricing_tier_set_id: typeof row.pricing_tier_set_id === "string" ? row.pricing_tier_set_id : null,
    attribute_values:
      row.attribute_values && typeof row.attribute_values === "object" ? row.attribute_values : {},
  };
}

function mapTier(row: ProductPricingTierRow | ProductPricingTierSetTierRow): ResolvedProductPricingTier {
  return {
    id: row.id,
    min_qty: Math.max(1, toNumber(row.min_qty, 1)),
    max_qty: row.max_qty === null || row.max_qty === undefined ? null : Math.max(1, toNumber(row.max_qty, 1)),
    price: Math.max(0, toNumber(row.price)),
    sort_order: row.sort_order ?? null,
  };
}

function buildPricingMap(
  products: ProductDbRow[],
  variantsByProductId: Map<string, ProductDbVariantRow[]>,
  pricingTiers: ProductPricingTierRow[],
  pricingTierSets: ProductPricingTierSetRow[],
  pricingTierSetRows: ProductPricingTierSetTierRow[],
) {
  const tiersByProductId = new Map<string, ProductPricingTierRow[]>();
  const tierSetsByProductId = new Map<string, ProductPricingTierSetRow[]>();
  const tierRowsBySetId = new Map<string, ProductPricingTierSetTierRow[]>();

  pricingTiers.forEach((tier) => {
    const current = tiersByProductId.get(tier.product_id) ?? [];
    current.push(tier);
    tiersByProductId.set(tier.product_id, current);
  });

  pricingTierSets.forEach((set) => {
    const current = tierSetsByProductId.get(set.product_id) ?? [];
    current.push(set);
    tierSetsByProductId.set(set.product_id, current);
  });

  pricingTierSetRows.forEach((row) => {
    const current = tierRowsBySetId.get(row.tier_set_id) ?? [];
    current.push(row);
    tierRowsBySetId.set(row.tier_set_id, current);
  });

  return Object.fromEntries(
    products.map((product) => {
      const tiers = tiersByProductId.get(product.id) ?? [];
      const tierSets = tierSetsByProductId.get(product.id) ?? [];
      const variants = variantsByProductId.get(product.id) ?? [];
      const config: ResolvedProductPricingConfig = {
        source: tiers.length > 0 || tierSets.length > 0 ? "legacy" : null,
        profile_id: null,
        profile_name: null,
        pricing_type: tiers.length > 0 ? normalizePricingType(tiers[0]?.pricing_type) : null,
        tiers: tiers.map(mapTier),
        variant_tier_sets: tierSets.map((set) => ({
          id: set.id,
          name: set.name,
          fallback_price: Math.max(0, toNumber(set.fallback_price)),
          pricing_type: normalizePricingType(set.pricing_type),
          tiers: (tierRowsBySetId.get(set.id) ?? []).map(mapTier),
          sort_order: set.sort_order ?? null,
        })),
        variant_assignments: variants.map((variant) => ({
          variant_id: variant.id,
          tier_set_id: variant.pricing_tier_set_id ?? null,
        })),
      };

      return [product.id, config];
    }),
  );
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const ids = Array.from(
      new Set(
        (searchParams.get("ids") ?? "")
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
      ),
    );

    if (ids.length === 0) {
      return NextResponse.json({
        products: [],
        variantsByProductId: {},
        pricingByProductId: {},
        vendorNamesById: {},
      });
    }

    const productsResult = await query<ProductDbRow>(
      `
        select
          *,
          coalesce(image_url, image) as image_url,
          coalesce(price, price_from, 0)::float8 as price,
          coalesce(moq, 1)::int as moq,
          coalesce(is_active, true) as is_active
        from public.products
        where id::text = any($1::text[])
      `,
      [ids],
    );
    const products = productsResult.rows.map(normalizeProduct);
    const productIds = products.map((product) => product.id);

    if (productIds.length === 0) {
      return NextResponse.json({
        products: [],
        variantsByProductId: {},
        pricingByProductId: {},
        vendorNamesById: {},
      });
    }

    const [variantsResult, pricingTiersResult, pricingTierSetsResult, pricingTierSetRowsResult, vendorsResult] =
      await Promise.all([
        query<ProductDbVariantRow>(
          `
            select
              id, product_id, name, value, sku,
              regular_price::float8 as regular_price,
              discount_price::float8 as discount_price,
              price::float8 as price,
              moq, stock, weight::float8 as weight, image_url,
              min_order_quantity, is_active, sort_order, pricing_tier_set_id,
              attribute_values, created_at
            from public.product_variants
            where product_id::text = any($1::text[]) and coalesce(is_active, true) = true
            order by sort_order asc nulls last, created_at asc
          `,
          [productIds],
        ),
        query<ProductPricingTierRow>(
          `
            select
              id, product_id, pricing_type, min_qty, max_qty,
              price::float8 as price, sort_order, created_at
            from public.product_pricing_tiers
            where product_id::text = any($1::text[])
            order by min_qty asc, sort_order asc nulls last, created_at asc
          `,
          [productIds],
        ),
        query<ProductPricingTierSetRow>(
          `
            select
              id, product_id, name, fallback_price::float8 as fallback_price,
              pricing_type, sort_order, created_at
            from public.product_pricing_tier_sets
            where product_id::text = any($1::text[])
            order by sort_order asc nulls last, created_at asc
          `,
          [productIds],
        ),
        query<ProductPricingTierSetTierRow>(
          `
            select
              rows.id, rows.tier_set_id, rows.min_qty, rows.max_qty,
              rows.price::float8 as price, rows.sort_order, rows.created_at
            from public.product_pricing_tier_set_rows rows
            join public.product_pricing_tier_sets sets on sets.id = rows.tier_set_id
            where sets.product_id::text = any($1::text[])
            order by rows.sort_order asc nulls last, rows.min_qty asc, rows.created_at asc
          `,
          [productIds],
        ),
        query<VendorNameRow>(
          `
            select id, name
            from public.vendors
            where id::text = any($1::text[])
          `,
          [products.map((product) => product.vendor_id).filter(Boolean)],
        ),
      ]);

    const variantsByProductId = new Map<string, ProductDbVariantRow[]>();

    variantsResult.rows.map(normalizeVariant).forEach((variant) => {
      const current = variantsByProductId.get(variant.product_id) ?? [];
      current.push(variant);
      variantsByProductId.set(variant.product_id, current);
    });

    return NextResponse.json({
      products,
      variantsByProductId: Object.fromEntries(variantsByProductId.entries()),
      pricingByProductId: buildPricingMap(
        products,
        variantsByProductId,
        pricingTiersResult.rows,
        pricingTierSetsResult.rows,
        pricingTierSetRowsResult.rows,
      ),
      vendorNamesById: Object.fromEntries(vendorsResult.rows.map((vendor) => [vendor.id, vendor.name])),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load cart catalog data." },
      { status: 500 },
    );
  }
}
