"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  createProductEditorRecord,
  getEffectivePrice,
  updateProductEditorRecord,
  type ProductEditorSavePayload,
  type ProductPricingTierSetUpsertPayload,
  type ProductPricingTierUpsertPayload,
  type ProductVariantUpsertPayload,
} from "@/lib/products/actions";
import { getCndsShippingProfilesForVendor } from "@/lib/cnds/queries";
import { listProductMedia, uploadProductMedia } from "@/lib/media/storage";
import {
  getProductBrandOptions,
  getProductCategoryOptions,
  getProductVendorOptions,
} from "@/lib/products/queries";
import type {
  CndsShippingProfileOption,
  ProductAttribute,
  ProductBrandOption,
  ProductAttributeFormValue,
  ProductCategoryOption,
  ProductEditorRecord,
  ProductFormValues,
  ProductPricingSource,
  ProductPricingTierFormValue,
  ProductPricingTierSetFormValue,
  ProductPricingType,
  ProductSpecification,
  ProductSpecificationFormValue,
  ProductStatus,
  ProductVariationFormValue,
  ProductVariantAttributeValues,
  ProductUpsertPayload,
  ProductVendorOption,
} from "@/types/product-db";

type ProductFormProps = {
  mode: "create" | "edit";
  record?: ProductEditorRecord | null;
  allowedVendorIds?: string[];
  canAssignPlatformProducts?: boolean;
  forcedVendorId?: string | null;
  onSave?: (
    mode: "create" | "edit",
    payload: ProductEditorSavePayload,
    productId: string | null,
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
};

type PricingBridgeTier = {
  id: string;
  min_qty: string;
  max_qty: string;
  price: string;
};

type PricingBridgeTierSet = {
  id: string;
  name: string;
  fallback_price: string;
  pricing_type: ProductPricingType;
  tiers: PricingBridgeTier[];
};

type AttributeBridgeAttribute = {
  id: string;
  name: string;
  values: string;
};

type VariationBridgeVariation = {
  id: string;
  name: string;
  pricing_tier_set_id: string;
  moq: string;
  stock: string;
  summary: string;
  image_url: string;
};

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function createEmptyAttribute(): ProductAttributeFormValue {
  return {
    id: createId("attribute"),
    name: "",
    values: "",
  };
}

function createEmptyPricingTier(): ProductPricingTierFormValue {
  return {
    id: createId("pricing-tier"),
    min_qty: "1",
    max_qty: "",
    price: "",
  };
}

function createEmptyVariation(): ProductVariationFormValue {
  return {
    id: createId("variation"),
    name: "",
    regular_price: "",
    discount_price: "",
    moq: "1",
    stock: "0",
    image_url: "",
    pricing_tier_set_id: "",
    attribute_values: {},
  };
}

function createEmptyPricingTierSet(): ProductPricingTierSetFormValue {
  return {
    id: createId("pricing-tier-set"),
    name: "",
    fallback_price: "",
    pricing_type: "unit",
    tiers: [createEmptyPricingTier()],
  };
}

function createEmptySpecification(): ProductSpecificationFormValue {
  return {
    id: createId("specification"),
    label: "",
    value: "",
  };
}

function splitAttributeValues(value: string) {
  return value
    .split(/[\n,|]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function serializeAttributeValues(values: string[]) {
  return values.join(", ");
}

function parseAttributesForGeneration(attributes: ProductAttributeFormValue[]) {
  return attributes
    .map((attribute) => ({
      name: attribute.name.trim(),
      values: Array.from(new Set(splitAttributeValues(attribute.values))),
    }))
    .filter((attribute) => attribute.name && attribute.values.length > 0);
}

function buildGeneratedVariationsFromAttributes(
  attributes: ProductAttributeFormValue[],
  existingVariations: ProductVariationFormValue[],
  pricingTierSets: ProductPricingTierSetFormValue[],
  moq: string,
) {
  const nextParsedAttributes = parseAttributesForGeneration(attributes);

  if (nextParsedAttributes.length === 0) {
    return {
      error: "Add at least one attribute with values before generating variations.",
      variations: existingVariations,
    };
  }

  const combinations = cartesianProduct(nextParsedAttributes.map((attribute) => attribute.values));
  const existingBySignature = new Map(
    existingVariations.map((variation) => [buildVariationSignature(variation.attribute_values), variation]),
  );

  const generatedVariations = combinations.map((combination) => {
    const attributeValues = nextParsedAttributes.reduce<ProductVariantAttributeValues>((result, attribute, index) => {
      result[attribute.name] = combination[index];
      return result;
    }, {});
    const signature = buildVariationSignature(attributeValues);
    const existingVariation = existingBySignature.get(signature);

    return existingVariation ?? {
      id: createId("variation"),
      name: combination.join(" / "),
      regular_price: "",
      discount_price: "",
      moq: moq || "1",
      stock: "0",
      image_url: "",
      pricing_tier_set_id: pricingTierSets[0]?.id ?? "",
      attribute_values: attributeValues,
    };
  });

  const manualVariations = existingVariations.filter(
    (variation) => Object.keys(variation.attribute_values).length === 0 && variation.name.trim().length > 0,
  );

  return {
    error: null,
    variations: [...generatedVariations, ...manualVariations],
  };
}

function inferAttributesFromVariants(record?: ProductEditorRecord | null) {
  const attributesFromProduct = record?.product.attributes;

  if (attributesFromProduct && attributesFromProduct.length > 0) {
    return attributesFromProduct.map((attribute) => ({
      id: createId("attribute"),
      name: attribute.name,
      values: serializeAttributeValues(attribute.values),
    }));
  }

  const attributeMap = new Map<string, Set<string>>();

  record?.variants.forEach((variant) => {
    if (!variant.attribute_values) {
      return;
    }

    Object.entries(variant.attribute_values).forEach(([name, value]) => {
      const currentSet = attributeMap.get(name) ?? new Set<string>();
      currentSet.add(String(value));
      attributeMap.set(name, currentSet);
    });
  });

  if (attributeMap.size === 0) {
    return [createEmptyAttribute()];
  }

  return Array.from(attributeMap.entries()).map(([name, values]) => ({
    id: createId("attribute"),
    name,
    values: serializeAttributeValues(Array.from(values)),
  }));
}

function getInitialPricingTierSets(record?: ProductEditorRecord | null) {
  if (record?.pricing_tier_sets && record.pricing_tier_sets.length > 0) {
    return record.pricing_tier_sets.map(({ set, rows }) => ({
      id: set.id,
      name: set.name,
      fallback_price: String(set.fallback_price),
      pricing_type: set.pricing_type,
      tiers:
        rows.length > 0
          ? rows.map((row) => ({
              id: row.id,
              min_qty: String(row.min_qty),
              max_qty: row.max_qty !== null ? String(row.max_qty) : "",
              price: String(row.price),
            }))
          : [createEmptyPricingTier()],
    }));
  }

  if (record?.pricing_tiers && record.pricing_tiers.length > 0) {
    const defaultTierSetId = createId("pricing-tier-set");

    return [
      {
        id: defaultTierSetId,
        name: "Default Pricing",
        fallback_price:
          record.product.regular_price !== null && record.product.regular_price !== undefined
            ? String(record.product.regular_price)
            : String(record.product.price ?? 0),
        pricing_type: record.pricing_tiers[0]?.pricing_type ?? "unit",
        tiers: record.pricing_tiers.map((tier) => ({
          id: tier.id,
          min_qty: String(tier.min_qty),
          max_qty: tier.max_qty !== null ? String(tier.max_qty) : "",
          price: String(tier.price),
        })),
      },
    ];
  }

  return [createEmptyPricingTierSet()];
}

function getInitialValues(
  record?: ProductEditorRecord | null,
  allowedVendorIds: string[] = [],
  canAssignPlatformProducts = true,
  forcedVendorId?: string | null,
): ProductFormValues {
  const product = record?.product;
  const isVariable = (product?.product_type ?? (record?.variants.length ? "variable" : "single")) === "variable";
  const initialPricingTierSets = getInitialPricingTierSets(record);
  const defaultTierSetId = initialPricingTierSets[0]?.id ?? "";
  const initialStatus = product
    ? ((product.status ?? (product.is_active ? "active" : "disabled")) as ProductStatus)
    : "active";
  const defaultVendorId =
    forcedVendorId ??
    product?.vendor_id ??
    (!canAssignPlatformProducts && allowedVendorIds.length > 0 ? allowedVendorIds[0] : "");

  return {
    vendor_id: defaultVendorId,
    category_id: product?.category_id ?? "",
    brand_id: product?.brand_id ?? "",
    name: product?.name ?? "",
    slug: product?.slug ?? "",
    sku: product?.sku ?? "",
    description: product?.description ?? "",
    image_url: product?.image_url ?? "",
    gallery_images: Array.isArray(product?.gallery_images) ? product.gallery_images : [],
    weight:
      product?.weight === null || product?.weight === undefined || product.weight === ""
        ? ""
        : String(product.weight),
    badge: product?.badge ?? "",
    status: initialStatus,
    product_type: isVariable ? "variable" : "single",
    regular_price: product?.regular_price ? String(product.regular_price) : product?.price ? String(product.price) : "",
    discount_price: product?.discount_price ? String(product.discount_price) : "",
    moq: product?.moq ? String(product.moq) : "1",
    attributes: (() => {
      const inferredAttributes = inferAttributesFromVariants(record);
      return inferredAttributes.length > 0 ? inferredAttributes : [createEmptyAttribute()];
    })(),
    specifications:
      Array.isArray(product?.specifications) && product.specifications.length > 0
        ? product.specifications
            .map((spec) => {
              if (!spec || typeof spec !== "object" || Array.isArray(spec)) {
                return null;
              }

              return {
                id: createId("specification"),
                label: "label" in spec && typeof spec.label === "string" ? spec.label : "",
                value: "value" in spec && typeof spec.value === "string" ? spec.value : "",
              };
            })
            .filter((spec): spec is ProductSpecificationFormValue => spec !== null)
        : [createEmptySpecification()],
    cdd_shipping_profile: product?.cdd_shipping_profile ?? "standard",
    cnds_profile_id: product?.cnds_profile_id ?? "",
    pricing_source: "use_product_tier",
    pricing_type: record?.pricing_tiers[0]?.pricing_type ?? "unit",
    pricing_tiers:
      record?.pricing_tiers.map((tier) => ({
        id: tier.id,
        min_qty: String(tier.min_qty),
        max_qty: tier.max_qty !== null ? String(tier.max_qty) : "",
        price: String(tier.price),
      })) ?? [],
    pricing_tier_sets: initialPricingTierSets,
    pricing_tier_profile_id: "",
    variations:
      record?.variants.map((variant) => ({
        id: variant.id,
        name: variant.name,
        regular_price: variant.regular_price !== null ? String(variant.regular_price) : String(variant.price),
        discount_price: variant.discount_price !== null ? String(variant.discount_price) : "",
        moq: String(variant.moq),
        stock: String(variant.stock ?? 0),
        image_url: variant.image_url ?? "",
        pricing_tier_set_id: variant.pricing_tier_set_id ?? defaultTierSetId,
        attribute_values: variant.attribute_values ?? {},
      })) ?? [],
  };
}

function normalizeOptionalText(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeCategoryId(value: string) {
  return normalizeOptionalUuid(value);
}

function normalizeBrandId(value: string) {
  return normalizeOptionalUuid(value);
}

function normalizeVendorId(value: string) {
  return normalizeOptionalUuid(value);
}

function normalizeCndsProfileId(value: string) {
  return normalizeOptionalUuid(value);
}

function normalizePricingTierProfileId(value: string) {
  return normalizeOptionalUuid(value);
}

function normalizeOptionalUuid(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  return uuidPattern.test(trimmed) ? trimmed : null;
}

function buildProductPayload(values: ProductFormValues): ProductUpsertPayload {
  const regularPrice = parseNumber(values.regular_price) ?? 0;
  const discountPrice = parseNumber(values.discount_price);
  const moq = parseNumber(values.moq) ?? 1;
  const trimmedName = values.name.trim();
  const fallbackSlug =
    values.slug.trim() ||
    trimmedName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .replace(/-{2,}/g, "-");

  return {
    vendor_id: normalizeVendorId(values.vendor_id),
    category_id: normalizeCategoryId(values.category_id),
    brand_id: normalizeBrandId(values.brand_id),
    name: trimmedName,
    slug: fallbackSlug,
    sku: normalizeOptionalText(values.sku),
    description: normalizeOptionalText(values.description),
    image_url: normalizeOptionalText(values.image_url),
    price: getEffectivePrice(regularPrice, discountPrice),
    moq,
    weight: normalizeOptionalText(values.weight),
    badge: normalizeOptionalText(values.badge),
    is_active: values.status === "active",
    status: values.status,
    product_type: values.product_type,
    regular_price: values.product_type === "single" ? regularPrice : null,
    discount_price: values.product_type === "single" ? discountPrice : null,
    gallery_images: values.gallery_images.filter(Boolean),
    attributes: values.attributes
      .map((attribute): ProductAttribute => ({
        name: attribute.name.trim(),
        values: splitAttributeValues(attribute.values),
      }))
      .filter((attribute) => attribute.name && attribute.values.length > 0),
    specifications: values.specifications
      .map(
        (specification): ProductSpecification => ({
          label: specification.label.trim(),
          value: specification.value.trim(),
        }),
      )
      .filter((specification) => specification.label.length > 0 || specification.value.length > 0),
    cdd_shipping_profile: values.cdd_shipping_profile,
    cnds_profile_id: normalizeCndsProfileId(values.cnds_profile_id),
    pricing_tier_profile_id: normalizePricingTierProfileId(values.pricing_tier_profile_id),
    pricing_source: "use_product_tier",
  };
}

function resolveSubmittedStatus(fallbackStatus: ProductStatus): ProductStatus {
  if (typeof document === "undefined") {
    return fallbackStatus;
  }

  const checkedStatus = document.querySelector<HTMLInputElement>('input[name="status"]:checked')?.dataset
    .productStatusOption;

  if (checkedStatus === "active" || checkedStatus === "disabled" || checkedStatus === "draft") {
    return checkedStatus;
  }

  return fallbackStatus;
}

function applyForcedVendorId(payload: ProductUpsertPayload, forcedVendorId?: string | null) {
  if (!forcedVendorId) {
    return payload;
  }

  return {
    ...payload,
    vendor_id: forcedVendorId,
  };
}

function buildVariantPayloads(values: ProductFormValues): ProductVariantUpsertPayload[] {
  const tierSetFallbackById = new Map(
    values.pricing_tier_sets.map((tierSet) => [tierSet.id, Math.max(0, parseNumber(tierSet.fallback_price) ?? 0)]),
  );

  return values.variations.map((variation) => {
    const fallbackRegularPrice =
      tierSetFallbackById.get(variation.pricing_tier_set_id) ?? parseNumber(values.regular_price) ?? 0;
    const regularPrice = parseNumber(variation.regular_price) ?? fallbackRegularPrice;
    const discountPrice = parseNumber(variation.discount_price) ?? parseNumber(values.discount_price);
    const moq = parseNumber(variation.moq) ?? 1;
    const stock = Math.max(0, Math.floor(parseNumber(variation.stock) ?? 0));
    const derivedValue = Object.values(variation.attribute_values)
      .map((value) => String(value).trim())
      .filter(Boolean)
      .join(" / ");

    return {
      name: variation.name.trim(),
      value: derivedValue.length > 0 ? derivedValue : variation.name.trim() || null,
      regular_price: regularPrice,
      discount_price: discountPrice,
      price: getEffectivePrice(regularPrice, discountPrice),
      moq,
      stock,
      image_url: normalizeOptionalText(variation.image_url),
      pricing_tier_set_id: variation.pricing_tier_set_id || null,
      attribute_values: variation.attribute_values,
    };
  });
}

function buildPricingTierPayloads(values: ProductFormValues): ProductPricingTierUpsertPayload[] {
  return values.pricing_tiers
    .filter((tier) => tier.min_qty.trim() || tier.max_qty.trim() || tier.price.trim())
    .map((tier, index) => {
      const minQty = Math.max(1, Math.floor(parseNumber(tier.min_qty) ?? 1));
      const maxQtyValue = parseNumber(tier.max_qty);
      const maxQty = maxQtyValue !== null ? Math.max(minQty, Math.floor(maxQtyValue)) : null;
      const price = Math.max(0, parseNumber(tier.price) ?? 0);

      return {
        pricing_type: values.pricing_type,
        min_qty: minQty,
        max_qty: maxQty,
        price,
        sort_order: index,
      };
    });
}

function buildPricingTierSetPayloads(values: ProductFormValues): ProductPricingTierSetUpsertPayload[] {
  return values.pricing_tier_sets
    .filter(
      (tierSet) =>
        tierSet.name.trim() ||
        tierSet.fallback_price.trim() ||
        tierSet.tiers.some((tier) => tier.min_qty.trim() || tier.max_qty.trim() || tier.price.trim()),
    )
    .map((tierSet, index) => ({
      temp_id: tierSet.id,
      name: tierSet.name.trim() || `Tier Set ${index + 1}`,
      fallback_price: Math.max(0, parseNumber(tierSet.fallback_price) ?? 0),
      pricing_type: tierSet.pricing_type,
      sort_order: index,
      rows: tierSet.tiers
        .filter((tier) => tier.min_qty.trim() || tier.max_qty.trim() || tier.price.trim())
        .map((tier, tierIndex) => {
          const minQty = Math.max(1, Math.floor(parseNumber(tier.min_qty) ?? 1));
          const maxQtyValue = parseNumber(tier.max_qty);
          const maxQty = maxQtyValue !== null ? Math.max(minQty, Math.floor(maxQtyValue)) : null;

          return {
            pricing_type: tierSet.pricing_type,
            min_qty: minQty,
            max_qty: maxQty,
            price: Math.max(0, parseNumber(tier.price) ?? 0),
            sort_order: tierIndex,
          };
        }),
    }));
}

function cartesianProduct<T>(values: T[][]): T[][] {
  return values.reduce<T[][]>(
    (accumulator, current) =>
      accumulator.flatMap((prefix) => current.map((item) => [...prefix, item])),
    [[]],
  );
}

function buildVariationSignature(attributeValues: ProductVariantAttributeValues) {
  return Object.entries(attributeValues)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}:${value}`)
    .join("|");
}

function formatTierPricingTypeLabel(value: ProductPricingType) {
  return value === "unit" ? "Unit Pricing" : "Fixed Range Pricing";
}

function buildVariationBridgeState(variations: ProductVariationFormValue[]): VariationBridgeVariation[] {
  return variations.map((variation) => ({
    id: variation.id,
    name: variation.name,
    pricing_tier_set_id: variation.pricing_tier_set_id,
    moq: variation.moq,
    stock: variation.stock,
    summary: Object.entries(variation.attribute_values)
      .map(([key, value]) => `${key}: ${value}`)
      .join(" | "),
    image_url: variation.image_url,
  }));
}

function buildAttributeBridgeState(attributes: ProductAttributeFormValue[]): AttributeBridgeAttribute[] {
  return attributes.map((attribute) => ({
    id: attribute.id,
    name: attribute.name,
    values: attribute.values,
  }));
}

function ProductStatusBadge({ status }: { status: ProductStatus }) {
  const styles =
    status === "active"
      ? "bg-emerald-100 text-emerald-700"
      : status === "draft"
        ? "bg-amber-100 text-amber-700"
        : "bg-slate-200 text-slate-600";

  const label = status === "disabled" ? "Archived" : status === "draft" ? "Draft" : "Published";

  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${styles}`}>{label}</span>;
}

function CardSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5 space-y-1">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        {description ? <p className="text-sm text-slate-500">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

function TextField({
  id,
  label,
  value,
  onChange,
  placeholder,
  required,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        placeholder={placeholder}
        className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition-colors focus:border-[#615FFF]"
      />
    </div>
  );
}

function NumberField({
  id,
  label,
  value,
  onChange,
  placeholder,
  min,
  step,
  required,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  min?: string;
  step?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        id={id}
        type="number"
        min={min}
        step={step}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        placeholder={placeholder}
        className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition-colors focus:border-[#615FFF]"
      />
    </div>
  );
}

function MediaField({
  label,
  value,
  onChange,
  helperText,
  libraryHref,
  vendorId,
  pickerButtonId,
  allowManualUrl = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  helperText?: string;
  libraryHref?: string;
  vendorId?: string | null;
  pickerButtonId?: string;
  allowManualUrl?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [urlDraft, setUrlDraft] = useState(value);
  const [localPreviewUrl, setLocalPreviewUrl] = useState("");
  const [libraryImages, setLibraryImages] = useState<string[]>([]);
  const [libraryError, setLibraryError] = useState("");
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    setUrlDraft(value);
  }, [value]);

  const clearLocalPreview = () => {
    if (localPreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(localPreviewUrl);
    }
    setLocalPreviewUrl("");
  };

  const loadLibrary = async () => {
    setIsLoadingLibrary(true);
    setLibraryError("");

      try {
      const result = await listProductMedia({ vendorId });

      if (result.error) {
        setLibraryError(result.error.message);
        setLibraryImages([]);
        return;
      }

      setLibraryImages(result.data.map((item) => item.publicUrl));
    } catch (error) {
      setLibraryError(error instanceof Error ? error.message : "Unable to load media library.");
      setLibraryImages([]);
    } finally {
      setIsLoadingLibrary(false);
    }
  };

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    clearLocalPreview();
    setLocalPreviewUrl(URL.createObjectURL(file));
    setIsUploading(true);
    setLibraryError("");

    try {
      const result = await uploadProductMedia(file, { vendorId });

      if (result.error || !result.data) {
        setLibraryError(result.error?.message ?? "Unable to upload image.");
        return;
      }

      clearLocalPreview();
      setUrlDraft(result.data.publicUrl);
      onChange(result.data.publicUrl);
      setPickerOpen(false);
      await loadLibrary();
    } catch (error) {
      setLibraryError(error instanceof Error ? error.message : "Unable to upload image.");
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  };

  const previewValue = localPreviewUrl || value;

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
      <div className="space-y-3">
        <div>
          <p className="text-sm font-medium text-slate-700">{label}</p>
          {helperText ? <p className="mt-1 text-xs leading-5 text-slate-500">{helperText}</p> : null}
        </div>

        <div className="flex items-start gap-3">
          <div className="w-20 shrink-0 overflow-hidden rounded-2xl border border-dashed border-slate-300 bg-white">
            <div className="aspect-square bg-slate-100">
              {previewValue ? (
                <div
                  role="img"
                  aria-label={label}
                  className="h-full w-full bg-cover bg-center"
                  style={{ backgroundImage: `url("${previewValue}")` }}
                />
              ) : (
                <div className="flex h-full items-center justify-center px-1 text-center text-[11px] font-medium text-slate-400">
                  1:1 Preview
                </div>
              )}
            </div>
          </div>

          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-col gap-2">
              {libraryHref ? (
                <Link
                  href={libraryHref}
                  className="inline-flex w-full items-center justify-center rounded-xl border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-[#615FFF]/40 hover:text-slate-900"
                >
                  Open Full Media Library
                </Link>
              ) : null}
                <button
                  id={pickerButtonId}
                  type="button"
                  onClick={() => {
                    clearLocalPreview();
                    setPickerOpen((current) => !current);
                  if (!pickerOpen) {
                    void loadLibrary();
                  }
                }}
                className="inline-flex w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-[#615FFF]/40 hover:text-slate-900"
              >
                Select from File Gallery
              </button>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="inline-flex w-full items-center justify-center rounded-xl bg-[#615FFF] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                {isUploading ? "Uploading..." : "Upload from Computer"}
              </button>
              {previewValue ? (
                <button
                  type="button"
                  onClick={() => {
                    clearLocalPreview();
                    setUrlDraft("");
                    onChange("");
                  }}
                  className="inline-flex w-full items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-600 transition-colors hover:border-rose-300"
                >
                  Remove
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />

        {allowManualUrl ? (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">Or paste image URL</label>
            <div className="space-y-2">
              <input
                type="url"
                value={urlDraft}
                onChange={(event) => setUrlDraft(event.target.value)}
                placeholder="https://example.com/image.jpg"
                className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition-colors focus:border-[#615FFF]"
              />
              <button
                type="button"
                onClick={() => {
                  clearLocalPreview();
                  onChange(urlDraft.trim());
                }}
                className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition-colors hover:border-[#615FFF]/40 hover:text-slate-900"
              >
                Use URL
              </button>
            </div>
          </div>
        ) : null}

        {pickerOpen ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">File Gallery</p>
                <p className="text-xs text-slate-500">Choose an uploaded image from storage.</p>
              </div>
              <button
                type="button"
                onClick={() => setPickerOpen(false)}
                className="text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
              >
                Close
              </button>
            </div>

            {libraryError ? (
              <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                {libraryError}
              </div>
            ) : null}

            {isLoadingLibrary ? (
              <p className="text-sm text-slate-500">Loading gallery...</p>
            ) : libraryImages.length === 0 ? (
              <p className="text-sm text-slate-500">No gallery images found yet.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 xl:grid-cols-6">
                {libraryImages.map((imageUrl) => (
                  <button
                    key={imageUrl}
                    type="button"
                    onClick={() => {
                      clearLocalPreview();
                      setUrlDraft(imageUrl);
                      onChange(imageUrl);
                      setPickerOpen(false);
                    }}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 transition-colors hover:border-[#615FFF]/40"
                  >
                    <div
                      role="img"
                      aria-label={label}
                      className="aspect-square bg-cover bg-center"
                      style={{ backgroundImage: `url("${imageUrl}")` }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ProductForm({
  mode,
  record,
  allowedVendorIds = [],
  canAssignPlatformProducts = true,
  forcedVendorId = null,
  onSave,
}: ProductFormProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const productsIndexHref = pathname.startsWith("/vendor/") ? "/vendor/products" : "/admin/products";
  const messageRef = useRef<HTMLDivElement | null>(null);
  const appliedMediaSelectionRef = useRef<string | null>(null);
  const [values, setValues] = useState<ProductFormValues>(() =>
    getInitialValues(record, allowedVendorIds, canAssignPlatformProducts, forcedVendorId),
  );
  const [brands, setBrands] = useState<ProductBrandOption[]>([]);
  const [categories, setCategories] = useState<ProductCategoryOption[]>([]);
  const [cndsProfiles, setCndsProfiles] = useState<CndsShippingProfileOption[]>([]);
  const [vendors, setVendors] = useState<ProductVendorOption[]>([]);
  const [brandsLoading, setBrandsLoading] = useState(true);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [cndsProfilesLoading, setCndsProfilesLoading] = useState(true);
  const [vendorsLoading, setVendorsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadEditorOptions = async () => {
      const [brandResult, categoryResult, vendorResult] = await Promise.all([
        getProductBrandOptions(),
        getProductCategoryOptions(),
        getProductVendorOptions(),
      ]);

      if (!isMounted) {
        return;
      }

      const activeVendors = vendorResult.data.filter((vendor) => vendor.status !== "suspended");
      const scopedVendors =
        allowedVendorIds.length > 0
          ? activeVendors.filter((vendor) => allowedVendorIds.includes(vendor.id))
          : activeVendors;

      setBrands(brandResult.data);
      setCategories(categoryResult.data);
      setVendors(scopedVendors);
      setBrandsLoading(false);
      setCategoriesLoading(false);
      setVendorsLoading(false);
    };

    void loadEditorOptions();

    return () => {
      isMounted = false;
    };
  }, [allowedVendorIds]);

  useEffect(() => {
    let isMounted = true;

    const loadCndsProfiles = async () => {
      if (!values.vendor_id) {
        if (isMounted) {
          setCndsProfiles([]);
          setCndsProfilesLoading(false);
        }
        return;
      }

      setCndsProfilesLoading(true);
      const result = await getCndsShippingProfilesForVendor(values.vendor_id, { includeInactive: false });

      if (!isMounted) {
        return;
      }

      setCndsProfiles(result.data);
      setCndsProfilesLoading(false);
    };

    void loadCndsProfiles();

    return () => {
      isMounted = false;
    };
  }, [values.vendor_id]);

  useEffect(() => {
    setValues(getInitialValues(record, allowedVendorIds, canAssignPlatformProducts, forcedVendorId));
    setErrorMessage("");
    setIsSubmitting(false);
  }, [allowedVendorIds, canAssignPlatformProducts, forcedVendorId, mode, record]);

  const pageTitle = mode === "create" ? "Add Product" : "Update Product";
  const pageDescription =
    mode === "create"
      ? "Create a marketplace product with single or variable product settings."
      : "Update the product details without affecting storefront checkout or order flows.";

  const totalVariationCount = values.variations.length;
  const totalPricingTierCount = values.pricing_tiers.filter(
    (tier) => tier.min_qty.trim() || tier.max_qty.trim() || tier.price.trim(),
  ).length;
  const totalTierSetCount = values.pricing_tier_sets.filter(
    (tierSet) =>
      tierSet.name.trim() ||
      tierSet.fallback_price.trim() ||
      tierSet.tiers.some((tier) => tier.min_qty.trim() || tier.max_qty.trim() || tier.price.trim()),
  ).length;
  const orderedCategories = useMemo(() => {
    const topLevel = categories
      .filter((category) => !category.parent_id)
      .sort((left, right) => left.name.localeCompare(right.name));

    return topLevel.flatMap((category) => [
      category,
      ...categories
        .filter((child) => child.parent_id === category.id)
        .sort((left, right) => left.name.localeCompare(right.name)),
    ]);
  }, [categories]);

  const availableCndsProfiles = useMemo(() => {
    if (!values.cnds_profile_id || cndsProfiles.some((profile) => profile.id === values.cnds_profile_id)) {
      return cndsProfiles;
    }

    return [
      ...cndsProfiles,
      {
        id: values.cnds_profile_id,
        vendor_id: values.vendor_id || null,
        name: "Current profile (inactive or unavailable)",
        description: null,
        pricing_type: "fixed",
        is_active: false,
        tiers: [],
      } satisfies CndsShippingProfileOption,
    ];
  }, [cndsProfiles, values.cnds_profile_id]);

  useEffect(() => {
    if (!values.cnds_profile_id) {
      return;
    }

    const profileStillAvailable = cndsProfiles.some((profile) => profile.id === values.cnds_profile_id);
    const initialVendorId = forcedVendorId ?? record?.product.vendor_id ?? "";

    if (!profileStillAvailable && (mode === "create" || values.vendor_id !== initialVendorId)) {
      updateField("cnds_profile_id", "");
    }
  }, [cndsProfiles, forcedVendorId, mode, record?.product.vendor_id, values.cnds_profile_id, values.vendor_id]);

  const searchParamsString = searchParams.toString();

  const createMediaLibraryHref = (target: string) => {
    const params = new URLSearchParams();
    params.set("select", "1");
    params.set("target", target);
    params.set("returnTo", pathname + (searchParamsString ? `?${searchParamsString}` : ""));

    return `${pathname.startsWith("/vendor/") ? "/vendor/media" : "/admin/media"}?${params.toString()}`;
  };

  const updateField = <K extends keyof ProductFormValues>(field: K, value: ProductFormValues[K]) => {
    setValues((current) => ({
      ...current,
      [field]: value,
    }));
  };

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleAddGalleryImages = (event: Event) => {
      const customEvent = event as CustomEvent<{ images?: string[] }>;
      const nextImages = (customEvent.detail?.images ?? []).filter((image) => image.trim().length > 0);

      if (nextImages.length === 0) {
        return;
      }

      setValues((current) => ({
        ...current,
        gallery_images: [
          ...current.gallery_images,
          ...nextImages.filter((image) => !current.gallery_images.includes(image)),
        ],
      }));
    };

    const handleRemoveGalleryImage = (event: Event) => {
      const customEvent = event as CustomEvent<{ imageUrl?: string }>;
      const imageUrl = customEvent.detail?.imageUrl?.trim();

      if (!imageUrl) {
        return;
      }

      setValues((current) => ({
        ...current,
        gallery_images: current.gallery_images.filter((currentImage) => currentImage !== imageUrl),
      }));
    };

      const handleSetMainImage = (event: Event) => {
        const customEvent = event as CustomEvent<{ imageUrl?: string | null }>;
        const imageUrl = customEvent.detail?.imageUrl?.trim() ?? "";

        setValues((current) => ({
          ...current,
          image_url: imageUrl,
        }));
      };

      const handleSetPricingState = (event: Event) => {
        const customEvent = event as CustomEvent<{
          pricingType?: ProductPricingType;
          regularPrice?: string;
          discountPrice?: string;
          moq?: string;
          pricingTiers?: PricingBridgeTier[];
          pricingTierSets?: PricingBridgeTierSet[];
        }>;

        setValues((current) => ({
          ...current,
          pricing_type: customEvent.detail?.pricingType ?? current.pricing_type,
          regular_price: customEvent.detail?.regularPrice ?? current.regular_price,
          discount_price: customEvent.detail?.discountPrice ?? current.discount_price,
          moq: customEvent.detail?.moq ?? current.moq,
          pricing_tiers:
            customEvent.detail?.pricingTiers?.map((tier) => ({
              id: tier.id,
              min_qty: tier.min_qty,
              max_qty: tier.max_qty,
              price: tier.price,
            })) ?? current.pricing_tiers,
          pricing_tier_sets:
            customEvent.detail?.pricingTierSets?.map((tierSet) => ({
              id: tierSet.id,
              name: tierSet.name,
              fallback_price: tierSet.fallback_price,
              pricing_type: tierSet.pricing_type,
              tiers: tierSet.tiers.map((tier) => ({
                id: tier.id,
                min_qty: tier.min_qty,
                max_qty: tier.max_qty,
                price: tier.price,
              })),
            })) ?? current.pricing_tier_sets,
        }));
      };

      const handleSetAttributesState = (event: Event) => {
        const customEvent = event as CustomEvent<{
          attributes?: AttributeBridgeAttribute[];
        }>;

        const nextAttributes =
          customEvent.detail?.attributes?.map((attribute) => ({
            id: attribute.id,
            name: attribute.name,
            values: attribute.values,
          })) ?? null;

        if (!nextAttributes) {
          return;
        }

        setValues((current) => ({
          ...current,
          attributes: nextAttributes,
        }));
        setErrorMessage("");
      };

      const handleSetProductTypeFromBridge = (event: Event) => {
        const customEvent = event as CustomEvent<{
          productType?: "single" | "variable";
        }>;

        const nextProductType = customEvent.detail?.productType;

        if (!nextProductType) {
          return;
        }

        setValues((current) => ({
          ...current,
          product_type: nextProductType,
        }));
        setErrorMessage("");
      };

      const handleSetStatusFromBridge = (event: Event) => {
        const customEvent = event as CustomEvent<{
          status?: ProductStatus;
        }>;

        const nextStatus = customEvent.detail?.status;

        if (!nextStatus) {
          return;
        }

        setValues((current) => ({
          ...current,
          status: nextStatus,
        }));
        setErrorMessage("");
      };

      const handleSetProductNameFromBridge = (event: Event) => {
        const customEvent = event as CustomEvent<{
          name?: string;
        }>;

        if (typeof customEvent.detail?.name !== "string") {
          return;
        }

        setValues((current) => ({
          ...current,
          name: customEvent.detail?.name ?? "",
        }));
        setErrorMessage("");
      };

      const handleAddAttributeFromBridge = () => {
        setValues((current) => ({
          ...current,
          attributes:
            current.product_type === "single"
              ? current.attributes.length > 0
                ? current.attributes
                : [createEmptyAttribute()]
              : [...current.attributes, createEmptyAttribute()],
        }));
        setErrorMessage("");
      };

      const handleGenerateVariationsFromBridge = (event: Event) => {
        const customEvent = event as CustomEvent<{
          attributes?: AttributeBridgeAttribute[];
        }>;

        const nextAttributes =
          customEvent.detail?.attributes?.map((attribute) => ({
            id: attribute.id,
            name: attribute.name,
            values: attribute.values,
          })) ?? [];

        const result = buildGeneratedVariationsFromAttributes(
          nextAttributes,
          values.variations,
          values.pricing_tier_sets,
          values.moq,
        );

        if (result.error) {
          setErrorMessage(result.error);
          return;
        }

        setValues((current) => ({
          ...current,
          attributes: nextAttributes,
          variations: result.variations,
        }));
        setErrorMessage("");
      };

      const handleRemoveVariationFromBridge = (event: Event) => {
        const customEvent = event as CustomEvent<{
          variationId?: string;
        }>;

        const variationId = customEvent.detail?.variationId?.trim();

        if (!variationId) {
          return;
        }

        setValues((current) => ({
          ...current,
          variations: current.variations.filter((variation) => variation.id !== variationId),
        }));
        setErrorMessage("");
      };

      const handleSetVariationImageFromBridge = (event: Event) => {
        const customEvent = event as CustomEvent<{
          variationId?: string;
          imageUrl?: string;
        }>;

        const variationId = customEvent.detail?.variationId?.trim();

        if (!variationId) {
          return;
        }

        setValues((current) => ({
          ...current,
          variations: current.variations.map((variation) =>
            variation.id === variationId
              ? { ...variation, image_url: customEvent.detail?.imageUrl?.trim() ?? "" }
              : variation,
          ),
        }));
        setErrorMessage("");
      };

      window.addEventListener("prelize:add-gallery-images", handleAddGalleryImages as EventListener);
      window.addEventListener("prelize:remove-gallery-image", handleRemoveGalleryImage as EventListener);
      window.addEventListener("prelize:set-main-image", handleSetMainImage as EventListener);
      window.addEventListener("prelize:set-pricing-state", handleSetPricingState as EventListener);
      window.addEventListener("prelize:set-attributes-state", handleSetAttributesState as EventListener);
      window.addEventListener("prelize:set-product-type", handleSetProductTypeFromBridge as EventListener);
      window.addEventListener("prelize:set-product-status", handleSetStatusFromBridge as EventListener);
      window.addEventListener("prelize:set-product-name", handleSetProductNameFromBridge as EventListener);
      window.addEventListener("prelize:add-attribute", handleAddAttributeFromBridge as EventListener);
      window.addEventListener("prelize:generate-variations", handleGenerateVariationsFromBridge as EventListener);
      window.addEventListener("prelize:remove-variation", handleRemoveVariationFromBridge as EventListener);
      window.addEventListener("prelize:set-variation-image", handleSetVariationImageFromBridge as EventListener);

      return () => {
        window.removeEventListener("prelize:add-gallery-images", handleAddGalleryImages as EventListener);
        window.removeEventListener("prelize:remove-gallery-image", handleRemoveGalleryImage as EventListener);
        window.removeEventListener("prelize:set-main-image", handleSetMainImage as EventListener);
        window.removeEventListener("prelize:set-pricing-state", handleSetPricingState as EventListener);
        window.removeEventListener("prelize:set-attributes-state", handleSetAttributesState as EventListener);
        window.removeEventListener("prelize:set-product-type", handleSetProductTypeFromBridge as EventListener);
        window.removeEventListener("prelize:set-product-status", handleSetStatusFromBridge as EventListener);
        window.removeEventListener("prelize:set-product-name", handleSetProductNameFromBridge as EventListener);
        window.removeEventListener("prelize:add-attribute", handleAddAttributeFromBridge as EventListener);
        window.removeEventListener("prelize:generate-variations", handleGenerateVariationsFromBridge as EventListener);
        window.removeEventListener("prelize:remove-variation", handleRemoveVariationFromBridge as EventListener);
        window.removeEventListener("prelize:set-variation-image", handleSetVariationImageFromBridge as EventListener);
      };
  }, [values.moq, values.pricing_tier_sets, values.variations]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.dispatchEvent(
      new CustomEvent("prelize:media-state-updated", {
        detail: {
          mainImage: values.image_url,
          galleryImages: values.gallery_images,
        },
      }),
    );
  }, [values.gallery_images, values.image_url]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.dispatchEvent(
      new CustomEvent("prelize:pricing-state-updated", {
        detail: {
          pricingType: values.pricing_type,
          regularPrice: values.regular_price,
          discountPrice: values.discount_price,
          moq: values.moq,
          pricingTiers: values.pricing_tiers.map((tier) => ({
            id: tier.id,
            min_qty: tier.min_qty,
            max_qty: tier.max_qty,
            price: tier.price,
          })),
          pricingTierSets: values.pricing_tier_sets.map((tierSet) => ({
            id: tierSet.id,
            name: tierSet.name,
            fallback_price: tierSet.fallback_price,
            pricing_type: tierSet.pricing_type,
            tiers: tierSet.tiers.map((tier) => ({
              id: tier.id,
              min_qty: tier.min_qty,
              max_qty: tier.max_qty,
              price: tier.price,
            })),
          })),
        },
      }),
    );
  }, [
    values.discount_price,
    values.moq,
    values.pricing_tier_sets,
    values.pricing_tiers,
    values.pricing_type,
    values.regular_price,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.dispatchEvent(
      new CustomEvent("prelize:variations-state-updated", {
        detail: {
          variations: buildVariationBridgeState(values.variations),
        },
      }),
    );
  }, [values.product_type, values.variations]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.dispatchEvent(
      new CustomEvent("prelize:attributes-state-updated", {
        detail: {
          attributes: buildAttributeBridgeState(values.attributes),
        },
      }),
    );
  }, [values.attributes]);

  const handleAttributeChange = (id: string, field: keyof ProductAttributeFormValue, value: string) => {
    setValues((current) => ({
      ...current,
      attributes: current.attributes.map((attribute) =>
        attribute.id === id ? { ...attribute, [field]: value } : attribute,
      ),
    }));
  };

  const handleVariationChange = (id: string, field: keyof ProductVariationFormValue, value: string) => {
    setValues((current) => ({
      ...current,
      variations: current.variations.map((variation) =>
        variation.id === id ? { ...variation, [field]: value } : variation,
      ),
    }));
  };

  const handleSpecificationChange = (
    id: string,
    field: keyof ProductSpecificationFormValue,
    value: string,
  ) => {
    setValues((current) => ({
      ...current,
      specifications: current.specifications.map((specification) =>
        specification.id === id ? { ...specification, [field]: value } : specification,
      ),
    }));
  };

  const handlePricingTierChange = (
    id: string,
    field: keyof Omit<ProductPricingTierFormValue, "id">,
    value: string,
  ) => {
    setValues((current) => ({
      ...current,
      pricing_tiers: current.pricing_tiers.map((tier) => (tier.id === id ? { ...tier, [field]: value } : tier)),
    }));
  };

  const addAttribute = () => {
    setValues((current) => ({
      ...current,
      attributes:
        current.product_type === "single"
          ? current.attributes.length > 0
            ? current.attributes
            : [createEmptyAttribute()]
          : [...current.attributes, createEmptyAttribute()],
    }));
  };

  const removeAttribute = (id: string) => {
    setValues((current) => ({
      ...current,
      attributes:
        current.attributes.length > 1
          ? current.attributes.filter((attribute) => attribute.id !== id)
          : [createEmptyAttribute()],
    }));
  };

  const addVariation = () => {
    setValues((current) => ({
      ...current,
      variations: [
        ...current.variations,
        {
          ...createEmptyVariation(),
          pricing_tier_set_id: current.pricing_tier_sets[0]?.id ?? "",
        },
      ],
    }));
  };

  const removeVariation = (id: string) => {
    setValues((current) => ({
      ...current,
      variations: current.variations.filter((variation) => variation.id !== id),
    }));
  };

  const addSpecification = () => {
    setValues((current) => ({
      ...current,
      specifications: [...current.specifications, createEmptySpecification()],
    }));
  };

  const removeSpecification = (id: string) => {
    setValues((current) => ({
      ...current,
      specifications:
        current.specifications.length > 1
          ? current.specifications.filter((specification) => specification.id !== id)
          : [createEmptySpecification()],
    }));
  };

  const addPricingTier = () => {
    setValues((current) => ({
      ...current,
      pricing_tiers: [...current.pricing_tiers, createEmptyPricingTier()],
    }));
  };

  const removePricingTier = (id: string) => {
    setValues((current) => ({
      ...current,
      pricing_tiers: current.pricing_tiers.filter((tier) => tier.id !== id),
    }));
  };

  const handlePricingTierSetChange = (
    id: string,
    field: keyof Omit<ProductPricingTierSetFormValue, "id" | "tiers">,
    value: string,
  ) => {
    setValues((current) => ({
      ...current,
      pricing_tier_sets: current.pricing_tier_sets.map((tierSet) =>
        tierSet.id === id ? { ...tierSet, [field]: value } : tierSet,
      ),
    }));
  };

  const handlePricingTierSetTierChange = (
    tierSetId: string,
    tierId: string,
    field: keyof Omit<ProductPricingTierFormValue, "id">,
    value: string,
  ) => {
    setValues((current) => ({
      ...current,
      pricing_tier_sets: current.pricing_tier_sets.map((tierSet) =>
        tierSet.id === tierSetId
          ? {
              ...tierSet,
              tiers: tierSet.tiers.map((tier) => (tier.id === tierId ? { ...tier, [field]: value } : tier)),
            }
          : tierSet,
      ),
    }));
  };

  const addPricingTierSet = () => {
    const nextTierSet = createEmptyPricingTierSet();

    setValues((current) => ({
      ...current,
      pricing_tier_sets: [...current.pricing_tier_sets, nextTierSet],
      variations: current.variations.map((variation) =>
        variation.pricing_tier_set_id ? variation : { ...variation, pricing_tier_set_id: nextTierSet.id },
      ),
    }));
  };

  const removePricingTierSet = (id: string) => {
    setValues((current) => {
      const nextTierSets =
        current.pricing_tier_sets.length > 1
          ? current.pricing_tier_sets.filter((tierSet) => tierSet.id !== id)
          : [createEmptyPricingTierSet()];
      const fallbackTierSetId = nextTierSets[0]?.id ?? "";

      return {
        ...current,
        pricing_tier_sets: nextTierSets,
        variations: current.variations.map((variation) => ({
          ...variation,
          pricing_tier_set_id:
            variation.pricing_tier_set_id === id
              ? fallbackTierSetId
              : variation.pricing_tier_set_id || fallbackTierSetId,
        })),
      };
    });
  };

  const addPricingTierToSet = (tierSetId: string) => {
    setValues((current) => ({
      ...current,
      pricing_tier_sets: current.pricing_tier_sets.map((tierSet) =>
        tierSet.id === tierSetId
          ? {
              ...tierSet,
              tiers: [...tierSet.tiers, createEmptyPricingTier()],
            }
          : tierSet,
      ),
    }));
  };

  const removePricingTierFromSet = (tierSetId: string, tierId: string) => {
    setValues((current) => ({
      ...current,
      pricing_tier_sets: current.pricing_tier_sets.map((tierSet) =>
        tierSet.id === tierSetId
          ? {
              ...tierSet,
              tiers:
                tierSet.tiers.length > 1
                  ? tierSet.tiers.filter((tier) => tier.id !== tierId)
                  : [createEmptyPricingTier()],
            }
          : tierSet,
      ),
    }));
  };

  const generateVariations = () => {
    const result = buildGeneratedVariationsFromAttributes(
      values.attributes,
      values.variations,
      values.pricing_tier_sets,
      values.moq,
    );

    if (result.error) {
      setErrorMessage(result.error);
      return;
    }

    setValues((current) => ({
      ...current,
      variations: result.variations,
    }));
    setErrorMessage("");
  };

  const validateForm = () => {
    const payload = applyForcedVendorId(buildProductPayload(values), forcedVendorId);

    if (!payload.name) {
      return "Product name is required.";
    }

    if (!payload.slug) {
      return "Slug is required.";
    }

    if (!payload.product_type) {
      return "Product type is required.";
    }

    if (!canAssignPlatformProducts) {
      if (!payload.vendor_id) {
        return "No vendor account found for this product form.";
      }

      if (allowedVendorIds.length > 0 && !allowedVendorIds.includes(payload.vendor_id)) {
        return "This product cannot be assigned outside your vendor account.";
      }
    }

    if (payload.product_type === "single") {
      if (parseNumber(values.regular_price) === null || (parseNumber(values.regular_price) ?? 0) <= 0) {
        return "Regular price is required for a single product.";
      }

      if ((parseNumber(values.moq) ?? 0) <= 0) {
        return "MOQ must be greater than zero.";
      }
    }

    if (payload.product_type === "variable") {
      if (values.variations.length === 0) {
        return "At least one variation is required for a variable product.";
      }

      if (values.pricing_tier_sets.length === 0) {
        return "Add at least one pricing tier set for a variable product.";
      }

      for (const variation of values.variations) {
        if (!variation.name.trim()) {
          return "Each variation must have a name.";
        }

        if (!variation.pricing_tier_set_id.trim()) {
          return "Each variation must select a pricing tier set.";
        }
      }

      for (const tierSet of values.pricing_tier_sets) {
        if (!tierSet.name.trim()) {
          return "Each pricing tier set needs a name.";
        }

        if ((parseNumber(tierSet.fallback_price) ?? -1) < 0) {
          return "Each pricing tier set needs a valid fallback price.";
        }

        for (const tier of tierSet.tiers) {
          const isEmpty = !tier.min_qty.trim() && !tier.max_qty.trim() && !tier.price.trim();

          if (isEmpty) {
            continue;
          }

          const minQty = parseNumber(tier.min_qty);
          const maxQty = parseNumber(tier.max_qty);
          const price = parseNumber(tier.price);

          if (minQty === null || minQty < 1) {
            return "Each pricing tier needs a minimum quantity of at least 1.";
          }

          if (maxQty !== null && maxQty < minQty) {
            return "Pricing tier maximum quantity must be greater than or equal to the minimum quantity.";
          }

          if (price === null || price < 0) {
            return "Each pricing tier needs a valid price.";
          }
        }
      }
    } else {
      for (const tier of values.pricing_tiers) {
        const isEmpty = !tier.min_qty.trim() && !tier.max_qty.trim() && !tier.price.trim();

        if (isEmpty) {
          continue;
        }

        const minQty = parseNumber(tier.min_qty);
        const maxQty = parseNumber(tier.max_qty);
        const price = parseNumber(tier.price);

        if (minQty === null || minQty < 1) {
          return "Each pricing tier needs a minimum quantity of at least 1.";
        }

        if (maxQty !== null && maxQty < minQty) {
          return "Pricing tier maximum quantity must be greater than or equal to the minimum quantity.";
        }

        if (price === null || price < 0) {
          return "Each pricing tier needs a valid price.";
        }
      }
    }

    return null;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");

    const validationError = validateForm();

    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    const submittedStatus = resolveSubmittedStatus(values.status);
    const submitValues =
      submittedStatus === values.status
        ? values
        : {
            ...values,
            status: submittedStatus,
          };

    const savePayload: ProductEditorSavePayload = {
      product: applyForcedVendorId(buildProductPayload(submitValues), forcedVendorId),
      variants: submitValues.product_type === "variable" ? buildVariantPayloads(submitValues) : [],
      pricing_tiers: submitValues.product_type === "single" ? buildPricingTierPayloads(submitValues) : [],
      pricing_tier_sets: submitValues.product_type === "variable" ? buildPricingTierSetPayloads(submitValues) : [],
    };

    setIsSubmitting(true);

    try {
      const result =
        onSave
          ? await onSave(mode, savePayload, record?.product.id ?? null)
          : mode === "create"
            ? await createProductEditorRecord(savePayload)
            : await updateProductEditorRecord(record?.product.id ?? "", savePayload);

      if (result.error) {
        setErrorMessage(result.error.message);
        return;
      }

      const successStatus = mode === "create" ? "created" : "updated";
      router.push(`${productsIndexHref}?status=${successStatus}`);
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to save the product right now.");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (!errorMessage || !messageRef.current) {
      return;
    }

    messageRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [errorMessage]);

  useEffect(() => {
    const mediaUrl = searchParams.get("mediaUrl");
    const mediaTarget = searchParams.get("mediaTarget");
    const selectionKey = mediaUrl && mediaTarget ? `${mediaTarget}::${mediaUrl}` : null;

    if (!mediaUrl || !mediaTarget || appliedMediaSelectionRef.current === selectionKey) {
      return;
    }

    appliedMediaSelectionRef.current = selectionKey;

    queueMicrotask(() => {
      if (mediaTarget === "main-image") {
        updateField("image_url", mediaUrl);
      } else if (mediaTarget === "gallery") {
        setValues((current) => ({
          ...current,
          gallery_images: current.gallery_images.includes(mediaUrl)
            ? current.gallery_images
            : [...current.gallery_images, mediaUrl],
        }));
      } else if (mediaTarget.startsWith("variation:")) {
        const variationId = mediaTarget.replace("variation:", "");

        setValues((current) => ({
          ...current,
          variations: current.variations.map((variation) =>
            variation.id === variationId ? { ...variation, image_url: mediaUrl } : variation,
          ),
        }));
      }

      const nextParams = new URLSearchParams(searchParamsString);
      nextParams.delete("mediaUrl");
      nextParams.delete("mediaTarget");
      const nextQuery = nextParams.toString();

      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
    });
  }, [pathname, router, searchParams, searchParamsString]);

  return (
    <form id="product-editor-form" noValidate onSubmit={handleSubmit} className="space-y-6">
      {errorMessage ? (
        <div
          ref={messageRef}
          className="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-600 shadow-sm"
        >
          {errorMessage}
        </div>
      ) : null}

      <div hidden className="hidden" aria-hidden="true">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#615FFF]">Product Editor</p>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{pageTitle}</h1>
              <p className="text-sm text-slate-500">{pageDescription}</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <ProductStatusBadge status={values.status} />
              <button
                type="button"
                onClick={() => router.push(productsIndexHref)}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:border-[#615FFF]/40 hover:text-slate-900"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <div hidden className="hidden" aria-hidden="true">
            <CardSection title="Basic Information" description="Set the core product identity, ownership, and marketplace shipping profile.">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <TextField
                    id="product-name"
                    label="Product Name"
                    value={values.name}
                    onChange={(value) => updateField("name", value)}
                    placeholder="Premium wholesale product name"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="product-vendor" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Assign Vendor
                  </label>
                  <select
                    id="product-vendor"
                    value={values.vendor_id}
                    onChange={(event) => updateField("vendor_id", event.target.value)}
                    disabled={!canAssignPlatformProducts}
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition-colors focus:border-[#615FFF]"
                  >
                    {canAssignPlatformProducts ? (
                      <option value="">{vendorsLoading ? "Loading vendors..." : "Platform-managed product"}</option>
                    ) : null}
                    {vendors.map((vendor) => (
                      <option key={vendor.id} value={vendor.id}>
                        {vendor.name}
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    {canAssignPlatformProducts
                      ? "Leave this empty for marketplace-managed products, or assign ownership to a vendor now."
                      : "This product is locked to your current vendor account."}
                  </p>
                </div>

                <div>
                  <label htmlFor="product-weight" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Weight (Optional)
                  </label>
                  <input
                    id="product-weight"
                    type="text"
                    value={values.weight}
                    onChange={(event) => updateField("weight", event.target.value)}
                    placeholder="0.5"
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition-colors focus:border-[#615FFF]"
                  />
                </div>

              </div>
            </CardSection>
          </div>

          <div hidden className="hidden" aria-hidden="true">
            <CardSection title="Product Setup" description="Choose whether this product uses one simple price or multiple generated variations.">
              <div className="grid gap-3 md:grid-cols-2">
                {(["single", "variable"] as const).map((type) => {
                  const isSelected = values.product_type === type;
                  const label = type === "single" ? "Single Product" : "Variable Product";
                  const description =
                    type === "single"
                      ? "Use one regular price, discount price, and MOQ."
                      : "Use attributes and multiple generated variations.";

                  return (
                    <label
                      key={type}
                      className={`cursor-pointer rounded-2xl border p-4 transition-colors ${
                        isSelected
                          ? "border-[#615FFF]/40 bg-[#615FFF]/5"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="product_type"
                          checked={isSelected}
                          onChange={() => updateField("product_type", type)}
                          className="mt-1 h-4 w-4 border-slate-300 text-[#615FFF] focus:ring-[#615FFF]"
                        />
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{label}</p>
                          <p className="mt-1 text-sm text-slate-500">{description}</p>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </CardSection>
          </div>

          <div hidden className="hidden" aria-hidden="true">
            <CardSection
              title="Product Pricing Tiers"
              description="Set pricing, fallback values, and MOQ without changing the existing pricing logic."
            >
              {values.product_type === "single" ? (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <NumberField
                      id="product-regular-price"
                      label="Regular Price / Fallback Price"
                      value={values.regular_price}
                      onChange={(value) => updateField("regular_price", value)}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      required
                    />
                    <NumberField
                      id="product-discount-price"
                      label="Discount Price"
                      value={values.discount_price}
                      onChange={(value) => updateField("discount_price", value)}
                      placeholder="Optional"
                      min="0"
                      step="0.01"
                    />
                    <NumberField
                      id="product-moq"
                      label="MOQ"
                      value={values.moq}
                      onChange={(value) => updateField("moq", value)}
                      placeholder="10"
                      min="1"
                      step="1"
                      required
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-[minmax(0,260px)_auto] md:items-end">
                    <div>
                      <label htmlFor="product-pricing-type" className="mb-1.5 block text-sm font-medium text-slate-700">
                        Pricing Type
                      </label>
                      <select
                        id="product-pricing-type"
                        value={values.pricing_type}
                        onChange={(event) => updateField("pricing_type", event.target.value as ProductPricingType)}
                        className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition-colors focus:border-[#615FFF]"
                      >
                        <option value="unit">Unit Pricing</option>
                        <option value="fixed">Fixed Range Pricing</option>
                      </select>
                    </div>

                    <div className="flex justify-start md:justify-end">
                      <button
                        type="button"
                        onClick={addPricingTier}
                        className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:border-[#615FFF]/40 hover:text-slate-900"
                      >
                        Add Tier
                      </button>
                    </div>
                  </div>

                  {values.pricing_tiers.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                      No pricing tiers yet. Add a tier to apply quantity-based pricing for this product.
                    </div>
                  ) : (
                    values.pricing_tiers.map((tier, index) => (
                      <div key={tier.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                        <div className="mb-4 flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">Tier {index + 1}</p>
                            <p className="mt-1 text-xs text-slate-500">
                              {values.pricing_type === "fixed"
                                ? "Fixed total applies when this product quantity matches the tier."
                                : "Unit price applies when this product quantity matches the tier."}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removePricingTier(tier.id)}
                            className="text-sm font-medium text-rose-600 transition-colors hover:text-rose-700"
                          >
                            Remove Tier
                          </button>
                        </div>

                        <div className="grid gap-4 md:grid-cols-3">
                          <NumberField
                            id={`pricing-tier-min-${tier.id}`}
                            label="Min Qty"
                            value={tier.min_qty}
                            onChange={(value) => handlePricingTierChange(tier.id, "min_qty", value)}
                            placeholder="1"
                            min="1"
                            step="1"
                            required
                          />
                          <NumberField
                            id={`pricing-tier-max-${tier.id}`}
                            label="Max Qty"
                            value={tier.max_qty}
                            onChange={(value) => handlePricingTierChange(tier.id, "max_qty", value)}
                            placeholder="Optional"
                            min="1"
                            step="1"
                          />
                          <NumberField
                            id={`pricing-tier-price-${tier.id}`}
                            label="Price"
                            value={tier.price}
                            onChange={(value) => handlePricingTierChange(tier.id, "price", value)}
                            placeholder="0.00"
                            min="0"
                            step="0.01"
                            required
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-[minmax(0,220px)_minmax(0,220px)_auto] md:items-end">
                      <NumberField
                        id="product-moq"
                        label="MOQ"
                        value={values.moq}
                        onChange={(value) => updateField("moq", value)}
                        placeholder="10"
                        min="1"
                        step="1"
                        required
                      />
                      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                        Variation prices come from the selected tier set. No extra fallback input is needed on the variation row.
                      </div>
                      <div className="flex justify-start md:justify-end">
                        <button
                          type="button"
                          onClick={addPricingTierSet}
                          className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:border-[#615FFF]/40 hover:text-slate-900"
                        >
                          Add Tier Set
                        </button>
                      </div>
                    </div>

                    {values.pricing_tier_sets.map((tierSet, tierSetIndex) => (
                      <div key={tierSet.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                        <div className="mb-4 flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">Tier Set {tierSetIndex + 1}</p>
                            <p className="mt-1 text-xs text-slate-500">
                              Assign this set to one or more variations that share the same quantity pricing rules.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removePricingTierSet(tierSet.id)}
                            className="text-sm font-medium text-rose-600 transition-colors hover:text-rose-700"
                          >
                            Remove Tier Set
                          </button>
                        </div>

                        <div className="grid gap-4 md:grid-cols-3">
                          <TextField
                            id={`tier-set-name-${tierSet.id}`}
                            label="Tier Set Name"
                            value={tierSet.name}
                            onChange={(value) => handlePricingTierSetChange(tierSet.id, "name", value)}
                            placeholder="Standard Flower Pricing"
                          />
                          <NumberField
                            id={`tier-set-fallback-${tierSet.id}`}
                            label="Fallback Price"
                            value={tierSet.fallback_price}
                            onChange={(value) => handlePricingTierSetChange(tierSet.id, "fallback_price", value)}
                            placeholder="0.00"
                            min="0"
                            step="0.01"
                          />
                          <div>
                            <label htmlFor={`tier-set-type-${tierSet.id}`} className="mb-1.5 block text-sm font-medium text-slate-700">
                              Pricing Type
                            </label>
                            <select
                              id={`tier-set-type-${tierSet.id}`}
                              value={tierSet.pricing_type}
                              onChange={(event) =>
                                handlePricingTierSetChange(tierSet.id, "pricing_type", event.target.value as ProductPricingType)
                              }
                              className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition-colors focus:border-[#615FFF]"
                            >
                              <option value="unit">Unit Pricing</option>
                              <option value="fixed">Fixed Range Pricing</option>
                            </select>
                          </div>
                        </div>

                        <div className="mt-4 flex justify-end">
                          <button
                            type="button"
                            onClick={() => addPricingTierToSet(tierSet.id)}
                            className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:border-[#615FFF]/40 hover:text-slate-900"
                          >
                            Add Tier
                          </button>
                        </div>

                        <div className="mt-4 space-y-3">
                          {tierSet.tiers.map((tier, index) => (
                            <div key={tier.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                              <div className="mb-4 flex items-center justify-between gap-3">
                                <div>
                                  <p className="text-sm font-semibold text-slate-900">Tier {index + 1}</p>
                                  <p className="mt-1 text-xs text-slate-500">
                                    {tierSet.pricing_type === "fixed"
                                      ? "Fixed total applies when this variation quantity matches the tier."
                                      : "Unit price applies when this variation quantity matches the tier."}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removePricingTierFromSet(tierSet.id, tier.id)}
                                  className="text-sm font-medium text-rose-600 transition-colors hover:text-rose-700"
                                >
                                  Remove Tier
                                </button>
                              </div>

                              <div className="grid gap-4 md:grid-cols-3">
                                <NumberField
                                  id={`tier-set-${tierSet.id}-min-${tier.id}`}
                                  label="Min Qty"
                                  value={tier.min_qty}
                                  onChange={(value) => handlePricingTierSetTierChange(tierSet.id, tier.id, "min_qty", value)}
                                  placeholder="1"
                                  min="1"
                                  step="1"
                                  required
                                />
                                <NumberField
                                  id={`tier-set-${tierSet.id}-max-${tier.id}`}
                                  label="Max Qty"
                                  value={tier.max_qty}
                                  onChange={(value) => handlePricingTierSetTierChange(tierSet.id, tier.id, "max_qty", value)}
                                  placeholder="Optional"
                                  min="1"
                                  step="1"
                                />
                                <NumberField
                                  id={`tier-set-${tierSet.id}-price-${tier.id}`}
                                  label="Price"
                                  value={tier.price}
                                  onChange={(value) => handlePricingTierSetTierChange(tierSet.id, tier.id, "price", value)}
                                  placeholder="0.00"
                                  min="0"
                                  step="0.01"
                                  required
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardSection>
          </div>

          <div hidden className="hidden" aria-hidden="true">
                <CardSection title="Attributes" description="Add one or more attributes like Color or Size, then generate variations from them.">
                  <div id="product-attributes-section" className="space-y-4">
                    {values.attributes.map((attribute, index) => (
                      <div
                        key={attribute.id}
                        data-product-attribute-row="true"
                        data-product-attribute-id={attribute.id}
                        data-product-attribute-index={index}
                        className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
                      >
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-slate-900">Attribute {index + 1}</p>
                          <button
                            data-product-attribute-remove="true"
                            data-product-attribute-remove-id={attribute.id}
                            type="button"
                            onClick={() => removeAttribute(attribute.id)}
                            className="text-sm font-medium text-rose-600 transition-colors hover:text-rose-700"
                          >
                            Remove Attribute
                          </button>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          <TextField
                            id={`attribute-name-${attribute.id}`}
                            label="Attribute Name"
                            value={attribute.name}
                            onChange={(value) => handleAttributeChange(attribute.id, "name", value)}
                            placeholder="Color, Size"
                          />
                          <div>
                            <label
                              htmlFor={`attribute-values-${attribute.id}`}
                              className="mb-1.5 block text-sm font-medium text-slate-700"
                            >
                              Attribute Values
                            </label>
                            <textarea
                              id={`attribute-values-${attribute.id}`}
                              value={attribute.values}
                              onChange={(event) => handleAttributeChange(attribute.id, "values", event.target.value)}
                              placeholder="Red, Blue, Black"
                              className="min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 outline-none transition-colors focus:border-[#615FFF]"
                            />
                          </div>
                        </div>
                      </div>
                    ))}

                    <div className="flex flex-wrap gap-3">
                      <button
                        id="product-attributes-add"
                        data-product-attributes-add="true"
                        type="button"
                        onClick={addAttribute}
                        className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:border-[#615FFF]/40 hover:text-slate-900"
                      >
                        Add Attribute
                      </button>
                      <button
                        id="product-attributes-generate"
                        data-product-attributes-generate="true"
                        type="button"
                        onClick={generateVariations}
                        className="inline-flex items-center justify-center rounded-xl bg-[#615FFF] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                      >
                        Generate Variations Automatically
                      </button>
                    </div>
                  </div>
                </CardSection>
          </div>

          <div hidden className="hidden" aria-hidden="true">
            {values.product_type === "variable" ? (
              <>
                <CardSection title="Variations" description="Create variations manually or generate them from the attributes above.">
                  <div id="product-variations-section" className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm text-slate-500">{totalVariationCount} variation(s) ready</p>
                      <button
                        id="product-variations-add"
                        type="button"
                        onClick={addVariation}
                        className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:border-[#615FFF]/40 hover:text-slate-900"
                      >
                        Add Variation Manually
                      </button>
                    </div>

                    {values.variations.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                        No variations yet. Add one manually or generate them from attributes.
                      </div>
                    ) : (
                      values.variations.map((variation, index) => (
                        <div
                          key={variation.id}
                          data-product-variation-row="true"
                          data-product-variation-id={variation.id}
                          data-product-variation-index={index}
                          data-product-variation-image={variation.image_url}
                          data-product-variation-summary={
                            Object.entries(variation.attribute_values)
                              .map(([key, value]) => `${key}: ${value}`)
                              .join(" | ")
                          }
                          className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
                        >
                          <div className="mb-4 flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">Variation {index + 1}</p>
                              {Object.keys(variation.attribute_values).length > 0 ? (
                                <p className="mt-1 text-xs text-slate-500">
                                  {Object.entries(variation.attribute_values)
                                    .map(([key, value]) => `${key}: ${value}`)
                                    .join(" | ")}
                                </p>
                              ) : null}
                            </div>
                            <button
                              data-product-variation-remove="true"
                              data-product-variation-remove-id={variation.id}
                              type="button"
                              onClick={() => removeVariation(variation.id)}
                              className="text-sm font-medium text-rose-600 transition-colors hover:text-rose-700"
                            >
                              Remove Variation
                            </button>
                          </div>

                          <div className="grid gap-4 md:grid-cols-2">
                            <TextField
                              id={`variation-name-${variation.id}`}
                              label="Variation Name"
                              value={variation.name}
                              onChange={(value) => handleVariationChange(variation.id, "name", value)}
                              placeholder="Red / M"
                              required
                            />
                            <div>
                              <label htmlFor={`variation-tier-set-${variation.id}`} className="mb-1.5 block text-sm font-medium text-slate-700">
                                Pricing Tier Set
                              </label>
                              <select
                                id={`variation-tier-set-${variation.id}`}
                                value={variation.pricing_tier_set_id}
                                onChange={(event) => handleVariationChange(variation.id, "pricing_tier_set_id", event.target.value)}
                                className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition-colors focus:border-[#615FFF]"
                              >
                                <option value="">Select tier set</option>
                                {values.pricing_tier_sets.map((tierSet) => (
                                  <option key={tierSet.id} value={tierSet.id}>
                                    {tierSet.name.trim() || "Untitled Tier Set"}
                                  </option>
                                ))}
                              </select>
                              <p className="mt-2 text-xs leading-5 text-slate-500">
                                This variation will use the selected tier set and its own fallback price.
                              </p>
                            </div>
                            <div className="grid gap-4 sm:grid-cols-3">
                              <NumberField
                                id={`variation-moq-${variation.id}`}
                                label="MOQ"
                                value={variation.moq}
                                onChange={(value) => handleVariationChange(variation.id, "moq", value)}
                                placeholder="1"
                                min="1"
                                step="1"
                                required
                              />
                              <NumberField
                                id={`variation-stock-${variation.id}`}
                                label="Stock"
                                value={variation.stock}
                                onChange={(value) => handleVariationChange(variation.id, "stock", value)}
                                placeholder="0"
                                min="0"
                                step="1"
                              />
                            </div>

                            <div className="md:col-span-2">
                              <MediaField
                                label="Variation Image"
                                value={variation.image_url}
                                onChange={(value) => handleVariationChange(variation.id, "image_url", value)}
                                helperText="Select from file gallery or upload from computer."
                                libraryHref={createMediaLibraryHref(`variation:${variation.id}`)}
                                vendorId={forcedVendorId}
                              />
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardSection>

              </>
            ) : null}
          </div>
        </div>

        <aside className="space-y-6">
          <div hidden className="hidden" aria-hidden="true">
            <div id="product-status-section" className="space-y-3">
              {(["active", "disabled", "draft"] as const).map((status) => {
                const selected = values.status === status;

                return (
                  <label key={status}>
                    <input
                      type="radio"
                      name="status"
                      data-product-status-option={status}
                      checked={selected}
                      onChange={() => updateField("status", status)}
                    />
                  </label>
                );
              })}
            </div>
          </div>

          <div hidden className="hidden" aria-hidden="true">
              <div className="space-y-5">
                <input
                  id="product-sku"
                  type="text"
                  value={values.sku}
                  onChange={(event) => updateField("sku", event.target.value)}
                  className="hidden"
                />

                <div>
                  <label htmlFor="product-brand" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Brand
                  </label>
                  <select
                    id="product-brand"
                    value={values.brand_id}
                    onChange={(event) => updateField("brand_id", event.target.value)}
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition-colors focus:border-[#615FFF]"
                  >
                    <option value="">{brandsLoading ? "Loading brands..." : "Non Brand"}</option>
                    {brands.map((brand) => (
                      <option key={brand.id} value={brand.id}>
                        {brand.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="product-category" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Select Category
                  </label>
                  <select
                    id="product-category"
                    value={values.category_id}
                    onChange={(event) => updateField("category_id", event.target.value)}
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition-colors focus:border-[#615FFF]"
                  >
                    <option value="">{categoriesLoading ? "Loading categories..." : "Select category"}</option>
                    {orderedCategories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.parent_id ? `- ${category.name}` : category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div
                  id="product-main-image-section"
                  data-product-main-image={values.image_url}
                  className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3"
                />

                <select
                  id="product-cnds-shipping-profile"
                  value={values.cnds_profile_id}
                  onChange={(event) => updateField("cnds_profile_id", event.target.value)}
                  className="hidden"
                >
                  <option value="">
                    {cndsProfilesLoading ? "Loading CNDS profiles..." : "No CNDS profile selected"}
                  </option>
                  {availableCndsProfiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.name} ({profile.pricing_type === "unit" ? "Per Unit" : "Fixed"})
                    </option>
                  ))}
                </select>

                <div id="product-gallery-section" className="space-y-2">
                  {values.gallery_images.map((image, index) => (
                    <div
                      key={`gallery-image-bridge-${index}`}
                      data-product-gallery-row="true"
                      data-product-gallery-index={index}
                      data-product-gallery-image={image}
                    />
                  ))}
                </div>
              </div>
            </div>

          <div hidden className="hidden" aria-hidden="true">
            <CardSection title="Specifications" description="Add simple key-value details for technical or marketplace reference information.">
              <div id="product-specifications-section" className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-slate-500">{values.specifications.length} specification row(s)</p>
                  <button
                    id="product-specifications-add"
                    data-product-spec-add="true"
                    type="button"
                    onClick={addSpecification}
                    className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-[#615FFF]/40 hover:text-slate-900"
                  >
                  Add Spec
                </button>
              </div>

              <div className="space-y-3">
                  {values.specifications.map((specification, index) => (
                    <div
                      key={specification.id}
                      data-product-spec-row="true"
                      data-product-spec-id={specification.id}
                      data-product-spec-index={index}
                      className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
                    >
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-900">Specification {index + 1}</p>
                        <button
                          data-product-spec-remove="true"
                          data-product-spec-remove-id={specification.id}
                          type="button"
                          onClick={() => removeSpecification(specification.id)}
                          className="text-sm font-medium text-rose-600 transition-colors hover:text-rose-700"
                        >
                        Remove
                      </button>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <TextField
                        id={`product-spec-label-${specification.id}`}
                        label="Label"
                        value={specification.label}
                        onChange={(value) => handleSpecificationChange(specification.id, "label", value)}
                        placeholder="Material, Origin, Packaging"
                      />
                      <TextField
                        id={`product-spec-value-${specification.id}`}
                        label="Value"
                        value={specification.value}
                        onChange={(value) => handleSpecificationChange(specification.id, "value", value)}
                        placeholder="Cotton, China, 12 pcs per carton"
                      />
                    </div>
                  </div>
                ))}
                </div>
              </div>
            </CardSection>
          </div>

          <div className="hidden" aria-hidden="true">
            <CardSection title="Quick Summary" description="A quick overview before you save the product.">
              <div className="space-y-3 text-sm text-slate-600">
                <div className="flex items-center justify-between gap-3">
                  <span>Product Type</span>
                  <span className="font-semibold text-slate-900">
                    {values.product_type === "single" ? "Single Product" : "Variable Product"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Vendor</span>
                  <span className="font-semibold text-slate-900">
                    {vendors.find((vendor) => vendor.id === values.vendor_id)?.name ?? "Platform-managed"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Category</span>
                  <span className="font-semibold text-slate-900">
                    {categories.find((category) => category.id === values.category_id)?.name ?? "Not selected"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Brand</span>
                  <span className="font-semibold text-slate-900">
                    {brands.find((brand) => brand.id === values.brand_id)?.name ?? "Non Brand"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Gallery Images</span>
                  <span className="font-semibold text-slate-900">
                    {values.gallery_images.filter(Boolean).length}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Specifications</span>
                  <span className="font-semibold text-slate-900">
                    {
                      values.specifications.filter(
                        (specification) =>
                          specification.label.trim().length > 0 || specification.value.trim().length > 0,
                      ).length
                    }
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Variations</span>
                  <span className="font-semibold text-slate-900">{totalVariationCount}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>{values.product_type === "single" ? "Pricing Tiers" : "Tier Sets"}</span>
                  <span className="font-semibold text-slate-900">
                    {values.product_type === "single" ? totalPricingTierCount : totalTierSetCount}
                  </span>
                </div>
                {values.product_type === "single" ? (
                  <div className="flex items-center justify-between gap-3">
                    <span>Pricing Type</span>
                    <span className="font-semibold capitalize text-slate-900">{values.pricing_type}</span>
                  </div>
                ) : null}
                <div className="flex items-center justify-between gap-3">
                  <span>CNDS Shipping Profile</span>
                  <span className="font-semibold text-slate-900">
                    {availableCndsProfiles.find((profile) => profile.id === values.cnds_profile_id)?.name ??
                      "Not selected"}
                  </span>
                </div>
              </div>
            </CardSection>
          </div>
        </aside>
      </div>
    </form>
  );
}

export default ProductForm;
