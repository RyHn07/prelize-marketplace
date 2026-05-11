import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseClient } from "@/lib/supabase-client";
import {
  getProductCategoryOptions,
  getProductImageMapByProductIds,
  getProductsByIds,
  getPublicProducts,
} from "@/lib/products/queries";
import { mapProductDbToStorefrontProduct } from "@/lib/products/storefront";
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

function resolveSupabaseClient(client?: SupabaseClient) {
  return client ?? getSupabaseClient();
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
    title: row.title,
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
    .map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug ?? createSlugFallback(category.name),
      image: imageByCategoryId.get(category.id) ?? "/file.svg",
      itemCount: `${countByCategoryId.get(category.id) ?? 0} products`,
      totalItems: countByCategoryId.get(category.id) ?? 0,
    }))
    .sort((left, right) => right.totalItems - left.totalItems || left.name.localeCompare(right.name))
    .slice(0, 8)
    .map(({ totalItems: _totalItems, ...category }) => category);
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
  const { data: imageMap } = await getProductImageMapByProductIds(limitedProducts.map((product) => product.id));

  return mapProductsToStorefront(limitedProducts, imageMap, categoryOptions, vendorOptions);
}

export async function getHomepageThemeBySlug(slug: string, client?: SupabaseClient) {
  const supabase = resolveSupabaseClient(client);
  const { data, error } = await supabase
    .from("homepage_themes")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  return {
    data: data ? normalizeHomepageTheme(data as RawHomepageThemeRow) : null,
    error,
  };
}

export async function getHomepageThemeById(id: string, client?: SupabaseClient) {
  const supabase = resolveSupabaseClient(client);
  const { data, error } = await supabase
    .from("homepage_themes")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  return {
    data: data ? normalizeHomepageTheme(data as RawHomepageThemeRow) : null,
    error,
  };
}

export async function getActiveHomepageTheme(client?: SupabaseClient) {
  const supabase = resolveSupabaseClient(client);
  const { data, error } = await supabase
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

export async function getHomepageSections(themeId: string, client?: SupabaseClient) {
  const supabase = resolveSupabaseClient(client);
  const { data, error } = await supabase
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

export async function getHomepageContentBlocks(client?: SupabaseClient) {
  const supabase = resolveSupabaseClient(client);
  const { data, error } = await supabase
    .from("homepage_content_blocks")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  return {
    data: ((data ?? []) as RawHomepageContentBlockRow[]).map(normalizeHomepageContentBlock),
    error,
  };
}

export async function getHomepageBanners(client?: SupabaseClient) {
  const supabase = resolveSupabaseClient(client);
  const { data, error } = await supabase
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

export async function getHomepageProductSections(client?: SupabaseClient) {
  const supabase = resolveSupabaseClient(client);
  const { data, error } = await supabase
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
  client?: SupabaseClient;
}) {
  const client = options?.client;

  const themeResult = options?.previewThemeId
    ? await getHomepageThemeById(options.previewThemeId, client)
    : options?.previewThemeSlug
      ? await getHomepageThemeBySlug(options.previewThemeSlug, client)
      : await getActiveHomepageTheme(client);

  if (!themeResult.data) {
    return {
      data: {
        theme: null,
        sections: [] as HomepageThemeSectionRow[],
        contentBlocks: [] as HomepageContentBlockRow[],
        contentBlockMap: new Map<string, HomepageContentBlockRow>(),
        banners: [] as HomepageBannerRow[],
        productSections: [] as HomepageResolvedProductSection[],
        categories: [] as Category[],
      } satisfies HomepageRenderData,
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
