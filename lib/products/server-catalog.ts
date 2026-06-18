import "server-only";

import { query } from "@/lib/db";
import type { ProductBrowseSort } from "@/lib/products/queries";
import type { ProductCategoryOption, ProductDbRow, ProductVendorOption } from "@/types/product-db";

type PublicProductBrowseParams = {
  search?: string | null;
  category?: string | null;
  subcategory?: string | null;
  min?: string | number | null;
  max?: string | number | null;
  moq?: string | number | null;
  vendor?: string | null;
  sort?: ProductBrowseSort | null;
  page?: string | number | null;
  limit?: string | number | null;
};

function parseNumber(value: string | number | null | undefined) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeText(value: string | null | undefined) {
  return typeof value === "string" ? value.trim() : "";
}

function clampPage(value: string | number | null | undefined) {
  const parsed = parseNumber(value);
  return parsed && parsed > 0 ? Math.floor(parsed) : 1;
}

function clampLimit(value: string | number | null | undefined) {
  const parsed = parseNumber(value);

  if (!parsed || parsed <= 0) {
    return 12;
  }

  return Math.min(48, Math.max(1, Math.floor(parsed)));
}

function findCategory(categoryOptions: ProductCategoryOption[], value: string) {
  return categoryOptions.find((category) => category.id === value || category.slug === value) ?? null;
}

export async function getServerProductCategoryOptions() {
  const result = await query<ProductCategoryOption>(
    `
      select id, name, slug, parent_id, coalesce(image_url, image) as image_url
      from public.categories
      order by name asc
    `,
  );

  return {
    data: result.rows,
    error: null,
  };
}

export async function getServerProductCategoryBySlug(slug: string) {
  const result = await query<ProductCategoryOption>(
    `
      select id, name, slug, parent_id, coalesce(image_url, image) as image_url
      from public.categories
      where slug = $1
      limit 1
    `,
    [slug],
  );

  return {
    data: result.rows[0] ?? null,
    error: null,
  };
}

export async function getServerVendorOptions() {
  const result = await query<ProductVendorOption>(
    `
      select id, name, slug, status
      from public.vendors
      order by name asc
    `,
  );

  return {
    data: result.rows,
    error: null,
  };
}

async function getServerPublicProducts() {
  const result = await query<ProductDbRow>(
    `
      select
        products.id,
        products.vendor_id,
        products.category_id,
        products.brand_id,
        products.name,
        products.slug,
        products.sku,
        products.description,
        coalesce(products.image_url, products.image) as image_url,
        coalesce(
          nullif(products.price, 0),
          pricing.min_tier_price,
          case
            when products.selling_price_cny is not null
              and products.exchange_rate_cny_to_bdt is not null
              and products.selling_price_cny > 0
              and products.exchange_rate_cny_to_bdt > 0
            then round((products.selling_price_cny * products.exchange_rate_cny_to_bdt)::numeric, 2)
            else coalesce(products.price, products.price_from, 0)
          end
        )::float8 as price,
        coalesce(nullif(products.moq, 1), pricing.min_tier_moq, products.moq, 1)::int as moq,
        coalesce(products.weight::text, '') as weight,
        products.badge,
        coalesce(products.is_active, true) as is_active,
        products.created_at,
        products.status,
        products.product_type,
        products.regular_price::float8 as regular_price,
        products.discount_price::float8 as discount_price,
        products.gallery_images,
        products.attributes,
        products.cdd_shipping_profile,
        products.short_description,
        products.specifications,
        products.reviews,
        products.cnds_profile_id,
        products.pricing_tier_profile_id,
        products.pricing_source,
        products.buying_price_cny::float8 as buying_price_cny,
        products.profit_percent::float8 as profit_percent,
        products.profit_amount_cny::float8 as profit_amount_cny,
        products.selling_price_cny::float8 as selling_price_cny,
        products.exchange_rate_cny_to_bdt::float8 as exchange_rate_cny_to_bdt
      from public.products
      left join (
        select
          product_pricing_tier_sets.product_id,
          min(product_pricing_tier_set_rows.price) as min_tier_price,
          min(product_pricing_tier_set_rows.min_qty) as min_tier_moq
        from public.product_pricing_tier_sets
        join public.product_pricing_tier_set_rows
          on product_pricing_tier_set_rows.tier_set_id = product_pricing_tier_sets.id
        group by product_pricing_tier_sets.product_id
      ) pricing on pricing.product_id = products.id
      where coalesce(products.is_active, true) = true and coalesce(products.status, 'active') = 'active'
      order by products.created_at desc
    `,
  );

  return result.rows;
}

export async function getServerPublicProductsByBrowseParams(
  params: PublicProductBrowseParams = {},
) {
  const [{ data: categoryOptions }, publicProducts] = await Promise.all([
    getServerProductCategoryOptions(),
    getServerPublicProducts(),
  ]);
  const search = normalizeText(params.search).toLowerCase();
  const categoryValue = normalizeText(params.category);
  const subcategoryValue = normalizeText(params.subcategory);
  const vendorValue = normalizeText(params.vendor);
  const minPrice = parseNumber(params.min);
  const maxPrice = parseNumber(params.max);
  const minMoq = parseNumber(params.moq);
  const sort = params.sort ?? "newest";
  const page = clampPage(params.page);
  const limit = clampLimit(params.limit);
  const selectedCategory = categoryValue ? findCategory(categoryOptions, categoryValue) : null;
  const selectedSubcategory = subcategoryValue ? findCategory(categoryOptions, subcategoryValue) : null;
  const scopedCategoryIds = new Set<string>();

  if (selectedSubcategory) {
    scopedCategoryIds.add(selectedSubcategory.id);
  } else if (selectedCategory) {
    scopedCategoryIds.add(selectedCategory.id);
    categoryOptions
      .filter((category) => category.parent_id === selectedCategory.id)
      .forEach((category) => scopedCategoryIds.add(category.id));
  }

  const contextualProducts = publicProducts.filter((product) => {
    const matchesSearch = search.length === 0 || product.name.toLowerCase().includes(search);
    const matchesCategory = scopedCategoryIds.size === 0 || Boolean(product.category_id && scopedCategoryIds.has(product.category_id));
    const matchesVendor = vendorValue.length === 0 || product.vendor_id === vendorValue;
    const matchesMoq = minMoq === null || product.moq >= minMoq;

    return matchesSearch && matchesCategory && matchesVendor && matchesMoq;
  });
  const filteredProducts = contextualProducts.filter((product) => {
    const matchesMin = minPrice === null || product.price >= minPrice;
    const matchesMax = maxPrice === null || product.price <= maxPrice;

    return matchesMin && matchesMax;
  });
  const priceRangeSource = contextualProducts.length > 0 ? contextualProducts : publicProducts;
  const sortedProducts = [...filteredProducts].sort((left, right) => {
    if (sort === "price_low_high") {
      return left.price - right.price;
    }

    if (sort === "price_high_low") {
      return right.price - left.price;
    }

    return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
  });
  const totalCount = sortedProducts.length;
  const offset = (page - 1) * limit;

  return {
    data: sortedProducts.slice(offset, offset + limit),
    error: null,
    categoryOptions,
    selectedCategory,
    selectedSubcategory,
    totalCount,
    page,
    limit,
    availableMinPrice: priceRangeSource.length > 0 ? Math.min(...priceRangeSource.map((product) => product.price)) : 0,
    availableMaxPrice: priceRangeSource.length > 0 ? Math.max(...priceRangeSource.map((product) => product.price)) : 0,
  };
}

export async function getServerProductImageMapByProductIds(productIds: string[]) {
  const uniqueIds = Array.from(new Set(productIds.filter(Boolean)));
  const imageMap = new Map<string, string[]>();

  if (uniqueIds.length === 0) {
    return {
      data: imageMap,
      error: null,
    };
  }

  const result = await query<{ product_id: string; image_url: string }>(
    `
      select product_id, image_url
      from public.product_images
      where product_id = any($1::uuid[])
      order by sort_order asc, created_at asc
    `,
    [uniqueIds],
  ).catch(() => null);

  if (!result) {
    return {
      data: imageMap,
      error: null,
    };
  }

  for (const image of result.rows) {
    const current = imageMap.get(image.product_id) ?? [];
    current.push(image.image_url);
    imageMap.set(image.product_id, current);
  }

  return {
    data: imageMap,
    error: null,
  };
}

export async function getServerProductReviewSummaryMap(productIds: string[]) {
  const uniqueIds = Array.from(new Set(productIds.filter(Boolean)));
  const reviewMap = new Map<string, { averageRating: number; reviewCount: number }>();

  if (uniqueIds.length === 0) {
    return {
      data: reviewMap,
      error: null,
    };
  }

  const result = await query<{ product_id: string; average_rating: string | null; review_count: string }>(
    `
      select product_id, avg(rating)::text as average_rating, count(*)::text as review_count
      from public.product_reviews
      where product_id = any($1::uuid[])
      group by product_id
    `,
    [uniqueIds],
  ).catch(() => null);

  if (!result) {
    return {
      data: reviewMap,
      error: null,
    };
  }

  for (const row of result.rows) {
    reviewMap.set(row.product_id, {
      averageRating: Number(row.average_rating ?? 0),
      reviewCount: Number(row.review_count),
    });
  }

  return {
    data: reviewMap,
    error: null,
  };
}
