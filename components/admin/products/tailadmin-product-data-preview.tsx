"use client";

import { useEffect, useRef, useState } from "react";

import {
  createVendorCndsProfileRequest,
  updateVendorCndsProfileRequest,
  type CndsProfileEditorPayload,
} from "@/lib/cnds/actions";
import type { CndsShippingPricingType, CndsShippingProfileRow } from "@/types/product-db";

type ProductType = "simple" | "variable";
type ProductTab = "inventory" | "pricing-tiers" | "shipping" | "attributes" | "variations";
type StockStatus = "in-stock" | "out-of-stock" | "on-backorder";
type PreviewPricingTier = {
  id: string;
  minQty: string;
  maxQty: string;
  price: string;
};
type PreviewTierSet = {
  id: string;
  name: string;
  fallbackPrice: string;
  pricingType: "unit" | "fixed";
  tiers: PreviewPricingTier[];
};
type PreviewAttribute = {
  id: string;
  name: string;
  values: string;
};
type PreviewAttributeDraft = {
  name: string;
  values: string;
};
type PreviewVariation = {
  id: string;
  name: string;
  pricingTierSetId: string;
  moq: string;
  stock: string;
  weight: string;
  summary: string;
  imageUrl: string;
};

type VariationStateBridgeVariation = {
  id: string;
  name: string;
  pricing_tier_set_id: string;
  moq: string;
  stock: string;
  weight: string;
  summary: string;
  image_url: string;
};

type PreviewCndsProfile = {
  id: string;
  vendor_id: string | null;
  name: string;
  description: string | null;
  pricing_type: "unit" | "fixed";
  is_active: boolean;
  tiers: Array<{
    min_qty: number;
    max_qty: number | null;
    price: number;
    sort_order?: number | null;
  }>;
};

type CndsTierDraft = {
  id: string;
  minQty: string;
  maxQty: string;
  price: string;
};

type CndsEditorDraft = {
  name: string;
  description: string;
  pricingType: CndsShippingPricingType;
  isActive: boolean;
  tiers: CndsTierDraft[];
};

const MAX_PRODUCT_PRICING_TIERS = 3;
const MAX_PRODUCT_TIER_SETS = 5;

function createCndsTierDraft(sortOrder = 0): CndsTierDraft {
  return {
    id: `cnds-tier-${Math.random().toString(36).slice(2, 10)}`,
    minQty: sortOrder === 0 ? "1" : "",
    maxQty: "",
    price: "0",
  };
}

function createCndsEditorDraft(profile?: PreviewCndsProfile | null): CndsEditorDraft {
  if (!profile) {
    return {
      name: "",
      description: "",
      pricingType: "fixed",
      isActive: true,
      tiers: [createCndsTierDraft()],
    };
  }

  return {
    name: profile.name,
    description: profile.description ?? "",
    pricingType: profile.pricing_type,
    isActive: profile.is_active,
    tiers:
      profile.tiers.length > 0
        ? profile.tiers.map((tier) => ({
            id: createCndsTierDraft().id,
            minQty: String(tier.min_qty),
            maxQty: tier.max_qty === null ? "" : String(tier.max_qty),
            price: String(tier.price),
          }))
        : [createCndsTierDraft()],
  };
}

function buildCndsEditorPayload(draft: CndsEditorDraft): CndsProfileEditorPayload {
  return {
    name: draft.name.trim(),
    description: draft.description.trim(),
    pricing_type: draft.pricingType,
    is_active: draft.isActive,
    tiers: draft.tiers.map((tier, index) => ({
      min_qty: Math.max(1, Number.parseInt(tier.minQty, 10) || 1),
      max_qty: tier.maxQty.trim() ? Math.max(1, Number.parseInt(tier.maxQty, 10) || 1) : null,
      price: Math.max(0, Number.parseFloat(tier.price) || 0),
      sort_order: index,
    })),
  };
}

function mapCndsRowToPreviewProfile(profile: CndsShippingProfileRow): PreviewCndsProfile {
  return {
    id: profile.id,
    vendor_id: profile.vendor_id,
    name: profile.name,
    description: profile.description,
    pricing_type: profile.pricing_type,
    is_active: profile.is_active,
    tiers: profile.tiers.map((tier) => ({
      min_qty: tier.min_qty,
      max_qty: tier.max_qty,
      price: tier.price,
      sort_order: tier.sort_order,
    })),
  };
}

const statusToStockStatus: Record<"active" | "disabled" | "draft", StockStatus> = {
  active: "in-stock",
  disabled: "out-of-stock",
  draft: "on-backorder",
};

const stockStatusToStatus: Record<StockStatus, "active" | "disabled" | "draft"> = {
  "in-stock": "active",
  "out-of-stock": "disabled",
  "on-backorder": "draft",
};

const productTypeOptions = [
  { value: "simple", label: "Simple product" },
  { value: "variable", label: "Variable product" },
] as const;

const simpleTabs: { id: ProductTab; label: string }[] = [
  { id: "inventory", label: "Inventory" },
  { id: "pricing-tiers", label: "Pricing Tiers" },
  { id: "shipping", label: "Shipping" },
  { id: "attributes", label: "Attributes" },
];

const variableTabs: { id: ProductTab; label: string }[] = [
  { id: "inventory", label: "Inventory" },
  { id: "pricing-tiers", label: "Pricing Tiers" },
  { id: "shipping", label: "Shipping" },
  { id: "attributes", label: "Attributes" },
  { id: "variations", label: "Variations" },
];

function Label({ htmlFor, children }: { htmlFor: string; children: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-gray-700">
      {children}
    </label>
  );
}

function createPreviewId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

function createPreviewTier(): PreviewPricingTier {
  return {
    id: createPreviewId("tier"),
    minQty: "",
    maxQty: "",
    price: "",
  };
}

function createPreviewTierSet(index: number): PreviewTierSet {
  return {
    id: createPreviewId("tier-set"),
    name: `Tier - ${index + 1}`,
    fallbackPrice: "",
    pricingType: "unit",
    tiers: [createPreviewTier()],
  };
}

function getTierSetDisplayName(tierSet: Pick<PreviewTierSet, "name">, index: number) {
  const trimmedName = tierSet.name.trim();

  if (!trimmedName || /^Tier\s*-\s*\d+$/i.test(trimmedName)) {
    return `Tier - ${index + 1}`;
  }

  return trimmedName;
}

function InputField({
  id,
  type = "text",
  placeholder,
  value,
  onChange,
}: {
  id: string;
  type?: string;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
}) {
  return (
    <input
      id={id}
      type={type}
      placeholder={placeholder}
      value={value ?? ""}
      onChange={(event) => onChange?.(event.target.value)}
      className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-sm placeholder:text-gray-400 focus:border-[#615FFF]/40 focus:outline-none focus:ring-4 focus:ring-[#615FFF]/10"
    />
  );
}

function PanelSelect({
  id,
  value,
  options,
  onChange,
}: {
  id: string;
  value: string;
  options: readonly { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative min-w-[220px]">
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 pr-11 text-sm text-gray-800 shadow-sm focus:border-[#615FFF]/40 focus:outline-none focus:ring-4 focus:ring-[#615FFF]/10"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <path d="M4.5 6.75L9 11.25L13.5 6.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </div>
  );
}

function Checkbox({ label }: { label: string }) {
  return (
    <label className="inline-flex items-center gap-2 text-sm text-gray-700">
      <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-[#615FFF] focus:ring-[#615FFF]" />
      <span>{label}</span>
    </label>
  );
}

function SectionHeading({ title, description }: { title: string; description?: string }) {
  return (
    <div>
      <h4 className="text-sm font-medium text-gray-800">{title}</h4>
      {description ? <p className="mt-1 text-xs text-gray-500">{description}</p> : null}
    </div>
  );
}

export default function TailadminProductDataPreview() {
  const initialTierSetRef = useRef<PreviewTierSet | null>(null);

  if (!initialTierSetRef.current) {
    initialTierSetRef.current = createPreviewTierSet(0);
  }

  const [productType, setProductType] = useState<ProductType>("simple");
  const [activeTab, setActiveTab] = useState<ProductTab>("inventory");
  const [pricingType, setPricingType] = useState("unit-pricing");
  const [skuValue, setSkuValue] = useState("");
  const [stockStatus, setStockStatus] = useState<StockStatus>("in-stock");
  const [cndsProfileValue, setCndsProfileValue] = useState("");
  const [cndsProfileOptions, setCndsProfileOptions] = useState<Array<{ value: string; label: string }>>([
    { value: "", label: "No CNDS profile selected" },
  ]);
  const [cndsProfiles, setCndsProfiles] = useState<PreviewCndsProfile[]>([]);
  const [cndsProfilesLoading, setCndsProfilesLoading] = useState(false);
  const [cndsVendorId, setCndsVendorId] = useState<string | null>(null);
  const [isCndsEditorOpen, setIsCndsEditorOpen] = useState(false);
  const [editingCndsProfileId, setEditingCndsProfileId] = useState<string | null>(null);
  const [cndsEditorDraft, setCndsEditorDraft] = useState<CndsEditorDraft>(() => createCndsEditorDraft());
  const [cndsEditorError, setCndsEditorError] = useState("");
  const [isSavingCnds, setIsSavingCnds] = useState(false);
  const [regularPrice, setRegularPrice] = useState("");
  const [discountPrice, setDiscountPrice] = useState("");
  const [profitPercent, setProfitPercent] = useState("");
  const [moqValue, setMoqValue] = useState("1");
  const [weightValue, setWeightValue] = useState("");
  const [singlePricingTiers, setSinglePricingTiers] = useState<PreviewPricingTier[]>([createPreviewTier(), createPreviewTier()]);
  const [tierSets, setTierSets] = useState<PreviewTierSet[]>(() => [initialTierSetRef.current!]);
  const [activeTierSetId, setActiveTierSetId] = useState<string>(() => initialTierSetRef.current!.id);
  const [attributes, setAttributes] = useState<PreviewAttribute[]>([]);
  const [openAttributeId, setOpenAttributeId] = useState<string | null>(null);
  const [attributeDrafts, setAttributeDrafts] = useState<Record<string, PreviewAttributeDraft>>({});
  const [savedAttributeId, setSavedAttributeId] = useState<string | null>(null);
  const [variations, setVariations] = useState<PreviewVariation[]>([]);

  const tabs = productType === "variable" ? variableTabs : simpleTabs;

  const triggerRealAttributeAdd = () => {
    if (typeof window === "undefined") {
      return;
    }

    window.dispatchEvent(new CustomEvent("prelize:add-attribute"));
  };

  const getCurrentAttributeBridgePayload = () =>
    attributes.map((attribute) => {
      const draft = attributeDrafts[attribute.id] ?? {
        name: attribute.name,
        values: attribute.values,
      };

      return {
        id: attribute.id,
        name: draft.name,
        values: draft.values,
      };
    });

  const pushAttributeDraftToRealForm = (attributeId: string) => {
    const currentAttribute = attributes.find((attribute) => attribute.id === attributeId);
    const nextDraft = attributeDrafts[attributeId] ?? {
      name: currentAttribute?.name ?? "",
      values: currentAttribute?.values ?? "",
    };
    const realNameInput = document.getElementById(`attribute-name-${attributeId}`) as HTMLInputElement | null;
    const realValuesInput = document.getElementById(`attribute-values-${attributeId}`) as HTMLTextAreaElement | null;

    if (realNameInput) {
      realNameInput.value = nextDraft.name;
      realNameInput.dispatchEvent(new Event("input", { bubbles: true }));
    }

    if (realValuesInput) {
      realValuesInput.value = nextDraft.values;
      realValuesInput.dispatchEvent(new Event("input", { bubbles: true }));
    }
  };

  const saveAttributeDraft = (attributeId: string) => {
    const currentAttribute = attributes.find((attribute) => attribute.id === attributeId);
    const nextDraft = attributeDrafts[attributeId] ?? {
      name: currentAttribute?.name ?? "",
      values: currentAttribute?.values ?? "",
    };

    setAttributes((current) =>
      current.map((attribute) =>
        attribute.id === attributeId
          ? { ...attribute, name: nextDraft.name, values: nextDraft.values }
          : attribute,
      ),
    );

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("prelize:set-attributes-state", {
          detail: {
            attributes: getCurrentAttributeBridgePayload().map((attribute) =>
              attribute.id === attributeId ? { ...attribute, ...nextDraft } : attribute,
            ),
          },
        }),
      );
    }
    setSavedAttributeId(attributeId);
    window.setTimeout(() => {
      setSavedAttributeId((current) => (current === attributeId ? null : current));
    }, 1500);
  };

  const pushAllAttributeDraftsToRealForm = () => {
    attributes.forEach((attribute) => {
      saveAttributeDraft(attribute.id);
    });
  };

  const pushPricingStateToRealForm = (
    next: Partial<{
      pricingType: "unit" | "fixed";
      regularPrice: string;
      discountPrice: string;
      profitPercent: string;
      moq: string;
      pricingTiers: PreviewPricingTier[];
      pricingTierSets: PreviewTierSet[];
    }> = {},
  ) => {
    if (typeof window === "undefined") {
      return;
    }

    const normalizedPricingType =
      next.pricingType ?? (pricingType === "unit-pricing" ? "unit" : "fixed");

    window.dispatchEvent(
      new CustomEvent("prelize:set-pricing-state", {
        detail: {
          pricingType: normalizedPricingType,
          regularPrice: next.regularPrice ?? regularPrice,
          discountPrice: next.discountPrice ?? discountPrice,
          profitPercent: next.profitPercent ?? profitPercent,
          moq: next.moq ?? moqValue,
          pricingTiers: (next.pricingTiers ?? singlePricingTiers).map((tier) => ({
            id: tier.id,
            min_qty: tier.minQty,
            max_qty: tier.maxQty,
            price: tier.price,
          })),
          pricingTierSets: (next.pricingTierSets ?? tierSets).map((tierSet, index) => ({
            id: tierSet.id,
            name: getTierSetDisplayName(tierSet, index),
            fallback_price: tierSet.fallbackPrice,
            pricing_type: tierSet.pricingType,
            tiers: tierSet.tiers.map((tier) => ({
              id: tier.id,
              min_qty: tier.minQty,
              max_qty: tier.maxQty,
              price: tier.price,
            })),
          })),
        },
      }),
    );
  };

  useEffect(() => {
    setTierSets((current) => {
      if (current.length > 0) {
        return current;
      }

      const nextTierSet = createPreviewTierSet(0);
      setActiveTierSetId(nextTierSet.id);
      return [nextTierSet];
    });
  }, []);

  useEffect(() => {
    if (tierSets.length === 0) {
      const nextTierSet = createPreviewTierSet(0);
      setTierSets([nextTierSet]);
      setActiveTierSetId(nextTierSet.id);
      return;
    }

    if (!tierSets.some((tierSet) => tierSet.id === activeTierSetId)) {
      setActiveTierSetId(tierSets[0].id);
    }
  }, [activeTierSetId, tierSets]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const getField = (id: string) => document.getElementById(id) as HTMLInputElement | HTMLSelectElement | null;

    const syncFromRealForm = () => {
      const checkedType = document.querySelector<HTMLInputElement>('input[name="product_type"]:checked');
      const nextType = checkedType?.value === "variable" ? "variable" : "simple";
      setProductType(nextType);
      setActiveTab((current) => {
        if (nextType === "simple" && current === "variations") {
          return "inventory";
        }
        return current;
      });
      setRegularPrice((getField("product-regular-price") as HTMLInputElement | null)?.value ?? "");
      setDiscountPrice((getField("product-discount-price") as HTMLInputElement | null)?.value ?? "");
      setProfitPercent((getField("product-profit-percent") as HTMLInputElement | null)?.value ?? "");
      setMoqValue((getField("product-moq") as HTMLInputElement | null)?.value ?? "1");
      setPricingType((getField("product-pricing-type") as HTMLSelectElement | null)?.value === "fixed" ? "carton-pricing" : "unit-pricing");
      setSkuValue((getField("product-sku") as HTMLInputElement | null)?.value ?? "");
      setWeightValue((getField("product-weight") as HTMLInputElement | null)?.value ?? "");
      const cndsProfileSelect = getField("product-cnds-shipping-profile") as HTMLSelectElement | null;
      setCndsProfileValue(cndsProfileSelect?.value ?? "");
      setCndsProfileOptions(
        cndsProfileSelect && cndsProfileSelect.options.length > 0
          ? Array.from(cndsProfileSelect.options).map((option) => ({
              value: option.value,
              label: option.text,
            }))
          : [{ value: "", label: "No CNDS profile selected" }],
      );
      const checkedStatus = document.querySelector<HTMLInputElement>('input[name="status"]:checked')?.dataset
        .productStatusOption as "active" | "disabled" | "draft" | undefined;
      setStockStatus(checkedStatus ? statusToStockStatus[checkedStatus] : "in-stock");
    };

    const productTypeInputs = Array.from(document.querySelectorAll<HTMLInputElement>('input[name="product_type"]'));
    const statusInputs = Array.from(document.querySelectorAll<HTMLInputElement>('input[name="status"]'));
    const regularPriceInput = getField("product-regular-price") as HTMLInputElement | null;
    const discountPriceInput = getField("product-discount-price") as HTMLInputElement | null;
    const profitPercentInput = getField("product-profit-percent") as HTMLInputElement | null;
    const moqInput = getField("product-moq") as HTMLInputElement | null;
    const pricingTypeSelect = getField("product-pricing-type") as HTMLSelectElement | null;
    const skuInput = getField("product-sku") as HTMLInputElement | null;
    const weightInput = getField("product-weight") as HTMLInputElement | null;
    const cndsProfileSelect = getField("product-cnds-shipping-profile") as HTMLSelectElement | null;

    const handleInputSync = () => syncFromRealForm();
    const handleChangeSync = () => syncFromRealForm();

    productTypeInputs.forEach((input) => input.addEventListener("change", handleChangeSync));
    statusInputs.forEach((input) => input.addEventListener("change", handleChangeSync));
    regularPriceInput?.addEventListener("input", handleInputSync);
    discountPriceInput?.addEventListener("input", handleInputSync);
    profitPercentInput?.addEventListener("input", handleInputSync);
    moqInput?.addEventListener("input", handleInputSync);
    pricingTypeSelect?.addEventListener("change", handleChangeSync);
    skuInput?.addEventListener("input", handleInputSync);
    weightInput?.addEventListener("input", handleInputSync);
    cndsProfileSelect?.addEventListener("change", handleChangeSync);

    syncFromRealForm();

    return () => {
      productTypeInputs.forEach((input) => input.removeEventListener("change", handleChangeSync));
      statusInputs.forEach((input) => input.removeEventListener("change", handleChangeSync));
      regularPriceInput?.removeEventListener("input", handleInputSync);
      discountPriceInput?.removeEventListener("input", handleInputSync);
      profitPercentInput?.removeEventListener("input", handleInputSync);
      moqInput?.removeEventListener("input", handleInputSync);
      pricingTypeSelect?.removeEventListener("change", handleChangeSync);
      skuInput?.removeEventListener("input", handleInputSync);
      weightInput?.removeEventListener("input", handleInputSync);
      cndsProfileSelect?.removeEventListener("change", handleChangeSync);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleCndsProfilesStateUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<{
        loading?: boolean;
        vendorId?: string | null;
        selectedProfileId?: string;
        profiles?: PreviewCndsProfile[];
      }>;
      const profiles = customEvent.detail?.profiles ?? [];

      setCndsProfilesLoading(Boolean(customEvent.detail?.loading));
      setCndsVendorId(customEvent.detail?.vendorId ?? null);
      setCndsProfiles(profiles);
      setCndsProfileValue(customEvent.detail?.selectedProfileId ?? "");
      setCndsProfileOptions([
        {
          value: "",
          label: customEvent.detail?.loading ? "Loading CNDS profiles..." : "No CNDS profile selected",
        },
        ...profiles.map((profile) => ({
          value: profile.id,
          label: `${profile.name} (${profile.pricing_type === "unit" ? "Per Unit" : "Fixed"})`,
        })),
      ]);
    };

    const handleProductTypeStateUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<{
        productType?: "single" | "variable";
      }>;

      const nextType = customEvent.detail?.productType === "variable" ? "variable" : "simple";

      setProductType(nextType);
      setActiveTab((current) => {
        if (nextType === "simple" && current === "variations") {
          return "inventory";
        }

        return current;
      });
    };

    window.addEventListener("prelize:cnds-profiles-state-updated", handleCndsProfilesStateUpdated as EventListener);
    window.addEventListener("prelize:product-type-state-updated", handleProductTypeStateUpdated as EventListener);

    return () => {
      window.removeEventListener("prelize:cnds-profiles-state-updated", handleCndsProfilesStateUpdated as EventListener);
      window.removeEventListener("prelize:product-type-state-updated", handleProductTypeStateUpdated as EventListener);
    };
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const syncVariationsFromRealForm = () => {
      const realRows = Array.from(
        document.querySelectorAll<HTMLElement>("[data-product-variation-row='true']"),
      );

      const nextVariations = realRows.map((row, index) => {
        const variationId = row.dataset.productVariationId ?? `variation-${index + 1}`;
        const nameInput = document.getElementById(`variation-name-${variationId}`) as HTMLInputElement | null;
        const pricingTierSetSelect = document.getElementById(`variation-tier-set-${variationId}`) as HTMLSelectElement | null;
        const moqInput = document.getElementById(`variation-moq-${variationId}`) as HTMLInputElement | null;
        const stockInput = document.getElementById(`variation-stock-${variationId}`) as HTMLInputElement | null;
        const weightInput = document.getElementById(`variation-weight-${variationId}`) as HTMLInputElement | null;

        return {
          id: variationId,
          name: nameInput?.value ?? "",
          pricingTierSetId: pricingTierSetSelect?.value ?? "",
          moq: moqInput?.value ?? "1",
          stock: stockInput?.value ?? "0",
          weight: weightInput?.value ?? "",
          summary: row.dataset.productVariationSummary ?? "",
          imageUrl: row.dataset.productVariationImage ?? "",
        };
      });

      setVariations(nextVariations);
    };

    const handleVariationStateUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<{
        variations?: VariationStateBridgeVariation[];
      }>;
      const nextVariations =
        customEvent.detail?.variations?.map((variation) => ({
          id: variation.id,
          name: variation.name,
          pricingTierSetId: variation.pricing_tier_set_id,
          moq: variation.moq,
          stock: variation.stock,
          weight: variation.weight,
          summary: variation.summary,
          imageUrl: variation.image_url,
        })) ?? [];

      setVariations(nextVariations);
    };

    const wireVariationInputs = () => {
      const realRows = Array.from(
        document.querySelectorAll<HTMLElement>("[data-product-variation-row='true']"),
      );

      realRows.forEach((row) => {
        const variationId = row.dataset.productVariationId;

        if (!variationId) {
          return;
        }

        const nameInput = document.getElementById(`variation-name-${variationId}`) as HTMLInputElement | null;
        const pricingTierSetSelect = document.getElementById(`variation-tier-set-${variationId}`) as HTMLSelectElement | null;
        const moqInput = document.getElementById(`variation-moq-${variationId}`) as HTMLInputElement | null;
        const stockInput = document.getElementById(`variation-stock-${variationId}`) as HTMLInputElement | null;
        const weightInput = document.getElementById(`variation-weight-${variationId}`) as HTMLInputElement | null;

        nameInput?.addEventListener("input", syncVariationsFromRealForm);
        pricingTierSetSelect?.addEventListener("change", syncVariationsFromRealForm);
        moqInput?.addEventListener("input", syncVariationsFromRealForm);
        stockInput?.addEventListener("input", syncVariationsFromRealForm);
        weightInput?.addEventListener("input", syncVariationsFromRealForm);
      });

      return () => {
        realRows.forEach((row) => {
          const variationId = row.dataset.productVariationId;

          if (!variationId) {
            return;
          }

          const nameInput = document.getElementById(`variation-name-${variationId}`) as HTMLInputElement | null;
          const pricingTierSetSelect = document.getElementById(`variation-tier-set-${variationId}`) as HTMLSelectElement | null;
          const moqInput = document.getElementById(`variation-moq-${variationId}`) as HTMLInputElement | null;
          const stockInput = document.getElementById(`variation-stock-${variationId}`) as HTMLInputElement | null;
          const weightInput = document.getElementById(`variation-weight-${variationId}`) as HTMLInputElement | null;

          nameInput?.removeEventListener("input", syncVariationsFromRealForm);
          pricingTierSetSelect?.removeEventListener("change", syncVariationsFromRealForm);
          moqInput?.removeEventListener("input", syncVariationsFromRealForm);
          stockInput?.removeEventListener("input", syncVariationsFromRealForm);
          weightInput?.removeEventListener("input", syncVariationsFromRealForm);
        });
      };
    };

    syncVariationsFromRealForm();

    const section = document.getElementById("product-variations-section");
    const addButton = document.getElementById("product-variations-add");
    const generateButton = document.getElementById("product-attributes-generate");
    addButton?.addEventListener("click", syncVariationsFromRealForm);
    generateButton?.addEventListener("click", syncVariationsFromRealForm);
    window.addEventListener("prelize:variations-state-updated", handleVariationStateUpdated as EventListener);

    const observer =
      section
        ? new MutationObserver(() => {
            syncVariationsFromRealForm();
          })
        : null;

    if (section && observer) {
      observer.observe(section, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["data-product-variation-summary"],
      });
    }

    let cleanupInputListeners = wireVariationInputs();

    const rebindingObserver =
      section
        ? new MutationObserver(() => {
            cleanupInputListeners?.();
            cleanupInputListeners = wireVariationInputs();
          })
        : null;

    if (section && rebindingObserver) {
      rebindingObserver.observe(section, { childList: true, subtree: true });
    }

    return () => {
      addButton?.removeEventListener("click", syncVariationsFromRealForm);
      generateButton?.removeEventListener("click", syncVariationsFromRealForm);
      window.removeEventListener("prelize:variations-state-updated", handleVariationStateUpdated as EventListener);
      cleanupInputListeners?.();
      observer?.disconnect();
      rebindingObserver?.disconnect();
    };
  }, [productType]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handlePricingStateUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<{
        pricingType?: "unit" | "fixed";
        regularPrice?: string;
        discountPrice?: string;
        profitPercent?: string;
        moq?: string;
        pricingTiers?: Array<{
          id: string;
          min_qty: string;
          max_qty: string;
          price: string;
        }>;
        pricingTierSets?: Array<{
          id: string;
          name: string;
          fallback_price: string;
          pricing_type: "unit" | "fixed";
          tiers: Array<{
            id: string;
            min_qty: string;
            max_qty: string;
            price: string;
          }>;
        }>;
      }>;

      setPricingType(customEvent.detail?.pricingType === "fixed" ? "carton-pricing" : "unit-pricing");
      setRegularPrice(customEvent.detail?.regularPrice ?? "");
      setDiscountPrice(customEvent.detail?.discountPrice ?? "");
      setProfitPercent(customEvent.detail?.profitPercent ?? "");
      setMoqValue(customEvent.detail?.moq ?? "1");

      if (customEvent.detail?.pricingTiers) {
        setSinglePricingTiers(
          customEvent.detail.pricingTiers.length > 0
            ? customEvent.detail.pricingTiers.map((tier) => ({
                id: tier.id,
                minQty: tier.min_qty,
                maxQty: tier.max_qty,
                price: tier.price,
              }))
            : [createPreviewTier()],
        );
      }

      if (customEvent.detail?.pricingTierSets) {
        const nextTierSets =
          customEvent.detail.pricingTierSets.length > 0
            ? customEvent.detail.pricingTierSets.map((tierSet, index) => ({
                id: tierSet.id,
                name: getTierSetDisplayName({ name: tierSet.name }, index),
                fallbackPrice: tierSet.fallback_price,
                pricingType: tierSet.pricing_type,
                tiers:
                  tierSet.tiers.length > 0
                    ? tierSet.tiers.map((tier) => ({
                        id: tier.id,
                        minQty: tier.min_qty,
                        maxQty: tier.max_qty,
                        price: tier.price,
                      }))
                    : [createPreviewTier()],
              }))
            : [createPreviewTierSet(0)];

        setTierSets(nextTierSets);
        setActiveTierSetId((current) =>
          nextTierSets.some((tierSet) => tierSet.id === current) ? current : nextTierSets[0].id,
        );

        if (productType === "variable") {
          const effectiveTierSet =
            nextTierSets.find((tierSet) => tierSet.id === activeTierSetId) ?? nextTierSets[0];
          if (effectiveTierSet) {
            setRegularPrice(effectiveTierSet.fallbackPrice);
            setPricingType(effectiveTierSet.pricingType === "fixed" ? "carton-pricing" : "unit-pricing");
          }
        }
      }
    };

    window.addEventListener("prelize:pricing-state-updated", handlePricingStateUpdated as EventListener);

    return () => {
      window.removeEventListener("prelize:pricing-state-updated", handlePricingStateUpdated as EventListener);
    };
  }, []);

  const syncProductType = (nextType: ProductType) => {
    setProductType(nextType);
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("prelize:set-product-type", {
          detail: {
            productType: nextType === "simple" ? "single" : "variable",
          },
        }),
      );
    }
    const realInput = document.querySelector<HTMLInputElement>(`input[name="product_type"][value="${nextType === "simple" ? "single" : "variable"}"]`);
    realInput?.click();
    if (nextType === "simple" && activeTab === "variations") {
      setActiveTab("inventory");
    }
  };

  const syncInputField = (id: string, value: string) => {
    const field = document.getElementById(id) as HTMLInputElement | null;
    if (!field) {
      return;
    }
    field.value = value;
    field.dispatchEvent(new Event("input", { bubbles: true }));
  };

  const syncSelectField = (id: string, value: string) => {
    const field = document.getElementById(id) as HTMLSelectElement | null;
    if (!field) {
      return;
    }
    field.value = value;
    field.dispatchEvent(new Event("change", { bubbles: true }));
  };

  const syncStockStatus = (nextStatus: StockStatus) => {
    setStockStatus(nextStatus);
    const mappedStatus = stockStatusToStatus[nextStatus];
    const realInput = document.querySelector<HTMLInputElement>(
      `input[name="status"][data-product-status-option="${mappedStatus}"]`,
    );
    realInput?.click();
  };

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const syncAttributesFromRealForm = () => {
      const realRows = Array.from(
        document.querySelectorAll<HTMLElement>("[data-product-attribute-row='true']"),
      );

      const nextAttributes = realRows.map((row, index) => {
        const attributeId = row.dataset.productAttributeId ?? `attribute-${index + 1}`;
        const nameInput = document.getElementById(`attribute-name-${attributeId}`) as HTMLInputElement | null;
        const valuesInput = document.getElementById(`attribute-values-${attributeId}`) as HTMLTextAreaElement | null;

        return {
          id: attributeId,
          name: nameInput?.value ?? "",
          values: valuesInput?.value ?? "",
        };
      });

      setAttributes(nextAttributes);
      setAttributeDrafts((current) => {
        const nextDrafts: Record<string, PreviewAttributeDraft> = {};

        nextAttributes.forEach((attribute) => {
          nextDrafts[attribute.id] = current[attribute.id] ?? {
            name: attribute.name,
            values: attribute.values,
          };
        });

        return nextDrafts;
      });
      setOpenAttributeId((current) => {
        if (nextAttributes.length === 0) {
          return null;
        }

        if (current && nextAttributes.some((attribute) => attribute.id === current)) {
          return current;
        }

        return nextAttributes[0].id;
      });
    };

    const handleAttributesStateUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<{
        attributes?: Array<{
          id: string;
          name: string;
          values: string;
        }>;
      }>;

      const nextAttributes =
        customEvent.detail?.attributes?.map((attribute) => ({
          id: attribute.id,
          name: attribute.name,
          values: attribute.values,
        })) ?? [];

      setAttributes(nextAttributes);
      setAttributeDrafts((current) => {
        const nextDrafts: Record<string, PreviewAttributeDraft> = {};

        nextAttributes.forEach((attribute) => {
          nextDrafts[attribute.id] = current[attribute.id] ?? {
            name: attribute.name,
            values: attribute.values,
          };
        });

        return nextDrafts;
      });
      setOpenAttributeId((current) => {
        if (nextAttributes.length === 0) {
          return null;
        }

        if (current && nextAttributes.some((attribute) => attribute.id === current)) {
          return current;
        }

        return nextAttributes[nextAttributes.length - 1]?.id ?? nextAttributes[0].id;
      });
    };

    const wireAttributeInputs = () => {
      const realRows = Array.from(
        document.querySelectorAll<HTMLElement>("[data-product-attribute-row='true']"),
      );

      realRows.forEach((row) => {
        const attributeId = row.dataset.productAttributeId;

        if (!attributeId) {
          return;
        }

        const nameInput = document.getElementById(`attribute-name-${attributeId}`) as HTMLInputElement | null;
        const valuesInput = document.getElementById(`attribute-values-${attributeId}`) as HTMLTextAreaElement | null;

        nameInput?.addEventListener("input", syncAttributesFromRealForm);
        valuesInput?.addEventListener("input", syncAttributesFromRealForm);
      });

      return () => {
        realRows.forEach((row) => {
          const attributeId = row.dataset.productAttributeId;

          if (!attributeId) {
            return;
          }

          const nameInput = document.getElementById(`attribute-name-${attributeId}`) as HTMLInputElement | null;
          const valuesInput = document.getElementById(`attribute-values-${attributeId}`) as HTMLTextAreaElement | null;

          nameInput?.removeEventListener("input", syncAttributesFromRealForm);
          valuesInput?.removeEventListener("input", syncAttributesFromRealForm);
        });
      };
    };

    syncAttributesFromRealForm();

    const section = document.getElementById("product-attributes-section");
    const addButton = document.getElementById("product-attributes-add");
    addButton?.addEventListener("click", syncAttributesFromRealForm);
    window.addEventListener("prelize:attributes-state-updated", handleAttributesStateUpdated as EventListener);

    const observer =
      section
        ? new MutationObserver(() => {
            syncAttributesFromRealForm();
          })
        : null;

    if (section && observer) {
      observer.observe(section, { childList: true, subtree: true });
    }

    let cleanupInputListeners = wireAttributeInputs();

    const rebindingObserver =
      section
        ? new MutationObserver(() => {
            cleanupInputListeners?.();
            cleanupInputListeners = wireAttributeInputs();
          })
        : null;

    if (section && rebindingObserver) {
      rebindingObserver.observe(section, { childList: true, subtree: true });
    }

    return () => {
      addButton?.removeEventListener("click", syncAttributesFromRealForm);
      window.removeEventListener("prelize:attributes-state-updated", handleAttributesStateUpdated as EventListener);
      cleanupInputListeners?.();
      observer?.disconnect();
      rebindingObserver?.disconnect();
    };
  }, []);

  const updateSingleTier = (tierId: string, field: keyof PreviewPricingTier, value: string) => {
    const next = singlePricingTiers.map((tier) => (tier.id === tierId ? { ...tier, [field]: value } : tier));
    setSinglePricingTiers(next);
    queueMicrotask(() => {
      pushPricingStateToRealForm({ pricingTiers: next });
    });
  };

  const addSingleTier = () => {
    if (singlePricingTiers.length >= MAX_PRODUCT_PRICING_TIERS) {
      return;
    }

    const next = [...singlePricingTiers, createPreviewTier()];
    setSinglePricingTiers(next);
    queueMicrotask(() => {
      pushPricingStateToRealForm({ pricingTiers: next });
    });
  };

  const removeSingleTier = (tierId: string) => {
    const next = singlePricingTiers.length > 1 ? singlePricingTiers.filter((tier) => tier.id !== tierId) : singlePricingTiers;
    setSinglePricingTiers(next);
    queueMicrotask(() => {
      pushPricingStateToRealForm({ pricingTiers: next });
    });
  };

  const addTierSet = () => {
    if (tierSets.length >= MAX_PRODUCT_TIER_SETS) {
      return;
    }

    const nextTierSet = createPreviewTierSet(tierSets.length);
    setActiveTierSetId(nextTierSet.id);
    setTierSets((current) => {
      const next = [...current, { ...nextTierSet, name: getTierSetDisplayName(nextTierSet, current.length) }];

      queueMicrotask(() => {
        pushPricingStateToRealForm({
          pricingType: nextTierSet.pricingType,
          regularPrice: nextTierSet.fallbackPrice,
          pricingTierSets: next,
        });
      });

      return next;
    });
  };

  const removeTierSet = (tierSetId: string) => {
    setTierSets((current) => {
      const next = current.length > 1 ? current.filter((tierSet) => tierSet.id !== tierSetId) : current;
      const nextActiveTierSet = next.some((tierSet) => tierSet.id === activeTierSetId)
        ? activeTierSet
        : next[0];

      queueMicrotask(() => {
        if (nextActiveTierSet) {
          setActiveTierSetId(nextActiveTierSet.id);
          setRegularPrice(nextActiveTierSet.fallbackPrice);
          setPricingType(nextActiveTierSet.pricingType === "fixed" ? "carton-pricing" : "unit-pricing");
        }

        pushPricingStateToRealForm({
          pricingType: nextActiveTierSet?.pricingType,
          regularPrice: nextActiveTierSet?.fallbackPrice,
          pricingTierSets: next,
        });
      });

      return next;
    });
  };

  const updateTierSetTier = (
    tierSetId: string,
    tierId: string,
    field: keyof PreviewPricingTier,
    value: string,
  ) => {
    const next = tierSets.map((tierSet) =>
      tierSet.id === tierSetId
        ? {
            ...tierSet,
            tiers: tierSet.tiers.map((tier) => (tier.id === tierId ? { ...tier, [field]: value } : tier)),
          }
        : tierSet,
    );
    setTierSets(next);
    queueMicrotask(() => {
      pushPricingStateToRealForm({ pricingTierSets: next });
    });
  };

  const addTierToSet = (tierSetId: string) => {
    const next = tierSets.map((tierSet) =>
      tierSet.id === tierSetId && tierSet.tiers.length < MAX_PRODUCT_PRICING_TIERS
        ? { ...tierSet, tiers: [...tierSet.tiers, createPreviewTier()] }
        : tierSet,
    );
    setTierSets(next);
    queueMicrotask(() => {
      pushPricingStateToRealForm({ pricingTierSets: next });
    });
  };

  const updateTierSetName = (tierSetId: string, value: string) => {
    const next = tierSets.map((tierSet) =>
      tierSet.id === tierSetId
        ? {
            ...tierSet,
            name: value,
          }
        : tierSet,
    );
    setTierSets(next);
    queueMicrotask(() => {
      pushPricingStateToRealForm({ pricingTierSets: next });
    });
  };

  const removeTierFromSet = (tierSetId: string, tierId: string) => {
    const next = tierSets.map((tierSet) =>
      tierSet.id === tierSetId
        ? {
            ...tierSet,
            tiers: tierSet.tiers.length > 1 ? tierSet.tiers.filter((tier) => tier.id !== tierId) : tierSet.tiers,
          }
        : tierSet,
    );
    setTierSets(next);
    queueMicrotask(() => {
      pushPricingStateToRealForm({ pricingTierSets: next });
    });
  };

  const activeTierSet = tierSets.find((tierSet) => tierSet.id === activeTierSetId) ?? tierSets[0];
  const visiblePricingTiers = productType === "variable" ? activeTierSet?.tiers ?? [] : singlePricingTiers;
  const canAddPricingTier = visiblePricingTiers.length < MAX_PRODUCT_PRICING_TIERS;
  const canAddTierSet = tierSets.length < MAX_PRODUCT_TIER_SETS;
  const selectedCndsProfile = cndsProfiles.find((profile) => profile.id === cndsProfileValue) ?? null;

  const openCreateCndsEditor = () => {
    setEditingCndsProfileId(null);
    setCndsEditorDraft(createCndsEditorDraft());
    setCndsEditorError("");
    setIsCndsEditorOpen(true);
  };

  const openEditCndsEditor = () => {
    if (!selectedCndsProfile) {
      return;
    }

    setEditingCndsProfileId(selectedCndsProfile.id);
    setCndsEditorDraft(createCndsEditorDraft(selectedCndsProfile));
    setCndsEditorError("");
    setIsCndsEditorOpen(true);
  };

  const closeCndsEditor = () => {
    if (isSavingCnds) {
      return;
    }

    setIsCndsEditorOpen(false);
    setEditingCndsProfileId(null);
    setCndsEditorDraft(createCndsEditorDraft());
    setCndsEditorError("");
  };

  const updateCndsDraftField = <Field extends keyof CndsEditorDraft>(field: Field, value: CndsEditorDraft[Field]) => {
    setCndsEditorDraft((current) => ({
      ...current,
      [field]: value,
    }));
    setCndsEditorError("");
  };

  const updateCndsTierDraft = (tierId: string, field: keyof Omit<CndsTierDraft, "id">, value: string) => {
    setCndsEditorDraft((current) => ({
      ...current,
      tiers: current.tiers.map((tier) => (tier.id === tierId ? { ...tier, [field]: value } : tier)),
    }));
    setCndsEditorError("");
  };

  const addCndsTierDraft = () => {
    setCndsEditorDraft((current) => ({
      ...current,
      tiers: [...current.tiers, createCndsTierDraft(current.tiers.length)],
    }));
    setCndsEditorError("");
  };

  const removeCndsTierDraft = (tierId: string) => {
    setCndsEditorDraft((current) => ({
      ...current,
      tiers: current.tiers.length > 1 ? current.tiers.filter((tier) => tier.id !== tierId) : current.tiers,
    }));
    setCndsEditorError("");
  };

  const selectCndsProfile = (profileId: string) => {
    setCndsProfileValue(profileId);
    syncSelectField("product-cnds-shipping-profile", profileId);

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("prelize:set-cnds-profile", {
          detail: {
            profileId,
          },
        }),
      );
    }
  };

  const saveCndsEditor = async () => {
    if (!cndsVendorId) {
      setCndsEditorError("Select a vendor before creating a CNDS profile for this product.");
      return;
    }

    const payload = buildCndsEditorPayload(cndsEditorDraft);

    if (!payload.name) {
      setCndsEditorError("Profile name is required.");
      return;
    }

    if (payload.tiers.length === 0) {
      setCndsEditorError("Add at least one CNDS tier.");
      return;
    }

    const invalidTier = payload.tiers.find(
      (tier) => tier.min_qty < 1 || (tier.max_qty !== null && tier.max_qty < tier.min_qty) || tier.price < 0,
    );

    if (invalidTier) {
      setCndsEditorError("Each CNDS tier needs a valid quantity range and non-negative price.");
      return;
    }

    setIsSavingCnds(true);
    setCndsEditorError("");

    try {
      const result =
        editingCndsProfileId && selectedCndsProfile
          ? await updateVendorCndsProfileRequest(cndsVendorId, editingCndsProfileId, payload)
          : await createVendorCndsProfileRequest(cndsVendorId, payload);
      const savedProfile = mapCndsRowToPreviewProfile(result.profile);

      setCndsProfiles((current) => {
        const withoutSaved = current.filter((profile) => profile.id !== savedProfile.id);
        return [savedProfile, ...withoutSaved];
      });
      setCndsProfileOptions((current) => {
        const withoutSaved = current.filter((option) => option.value !== savedProfile.id && option.value !== "");
        return [
          { value: "", label: "No CNDS profile selected" },
          {
            value: savedProfile.id,
            label: `${savedProfile.name} (${savedProfile.pricing_type === "unit" ? "Per Unit" : "Fixed"})`,
          },
          ...withoutSaved,
        ];
      });
      selectCndsProfile(savedProfile.id);
      setIsCndsEditorOpen(false);
      setEditingCndsProfileId(null);
      setCndsEditorDraft(createCndsEditorDraft());
    } catch (error) {
      setCndsEditorError(error instanceof Error ? error.message : "Unable to save the CNDS profile.");
    } finally {
      setIsSavingCnds(false);
    }
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white">
      <div className="border-b border-gray-100 px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
            <h3 className="text-base font-medium text-gray-800">Product Data</h3>
            <PanelSelect id="preview-product-type" value={productType} options={productTypeOptions} onChange={(value) => syncProductType(value as ProductType)} />
          </div>

          <div className="flex flex-wrap gap-5">
            <Checkbox label="Virtual" />
            <Checkbox label="Downloadable" />
            <Checkbox label="Subscription" />
          </div>
        </div>
        <p className="mt-4 text-xs text-amber-600">
          Connected now: product type dropdown, SKU, stock status, CNDS shipping profile, regular price, discount price, MOQ, pricing type, weight, pricing tiers, tier sets, and the attribute builder. Not connected yet: stock quantity, advanced shipping dimensions, and the variation generator because the current real form does not expose matching backend-safe fields for those TailAdmin controls.
        </p>
      </div>

      <div className="grid xl:grid-cols-[240px_minmax(0,1fr)]">
        <div className="border-b border-gray-100 bg-gray-50/70 xl:border-b-0 xl:border-r">
          <div className="flex flex-col">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center border-b border-gray-100 px-5 py-4 text-left text-sm font-medium transition ${
                    isActive ? "bg-white text-[#615FFF]" : "text-gray-600 hover:bg-white hover:text-gray-800"
                  }`}
                >
                  <span className="inline-flex h-2 w-2 rounded-full bg-current opacity-60" />
                  <span className="ml-3">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-5 sm:p-6">
          {activeTab === "inventory" ? (
            <div className="space-y-6">
              <SectionHeading title="Inventory" description="Manage SKU, stock levels, and availability." />
              <div className="grid gap-6 xl:grid-cols-2">
                <div>
                  <Label htmlFor="preview-sku">SKU</Label>
                  <InputField
                    id="preview-sku"
                    value={skuValue}
                    onChange={(value) => {
                      setSkuValue(value);
                      syncInputField("product-sku", value);
                    }}
                    placeholder="PRL-IPH15PM-001"
                  />
                </div>
                <div>
                  <Label htmlFor="preview-stock-status">Stock status</Label>
                  <PanelSelect
                    id="preview-stock-status"
                    value={stockStatus}
                    options={[
                      { value: "in-stock", label: "In Stock" },
                      { value: "out-of-stock", label: "Out of Stock" },
                      { value: "on-backorder", label: "Draft" },
                    ]}
                    onChange={(value) => syncStockStatus(value as StockStatus)}
                  />
                </div>
              </div>
              <div className="grid gap-6 xl:grid-cols-3">
                <div>
                  <Label htmlFor="preview-stock-qty">Stock quantity</Label>
                  <InputField id="preview-stock-qty" type="number" value="24" onChange={() => undefined} />
                </div>
                <div>
                  <Label htmlFor="preview-low-stock">Weight (Optional)</Label>
                  <InputField
                    id="preview-low-stock"
                    type="number"
                    value={weightValue}
                    onChange={(value) => {
                      setWeightValue(value);
                      if (typeof window !== "undefined") {
                        window.dispatchEvent(
                          new CustomEvent("prelize:set-product-weight", {
                            detail: { weight: value },
                          }),
                        );
                      }
                      syncInputField("product-weight", value);
                    }}
                  />
                </div>
                <div>
                  <Label htmlFor="preview-inventory-moq">MOQ</Label>
                  <InputField
                    id="preview-inventory-moq"
                    type="number"
                    value={moqValue}
                    onChange={(value) => {
                      setMoqValue(value);
                      syncInputField("product-moq", value);
                      pushPricingStateToRealForm({ moq: value });
                    }}
                  />
                </div>
              </div>
            </div>
          ) : null}

          {activeTab === "pricing-tiers" ? (
            <div className="space-y-6">
              <SectionHeading title="Product Pricing Tiers" description="Set CNY buying prices. Selling prices are calculated from product profit percent and the current exchange rate." />
              <div className="rounded-2xl border border-gray-200">
                <div className="space-y-6">
                  {productType === "variable" ? (
                    <div className="border-b border-gray-200 px-5 pt-5 sm:px-6">
                      <div className="flex flex-wrap items-center gap-6">
                        {tierSets.map((tierSet, index) => {
                          const isActive = tierSet.id === activeTierSet?.id;

                          return (
                            <button
                              key={tierSet.id}
                              type="button"
                              onClick={() => setActiveTierSetId(tierSet.id)}
                              className={`border-b-2 px-0 pb-3 text-base font-medium transition-colors ${
                                isActive
                                  ? "border-[#615FFF] text-[#615FFF]"
                                  : "border-transparent text-slate-600 hover:text-slate-900"
                              }`}
                            >
                              {getTierSetDisplayName(tierSet, index)}
                            </button>
                          );
                        })}
                        <button
                          type="button"
                          disabled={!canAddTierSet}
                          onClick={addTierSet}
                          className="inline-flex items-center gap-2 pb-3 text-base font-medium text-slate-700 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <span className="text-xl leading-none">+</span>
                          <span>{canAddTierSet ? "Add Tier Set" : `Max ${MAX_PRODUCT_TIER_SETS} Tier Sets`}</span>
                        </button>
                      </div>
                    </div>
                  ) : null}

                  <div className="space-y-6 px-5 py-5 sm:px-6">
                    <div className={`grid gap-6 ${productType === "variable" ? "xl:grid-cols-3" : "xl:grid-cols-2"}`}>
                      {productType === "variable" && activeTierSet ? (
                        <div>
                          <Label htmlFor={`preview-tier-set-name-${activeTierSet.id}`}>Tier Set Name</Label>
                          <InputField
                            id={`preview-tier-set-name-${activeTierSet.id}`}
                            value={activeTierSet.name}
                            placeholder="Standard Flower Pricing"
                            onChange={(value) => {
                              updateTierSetName(activeTierSet.id, value);
                            }}
                          />
                        </div>
                      ) : null}
                      <div>
                        <Label htmlFor="preview-regular-price">
                          {productType === "variable" ? "Fallback Buying Price (CNY)" : "Buying Price (CNY)"}
                        </Label>
                        <InputField
                          id="preview-regular-price"
                          type="number"
                          value={regularPrice}
                          onChange={(value) => {
                            setRegularPrice(value);
                            syncInputField("product-regular-price", value);
                            if (productType === "variable" && activeTierSet) {
                              const nextTierSets = tierSets.map((tierSet) =>
                                tierSet.id === activeTierSet.id
                                  ? { ...tierSet, fallbackPrice: value }
                                  : tierSet,
                              );
                              setTierSets(nextTierSets);
                              pushPricingStateToRealForm({ regularPrice: value, pricingTierSets: nextTierSets });
                              return;
                            }

                            pushPricingStateToRealForm({ regularPrice: value });
                          }}
                        />
                      </div>
                      <div>
                        <Label htmlFor="preview-profit-percent">Profit (%)</Label>
                        <InputField
                          id="preview-profit-percent"
                          type="number"
                          value={profitPercent}
                          onChange={(value) => {
                            setProfitPercent(value);
                            syncInputField("product-profit-percent", value);
                            pushPricingStateToRealForm({ profitPercent: value });
                          }}
                          placeholder="0"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-4 xl:flex-row xl:items-end">
                      <div className="w-full xl:max-w-[230px]">
                        <Label htmlFor="preview-pricing-type">Pricing Type</Label>
                        <PanelSelect
                          id="preview-pricing-type"
                          value={pricingType}
                          options={[
                            { value: "unit-pricing", label: "Unit Pricing" },
                            { value: "carton-pricing", label: "Carton Pricing" },
                            { value: "bundle-pricing", label: "Bundle Pricing" },
                          ]}
                          onChange={(value) => {
                            setPricingType(value);
                            syncSelectField("product-pricing-type", value === "unit-pricing" ? "unit" : "fixed");
                            if (productType === "variable" && activeTierSet) {
                              const nextPricingType: "unit" | "fixed" =
                                value === "unit-pricing" ? "unit" : "fixed";
                              const nextTierSets = tierSets.map((tierSet) =>
                                tierSet.id === activeTierSet.id
                                  ? {
                                      ...tierSet,
                                      pricingType: nextPricingType,
                                    }
                                  : tierSet,
                              );
                              setTierSets(nextTierSets);
                              pushPricingStateToRealForm({
                                pricingType: nextPricingType,
                                pricingTierSets: nextTierSets,
                              });
                              return;
                            }

                            pushPricingStateToRealForm({
                              pricingType: value === "unit-pricing" ? "unit" : "fixed",
                            });
                          }}
                        />
                      </div>

                      <button
                        type="button"
                        disabled={!canAddPricingTier}
                        onClick={() => {
                          if (productType === "variable" && activeTierSet) {
                            addTierToSet(activeTierSet.id);
                            return;
                          }

                          addSingleTier();
                        }}
                        className="inline-flex h-11 items-center justify-center rounded-lg bg-[#615FFF] px-5 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {canAddPricingTier ? "Add Tier" : `Max ${MAX_PRODUCT_PRICING_TIERS} Tiers`}
                      </button>
                    </div>

                    <div className="space-y-6">
                      {visiblePricingTiers.map((tier, index) => (
                        <div key={tier.id} className="rounded-2xl border border-gray-200 px-4 py-4 sm:px-5">
                          <div className="grid gap-4 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end">
                            <div>
                              <Label htmlFor={`preview-tier-min-${tier.id}`}>Min Qty</Label>
                              <InputField
                                id={`preview-tier-min-${tier.id}`}
                                type="number"
                                value={tier.minQty}
                                onChange={(value) => {
                                  if (productType === "variable" && activeTierSet) {
                                    updateTierSetTier(activeTierSet.id, tier.id, "minQty", value);
                                    return;
                                  }

                                  updateSingleTier(tier.id, "minQty", value);
                                }}
                              />
                            </div>
                            <div>
                              <Label htmlFor={`preview-tier-max-${tier.id}`}>Max Qty</Label>
                              <InputField
                                id={`preview-tier-max-${tier.id}`}
                                value={tier.maxQty}
                                onChange={(value) => {
                                  if (productType === "variable" && activeTierSet) {
                                    updateTierSetTier(activeTierSet.id, tier.id, "maxQty", value);
                                    return;
                                  }

                                  updateSingleTier(tier.id, "maxQty", value);
                                }}
                                placeholder="Optional"
                              />
                            </div>
                            <div>
                              <Label htmlFor={`preview-tier-price-${tier.id}`}>Buying Price (CNY)</Label>
                              <InputField
                                id={`preview-tier-price-${tier.id}`}
                                type="number"
                                value={tier.price}
                                onChange={(value) => {
                                  if (productType === "variable" && activeTierSet) {
                                    updateTierSetTier(activeTierSet.id, tier.id, "price", value);
                                    return;
                                  }

                                  updateSingleTier(tier.id, "price", value);
                                }}
                              />
                            </div>
                            <div className="flex items-end">
                              <button
                                type="button"
                                onClick={() => {
                                  if (productType === "variable" && activeTierSet) {
                                    removeTierFromSet(activeTierSet.id, tier.id);
                                    return;
                                  }

                                  removeSingleTier(tier.id);
                                }}
                                className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-gray-300 text-rose-500 shadow-sm hover:bg-rose-50"
                                aria-label={`Delete tier ${index + 1}`}
                              >
                                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                                  <path d="M7.125 3.375H10.875M4.875 5.625H13.125M6 5.625L6.375 12.375C6.42939 13.3549 7.2399 14.125 8.22134 14.125H9.77866C10.7601 14.125 11.5706 13.3549 11.625 12.375L12 5.625" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}

                      {productType === "variable" && tierSets.length > 1 && activeTierSet ? (
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => removeTierSet(activeTierSet.id)}
                            className="text-sm font-medium text-rose-600 transition-colors hover:text-rose-700"
                          >
                            Remove Active Tier Set
                          </button>
                        </div>
                      ) : null}
                    </div>

                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {activeTab === "shipping" ? (
            <div className="space-y-6">
              <SectionHeading title="Shipping" description="Assign CNDS shipping and review the selected profile pricing." />
              <div className="grid gap-6 xl:grid-cols-3">
                <div className="xl:col-span-3">
                  <Label htmlFor="preview-cnds-shipping-profile">CNDS Shipping Profile</Label>
                  <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
                    <PanelSelect
                      id="preview-cnds-shipping-profile"
                      value={cndsProfileValue}
                      options={cndsProfileOptions}
                      onChange={(value) => {
                        setCndsProfileValue(value);
                        syncSelectField("product-cnds-shipping-profile", value);
                      }}
                    />
                    <button
                      type="button"
                      onClick={openCreateCndsEditor}
                      disabled={!cndsVendorId}
                      className="inline-flex h-11 items-center justify-center rounded-lg border border-[#615FFF]/30 bg-white px-4 text-sm font-semibold text-[#615FFF] shadow-sm transition-colors hover:bg-[#615FFF]/5 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                    >
                      Add CNDS
                    </button>
                    {selectedCndsProfile ? (
                      <button
                        type="button"
                        onClick={openEditCndsEditor}
                        className="inline-flex h-11 items-center justify-center rounded-lg bg-[#615FFF] px-4 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
                      >
                        Edit CNDS
                      </button>
                    ) : (
                      <span className="inline-flex h-11 cursor-not-allowed items-center justify-center rounded-lg bg-slate-200 px-4 text-sm font-semibold text-slate-500">
                        Edit CNDS
                      </span>
                    )}
                  </div>
                </div>
                <div className="xl:col-span-3">
                  <div className="rounded-2xl border border-gray-200 bg-gray-50/60 p-4">
                    {cndsProfilesLoading ? (
                      <p className="text-sm font-medium text-gray-600">Loading CNDS pricing...</p>
                    ) : selectedCndsProfile ? (
                      <div className="space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{selectedCndsProfile.name}</p>
                            <p className="mt-1 text-xs text-gray-500">
                              {selectedCndsProfile.pricing_type === "unit"
                                ? "Per unit CNDS charge"
                                : "Fixed CNDS charge by quantity range"}
                            </p>
                          </div>
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#615FFF] ring-1 ring-[#615FFF]/20">
                            {selectedCndsProfile.tiers.length} tier{selectedCndsProfile.tiers.length === 1 ? "" : "s"}
                          </span>
                        </div>

                        {selectedCndsProfile.tiers.length > 0 ? (
                          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                            <div className="grid grid-cols-3 border-b border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-500">
                              <span>Min Qty</span>
                              <span>Max Qty</span>
                              <span className="text-right">CNDS Price</span>
                            </div>
                            {selectedCndsProfile.tiers.map((tier, index) => (
                              <div
                                key={`${selectedCndsProfile.id}-${index}`}
                                className="grid grid-cols-3 border-b border-gray-100 px-3 py-2 text-sm text-gray-700 last:border-b-0"
                              >
                                <span>{tier.min_qty}</span>
                                <span>{tier.max_qty ?? "No limit"}</span>
                                <span className="text-right font-semibold text-gray-900">৳{tier.price.toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">This CNDS profile has no pricing tiers yet.</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">Select a CNDS shipping profile to see its pricing tiers here.</p>
                    )}
                  </div>
                </div>
                <div>
                  <Label htmlFor="preview-length">Length (cm)</Label>
                  <InputField id="preview-length" value="120" onChange={() => undefined} />
                </div>
                <div>
                  <Label htmlFor="preview-width">Width (cm)</Label>
                  <InputField id="preview-width" value="23" onChange={() => undefined} />
                </div>
              </div>
            </div>
          ) : null}

          {activeTab === "attributes" ? (
            <div className="space-y-6">
              <SectionHeading title="Attributes" description="Use attributes to create filters and variable product options." />
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={productType === "simple" && attributes.length >= 1}
                  onClick={() => {
                    if (productType === "simple") {
                      return;
                    }

                    triggerRealAttributeAdd();
                  }}
                  className="inline-flex items-center justify-center rounded-lg border border-[#615FFF]/30 bg-white px-4 py-2.5 text-sm font-medium text-[#615FFF] shadow-sm hover:bg-[#615FFF]/5 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Add new
                </button>
              </div>
              <div className="space-y-4">
                {attributes.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-gray-300 px-6 py-10 text-center text-sm text-gray-500">
                    No attributes yet. Add one to start building product options.
                  </div>
                ) : (
                  attributes.map((attribute, index) => {
                    const isOpen = openAttributeId === attribute.id;
                    const title = attribute.name.trim() || `Attribute ${index + 1}`;
                    const draft = attributeDrafts[attribute.id] ?? {
                      name: attribute.name,
                      values: attribute.values,
                    };

                    return (
                      <div key={attribute.id} className="rounded-xl border border-gray-200">
                        <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-5 py-4">
                          <h5 className="text-sm font-semibold uppercase tracking-wide text-gray-800">{title}</h5>
                          <div className="flex items-center gap-4">
                            <button
                              type="button"
                              onClick={() => {
                                const realRemoveButton = document.querySelector<HTMLButtonElement>(
                                  `[data-product-attribute-remove-id='${attribute.id}']`,
                                );
                                realRemoveButton?.click();
                              }}
                              className="text-sm font-medium text-rose-500 hover:text-rose-600"
                            >
                              Remove
                            </button>
                            <button
                              type="button"
                              onClick={() => setOpenAttributeId(isOpen ? null : attribute.id)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-white"
                            >
                              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true" className={`transition-transform ${isOpen ? "rotate-180" : ""}`}>
                                <path d="M4.5 6.75L9 11.25L13.5 6.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </button>
                          </div>
                        </div>
                        {isOpen ? (
                          <div className="space-y-6 p-5 sm:p-6">
                            <div className="grid gap-6 xl:grid-cols-[220px_minmax(0,1fr)]">
                              <div>
                                <Label htmlFor={`preview-attribute-name-${attribute.id}`}>Name</Label>
                                <InputField
                                  id={`preview-attribute-name-${attribute.id}`}
                                  value={draft.name}
                                  placeholder="e.g. Color, Size"
                                  onChange={(value) => {
                                    setAttributeDrafts((current) => ({
                                      ...current,
                                      [attribute.id]: {
                                        ...(current[attribute.id] ?? { name: attribute.name, values: attribute.values }),
                                        name: value,
                                      },
                                    }));
                                  }}
                                />
                              </div>
                              <div>
                                <Label htmlFor={`preview-attribute-values-${attribute.id}`}>Value(s)</Label>
                                <textarea
                                  id={`preview-attribute-values-${attribute.id}`}
                                  value={draft.values}
                                  placeholder="Format: Red | Blue | Black"
                                  onChange={(event) => {
                                    const nextValue = event.target.value;
                                    setAttributeDrafts((current) => ({
                                      ...current,
                                      [attribute.id]: {
                                        ...(current[attribute.id] ?? { name: attribute.name, values: attribute.values }),
                                        values: nextValue,
                                      },
                                    }));
                                  }}
                                  className="h-11 w-full resize-none rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-sm placeholder:text-gray-400 focus:border-[#615FFF]/40 focus:outline-none focus:ring-4 focus:ring-[#615FFF]/10"
                                />
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                saveAttributeDraft(attribute.id);
                              }}
                              className="inline-flex items-center justify-center rounded-lg bg-[#615FFF] px-5 py-3 text-sm font-medium text-white shadow-sm hover:opacity-90"
                            >
                              {savedAttributeId === attribute.id ? "Saved" : "Attributes Save"}
                            </button>
                          </div>
                        ) : null}
                      </div>
                    );
                  })
                )}
              </div>
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 px-4 py-3 text-sm text-emerald-700">
                Simple product supports one attribute set, while variable product supports multiple attributes. Attribute changes sync to the real product form when you click Attributes Save and persist to the database on Draft or Publish Product.
              </div>
            </div>
          ) : null}

          {activeTab === "variations" ? (
            <div className="space-y-6">
              <SectionHeading title="Variations" description="Create multiple purchasable versions from your product attributes." />
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const payload = getCurrentAttributeBridgePayload();
                    setAttributes((current) =>
                      current.map((attribute) => {
                        const nextAttribute = payload.find((item) => item.id === attribute.id);
                        return nextAttribute ? { ...attribute, name: nextAttribute.name, values: nextAttribute.values } : attribute;
                      }),
                    );
                    if (typeof window !== "undefined") {
                      window.dispatchEvent(
                        new CustomEvent("prelize:generate-variations", {
                          detail: {
                            attributes: payload,
                          },
                        }),
                      );
                    }
                  }}
                  className="inline-flex items-center justify-center rounded-lg border border-[#615FFF]/30 bg-white px-4 py-2.5 text-sm font-medium text-[#615FFF] shadow-sm hover:bg-[#615FFF]/5"
                >
                  Generate variations
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const realAddButton = document.getElementById("product-variations-add") as HTMLButtonElement | null;
                    realAddButton?.click();
                  }}
                  className="inline-flex items-center justify-center rounded-lg border border-[#615FFF]/30 bg-white px-4 py-2.5 text-sm font-medium text-[#615FFF] shadow-sm hover:bg-[#615FFF]/5"
                >
                  Add manually
                </button>
              </div>
              {variations.length === 0 ? (
                <div className="flex min-h-[280px] flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 px-6 py-12 text-center">
                  <div className="mb-5 text-gray-300">
                    <svg width="72" height="72" viewBox="0 0 72 72" fill="none" aria-hidden="true">
                      <path d="M36 16 49 29H41V47H31V29H23L36 16Z" fill="currentColor" />
                      <circle cx="53" cy="49" r="10" fill="currentColor" />
                    </svg>
                  </div>
                  <p className="max-w-[420px] text-sm text-gray-500">No variations yet. Generate them from all added attributes or add a new variation manually.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {variations.map((variation, index) => (
                    <div key={variation.id} className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
                      <div className="mb-4 flex items-start justify-between gap-3">
                        <div>
                          <h5 className="text-sm font-semibold text-gray-800">
                            {variation.name.trim() || `Variation ${index + 1}`}
                          </h5>
                          {variation.summary ? (
                            <p className="mt-1 text-xs text-gray-500">{variation.summary}</p>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setVariations((current) =>
                              current.filter((currentVariation) => currentVariation.id !== variation.id),
                            );
                            if (typeof window !== "undefined") {
                              window.dispatchEvent(
                                new CustomEvent("prelize:remove-variation", {
                                  detail: {
                                    variationId: variation.id,
                                  },
                                }),
                              );
                            }
                          }}
                          className="text-sm font-medium text-rose-500 hover:text-rose-600"
                        >
                          Remove
                        </button>
                      </div>

                      <div className="grid gap-4 md:grid-cols-[72px_minmax(0,1.2fr)_minmax(0,1.2fr)_110px_110px_130px] md:items-end">
                        <div>
                          <button
                            type="button"
                            onClick={() => {
                              if (typeof window !== "undefined") {
                                window.dispatchEvent(
                                  new CustomEvent("prelize:open-media-modal", {
                                    detail: {
                                      target: `variation:${variation.id}`,
                                    },
                                  }),
                                );
                              }
                            }}
                            className="group relative flex h-[70px] w-[70px] items-center justify-center overflow-hidden rounded-xl border border-dashed border-gray-300 bg-white"
                          >
                            {variation.imageUrl ? (
                              <>
                                <div
                                  role="img"
                                  aria-label={`${variation.name || `Variation ${index + 1}`} image`}
                                  className="h-full w-full bg-cover bg-center"
                                  style={{ backgroundImage: `url("${variation.imageUrl}")` }}
                                />
                                <span
                                  className="absolute right-1 top-1 z-10 inline-flex h-5 w-5 items-center justify-center rounded-full border border-white bg-red-500 text-white opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
                                  onClick={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    setVariations((current) =>
                                      current.map((currentVariation) =>
                                        currentVariation.id === variation.id
                                          ? { ...currentVariation, imageUrl: "" }
                                          : currentVariation,
                                      ),
                                    );
                                    if (typeof window !== "undefined") {
                                      window.dispatchEvent(
                                        new CustomEvent("prelize:set-variation-image", {
                                          detail: {
                                            variationId: variation.id,
                                            imageUrl: "",
                                          },
                                        }),
                                      );
                                    }
                                  }}
                                >
                                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                                    <path d="M2 2L8 8M8 2L2 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                  </svg>
                                </span>
                              </>
                            ) : (
                              <span className="px-2 text-center text-[11px] font-medium leading-4 text-gray-400">Select Image</span>
                            )}
                          </button>
                        </div>
                        <div>
                          <Label htmlFor={`preview-variation-name-${variation.id}`}>Variation Name</Label>
                          <InputField
                            id={`preview-variation-name-${variation.id}`}
                            value={variation.name}
                            placeholder="e.g. Red / M"
                            onChange={(value) => {
                              const realInput = document.getElementById(`variation-name-${variation.id}`) as HTMLInputElement | null;
                              if (!realInput) {
                                return;
                              }
                              realInput.value = value;
                              realInput.dispatchEvent(new Event("input", { bubbles: true }));
                            }}
                          />
                        </div>
                        <div>
                        <Label htmlFor={`preview-variation-tier-set-${variation.id}`}>Pricing Tier Set</Label>
                        <PanelSelect
                          id={`preview-variation-tier-set-${variation.id}`}
                          value={variation.pricingTierSetId}
                          options={[
                            { value: "", label: "Select" },
                            ...tierSets.map((tierSet, index) => ({
                                value: tierSet.id,
                                label: tierSet.name.trim() || `Tier Set ${index + 1}`,
                              })),
                            ]}
                            onChange={(value) => {
                              const realSelect = document.getElementById(`variation-tier-set-${variation.id}`) as HTMLSelectElement | null;
                              if (!realSelect) {
                                return;
                              }
                              realSelect.value = value;
                              realSelect.dispatchEvent(new Event("change", { bubbles: true }));
                            }}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`preview-variation-moq-${variation.id}`}>MOQ</Label>
                          <InputField
                            id={`preview-variation-moq-${variation.id}`}
                            type="number"
                            value={variation.moq}
                            onChange={(value) => {
                              const realInput = document.getElementById(`variation-moq-${variation.id}`) as HTMLInputElement | null;
                              if (!realInput) {
                                return;
                              }
                              realInput.value = value;
                              realInput.dispatchEvent(new Event("input", { bubbles: true }));
                            }}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`preview-variation-stock-${variation.id}`}>Stock</Label>
                          <InputField
                            id={`preview-variation-stock-${variation.id}`}
                            type="number"
                            value={variation.stock}
                            onChange={(value) => {
                              const realInput = document.getElementById(`variation-stock-${variation.id}`) as HTMLInputElement | null;
                              if (!realInput) {
                                return;
                              }
                              realInput.value = value;
                              realInput.dispatchEvent(new Event("input", { bubbles: true }));
                            }}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`preview-variation-weight-${variation.id}`}>Weight (kg)</Label>
                          <InputField
                            id={`preview-variation-weight-${variation.id}`}
                            type="number"
                            value={variation.weight}
                            onChange={(value) => {
                              if (typeof window !== "undefined") {
                                window.dispatchEvent(
                                  new CustomEvent("prelize:set-variation-weight", {
                                    detail: {
                                      variationId: variation.id,
                                      weight: value,
                                    },
                                  }),
                                );
                              }
                              const realInput = document.getElementById(`variation-weight-${variation.id}`) as HTMLInputElement | null;
                              if (!realInput) {
                                return;
                              }
                              realInput.value = value;
                              realInput.dispatchEvent(new Event("input", { bubbles: true }));
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {isCndsEditorOpen ? (
        <div className="fixed inset-0 z-[1000000] flex items-center justify-center bg-slate-950/50 px-4 py-8 backdrop-blur-[2px]">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
            <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-5 sm:px-6 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-base font-semibold text-gray-900">
                  {editingCndsProfileId ? "Edit CNDS Profile" : "Add CNDS Profile"}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Configure China domestic shipping tiers without leaving this product.
                </p>
              </div>
              <button
                type="button"
                onClick={closeCndsEditor}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-lg text-slate-500 transition-colors hover:border-[#615FFF]/30 hover:text-slate-900"
                aria-label="Close CNDS editor"
              >
                x
              </button>
            </div>

            <div className="max-h-[calc(90vh-88px)] overflow-y-auto px-5 py-5 sm:px-6">
              {cndsEditorError ? (
                <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600">
                  {cndsEditorError}
                </div>
              ) : null}

              {!cndsVendorId ? (
                <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
                  Select a vendor before adding a CNDS profile.
                </div>
              ) : null}

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="inline-cnds-name">Profile Name</Label>
                  <InputField
                    id="inline-cnds-name"
                    value={cndsEditorDraft.name}
                    onChange={(value) => updateCndsDraftField("name", value)}
                    placeholder="Test CNDS"
                  />
                </div>
                <div>
                  <Label htmlFor="inline-cnds-pricing-type">Pricing Type</Label>
                  <PanelSelect
                    id="inline-cnds-pricing-type"
                    value={cndsEditorDraft.pricingType}
                    options={[
                      { value: "fixed", label: "Fixed" },
                      { value: "unit", label: "Per Unit" },
                    ]}
                    onChange={(value) => updateCndsDraftField("pricingType", value as CndsShippingPricingType)}
                  />
                </div>
              </div>

              <div className="mt-4">
                <label htmlFor="inline-cnds-description" className="mb-1.5 block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  id="inline-cnds-description"
                  rows={3}
                  value={cndsEditorDraft.description}
                  onChange={(event) => updateCndsDraftField("description", event.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-3 text-sm text-gray-800 shadow-sm outline-none transition-colors focus:border-[#615FFF]/40 focus:ring-4 focus:ring-[#615FFF]/10"
                  placeholder="Optional internal note"
                />
              </div>

              <label className="mt-4 inline-flex items-center gap-3 rounded-xl border border-gray-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={cndsEditorDraft.isActive}
                  onChange={(event) => updateCndsDraftField("isActive", event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-[#615FFF] focus:ring-[#615FFF]"
                />
                Active Profile
              </label>

              <div className="mt-6 rounded-2xl border border-gray-200 bg-slate-50 p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">CNDS Tiers</p>
                    <p className="text-xs text-slate-500">Set quantity ranges and CNDS cost.</p>
                  </div>
                  <button
                    type="button"
                    onClick={addCndsTierDraft}
                    className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-[#615FFF]/40 hover:text-slate-900"
                  >
                    Add Tier
                  </button>
                </div>

                <div className="space-y-4">
                  {cndsEditorDraft.tiers.map((tier, index) => (
                    <div key={tier.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-slate-900">Tier {index + 1}</p>
                        <button
                          type="button"
                          onClick={() => removeCndsTierDraft(tier.id)}
                          disabled={cndsEditorDraft.tiers.length === 1}
                          className="text-sm font-medium text-rose-500 disabled:cursor-not-allowed disabled:text-slate-300"
                        >
                          Remove
                        </button>
                      </div>

                      <div className="grid gap-3 md:grid-cols-3">
                        <div>
                          <Label htmlFor={`inline-cnds-min-${tier.id}`}>Min Qty</Label>
                          <InputField
                            id={`inline-cnds-min-${tier.id}`}
                            type="number"
                            value={tier.minQty}
                            onChange={(value) => updateCndsTierDraft(tier.id, "minQty", value)}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`inline-cnds-max-${tier.id}`}>Max Qty</Label>
                          <InputField
                            id={`inline-cnds-max-${tier.id}`}
                            type="number"
                            value={tier.maxQty}
                            onChange={(value) => updateCndsTierDraft(tier.id, "maxQty", value)}
                            placeholder="No limit"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`inline-cnds-price-${tier.id}`}>CNDS Price</Label>
                          <InputField
                            id={`inline-cnds-price-${tier.id}`}
                            type="number"
                            value={tier.price}
                            onChange={(value) => updateCndsTierDraft(tier.id, "price", value)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-gray-100 pt-5">
                <button
                  type="button"
                  onClick={() => void saveCndsEditor()}
                  disabled={isSavingCnds || !cndsVendorId}
                  className="inline-flex items-center justify-center rounded-lg bg-[#615FFF] px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSavingCnds ? "Saving..." : editingCndsProfileId ? "Update CNDS" : "Create CNDS"}
                </button>
                <button
                  type="button"
                  onClick={closeCndsEditor}
                  disabled={isSavingCnds}
                  className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-[#615FFF]/40 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
