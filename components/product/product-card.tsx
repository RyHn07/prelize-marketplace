import Image from "next/image";
import Link from "next/link";

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

function Badge({ label }: { label: NonNullable<Product["badge"]> }) {
  const badgeClasses =
    label === "Hot"
      ? "bg-rose-50 text-rose-600"
      : label === "New"
        ? "bg-emerald-50 text-emerald-600"
        : "bg-indigo-50 text-[#615FFF]";

  return (
    <span
      className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold ${badgeClasses}`}
    >
      {label}
    </span>
  );
}

function getCardMeta(productId: string) {
  const seed = Number(productId.replace(/\D/g, "")) || 1;
  const ratings = ["4.8", "4.7", "4.9", "4.6"];
  const soldCounts = ["2.6K", "1.9K", "3.1K", "980"];
  const deliveryWindows = ["20-25 days", "18-22 days", "15-20 days", "22-28 days"];

  return {
    rating: ratings[(seed - 1) % ratings.length],
    sold: soldCounts[(seed - 1) % soldCounts.length],
    delivery: deliveryWindows[(seed - 1) % deliveryWindows.length],
  };
}

export default function ProductCard({ product, viewMode = "grid" }: ProductCardProps) {
  const meta = getCardMeta(product.id);
  const isListView = viewMode === "list";

  return (
    <Link
      href={`/products/${product.slug}`}
      className={`group overflow-hidden rounded-lg border border-slate-200 bg-white transition-colors hover:border-slate-300 ${
        isListView ? "flex items-stretch gap-4 p-4" : "flex h-full flex-col"
      }`}
    >
      <div
        className={`relative overflow-hidden bg-slate-50 ${
          isListView ? "h-40 w-40 shrink-0 rounded-lg" : "aspect-square"
        }`}
      >
        <Image
          src={product.image}
          alt={product.name}
          fill
          sizes={
            isListView
              ? "(min-width: 1024px) 160px, 160px"
              : "(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
          }
          className="object-cover"
        />

        {product.badge ? (
          <div className="absolute left-2.5 top-2.5">
            <Badge label={product.badge} />
          </div>
        ) : null}
      </div>

      <div className={`flex flex-1 flex-col gap-2.5 ${isListView ? "py-1 pr-1" : "p-3"}`}>
        <div className="space-y-1.5">
          {product.vendorName ? (
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              Vendor: {product.vendorName}
            </p>
          ) : null}
          <h3
            className={`text-[13px] font-semibold leading-5 text-slate-900 ${
              isListView ? "line-clamp-2" : "line-clamp-1 min-h-5"
            }`}
          >
            {product.name}
          </h3>
          <p className={`text-xs leading-5 text-slate-500 ${isListView ? "line-clamp-2" : "line-clamp-2 min-h-10"}`}>
            {product.shortDescription}
          </p>
          <p className="text-sm font-bold text-[#615FFF]">From ৳{product.priceFrom}</p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="text-[13px] tracking-tight text-amber-400">★★★★★</span>
            <span className="font-medium text-slate-600">{meta.rating}</span>
          </div>
          <span>Sold: {meta.sold}</span>
        </div>

        <div className="mt-auto flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2 py-1 font-medium text-slate-600">
            <DeliveryIcon />
            <span>CN to BD · {meta.delivery}</span>
          </span>
        </div>
      </div>
    </Link>
  );
}
