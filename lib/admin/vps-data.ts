import "server-only";

import { query } from "@/lib/db";
import type {
  ProductCategoryOption,
  ProductDbRow,
  ProductDbVariantRow,
  ProductEditorRecord,
  ProductImageRow,
  ProductPricingTierRow,
  ProductPricingTierSetRow,
  ProductPricingTierSetTierRow,
  ProductSpecRow,
  ProductVendorOption,
  VendorRow,
} from "@/types/product-db";

export type AdminOrderRow = {
  id: string;
  order_number: string;
  user_id: string | null;
  user_email: string;
  status: string;
  created_at: string;
  summary: {
    payNow?: number | string | null;
    payOnDelivery?: number | string | null;
  } | null;
  buyer?: Record<string, string | number | boolean | null> | null;
};

export type AdminCustomerRow = {
  key: string;
  userId: string | null;
  email: string;
  fullName: string | null;
  phone: string | null;
  country: string | null;
  city: string | null;
  orderCount: number;
  totalPayNow: number;
  latestOrderId: string;
  latestOrderNumber: string;
  latestOrderDate: string;
};

export type AdminMediaItem = {
  name: string;
  path: string;
  publicUrl: string;
  altText: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

function readBuyerString(
  buyer: AdminOrderRow["buyer"],
  keys: string[],
) {
  if (!buyer) {
    return null;
  }

  for (const key of keys) {
    const value = buyer[key];

    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
}

function toNumber(value: number | string | null | undefined) {
  const parsed = typeof value === "string" ? Number(value) : value;
  return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : 0;
}

function getCustomerKey(order: AdminOrderRow) {
  if (order.user_id) {
    return `user:${order.user_id}`;
  }

  return `email:${order.user_email.toLowerCase()}`;
}

function getFileName(url: string) {
  try {
    const parsed = new URL(url);
    return decodeURIComponent(parsed.pathname.split("/").filter(Boolean).pop() ?? url);
  } catch {
    return url.split("/").filter(Boolean).pop() ?? url;
  }
}

function getMediaPath(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.pathname.replace(/^\/+/, "");
  } catch {
    return url;
  }
}

export async function getAdminProducts() {
  return query<ProductDbRow>(
    `
      select
        products.*,
        coalesce(
          nullif(products.price, 0),
          pricing.min_tier_price,
          case
            when products.selling_price_cny is not null
              and products.exchange_rate_cny_to_bdt is not null
              and products.selling_price_cny > 0
              and products.exchange_rate_cny_to_bdt > 0
            then round((products.selling_price_cny * products.exchange_rate_cny_to_bdt)::numeric, 2)
            else products.price
          end
        ) as price,
        coalesce(nullif(products.moq, 1), pricing.min_tier_moq, products.moq) as moq
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
      order by products.created_at desc
    `,
  );
}

export async function getAdminOrders() {
  return query<AdminOrderRow>(
    `
      select id, order_number, user_id, user_email, status, payment_method, payment_status, created_at, summary, buyer
      from public.orders
      order by created_at desc
    `,
  );
}

export async function getAdminVendors() {
  return query<VendorRow>("select * from public.vendors order by created_at desc");
}

export async function getAdminProductVendorOptions() {
  return query<ProductVendorOption>(
    `
      select id, name, slug, status
      from public.vendors
      order by name asc
    `,
  );
}

export async function getAdminProductCategoryOptions() {
  return query<ProductCategoryOption>(
    `
      select id, name, slug, parent_id, coalesce(image_url, image) as image_url
      from public.categories
      order by name asc
    `,
  );
}

async function queryOptionalRows<T extends Record<string, unknown>>(
  text: string,
  values?: unknown[],
): Promise<T[]> {
  try {
    const result = await query<T>(text, values);
    return result.rows;
  } catch {
    return [];
  }
}

function mergeProductEditorRelations(
  product: ProductDbRow,
  imageRows: ProductImageRow[],
  specRows: ProductSpecRow[],
): ProductDbRow {
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
      : product.specifications;

  return {
    ...product,
    gallery_images: galleryImages,
    specifications,
  };
}

export async function getAdminProductEditorRecord(id: string) {
  const productResult = await query<ProductDbRow>(
    "select * from public.products where id = $1 limit 1",
    [id],
  );
  const product = productResult.rows[0] ?? null;

  if (!product) {
    return {
      data: null as ProductEditorRecord | null,
      error: null,
    };
  }

  const [variantsResult, imagesResult, specsResult, pricingTiersResult, pricingTierSetsResult] =
    await Promise.all([
      queryOptionalRows<ProductDbVariantRow>(
        "select * from public.product_variants where product_id = $1 order by created_at asc",
        [id],
      ),
      queryOptionalRows<ProductImageRow>(
        `
          select id, product_id, image_url, sort_order, created_at
          from public.product_images
          where product_id = $1
          order by sort_order asc, created_at asc
        `,
        [id],
      ),
      queryOptionalRows<ProductSpecRow>(
        `
          select id, product_id, label, value, sort_order, created_at
          from public.product_specs
          where product_id = $1
          order by sort_order asc, created_at asc
        `,
        [id],
      ),
      queryOptionalRows<ProductPricingTierRow>(
        `
          select *
          from public.product_pricing_tiers
          where product_id = $1
          order by min_qty asc, sort_order asc
        `,
        [id],
      ),
      queryOptionalRows<ProductPricingTierSetRow>(
        `
          select *
          from public.product_pricing_tier_sets
          where product_id = $1
          order by sort_order asc, created_at asc
        `,
        [id],
      ),
    ]);

  const pricingTierSetRowsResult = await queryOptionalRows<ProductPricingTierSetTierRow>(
    `
      select rows.*
      from public.product_pricing_tier_set_rows rows
      join public.product_pricing_tier_sets sets on sets.id = rows.tier_set_id
      where sets.product_id = $1
      order by rows.sort_order asc, rows.created_at asc
    `,
    [id],
  );
  const tierRowsBySetId = new Map<string, ProductPricingTierSetTierRow[]>();

  for (const row of pricingTierSetRowsResult) {
    const current = tierRowsBySetId.get(row.tier_set_id) ?? [];
    current.push(row);
    tierRowsBySetId.set(row.tier_set_id, current);
  }

  return {
    data: {
      product: mergeProductEditorRelations(product, imagesResult, specsResult),
      variants: variantsResult,
      pricing_tiers: pricingTiersResult,
      pricing_tier_sets: pricingTierSetsResult.map((set) => ({
        set,
        rows: tierRowsBySetId.get(set.id) ?? [],
      })),
    } satisfies ProductEditorRecord,
    error: null,
  };
}

export async function getAdminVendorProductCounts() {
  const result = await query<{ vendor_id: string | null; count: string }>(
    `
      select vendor_id, count(*)::text as count
      from public.products
      where vendor_id is not null
      group by vendor_id
    `,
  );

  return Object.fromEntries(
    result.rows
      .filter((row) => row.vendor_id)
      .map((row) => [row.vendor_id as string, Number(row.count)]),
  );
}

export function buildAdminCustomers(orders: AdminOrderRow[]) {
  const groupedCustomers = new Map<string, AdminCustomerRow>();

  for (const order of orders) {
    if (typeof order.user_email !== "string" || order.user_email.trim().length === 0) {
      continue;
    }

    const key = getCustomerKey(order);
    const existing = groupedCustomers.get(key);
    const fullName = readBuyerString(order.buyer ?? null, ["fullName", "name"]);
    const phone = readBuyerString(order.buyer ?? null, ["phone"]);
    const country = readBuyerString(order.buyer ?? null, ["country"]);
    const city = readBuyerString(order.buyer ?? null, ["city"]);
    const payNow = toNumber(order.summary?.payNow);

    if (!existing) {
      groupedCustomers.set(key, {
        key,
        userId: order.user_id,
        email: order.user_email,
        fullName,
        phone,
        country,
        city,
        orderCount: 1,
        totalPayNow: payNow,
        latestOrderId: order.id,
        latestOrderNumber: order.order_number,
        latestOrderDate: order.created_at,
      });
      continue;
    }

    groupedCustomers.set(key, {
      ...existing,
      fullName: existing.fullName ?? fullName,
      phone: existing.phone ?? phone,
      country: existing.country ?? country,
      city: existing.city ?? city,
      orderCount: existing.orderCount + 1,
      totalPayNow: existing.totalPayNow + payNow,
    });
  }

  return Array.from(groupedCustomers.values());
}

export async function getAdminMediaItems() {
  const result = await query<{ public_url: string; created_at: string | null; alt_text: string | null }>(
    `
      select distinct on (public_url) public_url, created_at, alt_text
      from (
        select image_url as public_url, created_at, null::text as alt_text
        from public.product_images
        where image_url is not null and image_url <> ''
        union all
        select image_url as public_url, created_at, name as alt_text
        from public.products
        where image_url is not null and image_url <> ''
        union all
        select coalesce(image_url, image) as public_url, created_at, name as alt_text
        from public.categories
        where coalesce(image_url, image) is not null and coalesce(image_url, image) <> ''
        union all
        select logo_url as public_url, created_at, name as alt_text
        from public.vendors
        where logo_url is not null and logo_url <> ''
        union all
        select banner_url as public_url, created_at, name as alt_text
        from public.vendors
        where banner_url is not null and banner_url <> ''
      ) media
      order by public_url, created_at desc nulls last
    `,
  );

  return result.rows.map<AdminMediaItem>((row) => ({
    name: getFileName(row.public_url),
    path: getMediaPath(row.public_url),
    publicUrl: row.public_url,
    altText: row.alt_text,
    createdAt: row.created_at,
    updatedAt: row.created_at,
  }));
}
