"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import Header from "@/components/Header";
import {
  getQuoteItems,
  getQuoteItemKey,
  QUOTE_STORAGE_KEY,
  QUOTE_UPDATED_EVENT,
  removeQuoteItem,
  type QuoteItem,
  updateQuoteItem,
} from "@/components/quote/quote-utils";
import { getProductsByIds } from "@/lib/products/queries";
import { calculateCartTotals, type CartItem } from "@/lib/shipping-utils";
import { getSupabaseClient } from "@/lib/supabase-client";
import { getVendorsByIds } from "@/lib/vendors/queries";
import type { ProductDbRow } from "@/types/product-db";

const MAX_QUANTITY = 9999;
const CHECKOUT_DRAFT_STORAGE_KEY = "prelize_checkout_draft";
const PAYMENT_METHOD = "Bank Transfer";

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
  shortDescription?: string | null;
  vendorName?: string | null;
  items: QuoteItem[];
};

type AuthUser = {
  id: string;
  email: string;
};

type CheckoutDraft = {
  selectedKeys: string[];
  selectedShippingProfiles: Record<string, string>;
};

type ItemAvailabilityIssue = {
  message: string;
  kind: "missing" | "inactive";
};

type CartProductSpecification = {
  label: string;
  value: string;
};

function formatBDT(amount: number) {
  return `\u09F3${amount.toLocaleString()}`;
}

function getVariantKey(item: QuoteItem) {
  return getQuoteItemKey(item.productId, item.variation, item.variantId);
}

function parseWeight(weight?: string) {
  if (!weight) {
    return undefined;
  }

  const parsedWeight = Number.parseFloat(weight);
  return Number.isFinite(parsedWeight) && parsedWeight > 0 ? parsedWeight : undefined;
}

function getProductAvailabilityIssue(product: ProductDbRow | undefined): ItemAvailabilityIssue | null {
  if (!product) {
    return {
      kind: "missing",
      message: "This product is no longer available in the catalog.",
    };
  }

  const status = product.status ?? (product.is_active ? "active" : "disabled");

  if (!product.is_active || status !== "active") {
    return {
      kind: "inactive",
      message: "This product is currently unavailable and cannot be checked out.",
    };
  }

  return null;
}

function isCartProductSpecification(value: unknown): value is CartProductSpecification {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    typeof (value as CartProductSpecification).label === "string" &&
    typeof (value as CartProductSpecification).value === "string"
  );
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
  const router = useRouter();
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [selectedShippingProfiles, setSelectedShippingProfiles] = useState<Record<string, string>>({});
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [productRecords, setProductRecords] = useState<ProductDbRow[]>([]);
  const [vendorNamesById, setVendorNamesById] = useState<Record<string, string>>({});
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
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
    let isMounted = true;
    const supabase = getSupabaseClient();

    supabase.auth.getUser().then(({ data }) => {
      if (!isMounted) {
        return;
      }

      const user = data.user;
      setCurrentUser(
        user?.id && user.email
          ? {
              id: user.id,
              email: user.email,
            }
          : null,
      );
      setHasCheckedAuth(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) {
        return;
      }

      const user = session?.user;
      setCurrentUser(
        user?.id && user.email
          ? {
              id: user.id,
              email: user.email,
            }
          : null,
      );
      setHasCheckedAuth(true);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadProductRecords = async () => {
      const result = await getProductsByIds(items.map((item) => item.productId));

      if (!isMounted) {
        return;
      }

      setProductRecords(result.data);

      const vendorIds = Array.from(
        new Set(
          result.data
            .map((product) => product.vendor_id)
            .filter((vendorId): vendorId is string => typeof vendorId === "string" && vendorId.length > 0),
        ),
      );

      if (vendorIds.length === 0) {
        setVendorNamesById({});
        return;
      }

      const vendorResult = await getVendorsByIds(vendorIds);

      if (!isMounted) {
        return;
      }

      setVendorNamesById(
        Object.fromEntries(vendorResult.data.map((vendor) => [vendor.id, vendor.name])),
      );
    };

    void loadProductRecords();

    return () => {
      isMounted = false;
    };
  }, [items]);

  const productRecordMap = useMemo(
    () => new Map(productRecords.map((product) => [product.id, product])),
    [productRecords],
  );

  useEffect(() => {
    if (hasCheckedAuth && !currentUser) {
      router.push("/login");
    }
  }, [currentUser, hasCheckedAuth, router]);

  useEffect(() => {
    const currentKeys = items.map((item) => getVariantKey(item));

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
      const productMatch = productRecordMap.get(item.productId);
      const existingGroup = groupedItems.get(item.productId);

      if (existingGroup) {
        existingGroup.items.push(item);
        return;
      }

      groupedItems.set(item.productId, {
        productId: item.productId,
        name: item.name,
        image: productMatch?.image_url ?? item.image,
        slug: productMatch?.slug,
        shortDescription: productMatch?.short_description ?? productMatch?.description ?? null,
        vendorName: productMatch?.vendor_id ? vendorNamesById[productMatch.vendor_id] ?? null : null,
        items: [item],
      });
    });

    return Array.from(groupedItems.values());
  }, [items, productRecordMap, vendorNamesById]);

  const itemAvailabilityIssues = useMemo(() => {
    const issues = new Map<string, ItemAvailabilityIssue>();

    items.forEach((item) => {
      const issue = getProductAvailabilityIssue(productRecordMap.get(item.productId));

      if (issue) {
        issues.set(getVariantKey(item), issue);
      }
    });

    return issues;
  }, [items, productRecordMap]);

  const hasUnavailableItems = itemAvailabilityIssues.size > 0;

  const selectedKeySet = useMemo(() => new Set(selectedKeys), [selectedKeys]);
  const effectiveSelectedShippingProfiles = useMemo(() => {
    return productGroups.reduce<Record<string, string>>((result, group) => {
      result[group.productId] = selectedShippingProfiles[group.productId] ?? shippingProfiles[0].id;
      return result;
    }, {});
  }, [productGroups, selectedShippingProfiles]);

  const selectedGroupedItems = useMemo<Record<string, CartItem[]>>(() => {
    return productGroups.reduce<Record<string, CartItem[]>>((result, group) => {
      const selectedItemsForGroup = group.items.filter((item) =>
        selectedKeySet.has(getVariantKey(item)) && !itemAvailabilityIssues.has(getVariantKey(item)),
      );

      if (selectedItemsForGroup.length === 0) {
        return result;
      }

      const productMatch = productRecordMap.get(group.productId);
      const selectedShippingProfileId =
        effectiveSelectedShippingProfiles[group.productId] ?? shippingProfiles[0].id;
      const selectedShippingProfile =
        shippingProfiles.find((profile) => profile.id === selectedShippingProfileId) ?? shippingProfiles[0];

      result[group.productId] = selectedItemsForGroup.map((item) => ({
        productId: item.productId,
        name: productMatch?.name ?? item.name,
        image: productMatch?.image_url ?? item.image,
        variation: item.variation,
        variantId: item.variantId,
        price: item.price,
        quantity: item.quantity,
        weight: parseWeight(
        productMatch?.weight == null ? undefined : String(productMatch.weight)
      ),
        shippingProfile: {
          id: selectedShippingProfile.id,
          name: selectedShippingProfile.name,
          ratePerKg: selectedShippingProfile.ratePerKg,
        },
        cddTiers: (productMatch as typeof productMatch & { cddTiers?: CartItem["cddTiers"] })?.cddTiers,
      }));

      return result;
    }, {});
  }, [effectiveSelectedShippingProfiles, itemAvailabilityIssues, productGroups, productRecordMap, selectedKeySet]);

  const totals = useMemo(() => calculateCartTotals(selectedGroupedItems), [selectedGroupedItems]);

  const selectedCartItems = useMemo(() => Object.values(selectedGroupedItems).flat(), [selectedGroupedItems]);

  const allItemKeys = useMemo(
    () => items.filter((item) => !itemAvailabilityIssues.has(getVariantKey(item))).map((item) => getVariantKey(item)),
    [itemAvailabilityIssues, items],
  );

  const allItemsSelected = allItemKeys.length > 0 && allItemKeys.every((key) => selectedKeySet.has(key));

  const selectedProductCount = useMemo(
    () =>
      productGroups.filter((group) =>
        group.items.some((item) => selectedKeySet.has(getVariantKey(item))),
      ).length,
    [productGroups, selectedKeySet],
  );

  const shippingSummaryLabel = useMemo(() => {
    const selectedProfileIds = productGroups
      .filter((group) =>
        group.items.some((item) => selectedKeySet.has(getVariantKey(item))),
      )
      .map((group) => effectiveSelectedShippingProfiles[group.productId] ?? shippingProfiles[0].id);

    const uniqueProfileIds = Array.from(new Set(selectedProfileIds));

    if (uniqueProfileIds.length === 0) {
      return "No shipping method selected";
    }

    if (uniqueProfileIds.length === 1) {
      const matchingProfile = shippingProfiles.find((profile) => profile.id === uniqueProfileIds[0]);
      return matchingProfile?.name ?? "Shipping selected";
    }

    return "Multiple shipping methods selected";
  }, [effectiveSelectedShippingProfiles, productGroups, selectedKeySet]);

  const toggleSelectAll = () => {
    setSelectedKeys((current) => (current.length === items.length ? [] : allItemKeys));
  };

  const toggleVariantSelection = (item: QuoteItem) => {
    if (itemAvailabilityIssues.has(getVariantKey(item))) {
      return;
    }

    const key = getVariantKey(item);

    setSelectedKeys((current) =>
      current.includes(key) ? current.filter((itemKey) => itemKey !== key) : [...current, key],
    );
  };

  const toggleProductSelection = (group: ProductGroup) => {
    const groupKeys = group.items
      .filter((item) => !itemAvailabilityIssues.has(getVariantKey(item)))
      .map((item) => getVariantKey(item));

    if (groupKeys.length === 0) {
      return;
    }

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

  const handleUpdateQuantity = (item: QuoteItem, quantity: number) => {
    updateQuoteItem(
      item.productId,
      item.variation,
      Math.min(MAX_QUANTITY, Math.max(0, quantity)),
      item.variantId,
    );
    setItems(getQuoteItems());
  };

  const handleRemoveVariant = (item: QuoteItem) => {
    const variantKey = getVariantKey(item);

    removeQuoteItem(item.productId, item.variation, item.variantId);
    setSelectedKeys((current) => current.filter((key) => key !== variantKey));
    setItems(getQuoteItems());
  };

  const handleContinueToCheckout = () => {
    if (selectedCartItems.length === 0) {
      setActionMessage(
        hasUnavailableItems
          ? "Remove unavailable items or select only valid items to continue."
          : "Select items to continue to checkout.",
      );
      return;
    }

    const checkoutDraft: CheckoutDraft = {
      selectedKeys,
      selectedShippingProfiles: effectiveSelectedShippingProfiles,
    };

    window.localStorage.setItem(CHECKOUT_DRAFT_STORAGE_KEY, JSON.stringify(checkoutDraft));
    setActionMessage("");
    router.push("/checkout");
  };

  if (!hasCheckedAuth || !currentUser) {
    return (
      <main className="min-h-screen bg-white">
        <Header />

        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center">
            <h2 className="text-2xl font-semibold text-slate-900">Loading...</h2>
            <p className="mt-2 text-sm text-slate-500">
              Checking your account before opening your cart.
            </p>
          </div>
        </section>
      </main>
    );
  }

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
              Review your selected items before continuing to checkout
            </p>
          </div>

          {items.length > 0 ? (
            <Checkbox checked={allItemsSelected} onChange={toggleSelectAll} label="Select All Items" />
          ) : null}
        </div>

        {hasUnavailableItems ? (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
            Some items in your cart are no longer available. They are blocked from checkout until removed.
          </div>
        ) : null}

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
              {productGroups.map((group) => {
                const groupKeys = group.items.map((item) => getVariantKey(item));
                const isGroupSelected = groupKeys.every((key) => selectedKeySet.has(key));
                const groupHasUnavailableItems = group.items.some((item) => itemAvailabilityIssues.has(getVariantKey(item)));
                const selectedProfileId =
                  effectiveSelectedShippingProfiles[group.productId] ?? shippingProfiles[0].id;
                const selectedProfile =
                  shippingProfiles.find((profile) => profile.id === selectedProfileId) ?? shippingProfiles[0];
                const selectedGroupItems = selectedGroupedItems[group.productId] ?? [];
                const selectedGroupTotals = calculateCartTotals(
                  selectedGroupItems.length > 0 ? { [group.productId]: selectedGroupItems } : {},
                );
                const groupProduct = productRecordMap.get(group.productId);
                const visibleSpecifications = Array.isArray(groupProduct?.specifications)
                  ? groupProduct.specifications
                      .flatMap((specification) =>
                        isCartProductSpecification(specification)
                          ? [{ label: specification.label, value: specification.value }]
                          : [],
                      )
                      .slice(0, 3)
                  : [];
                const reviewCount = Array.isArray(groupProduct?.reviews) ? groupProduct.reviews.length : 0;

                return (
                  <article key={group.productId} className="rounded-xl border border-slate-200 bg-white">
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
                            {group.vendorName ? `Vendor: ${group.vendorName}` : "Marketplace Product"}
                          </p>
                          <h2 className="text-lg font-semibold text-slate-900">
                            Product: {group.name}
                          </h2>
                          {group.shortDescription ? (
                            <p className="text-sm leading-6 text-slate-500">{group.shortDescription}</p>
                          ) : null}
                          <p className="text-sm text-slate-500">
                            {group.items.length} variation{group.items.length > 1 ? "s" : ""} in this
                            product group
                          </p>
                          {visibleSpecifications.length > 0 ? (
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                              {visibleSpecifications.map((specification) => (
                                <span key={`${group.productId}-${specification.label}`}>
                                  <strong className="font-semibold text-slate-600">{specification.label}:</strong>{" "}
                                  {specification.value}
                                </span>
                              ))}
                            </div>
                          ) : null}
                          <p className="text-xs font-medium text-slate-400">
                            {reviewCount > 0 ? `Reviews available: ${reviewCount}` : "No reviews yet"}
                          </p>
                          {groupHasUnavailableItems ? (
                            <p className="text-sm font-medium text-amber-700">
                              Contains unavailable items
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="divide-y divide-slate-200">
                      {group.items.map((item) => {
                        const variantKey = getVariantKey(item);
                        const isSelected = selectedKeySet.has(variantKey);
                        const productMatch = productRecordMap.get(item.productId);
                        const availabilityIssue = itemAvailabilityIssues.get(variantKey);
                        const parsedWeight = parseWeight(
                              productMatch?.weight == null ? undefined : String(productMatch.weight)
                            );

                        return (
                          <div key={variantKey} className="px-4 py-4 sm:px-5">
                            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                              <div className="flex gap-3">
                                <Checkbox
                                  checked={isSelected}
                                  onChange={() => toggleVariantSelection(item)}
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
                                  {availabilityIssue ? (
                                    <p className="text-xs font-medium text-amber-700">{availabilityIssue.message}</p>
                                  ) : null}
                                </div>
                              </div>

                              <div className="flex flex-col gap-3 sm:flex-row sm:items-center xl:justify-end">
                                <QuantityControl
                                  quantity={item.quantity}
                                  onDecrease={() => handleUpdateQuantity(item, item.quantity - 1)}
                                  onIncrease={() => handleUpdateQuantity(item, item.quantity + 1)}
                                  onInputChange={(value) => handleUpdateQuantity(item, value)}
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
                                  onClick={() => handleRemoveVariant(item)}
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
                            disabled={groupHasUnavailableItems}
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

              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold text-slate-900">Payment Method</h2>
                  <p className="text-base font-semibold text-[#615FFF]">{PAYMENT_METHOD}</p>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-500">
                  After placing your order, our team will contact you with bank transfer details.
                </p>
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
                  disabled={selectedCartItems.length === 0 || !currentUser || !hasCheckedAuth}
                  onClick={handleContinueToCheckout}
                  className="inline-flex w-full items-center justify-center rounded-full bg-[#615FFF] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#5552e6] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                >
                  Continue to Checkout
                </button>
                <Link
                  href="/products"
                  className="inline-flex w-full items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:text-slate-900"
                >
                  Continue Shopping
                </Link>
              </div>

              <p className="text-center text-sm text-slate-500">
                {!currentUser && hasCheckedAuth
                  ? "Please login to continue"
                  : selectedCartItems.length === 0
                    ? "Select items to continue to checkout"
                    : ""}
              </p>

              {actionMessage ? (
                <p className="text-center text-sm font-medium text-rose-500">{actionMessage}</p>
              ) : null}

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
