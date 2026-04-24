"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import Header from "@/components/Header";
import {
  getQuoteItems,
  QUOTE_STORAGE_KEY,
  QUOTE_UPDATED_EVENT,
  removeQuoteItem,
  type QuoteItem,
  updateQuoteItem,
} from "@/components/quote/quote-utils";
import { mockProducts } from "@/data/mock-products";
import { calculateCartTotals, type CartItem } from "@/lib/shipping-utils";

const MAX_QUANTITY = 9999;
const ORDERS_STORAGE_KEY = "prelize_orders";

const shippingProfiles = [
  {
    id: "air",
    name: "By Air",
    ratePerKg: 1000,
    estimate: "7-12 days",
  },
  {
    id: "sea",
    name: "By Sea",
    ratePerKg: 350,
    estimate: "25-40 days",
  },
  {
    id: "express-air",
    name: "Express Air",
    ratePerKg: 1300,
    estimate: "5-8 days",
  },
] as const;

type ProductGroup = {
  productId: string;
  name: string;
  image: string;
  slug?: string;
  items: QuoteItem[];
};

type StoredOrder = {
  id: string;
  status: "Pending";
  createdAt: string;
  items: QuoteItem[];
  shippingMethods: {
    productId: string;
    productName: string;
    shippingProfileId: string;
    shippingProfileName: string;
  }[];
  summary: {
    quantity: number;
    totalQuantity: number;
    productPrice: number;
    cddCharge: number;
    shippingCost: number | null;
    hasUnknownShipping: boolean;
    payNow: number;
    payOnDelivery: number | string | null;
  };
};

function formatBDT(amount: number) {
  return `৳${amount.toLocaleString()}`;
}

function getVariantKey(productId: string, variation: string) {
  return `${productId}-${variation}`;
}

function parseWeight(weight?: string) {
  if (!weight) {
    return undefined;
  }

  const parsedWeight = Number.parseFloat(weight);
  return Number.isFinite(parsedWeight) && parsedWeight > 0 ? parsedWeight : undefined;
}

function Checkbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <label className="inline-flex items-center gap-2 text-sm text-slate-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 rounded border-slate-300 text-[#615FFF] focus:ring-[#615FFF]"
        aria-label={label}
      />
      {label ? <span>{label}</span> : null}
    </label>
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
  return (
    <div className="inline-flex h-10 items-center overflow-hidden rounded-lg border border-slate-200 bg-white">
      <button
        type="button"
        onClick={onDecrease}
        disabled={quantity === 0}
        className="inline-flex h-full w-10 items-center justify-center text-lg text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-700 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-white"
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
        className="h-full w-16 border-x border-slate-200 px-2 text-center text-sm font-semibold text-slate-800 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        aria-label="Quantity input"
      />
      <button
        type="button"
        onClick={onIncrease}
        className="inline-flex h-full w-10 items-center justify-center text-lg text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-700"
        aria-label="Increase quantity"
      >
        <span className="-mt-0.5">+</span>
      </button>
    </div>
  );
}

function TrashIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M4 7h16" strokeLinecap="round" />
      <path d="M9.5 4h5" strokeLinecap="round" />
      <path d="M7 7l1 12a1.5 1.5 0 0 0 1.5 1.4h5A1.5 1.5 0 0 0 16 19L17 7" />
      <path d="M10 11.2v5.2" strokeLinecap="round" />
      <path d="M14 11.2v5.2" strokeLinecap="round" />
    </svg>
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

export default function CartPage() {
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [selectedShippingProfiles, setSelectedShippingProfiles] = useState<Record<string, string>>({});
  const [orderSuccess, setOrderSuccess] = useState<StoredOrder | null>(null);
  const hasInitializedSelection = useRef(false);
  const previousItemKeys = useRef<string[]>([]);

  useEffect(() => {
    const syncQuoteItems = () => {
      setItems(getQuoteItems());
    };

    syncQuoteItems();

    const handleStorageChange = (event: StorageEvent) => {
      if (!event.key || event.key === QUOTE_STORAGE_KEY) {
        syncQuoteItems();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener(QUOTE_UPDATED_EVENT, syncQuoteItems);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener(QUOTE_UPDATED_EVENT, syncQuoteItems);
    };
  }, []);

  useEffect(() => {
    const currentKeys = items.map((item) => getVariantKey(item.productId, item.variation));

    setSelectedKeys((previousSelectedKeys) => {
      if (!hasInitializedSelection.current) {
        hasInitializedSelection.current = true;
        previousItemKeys.current = currentKeys;
        return currentKeys;
      }

      const previousItemKeySet = new Set(previousItemKeys.current);
      const previousSelectedKeySet = new Set(previousSelectedKeys);
      const nextSelectedKeys = currentKeys.filter((key) => previousSelectedKeySet.has(key));

      currentKeys.forEach((key) => {
        if (!previousItemKeySet.has(key)) {
          nextSelectedKeys.push(key);
        }
      });

      previousItemKeys.current = currentKeys;
      return nextSelectedKeys;
    });
  }, [items]);

  const productGroups = useMemo<ProductGroup[]>(() => {
    const groupedItems = new Map<string, ProductGroup>();

    items.forEach((item) => {
      const productMatch = mockProducts.find((product) => product.id === item.productId);
      const existingGroup = groupedItems.get(item.productId);

      if (existingGroup) {
        existingGroup.items.push(item);
        return;
      }

      groupedItems.set(item.productId, {
        productId: item.productId,
        name: item.name,
        image: item.image,
        slug: productMatch?.slug,
        items: [item],
      });
    });

    return Array.from(groupedItems.values());
  }, [items]);

  useEffect(() => {
    setSelectedShippingProfiles((current) => {
      const nextProfiles: Record<string, string> = {};

      productGroups.forEach((group) => {
        nextProfiles[group.productId] = current[group.productId] ?? shippingProfiles[0].id;
      });

      return nextProfiles;
    });
  }, [productGroups]);

  const selectedKeySet = useMemo(() => new Set(selectedKeys), [selectedKeys]);

  const selectedGroupedItems = useMemo<Record<string, CartItem[]>>(() => {
    return productGroups.reduce<Record<string, CartItem[]>>((result, group) => {
      const selectedItemsForGroup = group.items.filter((item) =>
        selectedKeySet.has(getVariantKey(item.productId, item.variation)),
      );

      if (selectedItemsForGroup.length === 0) {
        return result;
      }

      const productMatch = mockProducts.find((product) => product.id === group.productId);
      const selectedShippingProfileId = selectedShippingProfiles[group.productId] ?? shippingProfiles[0].id;
      const selectedShippingProfile =
        shippingProfiles.find((profile) => profile.id === selectedShippingProfileId) ?? shippingProfiles[0];

      result[group.productId] = selectedItemsForGroup.map((item) => ({
        productId: item.productId,
        name: item.name,
        image: item.image,
        variation: item.variation,
        price: item.price,
        quantity: item.quantity,
        weight: parseWeight(productMatch?.weight),
        shippingProfile: {
          id: selectedShippingProfile.id,
          name: selectedShippingProfile.name,
          ratePerKg: selectedShippingProfile.ratePerKg,
        },
        cddTiers: (productMatch as typeof productMatch & { cddTiers?: CartItem["cddTiers"] })?.cddTiers,
      }));

      return result;
    }, {});
  }, [productGroups, selectedKeySet, selectedShippingProfiles]);

  const totals = useMemo(() => calculateCartTotals(selectedGroupedItems), [selectedGroupedItems]);

  const selectedItems = useMemo(
    () =>
      Object.values(selectedGroupedItems)
        .flat()
        .map((item) => ({
          productId: item.productId,
          name: item.name,
          image: item.image,
          variation: item.variation,
          price: item.price,
          quantity: item.quantity,
        })),
    [selectedGroupedItems],
  );

  const allItemKeys = useMemo(
    () => items.map((item) => getVariantKey(item.productId, item.variation)),
    [items],
  );

  const allItemsSelected = items.length > 0 && selectedKeys.length === items.length;

  const selectedProductCount = useMemo(
    () =>
      productGroups.filter((group) =>
        group.items.some((item) => selectedKeySet.has(getVariantKey(item.productId, item.variation))),
      ).length,
    [productGroups, selectedKeySet],
  );

  const shippingSummaryLabel = useMemo(() => {
    const selectedProfileIds = productGroups
      .filter((group) =>
        group.items.some((item) => selectedKeySet.has(getVariantKey(item.productId, item.variation))),
      )
      .map((group) => selectedShippingProfiles[group.productId] ?? shippingProfiles[0].id);

    const uniqueProfileIds = Array.from(new Set(selectedProfileIds));

    if (uniqueProfileIds.length === 0) {
      return "No shipping method selected";
    }

    if (uniqueProfileIds.length === 1) {
      const matchingProfile = shippingProfiles.find((profile) => profile.id === uniqueProfileIds[0]);
      return matchingProfile?.name ?? "Shipping selected";
    }

    return "Multiple shipping methods selected";
  }, [productGroups, selectedKeySet, selectedShippingProfiles]);

  const toggleSelectAll = () => {
    setSelectedKeys((current) => (current.length === items.length ? [] : allItemKeys));
  };

  const toggleVariantSelection = (productId: string, variation: string) => {
    const key = getVariantKey(productId, variation);

    setSelectedKeys((current) =>
      current.includes(key) ? current.filter((itemKey) => itemKey !== key) : [...current, key],
    );
  };

  const toggleProductSelection = (group: ProductGroup) => {
    const groupKeys = group.items.map((item) => getVariantKey(item.productId, item.variation));
    const areAllGroupItemsSelected = groupKeys.every((key) => selectedKeySet.has(key));

    setSelectedKeys((current) => {
      if (areAllGroupItemsSelected) {
        return current.filter((key) => !groupKeys.includes(key));
      }

      return Array.from(new Set([...current, ...groupKeys]));
    });
  };

  const handleShippingProfileChange = (productId: string, profileId: string) => {
    setSelectedShippingProfiles((current) => ({
      ...current,
      [productId]: profileId,
    }));
  };

  const handleUpdateQuantity = (productId: string, variation: string, quantity: number) => {
    updateQuoteItem(productId, variation, Math.min(MAX_QUANTITY, Math.max(0, quantity)));
    setItems(getQuoteItems());
  };

  const handleRemoveVariant = (productId: string, variation: string) => {
    const variantKey = getVariantKey(productId, variation);

    removeQuoteItem(productId, variation);
    setSelectedKeys((current) => current.filter((key) => key !== variantKey));
    setItems(getQuoteItems());
  };

  const handlePlaceOrder = () => {
    if (selectedItems.length === 0) {
      return;
    }

    const shippingMethods = productGroups
      .filter((group) =>
        group.items.some((item) => selectedKeySet.has(getVariantKey(item.productId, item.variation))),
      )
      .map((group) => {
        const shippingProfileId = selectedShippingProfiles[group.productId] ?? shippingProfiles[0].id;
        const shippingProfile =
          shippingProfiles.find((profile) => profile.id === shippingProfileId) ?? shippingProfiles[0];

        return {
          productId: group.productId,
          productName: group.name,
          shippingProfileId: shippingProfile.id,
          shippingProfileName: shippingProfile.name,
        };
      });

    const order: StoredOrder = {
      id: `PLZ-${Date.now()}`,
      status: "Pending",
      createdAt: new Date().toISOString(),
      items: selectedItems,
      shippingMethods,
      summary: {
        quantity: totals.totalQuantity,
        totalQuantity: totals.totalQuantity,
        productPrice: totals.productPrice,
        cddCharge: totals.cddCharge,
        shippingCost: totals.shippingCost,
        hasUnknownShipping: totals.hasUnknownShipping,
        payNow: totals.payNow,
        payOnDelivery: totals.hasUnknownShipping
          ? "Confirmed after review"
          : totals.payOnDelivery,
      },
    };

    try {
      const storedOrders = window.localStorage.getItem(ORDERS_STORAGE_KEY);
      const parsedOrders = storedOrders ? JSON.parse(storedOrders) : [];
      const nextOrders = Array.isArray(parsedOrders) ? [order, ...parsedOrders] : [order];

      window.localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(nextOrders));
    } catch {
      window.localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify([order]));
    }

    selectedItems.forEach((item) => {
      removeQuoteItem(item.productId, item.variation);
    });

    setOrderSuccess(order);
    setSelectedKeys((current) =>
      current.filter(
        (key) =>
          !selectedItems.some((item) => getVariantKey(item.productId, item.variation) === key),
      ),
    );
    setItems(getQuoteItems());
  };

  return (
    <main className="min-h-screen bg-white">
      <Header />

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
              Shopping Cart ({selectedProductCount || productGroups.length})
            </h1>
            <p className="text-sm text-slate-500">
              Review your selected items before placing order
            </p>
          </div>

          {items.length > 0 ? (
            <Checkbox
              checked={allItemsSelected}
              onChange={toggleSelectAll}
              label="Select All Items"
            />
          ) : null}
        </div>

        {items.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center">
            <h2 className="text-2xl font-semibold text-slate-900">Your cart is empty</h2>
            <p className="mt-2 text-sm text-slate-500">
              Add products to your cart to review grouped variants here.
            </p>
            <Link
              href="/products"
              className="mt-6 inline-flex items-center justify-center rounded-full bg-[#615FFF] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#5552e6]"
            >
              Browse Products
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
            <div className="space-y-4">
              {orderSuccess ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4">
                  <p className="text-sm font-semibold text-emerald-700">
                    Order placed successfully. Status: Pending
                  </p>
                  <div className="mt-2 space-y-1 text-sm text-emerald-900">
                    <p>Order ID: {orderSuccess.id}</p>
                    <p>Status: {orderSuccess.status}</p>
                    <p>Pay Now: {formatBDT(orderSuccess.summary.payNow)}</p>
                  </div>
                </div>
              ) : null}

              {productGroups.map((group) => {
                const groupKeys = group.items.map((item) => getVariantKey(item.productId, item.variation));
                const isGroupSelected = groupKeys.every((key) => selectedKeySet.has(key));
                const selectedProfileId = selectedShippingProfiles[group.productId] ?? shippingProfiles[0].id;
                const selectedProfile =
                  shippingProfiles.find((profile) => profile.id === selectedProfileId) ?? shippingProfiles[0];
                const selectedGroupItems = selectedGroupedItems[group.productId] ?? [];
                const selectedGroupTotals = calculateCartTotals(
                  selectedGroupItems.length > 0 ? { [group.productId]: selectedGroupItems } : {},
                );

                return (
                  <article
                    key={group.productId}
                    className="rounded-xl border border-slate-200 bg-white"
                  >
                    <div className="border-b border-slate-200 px-4 py-4 sm:px-5">
                      <div className="flex gap-3">
                        <Checkbox
                          checked={isGroupSelected}
                          onChange={() => toggleProductSelection(group)}
                          label=""
                        />

                        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg border border-slate-100 bg-slate-50 sm:h-28 sm:w-28">
                          <Image
                            src={group.image}
                            alt={group.name}
                            fill
                            sizes="(min-width: 640px) 112px, 96px"
                            className="object-cover"
                          />
                        </div>

                        <div className="min-w-0 space-y-1">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                            Seller: Prelize Select
                          </p>
                          <h2 className="text-lg font-semibold text-slate-900">
                            Product: {group.name}
                          </h2>
                          <p className="text-sm text-slate-500">
                            {group.items.length} variation{group.items.length > 1 ? "s" : ""} in this
                            product group
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="divide-y divide-slate-200">
                      {group.items.map((item) => {
                        const variantKey = getVariantKey(item.productId, item.variation);
                        const isSelected = selectedKeySet.has(variantKey);
                        const productMatch = mockProducts.find((product) => product.id === item.productId);
                        const parsedWeight = parseWeight(productMatch?.weight);

                        return (
                          <div key={variantKey} className="px-4 py-4 sm:px-5">
                            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                              <div className="flex gap-3">
                                <Checkbox
                                  checked={isSelected}
                                  onChange={() => toggleVariantSelection(item.productId, item.variation)}
                                  label=""
                                />

                                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-slate-100 bg-slate-50">
                                  <Image
                                    src={item.image}
                                    alt={item.name}
                                    fill
                                    sizes="64px"
                                    className="object-cover"
                                  />
                                </div>

                                <div className="min-w-0 space-y-1">
                                  <p className="text-sm font-semibold text-slate-900">
                                    Variation: {item.variation}
                                  </p>
                                  <p className="text-sm text-slate-500">
                                    Unit price: {formatBDT(item.price)}
                                  </p>
                                  <p className="text-xs text-slate-400">
                                    Weight basis: {parsedWeight ? `${parsedWeight} kg per unit` : "Unknown"}
                                  </p>
                                </div>
                              </div>

                              <div className="flex flex-col gap-3 sm:flex-row sm:items-center xl:justify-end">
                                <QuantityControl
                                  quantity={item.quantity}
                                  onDecrease={() =>
                                    handleUpdateQuantity(item.productId, item.variation, item.quantity - 1)
                                  }
                                  onIncrease={() =>
                                    handleUpdateQuantity(item.productId, item.variation, item.quantity + 1)
                                  }
                                  onInputChange={(value) =>
                                    handleUpdateQuantity(item.productId, item.variation, value)
                                  }
                                />

                                <div className="min-w-[120px] text-left sm:text-right">
                                  <p className="text-xs uppercase tracking-[0.14em] text-slate-400">
                                    Row Total
                                  </p>
                                  <p className="mt-1 text-base font-semibold text-slate-900">
                                    {formatBDT(item.price * item.quantity)}
                                  </p>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleRemoveVariant(item.productId, item.variation)}
                                  className="inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-500"
                                  aria-label={`Remove ${item.variation}`}
                                >
                                  <TrashIcon />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="border-t border-slate-200 bg-slate-50/70 px-4 py-4 sm:px-5">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div className="space-y-2 lg:max-w-md">
                          <p className="text-sm font-semibold text-slate-900">Shipping Method</p>
                          <select
                            value={selectedProfile.id}
                            onChange={(event) =>
                              handleShippingProfileChange(group.productId, event.target.value)
                            }
                            className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none transition-colors focus:border-[#615FFF]"
                            aria-label={`Shipping method for ${group.name}`}
                          >
                            {shippingProfiles.map((profile) => (
                              <option key={profile.id} value={profile.id}>
                                {profile.name} - {formatBDT(profile.ratePerKg)}/kg
                              </option>
                            ))}
                          </select>
                          <div className="flex flex-col gap-1 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                            <span>Estimated delivery: {selectedProfile.estimate}</span>
                            <span>
                              Group shipping:{" "}
                              {selectedGroupTotals.hasUnknownShipping || selectedGroupTotals.payOnDelivery === null
                                ? "Confirmed after review"
                                : formatBDT(selectedGroupTotals.payOnDelivery)}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500">
                            Final shipping cost will be confirmed after review.
                          </p>
                        </div>

                        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center lg:justify-end">
                          <button
                            type="button"
                            className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-slate-400 hover:text-slate-900"
                          >
                            Add Note
                          </button>
                          <Link
                            href={group.slug ? `/products/${group.slug}` : "/products"}
                            className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-slate-400 hover:text-slate-900"
                          >
                            + Add more variations
                          </Link>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            <aside className="space-y-5 lg:sticky lg:top-6">
              <div className="rounded-lg bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2">
                    <p className="text-sm text-slate-500">Shipping Destination</p>
                    <div className="flex items-center gap-3 text-base font-semibold text-slate-900">
                      <span>To Bangladesh</span>
                      <span className="text-slate-300">-</span>
                      <span className="text-[#615FFF]">{shippingSummaryLabel}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="rounded-md p-2 text-slate-700 transition-colors hover:bg-white hover:text-[#615FFF]"
                    aria-label="Shipping details"
                  >
                    <LinkIcon />
                  </button>
                </div>
              </div>

              <div>
                <h2 className="text-lg font-semibold text-slate-900">Order Summary</h2>
              </div>

              <div className="space-y-0 rounded-xl border border-slate-200 bg-white px-5">
                <SummaryRow label="Quantity" value={String(totals.totalQuantity)} />
                <SummaryRow label="Product Price" value={formatBDT(totals.productPrice)} />
                <SummaryRow label="CDD Charge" value={formatBDT(totals.cddCharge)} />
                <SummaryRow label="Pay Now" value={formatBDT(totals.payNow)} strong />
              </div>

              <div className="rounded-lg border border-dashed border-[#615FFF]/50 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2">
                    <p className="text-base font-semibold text-slate-900">Pay on Delivery</p>
                  </div>

                  <div className="text-right">
                    <p className="text-lg font-semibold text-slate-700">
                      {totals.hasUnknownShipping || totals.payOnDelivery === null
                        ? "Confirmed after review"
                        : formatBDT(totals.payOnDelivery)}
                    </p>
                    <p className="mt-2 whitespace-nowrap text-xs font-medium text-[#615FFF]">
                      Estimated shipping charge
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  type="button"
                  disabled={selectedItems.length === 0}
                  onClick={handlePlaceOrder}
                  className="inline-flex w-full items-center justify-center rounded-full bg-[#615FFF] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#5552e6] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                >
                  Place Order
                </button>
                <Link
                  href="/products"
                  className="inline-flex w-full items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:text-slate-900"
                >
                  Continue Shopping
                </Link>
              </div>

              <p className="text-center text-sm text-slate-500">
                {selectedItems.length === 0 ? "Select items to place order" : ""}
              </p>

              <p className="text-sm leading-6 text-slate-500">
                Final shipping cost will be confirmed after order review.
              </p>
            </aside>
          </div>
        )}
      </section>
    </main>
  );
}
