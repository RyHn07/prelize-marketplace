"use client";

import { useEffect, useMemo, useState } from "react";

import { addToQuote } from "@/components/quote/quote-utils";
import type { Product } from "@/types/product";
import type {
  ProductAttribute,
  ProductCddShippingProfile,
  ProductDbRow,
  ProductDbVariantRow,
} from "@/types/product-db";
import {
  isProductInWishlist,
  toggleWishlistProduct,
  WISHLIST_UPDATED_EVENT,
} from "@/components/wishlist/wishlist-utils";

const MAX_QUANTITY = 9999;

type ProductOption = {
  id: string;
  image: string;
  label: string;
  price: number;
  moq: number;
  attributeValues: Record<string, string>;
};

type ProductOptionAttribute = {
  name: string;
  values: string[];
};

const SHIPPING_PROFILE_LABELS: Record<ProductCddShippingProfile, string> = {
  standard: "Standard shipping review",
  express: "Express shipping review",
  fragile: "Fragile cargo review",
  bulk: "Bulk shipment review",
};

function formatCurrency(value: number) {
  return `\u09F3${value.toLocaleString()}`;
}

function getWeightValue(weight: string) {
  const parsed = Number.parseFloat(weight);
  return Number.isNaN(parsed) ? 0.5 : parsed;
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
): ProductOption[] {
  if (productRecord.product_type === "variable" && variants.length > 0) {
    return variants.map((variant) => ({
      id: variant.id,
      image: variant.image_url ?? productRecord.image_url ?? product.image,
      label: variant.name,
      price: getEffectivePrice(variant.regular_price ?? variant.price, variant.discount_price),
      moq: variant.moq,
      attributeValues: Object.fromEntries(
        Object.entries(variant.attribute_values ?? {}).map(([key, value]) => [key, String(value)]),
      ),
    }));
  }

  return [
    {
      id: productRecord.id,
      image: productRecord.image_url ?? product.image,
      label: "Default",
      price: getEffectivePrice(productRecord.regular_price ?? productRecord.price, productRecord.discount_price ?? null),
      moq: productRecord.moq,
      attributeValues: {},
    },
  ];
}

function StarRating() {
  return (
    <div className="flex items-center gap-1 text-amber-400">
      {Array.from({ length: 5 }).map((_, index) => (
        <svg
          key={index}
          aria-hidden="true"
          viewBox="0 0 20 20"
          className="h-4 w-4 fill-current"
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
    <div className="inline-flex h-11 items-center overflow-hidden rounded-lg border border-slate-300 bg-white shadow-sm">
      <button
        type="button"
        onClick={onDecrease}
        disabled={isDecrementDisabled}
        className="inline-flex h-full aspect-square items-center justify-center text-lg text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-700 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-white"
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
        className="h-full min-w-12 border-x border-slate-300 px-2 text-center text-sm font-semibold text-slate-800 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        aria-label="Quantity input"
      />
      <button
        type="button"
        onClick={onIncrease}
        className="inline-flex h-full aspect-square items-center justify-center text-lg text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-700"
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
}: {
  product: Product;
  productRecord: ProductDbRow;
  variants: ProductDbVariantRow[];
}) {
  const reviewCount = product.reviews?.length ?? 0;
  const [showAllVariants, setShowAllVariants] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({});
  const optionAttributes = useMemo(
    () => buildOptionAttributes(productRecord, variants),
    [productRecord, variants],
  );
  const productOptions = useMemo(
    () => buildProductOptions(product, productRecord, variants),
    [product, productRecord, variants],
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
    setSelectedAttributes({});
    setQuantities(Object.fromEntries(productOptions.map((option) => [option.id, 0])));
    setShowAllVariants(false);
  }, [product.id, productOptions]);

  const filteredOptions = useMemo(() => {
    return productOptions.filter((option) =>
      Object.entries(selectedAttributes).every(
        ([attributeName, selectedValue]) =>
          !selectedValue || option.attributeValues[attributeName] === selectedValue,
      ),
    );
  }, [productOptions, selectedAttributes]);

  const visibleOptions = showAllVariants ? filteredOptions : filteredOptions.slice(0, 4);
  const shouldShowSeeAll = filteredOptions.length > 4;

  const totals = useMemo(() => {
    const quantity = productOptions.reduce((sum, option) => sum + (quantities[option.id] ?? 0), 0);
    const productPrice = productOptions.reduce(
      (sum, option) => sum + option.price * (quantities[option.id] ?? 0),
      0,
    );
    const cddCharge = quantity * 15;
    const payNow = productPrice + cddCharge;
    const estimatedShipping = Math.round(quantity * getWeightValue(product.weight) * 1000);

    return {
      quantity,
      productPrice,
      cddCharge,
      payNow,
      estimatedShipping,
    };
  }, [product.weight, productOptions, quantities]);

  const updateQuantity = (optionId: string, nextQuantity: number) => {
    setQuantities((current) => ({
      ...current,
      [optionId]: Math.min(MAX_QUANTITY, Math.max(0, nextQuantity)),
    }));
  };

  const handleAddToCart = () => {
    const selectedOptions = productOptions.filter((option) => (quantities[option.id] ?? 0) > 0);

    if (selectedOptions.length === 0) {
      window.alert("Please select quantity");
      return;
    }

    selectedOptions.forEach((option) => {
      addToQuote({
        productId: product.id,
        name: product.name,
        image: option.image,
        productSlug: product.slug,
        variation: option.label,
        variantId: option.id !== product.id ? option.id : null,
        price: option.price,
        quantity: quantities[option.id] ?? 0,
      });
    });

    setQuantities(Object.fromEntries(productOptions.map((option) => [option.id, 0])));
    window.alert("Added to cart");
  };

  return (
    <>
      <div className="space-y-6">
        <div className="space-y-3 border-b border-slate-200 pb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{product.name}</h1>
          {product.vendorName ? (
            <p className="text-sm font-medium text-slate-500">Vendor: {product.vendorName}</p>
          ) : null}
          <p className="text-sm leading-7 text-slate-600">{product.shortDescription}</p>

          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
            <StarRating />
            <span className="text-[#615FFF]">({reviewCount} Reviews)</span>
            <span className="text-slate-300">|</span>
            <span>Sold: 26</span>
          </div>
        </div>

        <div className="space-y-4">
          {optionAttributes.length > 0 ? (
            optionAttributes.map((attribute) => (
              <div key={attribute.name} className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-base font-semibold text-slate-900">{attribute.name}</p>
                  {selectedAttributes[attribute.name] ? (
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedAttributes((current) => ({
                          ...current,
                          [attribute.name]: "",
                        }))
                      }
                      className="text-sm font-medium text-slate-500 transition-colors hover:text-slate-800"
                    >
                      Clear
                    </button>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-3">
                  {attribute.values.map((value) => {
                    const isSelected = selectedAttributes[attribute.name] === value;

                    return (
                      <button
                        key={`${attribute.name}-${value}`}
                        type="button"
                        onClick={() =>
                          setSelectedAttributes((current) => ({
                            ...current,
                            [attribute.name]: current[attribute.name] === value ? "" : value,
                          }))
                        }
                        className={
                          isSelected
                            ? "rounded-full border border-[#615FFF] bg-[#615FFF]/10 px-4 py-2 text-sm font-semibold text-[#615FFF]"
                            : "rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-slate-400 hover:text-slate-900"
                        }
                      >
                        {value}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          ) : null}

          <div className="space-y-4">
            <div className="grid grid-cols-[1.2fr_0.8fr_1fr] items-center gap-4 text-base font-semibold text-slate-900">
              <span className="self-center">Option</span>
              <span className="self-center">Price</span>
              <span className="self-center">Quantity</span>
            </div>

            {filteredOptions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                No matching variants found for the selected options.
              </div>
            ) : (
              <div className="space-y-4">
                {visibleOptions.map((option) => (
                  <div
                    key={option.id}
                    className="grid grid-cols-[1.2fr_0.8fr_1fr] items-center gap-4 text-sm"
                  >
                    <div className="self-center">
                      <span className="block text-slate-900">{option.label}</span>
                      <span className="mt-1 block text-xs text-slate-500">MOQ: {option.moq}</span>
                    </div>
                    <span className="self-center font-semibold text-[#615FFF]">
                      {formatCurrency(option.price)}
                    </span>
                    <QuantityControl
                      quantity={quantities[option.id] ?? 0}
                      onDecrease={() => updateQuantity(option.id, (quantities[option.id] ?? 0) - 1)}
                      onIncrease={() => updateQuantity(option.id, (quantities[option.id] ?? 0) + 1)}
                      onInputChange={(value) => updateQuantity(option.id, value)}
                    />
                  </div>
                ))}
              </div>
            )}

            {shouldShowSeeAll ? (
              <button
                type="button"
                onClick={() => setShowAllVariants((current) => !current)}
                className="text-sm font-medium text-slate-500 transition-colors hover:text-slate-800"
              >
                {showAllVariants ? "Hide" : "See all"}
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="space-y-5">
        <div className="rounded-lg bg-slate-50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <p className="text-sm text-slate-500">Shipping Method</p>
              <div className="flex items-center gap-3 text-base font-semibold text-slate-900">
                <span>{SHIPPING_PROFILE_LABELS[productRecord.cdd_shipping_profile ?? "standard"]}</span>
                <span className="text-slate-300">-</span>
                <span className="text-[#615FFF]">Final rate after review</span>
              </div>
            </div>
            <button
              type="button"
              className="rounded-md p-2 text-slate-700 transition-colors hover:bg-white hover:text-[#615FFF]"
            >
              <LinkIcon />
            </button>
          </div>
        </div>

        <div className="space-y-0">
          <SummaryRow label="Quantity" value={String(totals.quantity)} />
          <SummaryRow label="Product Price" value={formatCurrency(totals.productPrice)} />
          <SummaryRow label="CDD Charge" value={formatCurrency(totals.cddCharge)} />
          <SummaryRow label="Pay Now" value={formatCurrency(totals.payNow)} strong />
        </div>

        <div className="rounded-lg border border-dashed border-[#615FFF]/50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <p className="text-base font-semibold text-slate-900">Pay on Delivery</p>
            </div>

            <div className="text-right">
              <p className="text-lg font-semibold text-slate-700">
                {totals.quantity === 0 ? "Pending selection" : formatCurrency(totals.estimatedShipping)}
              </p>
              <p className="mt-2 whitespace-nowrap text-xs font-medium text-[#615FFF]">
                Estimated shipping charge
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
            className="inline-flex items-center justify-center rounded-full bg-[#615FFF] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#5552e6]"
          >
            Add to Cart
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:text-slate-900"
          >
            Buy Now
          </button>
        </div>

        <p className="text-sm leading-6 text-slate-500">
          Bangladesh shipping cost is estimated and confirmed after order review.
        </p>
      </div>
    </>
  );
}
