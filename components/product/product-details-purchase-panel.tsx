"use client";

import { useEffect, useMemo, useState } from "react";

import { addToQuote } from "@/components/quote/quote-utils";
import type { Product } from "@/types/product";
import {
  isProductInWishlist,
  toggleWishlistProduct,
  WISHLIST_UPDATED_EVENT,
} from "@/components/wishlist/wishlist-utils";

const colorSwatches = [
  { name: "Stone", value: "#D4D4D8" },
  { name: "Mist", value: "#E5E7EB" },
  { name: "Taupe", value: "#D6D3D1" },
  { name: "Ash", value: "#D4D4D4" },
];

const variationRows = [
  { size: "9", price: 500 },
  { size: "10", price: 500 },
  { size: "11", price: 500 },
  { size: "12", price: 500 },
  { size: "13", price: 520 },
  { size: "14", price: 520 },
];

const shouldShowSeeAll = variationRows.length > 4;
const MAX_QUANTITY = 9999;
const initialQuantities = Object.fromEntries(variationRows.map((row) => [row.size, 0]));

function formatCurrency(value: number) {
  return `৳${value.toLocaleString()}`;
}

function getWeightValue(weight: string) {
  const parsed = Number.parseFloat(weight);
  return Number.isNaN(parsed) ? 0.5 : parsed;
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

export default function ProductDetailsPurchasePanel({ product }: { product: Product }) {
  const [activeColor, setActiveColor] = useState(colorSwatches[0]?.name ?? "");
  const [showAllVariants, setShowAllVariants] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [quantities, setQuantities] = useState<Record<string, number>>(initialQuantities);

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

  const totals = useMemo(() => {
    const quantity = variationRows.reduce((sum, row) => sum + (quantities[row.size] ?? 0), 0);
    const productPrice = variationRows.reduce(
      (sum, row) => sum + row.price * (quantities[row.size] ?? 0),
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
  }, [product.weight, quantities]);

  const updateQuantity = (size: string, nextQuantity: number) => {
    setQuantities((current) => ({
      ...current,
      [size]: Math.min(MAX_QUANTITY, Math.max(0, nextQuantity)),
    }));
  };

  const handleAddToCart = () => {
    const selectedVariations = variationRows.filter((row) => (quantities[row.size] ?? 0) > 0);

    if (selectedVariations.length === 0) {
      window.alert("Please select quantity");
      return;
    }

    selectedVariations.forEach((row) => {
      addToQuote({
        productId: product.id,
        name: product.name,
        image: product.image,
        variation: row.size,
        price: row.price,
        quantity: quantities[row.size] ?? 0,
      });
    });

    setQuantities(initialQuantities);
    window.alert("Added to cart");
  };

  const visibleVariationRows = showAllVariants ? variationRows : variationRows.slice(0, 4);

  return (
    <>
      <div className="space-y-6">
        <div className="space-y-3 border-b border-slate-200 pb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{product.name}</h1>

          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
            <StarRating />
            <span className="text-[#615FFF]">(3 Reviews)</span>
            <span className="text-slate-300">|</span>
            <span>Sold: 26</span>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-3">
            <p className="text-base font-semibold text-slate-900">Color</p>
            <div className="flex flex-wrap gap-4">
              {colorSwatches.map((swatch) => (
                <button
                  key={swatch.name}
                  type="button"
                  aria-label={swatch.name}
                  onClick={() => setActiveColor(swatch.name)}
                  className={`h-16 w-16 rounded-md border transition-colors ${
                    activeColor === swatch.name
                      ? "border-[#615FFF]"
                      : "border-transparent hover:border-slate-300"
                  }`}
                  style={{ backgroundColor: swatch.value }}
                />
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-[0.8fr_0.7fr_1fr] items-center gap-4 text-base font-semibold text-slate-900">
              <span className="self-center">Size</span>
              <span className="self-center">Price</span>
              <span className="self-center">Quantity</span>
            </div>

            <div className="space-y-4">
              {visibleVariationRows.map((row) => (
                <div
                  key={row.size}
                  className="grid grid-cols-[0.8fr_0.7fr_1fr] items-center gap-4 text-sm"
                >
                  <span className="self-center text-slate-900">{row.size}</span>
                  <span className="self-center font-semibold text-[#615FFF]">
                    {formatCurrency(row.price)}
                  </span>
                  <QuantityControl
                    quantity={quantities[row.size] ?? 0}
                    onDecrease={() => updateQuantity(row.size, (quantities[row.size] ?? 0) - 1)}
                    onIncrease={() => updateQuantity(row.size, (quantities[row.size] ?? 0) + 1)}
                    onInputChange={(value) => updateQuantity(row.size, value)}
                  />
                </div>
              ))}
            </div>

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
                <span>By Air</span>
                <span className="text-slate-300">-</span>
                <span className="text-[#615FFF]">৳1000/kg</span>
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
                {formatCurrency(totals.estimatedShipping)}
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
