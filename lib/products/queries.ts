import { mockCategories } from "@/data/mock-categories";
import { getSupabaseClient } from "@/lib/supabase-client";
import type {
  ProductCategoryOption,
  ProductDbRow,
  ProductDbVariantRow,
  ProductEditorRecord,
  ProductStatus,
  ProductType,
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

function normalizeProduct(row: ProductDbRow): ProductDbRow {
  const parsedPrice = Number(row.price);
  const parsedMoq = Number(row.moq);

  return {
    ...row,
    slug: typeof row.slug === "string" && row.slug.trim().length > 0 ? row.slug : String(row.id),
    image_url: typeof row.image_url === "string" ? row.image_url : null,
    description: typeof row.description === "string" ? row.description : null,
    price: Number.isFinite(parsedPrice) ? parsedPrice : 0,
    moq: Number.isFinite(parsedMoq) && parsedMoq > 0 ? parsedMoq : 1,
    is_active: typeof row.is_active === "boolean" ? row.is_active : true,
    status: normalizeStatus(row.status, row.is_active),
    product_type: normalizeProductType(row.product_type),
    gallery_images: Array.isArray(row.gallery_images) ? row.gallery_images : [],
    attributes: Array.isArray(row.attributes) ? row.attributes : [],
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

export async function getProductEditorRecord(id: string) {
  const productResult = await getProductById(id);

  if (productResult.error || !productResult.data) {
    return {
      data: null as ProductEditorRecord | null,
      error: productResult.error,
    };
  }

  const supabase = getSupabaseClient();
  const { data: variants, error: variantsError } = await supabase
    .from("product_variants")
    .select("*")
    .eq("product_id", id)
    .order("created_at", { ascending: true });

  if (variantsError) {
    const missingVariantsTable = variantsError.message.toLowerCase().includes("product_variants");

    return {
      data: {
        product: productResult.data,
        variants: missingVariantsTable ? [] : ((variants ?? []) as ProductDbVariantRow[]),
      },
      error: missingVariantsTable ? null : variantsError,
    };
  }

  return {
    data: {
      product: productResult.data,
      variants: (variants ?? []) as ProductDbVariantRow[],
    },
    error: null,
  };
}

export async function getProductCategoryOptions() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("categories").select("id, name, slug").order("name", { ascending: true });

  if (error) {
    return {
      data: mockCategories.map((category) => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
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
        })),
    error: null,
  };
}
