"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  createProductEditorRecord,
  getEffectivePrice,
  updateProductEditorRecord,
  type ProductEditorSavePayload,
  type ProductVariantUpsertPayload,
} from "@/lib/products/actions";
import { getCndsShippingProfilesForVendor } from "@/lib/cnds/queries";
import { listProductMedia, uploadProductMedia } from "@/lib/media/storage";
import { getProductCategoryOptions, getProductVendorOptions } from "@/lib/products/queries";
import type {
  CndsShippingProfileOption,
  ProductAttribute,
  ProductAttributeFormValue,
  ProductCategoryOption,
  ProductEditorRecord,
  ProductFormValues,
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

function createEmptyVariation(): ProductVariationFormValue {
  return {
    id: createId("variation"),
    name: "",
    regular_price: "",
    discount_price: "",
    moq: "1",
    image_url: "",
    attribute_values: {},
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
    .split(/[\n,]/)
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

function getInitialValues(
  record?: ProductEditorRecord | null,
  allowedVendorIds: string[] = [],
  canAssignPlatformProducts = true,
  forcedVendorId?: string | null,
): ProductFormValues {
  const product = record?.product;
  const isVariable = (product?.product_type ?? (record?.variants.length ? "variable" : "single")) === "variable";
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
    name: product?.name ?? "",
    slug: product?.slug ?? "",
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
    attributes: inferAttributesFromVariants(record),
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
    variations:
      record?.variants.map((variant) => ({
        id: variant.id,
        name: variant.name,
        regular_price: variant.regular_price !== null ? String(variant.regular_price) : String(variant.price),
        discount_price: variant.discount_price !== null ? String(variant.discount_price) : "",
        moq: String(variant.moq),
        image_url: variant.image_url ?? "",
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

function normalizeVendorId(value: string) {
  return normalizeOptionalUuid(value);
}

function normalizeCndsProfileId(value: string) {
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
    name: trimmedName,
    slug: fallbackSlug,
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
  };
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
  return values.variations.map((variation) => {
    const regularPrice = parseNumber(variation.regular_price) ?? 0;
    const discountPrice = parseNumber(variation.discount_price);
    const moq = parseNumber(variation.moq) ?? 1;

    return {
      name: variation.name.trim(),
      regular_price: regularPrice,
      discount_price: discountPrice,
      price: getEffectivePrice(regularPrice, discountPrice),
      moq,
      image_url: normalizeOptionalText(variation.image_url),
      attribute_values: variation.attribute_values,
    };
  });
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
  allowManualUrl = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  helperText?: string;
  libraryHref?: string;
  vendorId?: string | null;
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
  const [categories, setCategories] = useState<ProductCategoryOption[]>([]);
  const [cndsProfiles, setCndsProfiles] = useState<CndsShippingProfileOption[]>([]);
  const [vendors, setVendors] = useState<ProductVendorOption[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [cndsProfilesLoading, setCndsProfilesLoading] = useState(true);
  const [vendorsLoading, setVendorsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadEditorOptions = async () => {
      const [categoryResult, vendorResult] = await Promise.all([
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

      setCategories(categoryResult.data);
      setVendors(scopedVendors);
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

  const addAttribute = () => {
    setValues((current) => ({
      ...current,
      attributes: [...current.attributes, createEmptyAttribute()],
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
      variations: [...current.variations, createEmptyVariation()],
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

  const generateVariations = () => {
    const nextParsedAttributes = parseAttributesForGeneration(values.attributes);

    if (nextParsedAttributes.length === 0) {
      setErrorMessage("Add at least one attribute with values before generating variations.");
      return;
    }

    const combinations = cartesianProduct(nextParsedAttributes.map((attribute) => attribute.values));
    const existingBySignature = new Map(
      values.variations.map((variation) => [buildVariationSignature(variation.attribute_values), variation]),
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
        moq: values.moq || "1",
        image_url: "",
        attribute_values: attributeValues,
      };
    });

    const manualVariations = values.variations.filter(
      (variation) => Object.keys(variation.attribute_values).length === 0 && variation.name.trim().length > 0,
    );

    setValues((current) => ({
      ...current,
      variations: [...generatedVariations, ...manualVariations],
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

      for (const variation of values.variations) {
        if (!variation.name.trim()) {
          return "Each variation must have a name.";
        }

        if (parseNumber(variation.regular_price) === null || (parseNumber(variation.regular_price) ?? 0) <= 0) {
          return "Each variation must have a valid regular price.";
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

    const savePayload: ProductEditorSavePayload = {
      product: applyForcedVendorId(buildProductPayload(values), forcedVendorId),
      variants: values.product_type === "variable" ? buildVariantPayloads(values) : [],
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
    <form onSubmit={handleSubmit} className="space-y-6">
      {errorMessage ? (
        <div
          ref={messageRef}
          className="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-600 shadow-sm"
        >
          {errorMessage}
        </div>
      ) : null}

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
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center rounded-2xl bg-[#615FFF] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting
                  ? "Saving Product..."
                  : mode === "create"
                    ? values.status === "draft"
                      ? "Save Draft"
                      : values.status === "disabled"
                        ? "Archive Product"
                        : "Publish Product"
                    : "Update Product"}
              </button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <CardSection title="Basic Product Information" description="Set the core product details and media just like a WooCommerce-style product editor.">
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

              <div className="md:col-span-2">
                <label
                  htmlFor="product-cnds-shipping-profile"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  CNDS Shipping Profile
                </label>
                <select
                  id="product-cnds-shipping-profile"
                  value={values.cnds_profile_id}
                  onChange={(event) => updateField("cnds_profile_id", event.target.value)}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition-colors focus:border-[#615FFF]"
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
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  Assign an active CNDS shipping profile now. This only stores the profile on the product and does not
                  change checkout calculations yet.
                </p>
              </div>
            </div>
          </CardSection>

          <CardSection title="Product Type Selector" description="Choose whether this product uses one simple price or multiple generated variations.">
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

          {values.product_type === "single" ? (
            <CardSection title="Single Product Pricing" description="Set the pricing rules for a simple product.">
              <div className="grid gap-4 md:grid-cols-3">
                <NumberField
                  id="single-regular-price"
                  label="Regular Price"
                  value={values.regular_price}
                  onChange={(value) => updateField("regular_price", value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  required
                />
                <NumberField
                  id="single-discount-price"
                  label="Discount Price"
                  value={values.discount_price}
                  onChange={(value) => updateField("discount_price", value)}
                  placeholder="Optional"
                  min="0"
                  step="0.01"
                />
                <NumberField
                  id="single-moq"
                  label="MOQ"
                  value={values.moq}
                  onChange={(value) => updateField("moq", value)}
                  placeholder="10"
                  min="1"
                  step="1"
                  required
                />
              </div>
            </CardSection>
          ) : null}

          {values.product_type === "variable" ? (
            <>
              <CardSection title="Attributes Section" description="Add one or more attributes like Color or Size, then generate variations from them.">
                <div className="space-y-4">
                  {values.attributes.map((attribute, index) => (
                    <div key={attribute.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-slate-900">Attribute {index + 1}</p>
                        <button
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
                      type="button"
                      onClick={addAttribute}
                      className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:border-[#615FFF]/40 hover:text-slate-900"
                    >
                      Add Attribute
                    </button>
                    <button
                      type="button"
                      onClick={generateVariations}
                      className="inline-flex items-center justify-center rounded-xl bg-[#615FFF] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                    >
                      Generate Variations Automatically
                    </button>
                  </div>
                </div>
              </CardSection>

              <CardSection title="Variations Section" description="Create variations manually or generate them from the attributes above.">
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-slate-500">{totalVariationCount} variation(s) ready</p>
                    <button
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
                      <div key={variation.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
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
                          <div className="grid gap-4 sm:grid-cols-3">
                            <NumberField
                              id={`variation-price-${variation.id}`}
                              label="Regular Price"
                              value={variation.regular_price}
                              onChange={(value) => handleVariationChange(variation.id, "regular_price", value)}
                              placeholder="0.00"
                              min="0"
                              step="0.01"
                              required
                            />
                            <NumberField
                              id={`variation-discount-${variation.id}`}
                              label="Discount Price"
                              value={variation.discount_price}
                              onChange={(value) => handleVariationChange(variation.id, "discount_price", value)}
                              placeholder="Optional"
                              min="0"
                              step="0.01"
                            />
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

        <aside className="space-y-6">
          <CardSection title="Product Status" description="Control how the product appears in admin and how it should be treated for publishing.">
            <div className="space-y-3">
              {(["active", "disabled", "draft"] as const).map((status) => {
                const selected = values.status === status;
                const label =
                  status === "active" ? "Published" : status === "disabled" ? "Archived" : "Draft";

                return (
                  <label
                    key={status}
                    className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 transition-colors ${
                      selected ? "border-[#615FFF]/40 bg-[#615FFF]/5" : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="status"
                      checked={selected}
                      onChange={() => updateField("status", status)}
                      className="h-4 w-4 border-slate-300 text-[#615FFF] focus:ring-[#615FFF]"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-900">{label}</p>
                      <p className="text-xs text-slate-500">
                        {status === "active"
                          ? "Published and ready for storefront or marketplace use."
                          : status === "draft"
                            ? "Saved as draft for later completion."
                            : "Archived and hidden from normal active product workflows."}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          </CardSection>

          <CardSection title="Product Media" description="Manage category, main image, and gallery from a compact sidebar workflow.">
            <div className="space-y-5">
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

              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Main Image</p>
                    <p className="text-xs text-slate-500">Primary 1:1 image for the product.</p>
                  </div>
                  {values.image_url ? (
                    <div
                      role="img"
                      aria-label="Main product image preview"
                      className="h-14 w-14 shrink-0 rounded-2xl border border-slate-200 bg-slate-100 bg-cover bg-center"
                      style={{ backgroundImage: `url("${values.image_url}")` }}
                    />
                  ) : (
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white text-[10px] font-medium text-slate-400">
                      Empty
                    </div>
                  )}
                </div>

                <MediaField
                  label="Main Image Upload"
                  value={values.image_url}
                  onChange={(value) => updateField("image_url", value)}
                  helperText="Select from file gallery or upload from computer."
                  libraryHref={createMediaLibraryHref("main-image")}
                  vendorId={forcedVendorId}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Gallery Images</p>
                    <p className="text-xs text-slate-500">
                      {values.gallery_images.filter(Boolean).length} image(s) added
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateField("gallery_images", [...values.gallery_images, ""])}
                    className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-[#615FFF]/40 hover:text-slate-900"
                  >
                    Add Image
                  </button>
                </div>

                {values.gallery_images.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-center text-sm text-slate-500">
                    No gallery images added yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {values.gallery_images.map((image, index) => (
                      <details
                        key={`gallery-image-${index}`}
                        className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
                        open={index === values.gallery_images.length - 1}
                      >
                        <summary className="flex cursor-pointer list-none items-center gap-3 px-3 py-3">
                          {image ? (
                            <div
                              role="img"
                              aria-label={`Gallery image ${index + 1}`}
                              className="h-12 w-12 shrink-0 rounded-xl border border-slate-200 bg-slate-100 bg-cover bg-center"
                              style={{ backgroundImage: `url("${image}")` }}
                            />
                          ) : (
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-[10px] font-medium text-slate-400">
                              Empty
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-slate-800">Gallery Image {index + 1}</p>
                            <p className="truncate text-xs text-slate-500">
                              {image ? "Image selected" : "No image selected yet"}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              updateField(
                                "gallery_images",
                                values.gallery_images.filter((_, imageIndex) => imageIndex !== index),
                              );
                            }}
                            className="inline-flex items-center justify-center rounded-lg px-2 py-1 text-xs font-medium text-rose-600 transition-colors hover:bg-rose-50 hover:text-rose-700"
                          >
                            Remove
                          </button>
                        </summary>

                        <div className="border-t border-slate-200 p-3">
                          <MediaField
                            label={`Gallery Image ${index + 1}`}
                            value={image}
                            onChange={(nextValue) =>
                              updateField(
                                "gallery_images",
                                values.gallery_images.map((currentImage, imageIndex) =>
                                  imageIndex === index ? nextValue : currentImage,
                                ),
                              )
                            }
                            helperText="Select from file gallery or upload from computer."
                            libraryHref={createMediaLibraryHref("gallery")}
                            vendorId={forcedVendorId}
                          />
                        </div>
                      </details>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardSection>

          <CardSection title="Product Specifications" description="Add simple key-value details for technical or marketplace reference information.">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-slate-500">{values.specifications.length} specification row(s)</p>
                <button
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
                    className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
                  >
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-900">Specification {index + 1}</p>
                      <button
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
                <span>CNDS Shipping Profile</span>
                <span className="font-semibold text-slate-900">
                  {availableCndsProfiles.find((profile) => profile.id === values.cnds_profile_id)?.name ??
                    "Not selected"}
                </span>
              </div>
            </div>
          </CardSection>
        </aside>
      </div>
    </form>
  );
}

export default ProductForm;
