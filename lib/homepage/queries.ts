import type { PgDataClient } from "@/lib/postgres-data-client";

import { query } from "@/lib/db";
import { getDatabaseServiceClient } from "@/lib/postgres-data-client";
import {
  getProductCategoryOptions,
  getProductImageMapByProductIds,
  getProductsByIds,
  getPublicProducts,
} from "@/lib/products/queries";
import { mapProductDbToStorefrontProduct } from "@/lib/products/storefront";
import { getProductReviewSummaryMap } from "@/lib/reviews";
import { getVendorOptions } from "@/lib/vendors/queries";
import type { Category, Product } from "@/types/product";
import type {
  HomepageBannerRow,
  HomepageContentBlockRow,
  HomepageProductSectionRow,
  HomepageResolvedProductSection,
  HomepageThemeRow,
  HomepageThemeSectionRow,
  JsonValue,
  ProductCategoryOption,
  ProductDbRow,
  ProductVendorOption,
} from "@/types/product-db";

type RawHomepageThemeRow = Partial<HomepageThemeRow> & {
  id: string;
  name: string;
  slug: string;
};

type RawHomepageThemeSectionRow = Partial<HomepageThemeSectionRow> & {
  id: string;
  theme_id: string;
  section_key: string;
  section_type: string;
  component_name: string;
};

type RawHomepageContentBlockRow = Partial<HomepageContentBlockRow> & {
  id: string;
  content_key: string;
};

type RawHomepageBannerRow = Partial<HomepageBannerRow> & {
  id: string;
};

type RawHomepageProductSectionRow = Partial<HomepageProductSectionRow> & {
  id: string;
  title: string;
  section_key: string;
  source_type: string;
};

export type HomepageRenderData = {
  theme: HomepageThemeRow | null;
  sections: HomepageThemeSectionRow[];
  contentBlocks: HomepageContentBlockRow[];
  contentBlockMap: Map<string, HomepageContentBlockRow>;
  banners: HomepageBannerRow[];
  productSections: HomepageResolvedProductSection[];
  categories: Category[];
};

function createEmptyHomepageRenderData(): HomepageRenderData {
  return {
    theme: null,
    sections: [],
    contentBlocks: [],
    contentBlockMap: new Map<string, HomepageContentBlockRow>(),
    banners: [],
    productSections: [],
    categories: [],
  };
}

function resolvePgDataClient(client?: PgDataClient) {
  if (client) {
    return client;
  }

  return getDatabaseServiceClient();
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value : null;
}

function createSlugFallback(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function normalizeHomepageProductSectionTitle(value: string) {
  return value === "Newest wholesale arrivals" ? "Newest arrivals" : value;
}

function normalizeTimestamp(value: unknown) {
  return typeof value === "string" ? value : new Date(0).toISOString();
}

function normalizeJson(value: unknown): JsonValue {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    Array.isArray(value) ||
    (typeof value === "object" && value !== null)
  ) {
    return value as JsonValue;
  }

  return {};
}

function normalizeHomepageTheme(row: RawHomepageThemeRow): HomepageThemeRow {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: normalizeText(row.description),
    preview_image_url: normalizeText(row.preview_image_url),
    status:
      row.status === "active" || row.status === "archived" ? row.status : "draft",
    is_active: row.is_active === true,
    settings_json: normalizeJson(row.settings_json ?? {}),
    created_at: normalizeTimestamp(row.created_at),
    updated_at: normalizeTimestamp(row.updated_at),
  };
}

function normalizeHomepageThemeSection(row: RawHomepageThemeSectionRow): HomepageThemeSectionRow {
  const normalizedSectionKey = row.section_key as HomepageThemeSectionRow["section_key"];
  const normalizedSectionType = row.section_type as HomepageThemeSectionRow["section_type"];

  return {
    id: row.id,
    theme_id: row.theme_id,
    section_key: normalizedSectionKey,
    section_type: normalizedSectionType,
    component_name: row.component_name,
    sort_order: typeof row.sort_order === "number" ? row.sort_order : 0,
    is_enabled: row.is_enabled !== false,
    layout_settings: normalizeJson(row.layout_settings ?? {}),
    created_at: normalizeTimestamp(row.created_at),
    updated_at: normalizeTimestamp(row.updated_at),
  };
}

function normalizeHomepageContentBlock(row: RawHomepageContentBlockRow): HomepageContentBlockRow {
  return {
    id: row.id,
    content_key: row.content_key,
    title: normalizeText(row.title),
    subtitle: normalizeText(row.subtitle),
    description: normalizeText(row.description),
    image_url: normalizeText(row.image_url),
    button_text: normalizeText(row.button_text),
    button_link: normalizeText(row.button_link),
    data_json: normalizeJson(row.data_json ?? {}),
    is_active: row.is_active !== false,
    created_at: normalizeTimestamp(row.created_at),
    updated_at: normalizeTimestamp(row.updated_at),
  };
}

function normalizeHomepageBanner(row: RawHomepageBannerRow): HomepageBannerRow {
  return {
    id: row.id,
    title: normalizeText(row.title),
    subtitle: normalizeText(row.subtitle),
    image_url: normalizeText(row.image_url),
    link_url: normalizeText(row.link_url),
    placement: normalizeText(row.placement),
    sort_order: typeof row.sort_order === "number" ? row.sort_order : 0,
    start_date: normalizeText(row.start_date),
    end_date: normalizeText(row.end_date),
    is_active: row.is_active !== false,
    created_at: normalizeTimestamp(row.created_at),
  };
}

function normalizeHomepageProductSection(row: RawHomepageProductSectionRow): HomepageProductSectionRow {
  const rawProductIds = Array.isArray(row.product_ids) ? row.product_ids : [];

  return {
    id: row.id,
    title: normalizeHomepageProductSectionTitle(row.title),
    subtitle: normalizeText(row.subtitle),
    section_key: row.section_key,
    source_type:
      row.source_type === "manual" ||
      row.source_type === "featured" ||
      row.source_type === "category" ||
      row.source_type === "low_moq"
        ? row.source_type
        : "newest",
    category_id: normalizeText(row.category_id),
    product_ids: rawProductIds.filter((value): value is string => typeof value === "string"),
    limit_count: typeof row.limit_count === "number" && row.limit_count > 0 ? row.limit_count : 8,
    sort_order: typeof row.sort_order === "number" ? row.sort_order : 0,
    is_active: row.is_active !== false,
    created_at: normalizeTimestamp(row.created_at),
  };
}

function isPublicProductFeatured(product: ProductDbRow) {
  return product.badge === "Hot" || product.badge === "Best Value" || product.badge === "New";
}

function sortByCreatedAtDescending(left: ProductDbRow, right: ProductDbRow) {
  return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
}

function mapProductsToStorefront(
  products: ProductDbRow[],
  imageMap: Map<string, string[]>,
  reviewSummaryMap: Map<string, { averageRating: number; reviewCount: number }>,
  categories: ProductCategoryOption[],
  vendors: ProductVendorOption[],
): Product[] {
  return products.map((product) =>
    mapProductDbToStorefrontProduct(
      {
        ...product,
        gallery_images:
          imageMap.get(product.id) ??
          (Array.isArray(product.gallery_images)
            ? product.gallery_images
            : product.image_url
              ? [product.image_url]
              : []),
      },
      categories,
      vendors,
      reviewSummaryMap.get(product.id),
    ),
  );
}

function buildHomepageCategories(
  categoryOptions: ProductCategoryOption[],
  products: ProductDbRow[],
): Category[] {
  const countByCategoryId = new Map<string, number>();
  const imageByCategoryId = new Map<string, string>();

  products.forEach((product) => {
    if (!product.category_id) {
      return;
    }

    countByCategoryId.set(product.category_id, (countByCategoryId.get(product.category_id) ?? 0) + 1);

    if (!imageByCategoryId.has(product.category_id) && typeof product.image_url === "string" && product.image_url.trim()) {
      imageByCategoryId.set(product.category_id, product.image_url);
    }
  });

  return categoryOptions
    .filter((category) => !category.parent_id)
    .map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug ?? createSlugFallback(category.name),
      image:
        (typeof category.image_url === "string" && category.image_url.trim()
          ? category.image_url
          : null) ??
        imageByCategoryId.get(category.id) ??
        "/file.svg",
      itemCount: `${countByCategoryId.get(category.id) ?? 0} products`,
      totalItems: countByCategoryId.get(category.id) ?? 0,
    }))
    .sort((left, right) => right.totalItems - left.totalItems || left.name.localeCompare(right.name))
    .slice(0, 8)
    .map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      image: category.image,
      itemCount: category.itemCount,
    }));
}

async function getLocalHomepageRenderData(options?: {
  previewThemeId?: string;
  previewThemeSlug?: string;
}) {
  const themeResult = options?.previewThemeId
    ? await query<RawHomepageThemeRow>("select * from public.homepage_themes where id = $1 limit 1", [
        options.previewThemeId,
      ])
    : options?.previewThemeSlug
      ? await query<RawHomepageThemeRow>("select * from public.homepage_themes where slug = $1 limit 1", [
          options.previewThemeSlug,
        ])
      : await query<RawHomepageThemeRow>(
          `
            select *
            from public.homepage_themes
            where is_active = true and status = 'active'
            order by updated_at desc
            limit 1
          `,
        );

  const theme = themeResult.rows[0] ? normalizeHomepageTheme(themeResult.rows[0]) : null;

  if (!theme) {
    return {
      data: createEmptyHomepageRenderData(),
      error: null,
    };
  }

  const sectionsResult = await query<RawHomepageThemeSectionRow>(
    `
      select *
      from public.homepage_theme_sections
      where theme_id = $1 and is_enabled = true
      order by sort_order asc, created_at asc
    `,
    [theme.id],
  );
  const contentBlocksResult = await query<RawHomepageContentBlockRow>(
    `
      select *
      from public.homepage_content_blocks
      where is_active = true
      order by created_at asc
    `,
  );
  const bannersResult = await query<RawHomepageBannerRow>(
    `
      select *
      from public.homepage_banners
      where is_active = true
      order by sort_order asc, created_at asc
    `,
  );
  const productSectionsResult = await query<RawHomepageProductSectionRow>(
    `
      select *
      from public.homepage_product_sections
      where is_active = true
      order by sort_order asc, created_at asc
    `,
  );
  const categoriesResult = await query<ProductCategoryOption>(
    `
      select id, name, slug, parent_id, coalesce(image_url, image) as image_url
      from public.categories
      order by name asc
    `,
  );
  const productsResult = await query<ProductDbRow>(
    `
      select
        id,
        vendor_id,
        category_id,
        brand_id,
        name,
        slug,
        sku,
        description,
        coalesce(image_url, image) as image_url,
        coalesce(
          nullif(price, 0),
          pricing.min_tier_price,
          case
            when selling_price_cny is not null
              and exchange_rate_cny_to_bdt is not null
              and selling_price_cny > 0
              and exchange_rate_cny_to_bdt > 0
            then round((selling_price_cny * exchange_rate_cny_to_bdt)::numeric, 2)
            else coalesce(price, price_from, 0)
          end
        )::float8 as price,
        coalesce(moq, 1)::int as moq,
        coalesce(weight::text, '') as weight,
        badge,
        coalesce(is_active, true) as is_active,
        created_at,
        status,
        product_type,
        regular_price::float8 as regular_price,
        discount_price::float8 as discount_price,
        gallery_images,
        attributes,
        cdd_shipping_profile,
        short_description,
        specifications,
        reviews,
        cnds_profile_id,
        pricing_tier_profile_id,
        pricing_source,
        buying_price_cny::float8 as buying_price_cny,
        profit_percent::float8 as profit_percent,
        profit_amount_cny::float8 as profit_amount_cny,
        selling_price_cny::float8 as selling_price_cny,
        exchange_rate_cny_to_bdt::float8 as exchange_rate_cny_to_bdt
      from public.products
      left join (
        select
          product_pricing_tier_sets.product_id,
          min(product_pricing_tier_set_rows.price) as min_tier_price
        from public.product_pricing_tier_sets
        join public.product_pricing_tier_set_rows
          on product_pricing_tier_set_rows.tier_set_id = product_pricing_tier_sets.id
        group by product_pricing_tier_sets.product_id
      ) pricing on pricing.product_id = products.id
      where coalesce(is_active, true) = true and coalesce(status, 'active') = 'active'
      order by created_at desc
    `,
  );
  const vendorsResult = await query<ProductVendorOption>(
    `
      select id, name, slug, status
      from public.vendors
      order by name asc
    `,
  );
  const productImagesResult = await query<{ product_id: string; image_url: string }>(
    `
      select product_id, image_url
      from public.product_images
      order by sort_order asc, created_at asc
    `,
  );
  const reviewSummaryResult = await query<{ product_id: string; average_rating: string | null; review_count: string }>(
    `
      select product_id, avg(rating)::text as average_rating, count(*)::text as review_count
      from public.product_reviews
      group by product_id
    `,
  );

  const sections = sectionsResult.rows.map(normalizeHomepageThemeSection);
  const contentBlocks = contentBlocksResult.rows.map(normalizeHomepageContentBlock);
  const contentBlockMap = new Map(contentBlocks.map((block) => [block.content_key, block] as const));
  const banners = bannersResult.rows.map(normalizeHomepageBanner);
  const productSections = productSectionsResult.rows.map(normalizeHomepageProductSection);
  const publicProducts = productsResult.rows;
  const categoryOptions = categoriesResult.rows;
  const vendors = vendorsResult.rows;
  const imageMap = new Map<string, string[]>();

  for (const image of productImagesResult.rows) {
    const current = imageMap.get(image.product_id) ?? [];
    current.push(image.image_url);
    imageMap.set(image.product_id, current);
  }

  const reviewSummaryMap = new Map(
    reviewSummaryResult.rows.map((row) => [
      row.product_id,
      {
        averageRating: Number(row.average_rating ?? 0),
        reviewCount: Number(row.review_count),
      },
    ]),
  );

  const categories = buildHomepageCategories(categoryOptions, publicProducts);
  const resolvedProductSections: HomepageResolvedProductSection[] = [];

  for (const section of productSections) {
    let scopedProducts: ProductDbRow[] = [];

    if (section.source_type === "manual") {
      const orderById = new Map(section.product_ids.map((id, index) => [id, index]));
      scopedProducts = publicProducts
        .filter((product) => orderById.has(product.id))
        .sort((left, right) => (orderById.get(left.id) ?? 0) - (orderById.get(right.id) ?? 0));
    } else if (section.source_type === "featured") {
      scopedProducts = [...publicProducts].filter(isPublicProductFeatured).sort(sortByCreatedAtDescending);
    } else if (section.source_type === "category") {
      scopedProducts = [...publicProducts]
        .filter((product) => product.category_id === section.category_id)
        .sort(sortByCreatedAtDescending);
    } else if (section.source_type === "low_moq") {
      scopedProducts = [...publicProducts].sort(
        (left, right) => left.moq - right.moq || sortByCreatedAtDescending(left, right),
      );
    } else {
      scopedProducts = [...publicProducts].sort(sortByCreatedAtDescending);
    }

    resolvedProductSections.push({
      ...section,
      products: mapProductsToStorefront(scopedProducts.slice(0, section.limit_count), imageMap, reviewSummaryMap, categoryOptions, vendors),
    });
  }

  return {
    data: {
      theme,
      sections,
      contentBlocks,
      contentBlockMap,
      banners,
      productSections: resolvedProductSections,
      categories,
    } satisfies HomepageRenderData,
    error: null,
  };
}

async function resolveHomepageProductSectionProducts(
  section: HomepageProductSectionRow,
  publicProducts: ProductDbRow[],
  categoryOptions: ProductCategoryOption[],
  vendorOptions: ProductVendorOption[],
): Promise<Product[]> {
  let scopedProducts: ProductDbRow[] = [];

  if (section.source_type === "manual") {
    const manualResult = await getProductsByIds(section.product_ids);
    scopedProducts = manualResult.data
      .filter((product) => publicProducts.some((publicProduct) => publicProduct.id === product.id));

    const orderById = new Map(section.product_ids.map((id, index) => [id, index]));
    scopedProducts.sort((left, right) => (orderById.get(left.id) ?? 0) - (orderById.get(right.id) ?? 0));
  } else if (section.source_type === "featured") {
    scopedProducts = [...publicProducts]
      .filter(isPublicProductFeatured)
      .sort(sortByCreatedAtDescending);
  } else if (section.source_type === "category") {
    scopedProducts = [...publicProducts]
      .filter((product) => product.category_id === section.category_id)
      .sort(sortByCreatedAtDescending);
  } else if (section.source_type === "low_moq") {
    scopedProducts = [...publicProducts].sort((left, right) => left.moq - right.moq || sortByCreatedAtDescending(left, right));
  } else {
    scopedProducts = [...publicProducts].sort(sortByCreatedAtDescending);
  }

  const limitedProducts = scopedProducts.slice(0, section.limit_count);
  const productIds = limitedProducts.map((product) => product.id);
  const [{ data: imageMap }, { data: reviewSummaryMap }] = await Promise.all([
    getProductImageMapByProductIds(productIds),
    getProductReviewSummaryMap(productIds),
  ]);

  return mapProductsToStorefront(limitedProducts, imageMap, reviewSummaryMap, categoryOptions, vendorOptions);
}

export async function getHomepageThemeBySlug(slug: string, client?: PgDataClient) {
  const dataClient = resolvePgDataClient(client);

  if (!dataClient) {
    const { query } = await import("@/lib/db");
    const result = await query<RawHomepageThemeRow>(
      "select * from public.homepage_themes where slug = $1 limit 1",
      [slug],
    );

    return {
      data: result.rows[0] ? normalizeHomepageTheme(result.rows[0]) : null,
      error: null,
    };
  }

  const { data, error } = await dataClient
    .from("homepage_themes")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  return {
    data: data ? normalizeHomepageTheme(data as RawHomepageThemeRow) : null,
    error,
  };
}

export async function getHomepageThemeById(id: string, client?: PgDataClient) {
  const dataClient = resolvePgDataClient(client);

  if (!dataClient) {
    const { query } = await import("@/lib/db");
    const result = await query<RawHomepageThemeRow>(
      "select * from public.homepage_themes where id = $1 limit 1",
      [id],
    );

    return {
      data: result.rows[0] ? normalizeHomepageTheme(result.rows[0]) : null,
      error: null,
    };
  }

  const { data, error } = await dataClient
    .from("homepage_themes")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  return {
    data: data ? normalizeHomepageTheme(data as RawHomepageThemeRow) : null,
    error,
  };
}

export async function getActiveHomepageTheme(client?: PgDataClient) {
  const dataClient = resolvePgDataClient(client);

  if (!dataClient) {
    const { query } = await import("@/lib/db");
    const result = await query<RawHomepageThemeRow>(
      `
        select *
        from public.homepage_themes
        where is_active = true and status = 'active'
        order by updated_at desc
        limit 1
      `,
    );

    return {
      data: result.rows[0] ? normalizeHomepageTheme(result.rows[0]) : null,
      error: null,
    };
  }

  const { data, error } = await dataClient
    .from("homepage_themes")
    .select("*")
    .eq("is_active", true)
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .maybeSingle();

  return {
    data: data ? normalizeHomepageTheme(data as RawHomepageThemeRow) : null,
    error,
  };
}

export async function getHomepageSections(themeId: string, client?: PgDataClient) {
  const dataClient = resolvePgDataClient(client);

  if (!dataClient) {
    const { query } = await import("@/lib/db");
    const result = await query<RawHomepageThemeSectionRow>(
      `
        select *
        from public.homepage_theme_sections
        where theme_id = $1 and is_enabled = true
        order by sort_order asc, created_at asc
      `,
      [themeId],
    );

    return {
      data: result.rows.map(normalizeHomepageThemeSection),
      error: null,
    };
  }

  const { data, error } = await dataClient
    .from("homepage_theme_sections")
    .select("*")
    .eq("theme_id", themeId)
    .eq("is_enabled", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  return {
    data: ((data ?? []) as RawHomepageThemeSectionRow[]).map(normalizeHomepageThemeSection),
    error,
  };
}

export async function getHomepageContentBlocks(client?: PgDataClient) {
  const dataClient = resolvePgDataClient(client);

  if (!dataClient) {
    const { query } = await import("@/lib/db");
    const result = await query<RawHomepageContentBlockRow>(
      `
        select *
        from public.homepage_content_blocks
        where is_active = true
        order by created_at asc
      `,
    );

    return {
      data: result.rows.map(normalizeHomepageContentBlock),
      error: null,
    };
  }

  const { data, error } = await dataClient
    .from("homepage_content_blocks")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  return {
    data: ((data ?? []) as RawHomepageContentBlockRow[]).map(normalizeHomepageContentBlock),
    error,
  };
}

export async function getHomepageBanners(client?: PgDataClient) {
  const dataClient = resolvePgDataClient(client);

  if (!dataClient) {
    const { query } = await import("@/lib/db");
    const result = await query<RawHomepageBannerRow>(
      `
        select *
        from public.homepage_banners
        where is_active = true
        order by sort_order asc, created_at asc
      `,
    );

    return {
      data: result.rows.map(normalizeHomepageBanner),
      error: null,
    };
  }

  const { data, error } = await dataClient
    .from("homepage_banners")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  return {
    data: ((data ?? []) as RawHomepageBannerRow[]).map(normalizeHomepageBanner),
    error,
  };
}

export async function getHomepageProductSections(client?: PgDataClient) {
  const dataClient = resolvePgDataClient(client);

  if (!dataClient) {
    const { query } = await import("@/lib/db");
    const result = await query<RawHomepageProductSectionRow>(
      `
        select *
        from public.homepage_product_sections
        where is_active = true
        order by sort_order asc, created_at asc
      `,
    );

    return {
      data: result.rows.map(normalizeHomepageProductSection),
      error: null,
    };
  }

  const { data, error } = await dataClient
    .from("homepage_product_sections")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  return {
    data: ((data ?? []) as RawHomepageProductSectionRow[]).map(normalizeHomepageProductSection),
    error,
  };
}

export async function getHomepageRenderData(options?: {
  previewThemeId?: string;
  previewThemeSlug?: string;
  client?: PgDataClient;
}) {
  if (!options?.client) {
    try {
      return await getLocalHomepageRenderData(options);
    } catch (error) {
      return {
        data: createEmptyHomepageRenderData(),
        error,
      };
    }
  }

  const client = options?.client;

  const themeResult = options?.previewThemeId
    ? await getHomepageThemeById(options.previewThemeId, client)
    : options?.previewThemeSlug
      ? await getHomepageThemeBySlug(options.previewThemeSlug, client)
      : await getActiveHomepageTheme(client);

  if (!themeResult.data) {
    return {
      data: createEmptyHomepageRenderData(),
      error: themeResult.error,
    };
  }

  const [
    sectionsResult,
    contentBlocksResult,
    bannersResult,
    productSectionsResult,
    categoriesResult,
    publicProductsResult,
    vendorOptionsResult,
  ] = await Promise.all([
    getHomepageSections(themeResult.data.id, client),
    getHomepageContentBlocks(client),
    getHomepageBanners(client),
    getHomepageProductSections(client),
    getProductCategoryOptions(),
    getPublicProducts(client),
    getVendorOptions(),
  ]);

  const contentBlockMap = new Map(
    contentBlocksResult.data.map((block) => [block.content_key, block] as const),
  );

  const categories = buildHomepageCategories(categoriesResult.data, publicProductsResult.data);
  const resolvedProductSections: HomepageResolvedProductSection[] = [];

  for (const section of productSectionsResult.data) {
    const products = await resolveHomepageProductSectionProducts(
      section,
      publicProductsResult.data,
      categoriesResult.data,
      vendorOptionsResult.data,
    );

    resolvedProductSections.push({
      ...section,
      products,
    });
  }

  return {
    data: {
      theme: themeResult.data,
      sections: sectionsResult.data,
      contentBlocks: contentBlocksResult.data,
      contentBlockMap,
      banners: bannersResult.data,
      productSections: resolvedProductSections,
      categories,
    } satisfies HomepageRenderData,
    error:
      themeResult.error ??
      sectionsResult.error ??
      contentBlocksResult.error ??
      bannersResult.error ??
      productSectionsResult.error ??
      categoriesResult.error ??
      publicProductsResult.error ??
      vendorOptionsResult.error,
  };
}
