"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import type {
  ImportedPriceTier,
  ImportedProductMappedData,
  ImportedVariant,
  ProductImportReviewPayload,
  ProductImportSaveAction,
  ProductImportOverwriteKey,
} from "@/types/product-import";

type ReviewValues = ImportedProductMappedData & {
  title: string;
  category_id: string;
  brand_id: string;
  vendor_id: string;
  price: string;
  sale_price: string;
  status: "draft" | "active";
  tags_text: string;
  main_images_text: string;
};

type EditablePriceTier = {
  id: string;
  min_quantity: string;
  max_quantity: string;
  unit_price: string;
};

type EditableVariant = {
  id: string;
  sku: string;
  name: string;
  value: string;
  price: string;
  moq: string;
  stock_quantity: string;
  image_url: string;
  attributes: Record<string, string>;
};

type AiField = "title" | "short_description" | "full_description" | "seo_title" | "seo_description" | "tags" | "all";

const DEFAULT_OPEN_PRICING_TIER_MAX_QTY = 9999;

const OVERWRITE_OPTIONS: Array<{ key: ProductImportOverwriteKey; label: string }> = [
  { key: "title", label: "Overwrite title" },
  { key: "short_description", label: "Overwrite short description" },
  { key: "full_description", label: "Overwrite full description" },
  { key: "images", label: "Overwrite images" },
  { key: "price_tiers", label: "Overwrite price tiers" },
  { key: "shipping_cost", label: "Overwrite domestic shipping" },
  { key: "sku_variants", label: "Overwrite SKU/variants" },
  { key: "tags", label: "Overwrite tags" },
  { key: "category", label: "Overwrite category" },
  { key: "seo", label: "Overwrite SEO data" },
];

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 90);
}

function toReviewValues(mapped: ImportedProductMappedData): ReviewValues {
  return {
    ...mapped,
    title: mapped.clean_title,
    category_id: "",
    brand_id: "",
    vendor_id: "",
    price: String(mapped.price_tiers[0]?.unit_price ?? ""),
    sale_price: "",
    status: "draft",
    tags_text: mapped.tags.join(", "),
    main_images_text: mapped.main_images.join("\n"),
  };
}

function toEditablePriceTiers(priceTiers: ImportedPriceTier[]): EditablePriceTier[] {
  const rows = priceTiers.length > 0 ? priceTiers : [{ min_quantity: 1, max_quantity: null, unit_price: 0, currency: "CNY" as const }];

  return rows.map((tier) => ({
    id: createId("tier"),
    min_quantity: String(tier.min_quantity),
    max_quantity: tier.max_quantity === null ? "" : String(tier.max_quantity),
    unit_price: String(tier.unit_price),
  }));
}

function getFallbackTierPrice(mapped: ImportedProductMappedData) {
  const variantPrices = mapped.variants
    .map((variant) => variant.price)
    .filter((price): price is number => typeof price === "number" && Number.isFinite(price) && price > 0);

  return variantPrices.length > 0 ? Math.min(...variantPrices) : 0;
}

function getInitialEditablePriceTiers(mapped: ImportedProductMappedData): EditablePriceTier[] {
  if (mapped.price_tiers.length > 0) {
    return toEditablePriceTiers(mapped.price_tiers);
  }

  return toEditablePriceTiers([
    {
      min_quantity: mapped.moq,
      max_quantity: null,
      unit_price: getFallbackTierPrice(mapped),
      currency: "CNY",
    },
  ]);
}

function toEditableVariants(variants: ImportedVariant[]): EditableVariant[] {
  return variants.map((variant) => ({
    id: createId("variant"),
    sku: variant.sku ?? "",
    name: variant.name,
    value: variant.value ?? "",
    price: variant.price === null ? "" : String(variant.price),
    moq: variant.moq === null ? "" : String(variant.moq),
    stock_quantity: variant.stock_quantity === null ? "" : String(variant.stock_quantity),
    image_url: variant.image_url ?? "",
    attributes: variant.attributes,
  }));
}

function toImportedPriceTiers(rows: EditablePriceTier[]): ImportedPriceTier[] {
  const normalizedRows = rows
    .map((row) => ({
      min_quantity: Math.max(1, Math.floor(Number(row.min_quantity) || 1)),
      max_quantity: row.max_quantity.trim() ? Math.max(1, Math.floor(Number(row.max_quantity) || 1)) : null,
      unit_price: Math.max(0, Number(row.unit_price) || 0),
      currency: "CNY" as const,
    }))
    .filter((row) => row.unit_price > 0);

  return normalizedRows.map((row, index) => {
    const nextMinQuantity = normalizedRows[index + 1]?.min_quantity;
    const autoMaxQuantity = nextMinQuantity
      ? Math.max(row.min_quantity, nextMinQuantity - 1)
      : DEFAULT_OPEN_PRICING_TIER_MAX_QTY;

    return {
      ...row,
      max_quantity: row.max_quantity ?? autoMaxQuantity,
    };
  });
}

function toImportedVariants(rows: EditableVariant[], fallbackMoq: number): ImportedVariant[] {
  return rows.map((row) => ({
    sku: row.sku.trim() || null,
    name: row.name.trim() || row.value.trim() || "Variant",
    value: row.value.trim() || null,
    price: row.price.trim() ? Number(row.price) : null,
    moq: row.moq.trim() ? Number(row.moq) : fallbackMoq,
    stock_quantity: row.stock_quantity.trim() ? Number(row.stock_quantity) : null,
    image_url: row.image_url.trim() || null,
    attributes: row.attributes,
  }));
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <div className="border-b border-gray-100 px-5 py-5 sm:px-6">
        <h3 className="text-base font-medium text-gray-800">{title}</h3>
      </div>
      <div className="space-y-6 p-5 sm:p-6">{children}</div>
    </div>
  );
}

function AiButton({
  field,
  activeField,
  onClick,
}: {
  field: AiField;
  activeField: AiField | null;
  onClick: (field: AiField) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(field)}
      disabled={activeField !== null}
      className="inline-flex h-8 items-center justify-center rounded-lg border border-[#615FFF]/30 bg-white px-3 text-xs font-semibold text-[#615FFF] transition-colors hover:bg-[#615FFF]/5 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {activeField === field ? "AI..." : "AI"}
    </button>
  );
}

function TextField({
  id,
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  aiField,
  activeAiField,
  onAi,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  aiField?: AiField;
  activeAiField?: AiField | null;
  onAi?: (field: AiField) => void;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <label htmlFor={id} className="block text-sm font-medium text-gray-700">
          {label}
        </label>
        {aiField && onAi ? <AiButton field={aiField} activeField={activeAiField ?? null} onClick={onAi} /> : null}
      </div>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-sm placeholder:text-gray-400 outline-none transition-colors focus:border-[#615FFF]/40 focus:ring-4 focus:ring-[#615FFF]/10"
      />
    </div>
  );
}

function TextArea({
  id,
  label,
  value,
  onChange,
  rows = 4,
  aiField,
  activeAiField,
  onAi,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  aiField?: AiField;
  activeAiField?: AiField | null;
  onAi?: (field: AiField) => void;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <label htmlFor={id} className="block text-sm font-medium text-gray-700">
          {label}
        </label>
        {aiField && onAi ? <AiButton field={aiField} activeField={activeAiField ?? null} onClick={onAi} /> : null}
      </div>
      <textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-sm placeholder:text-gray-400 outline-none transition-colors focus:border-[#615FFF]/40 focus:ring-4 focus:ring-[#615FFF]/10"
      />
    </div>
  );
}

export default function AdminImport1688ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [review, setReview] = useState<ProductImportReviewPayload | null>(null);
  const [values, setValues] = useState<ReviewValues | null>(null);
  const [priceTiers, setPriceTiers] = useState<EditablePriceTier[]>([]);
  const [variants, setVariants] = useState<EditableVariant[]>([]);
  const [overwrite, setOverwrite] = useState<Partial<Record<ProductImportOverwriteKey, boolean>>>({
    title: true,
    short_description: true,
    full_description: true,
    images: true,
    price_tiers: true,
    shipping_cost: true,
    sku_variants: true,
    tags: true,
    category: true,
    seo: true,
  });
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [aiMessage, setAiMessage] = useState("");
  const [activeAiField, setActiveAiField] = useState<AiField | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<ProductImportSaveAction | "cancel" | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadReview = async () => {
      const response = await fetch(`/api/admin/products/import-1688/${id}`, { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as {
        data?: ProductImportReviewPayload;
        error?: string;
      } | null;

      if (!isMounted) {
        return;
      }

      if (!response.ok || !payload?.data) {
        setErrorMessage(payload?.error ?? "Unable to load the import review.");
        setLoading(false);
        return;
      }

      setReview(payload.data);
      setValues(toReviewValues(payload.data.mapped_data));
      setPriceTiers(getInitialEditablePriceTiers(payload.data.mapped_data));
      setVariants(toEditableVariants(payload.data.mapped_data.variants));
      setLoading(false);
    };

    void loadReview();

    return () => {
      isMounted = false;
    };
  }, [id]);

  const sourceErrors = useMemo(() => {
    if (!review?.errors || !Array.isArray(review.errors)) {
      return [];
    }

    return review.errors.filter((item): item is string => typeof item === "string");
  }, [review?.errors]);

  const updateValue = <K extends keyof ReviewValues>(key: K, value: ReviewValues[K]) => {
    setValues((current) => (current ? { ...current, [key]: value } : current));
  };

  const applyAiResult = (field: AiField, data: Record<string, unknown>) => {
    setValues((current) => {
      if (!current) {
        return current;
      }

      const nextValues = { ...current };
      const title = typeof data.title === "string" ? data.title.trim() : "";
      const slug = typeof data.slug === "string" ? data.slug.trim() : "";
      const shortDescription = typeof data.short_description === "string" ? data.short_description.trim() : "";
      const fullDescription = typeof data.full_description === "string" ? data.full_description.trim() : "";
      const seoTitle = typeof data.seo_title === "string" ? data.seo_title.trim() : "";
      const seoDescription = typeof data.seo_description === "string" ? data.seo_description.trim() : "";
      const tags = Array.isArray(data.tags) ? data.tags.filter((tag): tag is string => typeof tag === "string") : [];

      if ((field === "title" || field === "all") && title) {
        nextValues.title = title;
        nextValues.slug = slug || slugify(title) || nextValues.slug;
      }

      if ((field === "short_description" || field === "all") && shortDescription) {
        nextValues.short_description = shortDescription;
      }

      if ((field === "full_description" || field === "all") && fullDescription) {
        nextValues.full_description = fullDescription;
      }

      if ((field === "seo_title" || field === "all") && seoTitle) {
        nextValues.seo_title = seoTitle;
      }

      if ((field === "seo_description" || field === "all") && seoDescription) {
        nextValues.seo_description = seoDescription;
      }

      if ((field === "tags" || field === "all") && tags.length > 0) {
        nextValues.tags_text = tags.join(", ");
      }

      return nextValues;
    });
  };

  const runAi = async (field: AiField) => {
    if (!values || !review) {
      return;
    }

    setActiveAiField(field);
    setAiMessage("");
    setErrorMessage("");

    try {
      const response = await fetch("/api/admin/products/import-1688/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: field,
          values: {
            title: values.title,
            short_description: values.short_description,
            full_description: values.full_description,
            seo_title: values.seo_title,
            seo_description: values.seo_description,
            tags: values.tags_text,
          },
          source: {
            original_title: review.mapped_data.original_title,
            supplier_name: review.mapped_data.supplier_name,
            supplier_location: review.mapped_data.supplier_location,
            specifications: review.mapped_data.specifications,
            price_tiers: toImportedPriceTiers(priceTiers),
            variants: toImportedVariants(variants, values.moq),
          },
        }),
      });
      const payload = (await response.json().catch(() => null)) as {
        data?: Record<string, unknown>;
        error?: string;
      } | null;

      if (!response.ok || !payload?.data) {
        setAiMessage(payload?.error ?? "AI content generation failed.");
        return;
      }

      applyAiResult(field, payload.data);
      setAiMessage("AI content updated. Review before saving.");
    } catch (error) {
      setAiMessage(error instanceof Error ? error.message : "AI content generation failed.");
    } finally {
      setActiveAiField(null);
    }
  };

  const submitReview = async (action: ProductImportSaveAction) => {
    if (!values || !review) {
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");
    setIsSubmitting(action);

    try {
      const importedPriceTiers = toImportedPriceTiers(priceTiers);
      const importedVariants = toImportedVariants(variants, values.moq);
      const mainImages = values.main_images_text
        .split(/\r?\n/)
        .map((image) => image.trim())
        .filter(Boolean);

      const response = await fetch(`/api/admin/products/import-1688/${id}/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          fields: {
            ...values,
            clean_title: values.title,
            title: values.title,
            category_id: values.category_id || null,
            brand_id: values.brand_id || null,
            vendor_id: values.vendor_id || null,
            price: values.price ? Number(values.price) : importedPriceTiers[0]?.unit_price ?? null,
            sale_price: values.sale_price ? Number(values.sale_price) : null,
            status: action === "publish" ? "active" : values.status,
            price_tiers: importedPriceTiers,
            variants: importedVariants,
            tags: values.tags_text
              .split(",")
              .map((tag) => tag.trim())
              .filter(Boolean),
            main_images: mainImages,
            estimated_international_shipping_cost: null,
          },
          overwrite,
        }),
      });
      const payload = (await response.json().catch(() => null)) as {
        data?: { productId: string };
        error?: string;
      } | null;

      if (!response.ok || !payload?.data?.productId) {
        setErrorMessage(payload?.error ?? "Database save error.");
        return;
      }

      setSuccessMessage("Product import saved successfully.");
      router.push(`/admin/products?status=${action === "update" ? "updated" : "created"}`);
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Database save error.");
    } finally {
      setIsSubmitting(null);
    }
  };

  const cancelImport = async () => {
    setErrorMessage("");
    setIsSubmitting("cancel");

    try {
      const response = await fetch(`/api/admin/products/import-1688/${id}/cancel`, { method: "POST" });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        setErrorMessage(payload?.error ?? "Unable to cancel import.");
        return;
      }

      router.push("/admin/products");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to cancel import.");
    } finally {
      setIsSubmitting(null);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
        Loading...
      </div>
    );
  }

  if (!review || !values) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Import review unavailable</h1>
        <p className="mt-3 text-sm font-medium text-rose-600">{errorMessage || "Import record not found."}</p>
        <Link href="/admin/products" className="mt-6 inline-flex items-center justify-center rounded-xl bg-[#615FFF] px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90">
          Back to Products
        </Link>
      </div>
    );
  }

  const isUpdateMode = review.import_mode === "update";
  const mainImages = values.main_images_text.split(/\r?\n/).map((image) => image.trim()).filter(Boolean);

  return (
    <section className="w-full space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white">
        <div className="flex flex-col gap-4 border-b border-gray-100 px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-base font-medium text-gray-800">Review Imported Product</h3>
            <p className="mt-1 text-sm text-gray-500">
              Imported from {review.source_offer_id}. Review all AI and source data before saving.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void runAi("all")}
            disabled={activeAiField !== null}
            className="inline-flex items-center justify-center rounded-lg bg-[#615FFF] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {activeAiField === "all" ? "AI Updating..." : "AI Fill All"}
          </button>
        </div>

        {successMessage ? (
          <div className="border-b border-emerald-100 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-700 sm:px-6">
            {successMessage}
          </div>
        ) : null}

        {errorMessage ? (
          <div className="border-b border-rose-100 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-600 sm:px-6">
            {errorMessage}
          </div>
        ) : null}

        {aiMessage ? (
          <div className="border-b border-amber-100 bg-amber-50 px-5 py-4 text-sm font-medium text-amber-700 sm:px-6">
            {aiMessage}
          </div>
        ) : null}

        {sourceErrors.length > 0 ? (
          <div className="border-b border-amber-100 bg-amber-50 px-5 py-4 text-sm font-medium text-amber-700 sm:px-6">
            {sourceErrors.join(" ")}
          </div>
        ) : null}

        <div className="space-y-6 p-5 sm:p-6">
          <SectionCard title="Product Content">
            <div className="grid gap-6 xl:grid-cols-2">
              <TextField id="title" label="Title" value={values.title} onChange={(value) => updateValue("title", value)} aiField="title" activeAiField={activeAiField} onAi={runAi} />
              <TextField id="slug" label="Slug" value={values.slug} onChange={(value) => updateValue("slug", value)} />
              <TextField id="sku" label="SKU" value={values.sku} onChange={(value) => updateValue("sku", value)} />
              <TextField id="moq" label="MOQ" value={String(values.moq)} onChange={(value) => updateValue("moq", Math.max(1, Number(value) || 1))} type="number" />
            </div>

            <div className="grid gap-6 xl:grid-cols-3">
              <div>
                <label htmlFor="category" className="mb-1.5 block text-sm font-medium text-gray-700">
                  Category
                </label>
                <select id="category" value={values.category_id} onChange={(event) => updateValue("category_id", event.target.value)} className="h-11 w-full rounded-lg border border-gray-300 bg-white px-4 text-sm text-gray-800 shadow-sm outline-none transition-colors focus:border-[#615FFF]/40 focus:ring-4 focus:ring-[#615FFF]/10">
                  <option value="">Select category</option>
                  {review.product_options.categories.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="brand" className="mb-1.5 block text-sm font-medium text-gray-700">
                  Brand
                </label>
                <select id="brand" value={values.brand_id} onChange={(event) => updateValue("brand_id", event.target.value)} className="h-11 w-full rounded-lg border border-gray-300 bg-white px-4 text-sm text-gray-800 shadow-sm outline-none transition-colors focus:border-[#615FFF]/40 focus:ring-4 focus:ring-[#615FFF]/10">
                  <option value="">Select brand</option>
                  {review.product_options.brands.map((brand) => (
                    <option key={brand.id} value={brand.id}>{brand.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="vendor" className="mb-1.5 block text-sm font-medium text-gray-700">
                  Vendor
                </label>
                <select id="vendor" value={values.vendor_id} onChange={(event) => updateValue("vendor_id", event.target.value)} className="h-11 w-full rounded-lg border border-gray-300 bg-white px-4 text-sm text-gray-800 shadow-sm outline-none transition-colors focus:border-[#615FFF]/40 focus:ring-4 focus:ring-[#615FFF]/10">
                  <option value="">Platform</option>
                  {review.product_options.vendors.map((vendor) => (
                    <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <TextArea id="short-description" label="Short Description" value={values.short_description} onChange={(value) => updateValue("short_description", value)} rows={3} aiField="short_description" activeAiField={activeAiField} onAi={runAi} />
            <TextArea id="full-description" label="Description" value={values.full_description} onChange={(value) => updateValue("full_description", value)} rows={8} aiField="full_description" activeAiField={activeAiField} onAi={runAi} />
          </SectionCard>

          <SectionCard title="SEO">
            <div className="grid gap-6 xl:grid-cols-2">
              <TextField id="seo-title" label="SEO Title" value={values.seo_title} onChange={(value) => updateValue("seo_title", value)} aiField="seo_title" activeAiField={activeAiField} onAi={runAi} />
              <TextField id="seo-description" label="SEO Description" value={values.seo_description} onChange={(value) => updateValue("seo_description", value)} aiField="seo_description" activeAiField={activeAiField} onAi={runAi} />
            </div>
            <TextField id="tags" label="Tags" value={values.tags_text} onChange={(value) => updateValue("tags_text", value)} aiField="tags" activeAiField={activeAiField} onAi={runAi} />
          </SectionCard>

          <SectionCard title="Pricing Tiers">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-gray-800">Variable Product Tier Set</p>
                <p className="mt-1 text-sm text-gray-500">These rows create one pricing tier set and every imported SKU/variant will use it.</p>
              </div>
              <button
                type="button"
                onClick={() => setPriceTiers((current) => [...current, { id: createId("tier"), min_quantity: "1", max_quantity: "", unit_price: "" }])}
                className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
              >
                Add Tier
              </button>
            </div>

            <div className="space-y-3">
              {priceTiers.map((tier, index) => (
                <div key={tier.id} className="rounded-2xl border border-gray-200 bg-gray-50/60 p-4">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-gray-800">Tier {index + 1}</p>
                    {priceTiers.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => setPriceTiers((current) => current.filter((item) => item.id !== tier.id))}
                        className="text-sm font-medium text-rose-600 hover:text-rose-700"
                      >
                        Remove Tier
                      </button>
                    ) : null}
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <TextField id={`tier-min-${tier.id}`} label="Min Qty" value={tier.min_quantity} type="number" onChange={(value) => setPriceTiers((current) => current.map((item) => item.id === tier.id ? { ...item, min_quantity: value } : item))} />
                    <TextField id={`tier-max-${tier.id}`} label="Max Qty" value={tier.max_quantity} type="number" placeholder="Optional" onChange={(value) => setPriceTiers((current) => current.map((item) => item.id === tier.id ? { ...item, max_quantity: value } : item))} />
                    <TextField id={`tier-price-${tier.id}`} label="Buying Price (CNY)" value={tier.unit_price} type="number" onChange={(value) => setPriceTiers((current) => current.map((item) => item.id === tier.id ? { ...item, unit_price: value } : item))} />
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Domestic Shipping">
            <div className="grid gap-6 xl:grid-cols-2">
              <TextField id="shipping-cny" label="Domestic Shipping Cost (CNY)" value={String(values.domestic_shipping_cost_cny ?? "")} onChange={(value) => updateValue("domestic_shipping_cost_cny", value ? Number(value) : null)} type="number" />
              <TextField id="shipping-note" label="Shipping Note" value={values.shipping_note} onChange={(value) => updateValue("shipping_note", value)} />
            </div>
          </SectionCard>

          <SectionCard title="Product Images">
            <TextArea id="images" label="Image URLs" value={values.main_images_text} onChange={(value) => updateValue("main_images_text", value)} rows={5} />
            {mainImages.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                {mainImages.slice(0, 10).map((imageUrl) => (
                  <div key={imageUrl} className="aspect-square overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                    <div role="img" aria-label="Imported product image" className="h-full w-full bg-cover bg-center" style={{ backgroundImage: `url("${imageUrl}")` }} />
                  </div>
                ))}
              </div>
            ) : null}
          </SectionCard>

          <SectionCard title="Variation/SKU Data">
            <div className="max-h-[560px] overflow-auto rounded-xl border border-gray-200">
              <table className="min-w-[1180px] w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    {["SKU", "Name", "Value", "Price CNY", "MOQ", "Stock", "Image"].map((heading) => (
                      <th key={heading} className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {variants.map((variant) => (
                    <tr key={variant.id}>
                      <td className="px-3 py-3"><input value={variant.sku} onChange={(event) => setVariants((current) => current.map((item) => item.id === variant.id ? { ...item, sku: event.target.value } : item))} className="h-10 w-40 rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-[#615FFF]/40" /></td>
                      <td className="px-3 py-3"><input value={variant.name} onChange={(event) => setVariants((current) => current.map((item) => item.id === variant.id ? { ...item, name: event.target.value } : item))} className="h-10 w-48 rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-[#615FFF]/40" /></td>
                      <td className="px-3 py-3"><input value={variant.value} onChange={(event) => setVariants((current) => current.map((item) => item.id === variant.id ? { ...item, value: event.target.value } : item))} className="h-10 w-56 rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-[#615FFF]/40" /></td>
                      <td className="px-3 py-3"><input type="number" value={variant.price} onChange={(event) => setVariants((current) => current.map((item) => item.id === variant.id ? { ...item, price: event.target.value } : item))} className="h-10 w-28 rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-[#615FFF]/40" /></td>
                      <td className="px-3 py-3"><input type="number" value={variant.moq || String(values.moq)} onChange={(event) => setVariants((current) => current.map((item) => item.id === variant.id ? { ...item, moq: event.target.value } : item))} className="h-10 w-24 rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-[#615FFF]/40" /></td>
                      <td className="px-3 py-3"><input type="number" value={variant.stock_quantity} onChange={(event) => setVariants((current) => current.map((item) => item.id === variant.id ? { ...item, stock_quantity: event.target.value } : item))} className="h-10 w-28 rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-[#615FFF]/40" /></td>
                      <td className="px-3 py-3"><input value={variant.image_url} onChange={(event) => setVariants((current) => current.map((item) => item.id === variant.id ? { ...item, image_url: event.target.value } : item))} className="h-10 w-72 rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-[#615FFF]/40" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>

          {isUpdateMode ? (
            <SectionCard title="Overwrite Controls">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {OVERWRITE_OPTIONS.map((option) => (
                  <label key={option.key} className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <input
                      type="checkbox"
                      checked={Boolean(overwrite[option.key])}
                      onChange={(event) => setOverwrite((current) => ({ ...current, [option.key]: event.target.checked }))}
                      className="h-4 w-4 rounded border-gray-300 text-[#615FFF] focus:ring-[#615FFF]/20"
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </SectionCard>
          ) : null}

          <div className="flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => void cancelImport()}
              disabled={isSubmitting !== null}
              className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-5 py-3 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting === "cancel" ? "Cancelling..." : "Cancel Import"}
            </button>
            <button
              type="button"
              onClick={() => void submitReview("draft")}
              disabled={isSubmitting !== null}
              className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-5 py-3 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting === "draft" ? "Saving..." : "Save as Draft"}
            </button>
            <button
              type="button"
              onClick={() => void submitReview("publish")}
              disabled={isSubmitting !== null || isUpdateMode}
              className="inline-flex items-center justify-center rounded-lg bg-[#615FFF] px-5 py-3 text-sm font-medium text-white shadow-sm hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting === "publish" ? "Uploading..." : "Upload Product"}
            </button>
            {isUpdateMode ? (
              <button
                type="button"
                onClick={() => void submitReview("update")}
                disabled={isSubmitting !== null}
                className="inline-flex items-center justify-center rounded-lg bg-[#615FFF] px-5 py-3 text-sm font-medium text-white shadow-sm hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting === "update" ? "Updating..." : "Update Existing Product"}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
