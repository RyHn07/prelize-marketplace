"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import {
  isProductInWishlist,
  toggleWishlistProduct,
  WISHLIST_UPDATED_EVENT,
} from "@/components/wishlist/wishlist-utils";
import type { Product } from "@/types/product";

interface ProductCardProps {
  product: Product;
  viewMode?: "grid" | "list";
}

function DeliveryIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M3 7h11v8H3z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 10h3l3 3v2h-6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="7.5" cy="17.5" r="1.5" />
      <circle cx="17.5" cy="17.5" r="1.5" />
    </svg>
  );
}

function WishlistIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4.5 w-4.5"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        d="M12 20.5s-6.5-4.3-8.6-8C1.8 9.7 3 6.5 6.3 5.5c2-.6 4 .1 5.7 2 1.7-1.9 3.7-2.6 5.7-2 3.3 1 4.5 4.2 2.9 7-2.1 3.7-8.6 8-8.6 8Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Badge({ label }: { label: NonNullable<Product["badge"]> }) {
  const badgeClasses =
    label === "Hot"
      ? "bg-rose-50 text-rose-600"
      : label === "New"
        ? "bg-emerald-50 text-emerald-600"
        : "bg-indigo-50 text-[#615FFF]";

  return (
    <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold ${badgeClasses}`}>
      {label}
    </span>
  );
}

function getDeliveryWindow(productId: string) {
  const seed = Number(productId.replace(/\D/g, "")) || 1;
  const deliveryWindows = ["20-25 days", "18-22 days", "15-20 days", "22-28 days"];

  return deliveryWindows[(seed - 1) % deliveryWindows.length];
}

function formatPriceLabel(price: string | number) {
  const amount = typeof price === "number" ? price : Number(price);

  if (!Number.isFinite(amount)) {
    return `From ৳${price}`;
  }

  return `From ৳${amount.toLocaleString("en-BD", {
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function ProductCard({ product, viewMode = "grid" }: ProductCardProps) {
  const averageRating = product.averageRating ?? 0;
  const reviewCount = product.reviewCount ?? 0;
  const roundedRating = Math.max(0, Math.min(5, Math.round(averageRating)));
  const deliveryWindow = getDeliveryWindow(product.id);
  const isListView = viewMode === "list";
  const [isWishlisted, setIsWishlisted] = useState(false);

  useEffect(() => {
    const syncWishlistState = () => {
      setIsWishlisted(isProductInWishlist(product.id));
    };

    syncWishlistState();
    window.addEventListener(WISHLIST_UPDATED_EVENT, syncWishlistState);

    return () => {
      window.removeEventListener(WISHLIST_UPDATED_EVENT, syncWishlistState);
    };
  }, [product.id]);

  return (
    <Link
      href={`/products/${product.slug}`}
      className={`group overflow-hidden border border-slate-200 bg-white transition-colors hover:border-slate-300 ${
        isListView ? "flex items-stretch gap-4 rounded-lg p-4" : "flex h-full flex-col rounded-[14px]"
      }`}
    >
      <div
        className={`relative overflow-hidden bg-slate-50 ${
          isListView ? "h-40 w-40 shrink-0 rounded-lg" : "aspect-[0.96/1]"
        }`}
      >
        <Image
          src={product.image}
          alt={product.name}
          fill
          sizes={
            isListView
              ? "(min-width: 1024px) 160px, 160px"
              : "(min-width: 1280px) 25vw, (min-width: 640px) 50vw, 50vw"
          }
          className="object-cover"
        />

        {product.badge ? (
          <div className="absolute left-2.5 top-2.5">
            <Badge label={product.badge} />
          </div>
        ) : null}

        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            const nextIds = toggleWishlistProduct(product.id);
            setIsWishlisted(nextIds.includes(product.id));
          }}
          className={`absolute right-2.5 top-2.5 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full border shadow-sm transition-colors ${
            isWishlisted
              ? "border-rose-200 bg-white text-rose-500 hover:bg-rose-50"
              : "border-white/80 bg-white/95 text-slate-500 hover:text-rose-500"
          }`}
          aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
          aria-pressed={isWishlisted}
        >
          <WishlistIcon filled={isWishlisted} />
        </button>
      </div>

      <div className={`flex flex-1 flex-col gap-2 ${isListView ? "py-1 pr-1" : "p-2.5 sm:p-3"}`}>
        <div className="space-y-1">
          {product.vendorName ? (
            <p className="hidden text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 sm:block">
              Vendor: {product.vendorName}
            </p>
          ) : null}
          <h3
            className={`font-semibold text-slate-900 ${
              isListView
                ? "line-clamp-2 text-[13px] leading-5"
                : "line-clamp-2 h-8 min-h-8 max-h-8 overflow-hidden text-[12px] leading-4 sm:line-clamp-1 sm:h-5 sm:min-h-5 sm:max-h-5 sm:text-[13px] sm:leading-5"
            }`}
            style={
              isListView
                ? undefined
                : {
                    display: "-webkit-box",
                    WebkitBoxOrient: "vertical",
                    WebkitLineClamp: 2,
                  }
            }
          >
            {product.name}
          </h3>
          <p className="text-[14px] font-bold leading-none text-[#615FFF] sm:text-sm">
            {formatPriceLabel(product.priceFrom)}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500 sm:text-xs">
          <div className="flex items-center gap-1.5">
            <span className="-mt-0.5 text-[11px] leading-none tracking-tight text-amber-400 sm:text-[19px]">
              {"★".repeat(roundedRating)}
              <span className="text-slate-200">{"★".repeat(5 - roundedRating)}</span>
            </span>
            <span className="font-medium text-slate-600">{averageRating.toFixed(1)} ({reviewCount})</span>
          </div>
          <span>MOQ: {product.moq}</span>
        </div>

        <div className="mt-auto flex flex-wrap items-center gap-1.5 text-[8px] text-slate-500 sm:text-[11px]">
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 font-medium text-slate-600">
            <DeliveryIcon />
            <span>CN to BD · {deliveryWindow}</span>
          </span>
        </div>
      </div>
    </Link>
  );
}
