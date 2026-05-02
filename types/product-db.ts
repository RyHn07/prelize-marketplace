export type ProductDbWeight = string | number | null;
export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | { [key: string]: JsonValue } | JsonValue[];

export type ProductStatus = "active" | "disabled" | "draft";
export type ProductType = "single" | "variable";
export type ProductCddShippingProfile = "standard" | "express" | "fragile" | "bulk";
export type VendorStatus = "pending" | "active" | "suspended";
export type VendorMemberRole = "owner" | "staff";
export type VendorMemberStatus = "active" | "invited" | "disabled";
export type VendorInvitationStatus = "pending" | "accepted" | "rejected";
export type VendorOrderStatus =
  | "Pending"
  | "Confirmed"
  | "Processing"
  | "Shipped"
  | "Delivered"
  | "Cancelled";

export type ProductAttribute = {
  name: string;
  values: string[];
};

export type ProductSpecification = {
  label: string;
  value: string;
};

export type ProductImageRow = {
  id: string;
  product_id: string;
  image_url: string;
  sort_order: number | null;
  created_at: string;
};

export type ProductSpecRow = {
  id: string;
  product_id: string;
  label: string;
  value: string;
  sort_order: number | null;
  created_at: string;
};

export type ProductReview = {
  author?: string;
  rating?: number;
  title?: string;
  comment?: string;
  created_at?: string;
  [key: string]: JsonValue | undefined;
};

export type ProductVariantAttributeValues = Record<string, string>;

export type ProductDbVariantRow = {
  id: string;
  product_id: string;
  name: string;
  sku?: string | null;
  regular_price: number | null;
  discount_price: number | null;
  price: number;
  moq: number;
  weight?: number | null;
  image_url: string | null;
  min_order_quantity?: number | null;
  is_active?: boolean;
  sort_order?: number | null;
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
  short_description?: string | null;
  specifications?: ProductSpecification[] | JsonValue | null;
  reviews?: ProductReview[] | JsonValue | null;
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
  specifications: ProductSpecification[];
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
  specifications: ProductSpecificationFormValue[];
  variations: ProductVariationFormValue[];
  cdd_shipping_profile: ProductCddShippingProfile;
};

export type ProductSpecificationFormValue = {
  id: string;
  label: string;
  value: string;
};

export type ProductCategoryOption = {
  id: string;
  name: string;
  slug?: string;
  parent_id?: string | null;
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

export type VendorInvitationRow = {
  id: string;
  user_id: string;
  invited_by: string;
  status: VendorInvitationStatus;
  created_at: string;
};

export type OrderSummaryRow = {
  quantity?: number;
  totalQuantity?: number;
  productPrice: number;
  cddCharge: number;
  shippingCost?: number | null;
  hasUnknownShipping?: boolean;
  payNow: number;
  payOnDelivery: number | string | null;
};

export type ShippingMethodRow = {
  productId: string;
  productName: string;
  shippingProfileId: string;
  shippingProfileName: string;
};

export type VendorOrderRow = {
  id: string;
  order_id: string;
  vendor_id: string;
  status: VendorOrderStatus;
  summary: OrderSummaryRow;
  shipping_method: ShippingMethodRow[] | null;
  vendor_note: string | null;
  admin_note: string | null;
  created_at: string;
};

export type OrderItemRow = {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  product_image: string | null;
  variation: string;
  price: number;
  quantity: number;
  weight: number | null;
  vendor_id?: string | null;
  vendor_order_id?: string | null;
};

export type ProductEditorRecord = {
  product: ProductDbRow;
  variants: ProductDbVariantRow[];
};
