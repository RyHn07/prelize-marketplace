export type ProductDbWeight = string | number | null;

export type ProductStatus = "active" | "disabled" | "draft";
export type ProductType = "single" | "variable";
export type ProductCddShippingProfile = "standard" | "express" | "fragile" | "bulk";

export type ProductAttribute = {
  name: string;
  values: string[];
};

export type ProductVariantAttributeValues = Record<string, string>;

export type ProductDbVariantRow = {
  id: string;
  product_id: string;
  name: string;
  regular_price: number | null;
  discount_price: number | null;
  price: number;
  moq: number;
  image_url: string | null;
  attribute_values: ProductVariantAttributeValues | null;
  created_at?: string;
};

export type ProductDbRow = {
  id: string;
  category_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  price: number;
  moq: number;
  weight: ProductDbWeight;
  badge: string | null;
  is_active: boolean;
  created_at: string;
  status?: ProductStatus | null;
  product_type?: ProductType | null;
  regular_price?: number | null;
  discount_price?: number | null;
  gallery_images?: string[] | null;
  attributes?: ProductAttribute[] | null;
  cdd_shipping_profile?: ProductCddShippingProfile | null;
};

export type ProductUpsertPayload = {
  category_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  price: number;
  moq: number;
  weight: ProductDbWeight;
  badge: string | null;
  is_active: boolean;
  status: ProductStatus;
  product_type: ProductType;
  regular_price: number | null;
  discount_price: number | null;
  gallery_images: string[];
  attributes: ProductAttribute[];
  cdd_shipping_profile: ProductCddShippingProfile;
};

export type ProductAttributeFormValue = {
  id: string;
  name: string;
  values: string;
};

export type ProductVariationFormValue = {
  id: string;
  name: string;
  regular_price: string;
  discount_price: string;
  moq: string;
  image_url: string;
  attribute_values: ProductVariantAttributeValues;
};

export type ProductFormValues = {
  category_id: string;
  name: string;
  slug: string;
  description: string;
  image_url: string;
  gallery_images: string[];
  weight: string;
  badge: string;
  status: ProductStatus;
  product_type: ProductType;
  regular_price: string;
  discount_price: string;
  moq: string;
  attributes: ProductAttributeFormValue[];
  variations: ProductVariationFormValue[];
  cdd_shipping_profile: ProductCddShippingProfile;
};

export type ProductCategoryOption = {
  id: string;
  name: string;
  slug?: string;
};

export type ProductEditorRecord = {
  product: ProductDbRow;
  variants: ProductDbVariantRow[];
};
