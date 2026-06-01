"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import { addToQuote } from "@/components/quote/quote-utils";
import { calculateInternationalShippingEstimate, calculateTotalWeightKg, formatDeliveryWindow } from "@/lib/international-shipping/utils";
import { calculateProductGroupPricing } from "@/lib/product-pricing";
import type { Product } from "@/types/product";
import type {
  CndsShippingProfileRow,
  InternationalShippingMethodRow,
  ProductAttribute,
  ProductDbRow,
  ResolvedProductPricingConfig,
  ProductDbVariantRow,
} from "@/types/product-db";
import {
  isProductInWishlist,
  toggleWishlistProduct,
  WISHLIST_UPDATED_EVENT,
} from "@/components/wishlist/wishlist-utils";

const MAX_QUANTITY = 9999;
const PAY_ON_DELIVERY_PLACEHOLDER = "Pending review";

type ProductOption = {
  id: string;
  image: string;
  label: string;
  variantName: string | null;
  variantValue: string | null;
  price: number;
  moq: number;
  stock: number;
  weight: number | null;
  attributeValues: Record<string, string>;
};

type ProductOptionAttribute = {
  name: string;
  values: string[];
};

type AttributeImageMap = Record<string, Record<string, string>>;

function formatCurrency(value: number) {
  return `\u09F3${value.toLocaleString()}`;
}

function getEffectivePrice(regularPrice: number, discountPrice: number | null) {
  return discountPrice !== null && discountPrice > 0 && discountPrice < regularPrice
    ? discountPrice
    : regularPrice;
}

function buildOptionAttributes(
  productRecord: ProductDbRow,
  variants: ProductDbVariantRow[],
): ProductOptionAttribute[] {
  const productAttributes = (productRecord.attributes ?? []).filter(
    (attribute): attribute is ProductAttribute =>
      attribute.name.trim().length > 0 && Array.isArray(attribute.values) && attribute.values.length > 0,
  );

  if (productAttributes.length > 0) {
    return productAttributes.map((attribute) => ({
      name: attribute.name,
      values: attribute.values.filter((value) => value.trim().length > 0),
    }));
  }

  const attributeMap = new Map<string, Set<string>>();

  variants.forEach((variant) => {
    Object.entries(variant.attribute_values ?? {}).forEach(([name, value]) => {
      if (!name.trim() || !String(value).trim()) {
        return;
      }

      const currentValues = attributeMap.get(name) ?? new Set<string>();
      currentValues.add(String(value));
      attributeMap.set(name, currentValues);
    });
  });

  return Array.from(attributeMap.entries()).map(([name, values]) => ({
    name,
    values: Array.from(values),
  }));
}

function buildProductOptions(
  product: Product,
  productRecord: ProductDbRow,
  variants: ProductDbVariantRow[],
  productPricingConfig: ResolvedProductPricingConfig,
): ProductOption[] {
  const tierSetById = new Map(
    (productPricingConfig.variant_tier_sets ?? []).map((tierSet) => [tierSet.id, tierSet]),
  );

  if (productRecord.product_type === "variable" && variants.length > 0) {
    return variants.map((variant) => {
      const assignedTierSet =
        variant.pricing_tier_set_id ? tierSetById.get(variant.pricing_tier_set_id) ?? null : null;
      const variantRegularPrice =
        variant.regular_price && variant.regular_price > 0
          ? variant.regular_price
          : variant.price > 0
            ? variant.price
            : productRecord.regular_price ?? productRecord.price;

      return {
        id: variant.id,
        image: variant.image_url ?? productRecord.image_url ?? product.image,
        label: variant.name,
        variantName:
          Object.keys(variant.attribute_values ?? {}).join(" / ").trim() || (variant.name.trim().length > 0 ? "Variant" : null),
        variantValue: (
          variant.value ??
          Object.values(variant.attribute_values ?? {})
            .map((value) => String(value).trim())
            .filter(Boolean)
            .join(" / ")
        ) || variant.name,
        price:
          assignedTierSet?.fallback_price ??
          getEffectivePrice(variantRegularPrice, variant.discount_price),
        moq: variant.moq,
        stock: Math.max(0, variant.stock ?? 0),
        weight: typeof variant.weight === "number" && Number.isFinite(variant.weight) ? variant.weight : null,
        attributeValues: Object.fromEntries(
          Object.entries(variant.attribute_values ?? {}).map(([key, value]) => [key, String(value)]),
        ),
      };
    });
  }

  return [
    {
      id: productRecord.id,
      image: productRecord.image_url ?? product.image,
      label: "Default",
      variantName: null,
      variantValue: null,
      price: getEffectivePrice(productRecord.regular_price ?? productRecord.price, productRecord.discount_price ?? null),
      moq: productRecord.moq,
      stock: 0,
      weight:
        productRecord.weight == null
          ? null
          : Number.isFinite(Number(productRecord.weight))
            ? Number(productRecord.weight)
            : null,
      attributeValues: {},
    },
  ];
}

function buildAttributeImageMap(options: ProductOption[]): AttributeImageMap {
  const nextMap: AttributeImageMap = {};

  options.forEach((option) => {
    Object.entries(option.attributeValues).forEach(([attributeName, attributeValue]) => {
      const normalizedName = attributeName.trim();
      const normalizedValue = attributeValue.trim();

      if (!normalizedName || !normalizedValue || !option.image) {
        return;
      }

      if (!nextMap[normalizedName]) {
        nextMap[normalizedName] = {};
      }

      if (!nextMap[normalizedName][normalizedValue]) {
        nextMap[normalizedName][normalizedValue] = option.image;
      }
    });
  });

  return nextMap;
}

function shouldUseImageSelector(
  attributeName: string,
  values: string[],
  attributeImageMap: AttributeImageMap,
) {
  const normalizedName = attributeName.trim().toLowerCase();
  const isImageFriendlyAttribute = normalizedName === "color" || normalizedName === "colour";

  if (!isImageFriendlyAttribute) {
    return false;
  }

  return values.every((value) => {
    const imageUrl = attributeImageMap[attributeName]?.[value];
    return typeof imageUrl === "string" && imageUrl.trim().length > 0;
  });
}

function buildDefaultSelectedAttributes(
  attributes: ProductOptionAttribute[],
  attributeImageMap: AttributeImageMap,
) {
  return Object.fromEntries(
    attributes
      .filter((attribute) => shouldUseImageSelector(attribute.name, attribute.values, attributeImageMap))
      .map((attribute) => [attribute.name, attribute.values[0] ?? ""]),
  );
}

function calculateCndsCost(
  quantity: number,
  cndsProfile: CndsShippingProfileRow | null,
) {
  if (!cndsProfile || quantity <= 0) {
    return 0;
  }

  const matchedTier =
    cndsProfile.tiers.find(
      (tier) => quantity >= tier.min_qty && (tier.max_qty === null || quantity <= tier.max_qty),
    ) ?? null;

  if (!matchedTier) {
    return 0;
  }

  return cndsProfile.pricing_type === "unit" ? quantity * matchedTier.price : matchedTier.price;
}

function setStorefrontProductImage(imageUrl: string) {
  if (typeof window === "undefined" || !imageUrl.trim()) {
    return;
  }

  window.dispatchEvent(
    new CustomEvent("prelize:set-storefront-product-image", {
      detail: { imageUrl },
    }),
  );
}

function StarRating({ activeCount = 5 }: { activeCount?: number }) {
  return (
    <div className="flex items-center gap-1 text-amber-400">
      {Array.from({ length: 5 }).map((_, index) => (
        <svg
          key={index}
          aria-hidden="true"
          viewBox="0 0 20 20"
          className={`h-4 w-4 ${index < activeCount ? "fill-current" : "fill-slate-200"}`}
        >
          <path d="M10 1.8 12.5 7l5.7.8-4.1 4 1 5.6L10 14.7l-5.1 2.7 1-5.6-4.1-4 5.7-.8L10 1.8Z" />
        </svg>
      ))}
    </div>
  );
}

function SummaryRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-200 py-4 last:border-b-0">
      <span className={strong ? "text-sm font-semibold text-slate-900" : "text-sm text-slate-700"}>
        {label}
      </span>
      <span
        className={
          strong ? "text-sm font-semibold text-[#615FFF]" : "text-sm font-medium text-slate-700"
        }
      >
        {value}
      </span>
    </div>
  );
}

function WishlistIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
    >
      <path
        d="M12 20.5s-6.5-4.3-8.6-8C1.8 9.7 3 6.5 6.3 5.5c2-.6 4 .1 5.7 2 1.7-1.9 3.7-2.6 5.7-2 3.3 1 4.5 4.2 2.9 7-2.1 3.7-8.6 8-8.6 8Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M10 14 21 3" strokeLinecap="round" />
      <path d="M15 3h6v6" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M21 14v4a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3h4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-12 w-12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <circle cx="12" cy="12" r="8" />
      <path d="m8.5 12 2.3 2.3L15.7 9.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M6 6 18 18" strokeLinecap="round" />
      <path d="M18 6 6 18" strokeLinecap="round" />
    </svg>
  );
}

function QuantityControl({
  quantity,
  onDecrease,
  onIncrease,
  onInputChange,
}: {
  quantity: number;
  onDecrease: () => void;
  onIncrease: () => void;
  onInputChange: (value: number) => void;
}) {
  const isDecrementDisabled = quantity === 0;

  return (
    <div className="inline-flex h-11 shrink-0 items-center overflow-hidden rounded-lg border border-slate-300 bg-white shadow-sm">
      <button
        type="button"
        onClick={onDecrease}
        disabled={isDecrementDisabled}
        className="inline-flex h-full w-10 shrink-0 items-center justify-center text-lg text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-700 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-white"
        aria-label="Decrease quantity"
      >
        <span className="-mt-0.5">-</span>
      </button>
      <input
        type="number"
        min="0"
        max={MAX_QUANTITY}
        value={quantity}
        onChange={(event) => onInputChange(Number(event.target.value) || 0)}
        className="h-full w-14 min-w-0 border-x border-slate-300 px-2 text-center text-sm font-semibold text-slate-800 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        aria-label="Quantity input"
      />
      <button
        type="button"
        onClick={onIncrease}
        className="inline-flex h-full w-10 shrink-0 items-center justify-center text-lg text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-700"
        aria-label="Increase quantity"
      >
        <span className="-mt-0.5">+</span>
      </button>
    </div>
  );
}

export default function ProductDetailsPurchasePanel({
  product,
  productRecord,
  variants,
  productPricingConfig,
  cndsProfile,
  internationalShippingMethods,
  soldCount,
}: {
  product: Product;
  productRecord: ProductDbRow;
  variants: ProductDbVariantRow[];
  productPricingConfig: ResolvedProductPricingConfig;
  cndsProfile: CndsShippingProfileRow | null;
  internationalShippingMethods: InternationalShippingMethodRow[];
  soldCount: number;
}) {
  const router = useRouter();
  const reviewCount = product.reviews?.length ?? 0;
  const averageRating =
    reviewCount > 0
      ? (product.reviews ?? []).reduce((sum, review) => sum + (typeof review.rating === "number" ? review.rating : 0), 0) / reviewCount
      : 0;
  const roundedAverageRating = Math.max(0, Math.min(5, Math.round(averageRating)));
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [showCartPopup, setShowCartPopup] = useState(false);
  const [isProcessingCartAction, setIsProcessingCartAction] = useState(false);
  const [lastAddedOptionCount, setLastAddedOptionCount] = useState(0);
  const [cartErrorMessage, setCartErrorMessage] = useState("");
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({});
  const [selectedShippingMethodId, setSelectedShippingMethodId] = useState<string>(
    internationalShippingMethods[0]?.id ?? "",
  );
  const optionAttributes = useMemo(
    () => buildOptionAttributes(productRecord, variants),
    [productRecord, variants],
  );
  const productOptions = useMemo(
    () => buildProductOptions(product, productRecord, variants, productPricingConfig),
    [product, productPricingConfig, productRecord, variants],
  );
  const attributeImageMap = useMemo(() => buildAttributeImageMap(productOptions), [productOptions]);
  const visibleOptionAttributes = useMemo(
    () =>
      optionAttributes.filter((attribute) =>
        shouldUseImageSelector(attribute.name, attribute.values, attributeImageMap),
      ),
    [attributeImageMap, optionAttributes],
  );
  const optionColumnLabel = useMemo(
    () =>
      optionAttributes.find(
        (attribute) =>
          !shouldUseImageSelector(attribute.name, attribute.values, attributeImageMap),
      )?.name ?? "Option",
    [attributeImageMap, optionAttributes],
  );
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  useEffect(() => {
    const updateWishlistState = () => {
      setIsWishlisted(isProductInWishlist(product.id));
    };

    updateWishlistState();
    window.addEventListener(WISHLIST_UPDATED_EVENT, updateWishlistState);

    return () => {
      window.removeEventListener(WISHLIST_UPDATED_EVENT, updateWishlistState);
    };
  }, [product.id]);

  useEffect(() => {
    setSelectedAttributes(buildDefaultSelectedAttributes(optionAttributes, attributeImageMap));
    setQuantities(Object.fromEntries(productOptions.map((option) => [option.id, 0])));
    setSelectedShippingMethodId(internationalShippingMethods[0]?.id ?? "");
  }, [attributeImageMap, internationalShippingMethods, optionAttributes, product.id, productOptions]);

  const selectedShippingMethod = useMemo(
    () =>
      internationalShippingMethods.find((method) => method.id === selectedShippingMethodId) ??
      internationalShippingMethods[0] ??
      null,
    [internationalShippingMethods, selectedShippingMethodId],
  );

  const filteredOptions = useMemo(() => {
    return productOptions.filter((option) =>
      Object.entries(selectedAttributes).every(
        ([attributeName, selectedValue]) =>
          !selectedValue || option.attributeValues[attributeName] === selectedValue,
      ),
    );
  }, [productOptions, selectedAttributes]);

  const totals = useMemo(() => {
    const quantity = productOptions.reduce((sum, option) => sum + (quantities[option.id] ?? 0), 0);
    const variantAssignmentMap = new Map(
      (productPricingConfig.variant_assignments ?? []).map((assignment) => [assignment.variant_id, assignment.tier_set_id]),
    );
    const variantTierSetMap = new Map(
      (productPricingConfig.variant_tier_sets ?? []).map((tierSet) => [tierSet.id, tierSet]),
    );
    const pricing = calculateProductGroupPricing(
      productOptions.map((option) => {
        const assignedTierSetId = option.id !== product.id ? variantAssignmentMap.get(option.id) ?? null : null;
        const assignedTierSet = assignedTierSetId ? variantTierSetMap.get(assignedTierSetId) ?? null : null;

        return {
          productId: productRecord.id,
          name: product.name,
          image: option.image,
          variation: option.label,
          variantId: option.id !== product.id ? option.id : null,
          variantName: option.variantName,
          variantValue: option.variantValue,
          basePrice: option.price,
          price: option.price,
          quantity: quantities[option.id] ?? 0,
          productPricing: {
            pricingType: productPricingConfig.pricing_type,
            tiers: productPricingConfig.tiers,
            source: productPricingConfig.source,
            profileId: productPricingConfig.profile_id,
            profileName: productPricingConfig.profile_name,
          },
          variantPricing:
            productRecord.product_type === "variable" && assignedTierSet
              ? {
                  tierSetId: assignedTierSet.id,
                  tierSetName: assignedTierSet.name,
                  fallbackPrice: assignedTierSet.fallback_price,
                  pricingType: assignedTierSet.pricing_type,
                  tiers: assignedTierSet.tiers,
                }
              : null,
        };
      }),
    );
    const productPrice = pricing.totalPrice;
    const cndsCost = calculateCndsCost(quantity, cndsProfile);
    const payNow = productPrice + cndsCost;
    const { totalWeightKg, hasUnknownWeight } = calculateTotalWeightKg(
      productOptions.map((option) => ({
        weight: option.weight,
        quantity: quantities[option.id] ?? 0,
      })),
    );
    const internationalShipping = calculateInternationalShippingEstimate(
      selectedShippingMethod,
      totalWeightKg,
      hasUnknownWeight,
    );

    return {
      quantity,
      pricing,
      productPrice,
      cndsCost,
      payNow,
      totalWeightKg,
      internationalShipping,
    };
  }, [cndsProfile, product.id, product.name, productOptions, productPricingConfig, productRecord.id, quantities, selectedShippingMethod]);
  const unitPriceByOptionId = useMemo(
    () =>
      new Map(
        productOptions.map((option, index) => [
          option.id,
          totals.pricing.itemUnitPrices[index] ?? option.price,
        ]),
      ),
    [productOptions, totals.pricing.itemUnitPrices],
  );
  const displayPriceByOptionId = useMemo(
    () =>
      new Map(
        productOptions.map((option) => {
          const selectedQuantity = quantities[option.id] ?? 0;
          const calculatedUnitPrice = unitPriceByOptionId.get(option.id) ?? option.price;

          return [option.id, selectedQuantity > 0 ? calculatedUnitPrice : option.price];
        }),
      ),
    [productOptions, quantities, unitPriceByOptionId],
  );

  const updateQuantity = (optionId: string, nextQuantity: number) => {
    const option = productOptions.find((item) => item.id === optionId);
    const trackedStock = option && option.stock > 0 ? option.stock : null;

    setQuantities((current) => ({
      ...current,
      [optionId]: Math.min(trackedStock ?? MAX_QUANTITY, MAX_QUANTITY, Math.max(0, nextQuantity)),
    }));
    setCartErrorMessage("");
  };

  const getSelectedOptions = () => {
    return productOptions.filter((option) => (quantities[option.id] ?? 0) > 0);
  };

  const addSelectedOptionsToCart = () => {
    const selectedOptions = getSelectedOptions();

    if (selectedOptions.length === 0) {
      setCartErrorMessage("Please select quantity first.");
      return 0;
    }

    setCartErrorMessage("");
    selectedOptions.forEach((option) => {
      addToQuote({
        productId: product.id,
        name: product.name,
        image: option.image,
        productSlug: product.slug,
        variation: option.label,
        variantId: option.id !== product.id ? option.id : null,
        variantName: option.variantName,
        variantValue: option.variantValue,
        price: option.price,
        quantity: quantities[option.id] ?? 0,
        weight: option.weight,
      });
    });

    setLastAddedOptionCount(selectedOptions.length);
    setQuantities(Object.fromEntries(productOptions.map((option) => [option.id, 0])));
    return selectedOptions.length;
  };

  const handleAddToCart = () => {
    if (isProcessingCartAction) {
      return;
    }

    setIsProcessingCartAction(true);
    const addedOptionCount = addSelectedOptionsToCart();

    if (addedOptionCount === 0) {
      setIsProcessingCartAction(false);
      return;
    }

    setShowCartPopup(true);
    setIsProcessingCartAction(false);
  };

  const handleBuyNow = () => {
    if (isProcessingCartAction) {
      return;
    }

    setIsProcessingCartAction(true);
    const addedOptionCount = addSelectedOptionsToCart();

    if (addedOptionCount === 0) {
      setIsProcessingCartAction(false);
      return;
    }

    setShowCartPopup(false);
    router.push("/cart");
  };

  const handleGoToCart = () => {
    setShowCartPopup(false);
    router.push("/cart");
  };

  const handleContinueShopping = () => {
    setShowCartPopup(false);
  };

  return (
    <>
      <div className="space-y-6">
        <div className="space-y-3 border-b border-slate-200 pb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{product.name}</h1>
          {product.vendorName ? (
            <p className="text-sm font-medium text-slate-500">Vendor: {product.vendorName}</p>
          ) : null}
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
            <StarRating activeCount={reviewCount > 0 ? roundedAverageRating : 0} />
            <span className="text-[#615FFF]">
              {reviewCount > 0 ? `${averageRating.toFixed(1)} · ${reviewCount} Reviews` : "0 Reviews"}
            </span>
            <span className="text-slate-300">|</span>
            <span>Sold: {soldCount.toLocaleString()}</span>
          </div>
        </div>

        <div className="space-y-4">
          {visibleOptionAttributes.length > 0 ? (
            visibleOptionAttributes.map((attribute) => (
              <div key={attribute.name} className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-base font-semibold text-slate-900">
                    {attribute.name}
                    {selectedAttributes[attribute.name] ? (
                      <span className="ml-2 font-medium text-slate-500">
                        : {selectedAttributes[attribute.name]}
                      </span>
                    ) : null}
                  </p>
                  {selectedAttributes[attribute.name] ? (
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedAttributes((current) => ({
                          ...current,
                          [attribute.name]: attribute.values[0] ?? "",
                        }))
                      }
                      className="text-sm font-medium text-slate-500 transition-colors hover:text-slate-800"
                    >
                      Reset
                    </button>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-3">
                  {attribute.values.map((value) => {
                    const isSelected = selectedAttributes[attribute.name] === value;
                    const imageUrl = attributeImageMap[attribute.name]?.[value] ?? "";

                    return (
                      <button
                        key={`${attribute.name}-${value}`}
                        type="button"
                      onClick={() =>
                          {
                            setSelectedAttributes((current) => ({
                              ...current,
                              [attribute.name]: value,
                            }));
                            if (imageUrl) {
                              setStorefrontProductImage(imageUrl);
                            }
                          }
                        }
                        className={
                          isSelected
                            ? "group flex h-[76px] w-[76px] items-center justify-center overflow-hidden rounded-2xl border-2 border-[#615FFF] bg-white p-1 shadow-sm ring-4 ring-[#615FFF]/10"
                            : "group flex h-[76px] w-[76px] items-center justify-center overflow-hidden rounded-2xl border border-slate-300 bg-white p-1 shadow-sm transition-colors hover:border-slate-400"
                        }
                        aria-label={`${attribute.name}: ${value}`}
                        title={value}
                      >
                        <div
                          aria-hidden="true"
                          className="h-full w-full rounded-xl bg-cover bg-center"
                          style={{ backgroundImage: `url("${imageUrl}")` }}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          ) : null}

          <div className="space-y-4">
            <div className="flex items-center gap-3 text-base font-semibold text-slate-900">
              <div className="min-w-0 flex-1">{optionColumnLabel}</div>
              <div className="w-16 shrink-0 text-right">Price</div>
              <div className="w-[140px] shrink-0 text-left">Quantity</div>
            </div>

            {filteredOptions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                No matching variants found for the selected options.
              </div>
            ) : (
              <div className="max-h-[368px] space-y-4 overflow-y-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {filteredOptions.map((option) => (
                  <div key={option.id} className="flex items-center gap-3 text-sm">
                    <div className="flex min-w-0 flex-1 items-center gap-3 self-center">
                      {productRecord.product_type === "variable" ? (
                        <button
                          type="button"
                          onClick={() => setStorefrontProductImage(option.image)}
                          className="shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 transition-colors hover:border-[#615FFF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#615FFF]/40"
                          aria-label={`Show ${option.label} product image`}
                        >
                          <Image
                            src={option.image}
                            alt={`${option.label} variation`}
                            width={48}
                            height={48}
                            className="h-12 w-12 object-cover"
                          />
                        </button>
                      ) : null}
                      <div className="min-w-0">
                        <span className="block break-words leading-5 text-slate-900">
                          {option.attributeValues[optionColumnLabel] ?? option.label}
                        </span>
                        <span className="mt-1 block text-xs text-slate-500">
                          MOQ: {option.moq}
                          {option.stock > 0 ? ` | Stock: ${option.stock}` : ""}
                        </span>
                      </div>
                    </div>
                    <div className="w-16 shrink-0 self-center text-right">
                      <span className="font-semibold text-[#615FFF]">
                      {formatCurrency(displayPriceByOptionId.get(option.id) ?? option.price)}
                      </span>
                    </div>
                    <div className="w-[140px] self-center">
                      <QuantityControl
                        quantity={quantities[option.id] ?? 0}
                        onDecrease={() => updateQuantity(option.id, (quantities[option.id] ?? 0) - 1)}
                        onIncrease={() => updateQuantity(option.id, (quantities[option.id] ?? 0) + 1)}
                        onInputChange={(value) => updateQuantity(option.id, value)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        </div>
      </div>

      <div className="space-y-5">
        <div className="rounded-lg bg-slate-50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <p className="text-sm text-slate-500">International Shipping</p>
              <div className="flex items-center gap-3 text-base font-semibold text-slate-900">
                <span>{selectedShippingMethod?.name ?? "No method available"}</span>
                <span className="text-slate-300">-</span>
                <span className="text-[#615FFF]">
                  {selectedShippingMethod
                    ? formatDeliveryWindow(
                        selectedShippingMethod.delivery_min_days,
                        selectedShippingMethod.delivery_max_days,
                      )
                    : PAY_ON_DELIVERY_PLACEHOLDER}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                setSelectedShippingMethodId((current) => {
                  if (internationalShippingMethods.length === 0) {
                    return "";
                  }

                  const currentIndex = internationalShippingMethods.findIndex((method) => method.id === current);
                  const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % internationalShippingMethods.length : 0;

                  return internationalShippingMethods[nextIndex].id;
                })
              }
              className="rounded-md p-2 text-slate-700 transition-colors hover:bg-white hover:text-[#615FFF]"
              aria-label="Change international shipping method"
            >
              <LinkIcon />
            </button>
          </div>
          {totals.internationalShipping.warning ? (
            <p className="mt-3 text-sm text-amber-600">{totals.internationalShipping.warning}</p>
          ) : totals.totalWeightKg > 0 ? (
            <p className="mt-3 text-sm text-slate-500">Estimated total weight: {totals.totalWeightKg} kg</p>
          ) : null}
        </div>

        <div className="space-y-0">
          <SummaryRow label="Quantity" value={String(totals.quantity)} />
          <SummaryRow
            label="Product Price"
            value={formatCurrency(totals.productPrice)}
          />
          <SummaryRow label="CNDS Cost" value={formatCurrency(totals.cndsCost)} />
          <SummaryRow label="Pay Now" value={formatCurrency(totals.payNow)} strong />
        </div>

        <div className="rounded-lg border border-dashed border-[#615FFF]/50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <p className="text-base font-semibold text-slate-900">Pay on Delivery</p>
            </div>

            <div className="text-right">
              <p className="text-lg font-semibold text-slate-700">
                {totals.internationalShipping.total === null
                  ? PAY_ON_DELIVERY_PLACEHOLDER
                  : formatCurrency(totals.internationalShipping.total)}
              </p>
              <p className="mt-2 whitespace-nowrap text-xs font-medium text-[#615FFF]">
                International shipping
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              const nextWishlistIds = toggleWishlistProduct(product.id);
              setIsWishlisted(nextWishlistIds.includes(product.id));
            }}
            className={`inline-flex h-11 w-11 items-center justify-center rounded-full transition-colors ${
              isWishlisted
                ? "bg-rose-50 text-rose-500 hover:bg-rose-100"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
            aria-label="Add to wishlist"
            aria-pressed={isWishlisted}
          >
            <WishlistIcon />
          </button>
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={isProcessingCartAction}
            className="inline-flex items-center justify-center rounded-full bg-[#615FFF] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#5552e6] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isProcessingCartAction ? "Processing..." : "Add to Cart"}
          </button>
          <button
            type="button"
            onClick={handleBuyNow}
            disabled={isProcessingCartAction}
            className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isProcessingCartAction ? "Processing..." : "Buy Now"}
          </button>
        </div>

        {cartErrorMessage ? (
          <p className="text-sm font-medium text-rose-500">{cartErrorMessage}</p>
        ) : null}

        <p className="text-sm leading-6 text-slate-500">
          Bangladesh shipping cost is estimated and confirmed after order review.
        </p>
      </div>

      {showCartPopup ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4">
          <div className="relative w-full max-w-[760px] rounded-[16px] bg-white px-6 py-8 shadow-[0_30px_90px_rgba(15,23,42,0.24)] sm:px-10 sm:py-10">
            <button
              type="button"
              onClick={handleContinueShopping}
              className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close popup"
            >
              <CloseIcon />
            </button>

            <div className="flex flex-col items-center text-center">
              <div className="text-[#22C55E]">
                <CheckCircleIcon />
              </div>
              <p className="mt-5 text-lg font-medium text-slate-900">
                {lastAddedOptionCount > 1
                  ? `${lastAddedOptionCount} selected variants have been added to your cart!`
                  : "Your selected item has been added to your cart!"}
              </p>
              <p className="mt-3 text-base text-slate-600">
                {lastAddedOptionCount} item{lastAddedOptionCount > 1 ? "s" : ""} in the cart
              </p>

              <div className="mt-8 flex w-full max-w-[520px] flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={handleContinueShopping}
                  className="inline-flex flex-1 items-center justify-center rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
                >
                  Continue Shopping
                </button>
                <button
                  type="button"
                  onClick={handleGoToCart}
                  className="inline-flex flex-1 items-center justify-center rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
                >
                  View Cart
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
