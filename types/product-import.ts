import type { JsonValue, ProductEditorRecord } from "@/types/product-db";
import type { ProductEditorSavePayload } from "@/lib/products/actions";

export type ProductImportMode = "create" | "update";
export type ProductImportStatus = "fetched" | "ready_for_review" | "saved" | "failed" | "cancelled";
export type ProductImportSource = "1688";

export type ImportedPriceTier = {
  min_quantity: number;
  max_quantity: number | null;
  unit_price: number;
  currency: "CNY";
};

export type ImportedVariant = {
  sku: string | null;
  name: string;
  value: string | null;
  price: number | null;
  moq: number | null;
  stock_quantity: number | null;
  image_url: string | null;
  attributes: Record<string, string>;
};

export type ImportedProductMappedData = {
  source_url: string;
  source_offer_id: string;
  original_title: string;
  translated_title: string;
  clean_title: string;
  slug: string;
  sku: string;
  short_description: string;
  full_description: string;
  seo_title: string;
  seo_description: string;
  tags: string[];
  suggested_category: string | null;
  product_highlights: string[];
  specifications: Array<{ label: string; value: string }>;
  main_images: string[];
  product_description_images: string[];
  sku_options: Array<{ name: string; values: string[] }>;
  variants: ImportedVariant[];
  price_tiers: ImportedPriceTier[];
  moq: number;
  currency: "CNY";
  supplier_name: string | null;
  supplier_location: string | null;
  stock_quantity: number | null;
  domestic_shipping_cost_cny: number | null;
  estimated_international_shipping_cost: number | null;
  shipping_note: string;
};

export type ProductImportDownloadedImages = {
  main_images: string[];
  product_description_images: string[];
  variant_images: Array<{ source_url: string; local_url: string }>;
  failed: Array<{ source_url: string; error: string }>;
};

export type ProductImportRow = {
  id: string;
  source: ProductImportSource;
  source_url: string;
  source_offer_id: string;
  target_product_id: string | null;
  import_mode: ProductImportMode;
  status: ProductImportStatus;
  raw_data: JsonValue;
  mapped_data: ImportedProductMappedData;
  downloaded_images: ProductImportDownloadedImages;
  errors: JsonValue | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ProductImportReviewPayload = ProductImportRow & {
  target_product: ProductEditorRecord | null;
  product_options: {
    categories: Array<{ id: string; name: string }>;
    brands: Array<{ id: string; name: string }>;
    vendors: Array<{ id: string; name: string }>;
    products: Array<{ id: string; name: string; slug: string }>;
  };
};

export type ProductImportSaveAction = "draft" | "publish" | "update";

export type ProductImportOverwriteKey =
  | "title"
  | "short_description"
  | "full_description"
  | "images"
  | "price_tiers"
  | "shipping_cost"
  | "sku_variants"
  | "tags"
  | "category"
  | "seo";

export type ProductImportSavePayload = {
  action: ProductImportSaveAction;
  fields: Partial<ImportedProductMappedData> & {
    title?: string;
    category_id?: string | null;
    brand_id?: string | null;
    vendor_id?: string | null;
    status?: "draft" | "active";
    price?: number | null;
    sale_price?: number | null;
  };
  overwrite: Partial<Record<ProductImportOverwriteKey, boolean>>;
};

export type ProductImportSaveResult = {
  productId: string;
  product: ProductEditorSavePayload;
};
