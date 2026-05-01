export type ProductDbWeight = string | number | null;

export type ProductStatus = "active" | "disabled" | "draft";
export type ProductType = "single" | "variable";
export type ProductCddShippingProfile = "standard" | "express" | "fragile" | "bulk";
export type VendorStatus = "pending" | "active" | "suspended";
export type VendorMemberRole = "owner" | "staff";
export type VendorMemberStatus = "active" | "invited" | "disabled";

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
  vendor_id?: string | null;
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
  vendor_id: string | null;
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
  vendor_id: string;
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

export type ProductVendorOption = {
  id: string;
  name: string;
  slug?: string;
  status?: VendorStatus;
};

export type VendorRow = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  banner_url: string | null;
  description: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  status: VendorStatus;
  created_at: string;
  updated_at?: string | null;
};

export type VendorUpsertPayload = {
  name: string;
  slug: string;
  logo_url: string | null;
  banner_url: string | null;
  description: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  status: VendorStatus;
};

export type VendorFormValues = {
  name: string;
  slug: string;
  logo_url: string;
  banner_url: string;
  description: string;
  contact_email: string;
  contact_phone: string;
  address: string;
  status: VendorStatus;
};

export type VendorMemberRow = {
  id: string;
  vendor_id: string;
  user_id: string;
  role: VendorMemberRole;
  status: VendorMemberStatus;
  created_at: string;
};

export type ProductEditorRecord = {
  product: ProductDbRow;
  variants: ProductDbVariantRow[];
};
