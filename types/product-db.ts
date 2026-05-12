export type ProductDbWeight = string | number | null;
export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | { [key: string]: JsonValue } | JsonValue[];

export type ProductStatus = "active" | "disabled" | "draft";
export type ProductType = "single" | "variable";
export type ProductCddShippingProfile = "standard" | "express" | "fragile" | "bulk";
export type CndsShippingPricingType = "unit" | "fixed";
export type ProductPricingType = "unit" | "fixed";
export type ProductPricingSource = "use_product_tier" | "use_fixed_price";
export type InternationalShippingStatus = "pending_review" | "calculated";
export type VendorStatus = "pending" | "active" | "suspended";
export type VendorMemberRole = "owner" | "staff";
export type VendorMemberStatus = "active" | "invited" | "disabled";
export type VendorInvitationStatus = "pending" | "accepted" | "rejected";
export type HomepageThemeStatus = "draft" | "active" | "archived";
export type HomepageThemeSectionKey =
  | "hero"
  | "featured_categories"
  | "promo_banners"
  | "product_showcase"
  | "why_choose_prelize"
  | "how_it_works"
  | "lead_capture"
  | "testimonials";
export type HomepageSectionType = HomepageThemeSectionKey;
export type HomepageProductSectionSourceType = "manual" | "newest" | "featured" | "category" | "low_moq";
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

export type CndsShippingTierRow = {
  id: string;
  profile_id: string;
  min_qty: number;
  max_qty: number | null;
  price: number;
  sort_order: number;
  created_at: string | null;
};

export type CndsShippingProfileRow = {
  id: string;
  vendor_id: string | null;
  name: string;
  description: string | null;
  pricing_type: CndsShippingPricingType;
  is_active: boolean;
  created_at: string | null;
  tiers: CndsShippingTierRow[];
};

export type CndsShippingProfileOption = {
  id: string;
  vendor_id: string | null;
  name: string;
  description: string | null;
  pricing_type: CndsShippingPricingType;
  is_active: boolean;
  tiers: CndsShippingTierRow[];
};

export type InternationalShippingTierRow = {
  id: string;
  method_id: string;
  min_weight_kg: number;
  max_weight_kg: number | null;
  price_per_kg: number;
  sort_order: number;
  created_at: string | null;
};

export type InternationalShippingMethodRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  delivery_min_days: number | null;
  delivery_max_days: number | null;
  minimum_weight_kg: number;
  is_active: boolean;
  sort_order: number;
  created_at: string | null;
  tiers: InternationalShippingTierRow[];
};

export type ProductReview = {
  author?: string;
  rating?: number;
  title?: string;
  comment?: string;
  created_at?: string;
  [key: string]: JsonValue | undefined;
};

export type ProductPricingTierRow = {
  id: string;
  product_id: string;
  pricing_type: ProductPricingType;
  min_qty: number;
  max_qty: number | null;
  price: number;
  sort_order?: number | null;
  created_at?: string | null;
};

export type ProductPricingTierSetRow = {
  id: string;
  product_id: string;
  name: string;
  fallback_price: number;
  pricing_type: ProductPricingType;
  sort_order?: number | null;
  created_at?: string | null;
};

export type ProductPricingTierSetTierRow = {
  id: string;
  tier_set_id: string;
  min_qty: number;
  max_qty: number | null;
  price: number;
  sort_order?: number | null;
  created_at?: string | null;
};

export type PricingTierProfileRowRecord = {
  id: string;
  profile_id: string;
  min_qty: number;
  max_qty: number | null;
  price: number;
  sort_order: number;
  created_at?: string | null;
};

export type PricingTierProfileRow = {
  id: string;
  vendor_id: string | null;
  name: string;
  pricing_type: ProductPricingType;
  is_active: boolean;
  created_at?: string | null;
  rows: PricingTierProfileRowRecord[];
};

export type PricingTierProfileOption = PricingTierProfileRow;

export type ResolvedProductPricingTier = {
  id: string;
  min_qty: number;
  max_qty: number | null;
  price: number;
  sort_order?: number | null;
};

export type ResolvedProductPricingConfig = {
  source: "profile" | "legacy" | null;
  profile_id: string | null;
  profile_name: string | null;
  pricing_type: ProductPricingType | null;
  tiers: ResolvedProductPricingTier[];
  variant_tier_sets?: ResolvedVariantPricingTierSet[];
  variant_assignments?: ResolvedVariantPricingAssignment[];
};

export type ResolvedVariantPricingTierSet = {
  id: string;
  name: string;
  fallback_price: number;
  pricing_type: ProductPricingType;
  tiers: ResolvedProductPricingTier[];
  sort_order?: number | null;
};

export type ResolvedVariantPricingAssignment = {
  variant_id: string;
  tier_set_id: string | null;
};

export type ProductVariantAttributeValues = Record<string, string>;

export type ProductDbVariantRow = {
  id: string;
  product_id: string;
  name: string;
  value?: string | null;
  sku?: string | null;
  regular_price: number | null;
  discount_price: number | null;
  price: number;
  moq: number;
  stock?: number;
  weight?: number | null;
  image_url: string | null;
  min_order_quantity?: number | null;
  is_active?: boolean;
  sort_order?: number | null;
  pricing_tier_set_id?: string | null;
  attribute_values: ProductVariantAttributeValues | null;
  created_at?: string;
};

export type ProductDbRow = {
  id: string;
  vendor_id?: string | null;
  category_id: string | null;
  name: string;
  slug: string;
  sku?: string | null;
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
  cnds_profile_id?: string | null;
  pricing_tier_profile_id?: string | null;
  pricing_source?: ProductPricingSource | null;
};

export type ProductUpsertPayload = {
  vendor_id: string | null;
  category_id: string | null;
  name: string;
  slug: string;
  sku: string | null;
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
  cnds_profile_id: string | null;
  pricing_tier_profile_id: string | null;
  pricing_source: ProductPricingSource;
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
  stock: string;
  image_url: string;
  pricing_tier_set_id: string;
  attribute_values: ProductVariantAttributeValues;
};

export type HomepageThemeRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  preview_image_url: string | null;
  status: HomepageThemeStatus;
  is_active: boolean;
  settings_json: JsonValue;
  created_at: string;
  updated_at: string;
};

export type HomepageThemeSectionRow = {
  id: string;
  theme_id: string;
  section_key: HomepageThemeSectionKey;
  section_type: HomepageSectionType;
  component_name: string;
  sort_order: number;
  is_enabled: boolean;
  layout_settings: JsonValue;
  created_at: string;
  updated_at: string;
};

export type HomepageContentBlockRow = {
  id: string;
  content_key: string;
  title: string | null;
  subtitle: string | null;
  description: string | null;
  image_url: string | null;
  button_text: string | null;
  button_link: string | null;
  data_json: JsonValue;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type HomepageBannerRow = {
  id: string;
  title: string | null;
  subtitle: string | null;
  image_url: string | null;
  link_url: string | null;
  placement: string | null;
  sort_order: number;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
};

export type HomepageProductSectionRow = {
  id: string;
  title: string;
  subtitle: string | null;
  section_key: string;
  source_type: HomepageProductSectionSourceType;
  category_id: string | null;
  product_ids: string[];
  limit_count: number;
  sort_order: number;
  is_active: boolean;
  created_at: string;
};

export type HomepageResolvedProductSection = HomepageProductSectionRow & {
  products: import("@/types/product").Product[];
};

export type ProductPricingTierFormValue = {
  id: string;
  min_qty: string;
  max_qty: string;
  price: string;
};

export type ProductPricingTierSetFormValue = {
  id: string;
  name: string;
  fallback_price: string;
  pricing_type: ProductPricingType;
  tiers: ProductPricingTierFormValue[];
};

export type ProductFormValues = {
  vendor_id: string;
  category_id: string;
  name: string;
  slug: string;
  sku: string;
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
  pricing_type: ProductPricingType;
  pricing_tiers: ProductPricingTierFormValue[];
  pricing_tier_sets: ProductPricingTierSetFormValue[];
  cdd_shipping_profile: ProductCddShippingProfile;
  cnds_profile_id: string;
  pricing_tier_profile_id: string;
  pricing_source: ProductPricingSource;
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
  image_url?: string | null;
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
  variant_id?: string | null;
  product_name: string;
  product_image: string | null;
  variation: string;
  variant_name?: string | null;
  variant_value?: string | null;
  price: number;
  unit_price?: number | null;
  total_price?: number | null;
  quantity: number;
  weight: number | null;
  weight_kg?: number | null;
  total_weight_kg?: number | null;
  cnds_cost?: number | null;
  cnds_profile_id?: string | null;
  vendor_id?: string | null;
  vendor_order_id?: string | null;
};

export type ProductEditorRecord = {
  product: ProductDbRow;
  variants: ProductDbVariantRow[];
  pricing_tiers: ProductPricingTierRow[];
  pricing_tier_sets: Array<{
    set: ProductPricingTierSetRow;
    rows: ProductPricingTierSetTierRow[];
  }>;
};
