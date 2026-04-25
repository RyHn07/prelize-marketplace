"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import Header from "@/components/Header";
import {
  getQuoteItems,
  QUOTE_STORAGE_KEY,
  QUOTE_UPDATED_EVENT,
  removeQuoteItem,
  type QuoteItem,
} from "@/components/quote/quote-utils";
import { getProductsByIds } from "@/lib/products/queries";
import { calculateCartTotals, type CartItem } from "@/lib/shipping-utils";
import { getSupabaseClient } from "@/lib/supabase-client";
import type { ProductDbRow } from "@/types/product-db";

const CHECKOUT_DRAFT_STORAGE_KEY = "prelize_checkout_draft";
const PAYMENT_METHOD = "Bank Transfer";
const DEFAULT_PAYMENT_STATUS = "Pending";

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

type AuthUser = {
  id: string;
  email: string;
};

type CheckoutDraft = {
  selectedKeys: string[];
  selectedShippingProfiles: Record<string, string>;
};

type BuyerForm = {
  fullName: string;
  phone: string;
  country: string;
  city: string;
  address: string;
  note: string;
};

type BuyerFormErrors = Partial<Record<keyof BuyerForm, string>>;

type ShippingMethod = {
  productId: string;
  productName: string;
  shippingProfileId: string;
  shippingProfileName: string;
};

type OrderSummary = {
  quantity: number;
  totalQuantity: number;
  productPrice: number;
  cddCharge: number;
  shippingCost: number | null;
  hasUnknownShipping: boolean;
  payNow: number;
  payOnDelivery: number | string | null;
};

type SelectedProductGroup = {
  productId: string;
  name: string;
  image: string;
  items: QuoteItem[];
  shippingProfileName: string;
};

function formatBDT(amount: number) {
  return `\u09F3${amount.toLocaleString()}`;
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

function validateBuyerForm(values: BuyerForm) {
  const nextErrors: BuyerFormErrors = {};

  if (!values.fullName.trim()) {
    nextErrors.fullName = "Full name is required.";
  }

  if (!values.phone.trim()) {
    nextErrors.phone = "Phone is required.";
  }

  if (!values.country.trim()) {
    nextErrors.country = "Country is required.";
  }

  if (!values.city.trim()) {
    nextErrors.city = "City is required.";
  }

  if (!values.address.trim()) {
    nextErrors.address = "Address is required.";
  }

  return nextErrors;
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

export default function CheckoutPage() {
  const router = useRouter();
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [selectedShippingProfiles, setSelectedShippingProfiles] = useState<Record<string, string>>({});
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [productRecords, setProductRecords] = useState<ProductDbRow[]>([]);
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);
  const [hasLoadedDraft, setHasLoadedDraft] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [orderError, setOrderError] = useState("");
  const [buyerForm, setBuyerForm] = useState<BuyerForm>({
    fullName: "",
    phone: "",
    country: "",
    city: "",
    address: "",
    note: "",
  });
  const [buyerErrors, setBuyerErrors] = useState<BuyerFormErrors>({});

  useEffect(() => {
    let isMounted = true;

    const syncQuoteItems = () => {
      setItems(getQuoteItems());
    };

    syncQuoteItems();

    Promise.resolve().then(() => {
      if (!isMounted) {
        return;
      }

      const draftValue = window.localStorage.getItem(CHECKOUT_DRAFT_STORAGE_KEY);

      if (draftValue) {
        try {
          const parsedDraft = JSON.parse(draftValue) as CheckoutDraft;
          setSelectedKeys(Array.isArray(parsedDraft.selectedKeys) ? parsedDraft.selectedKeys : []);
          setSelectedShippingProfiles(parsedDraft.selectedShippingProfiles ?? {});
        } catch {
          window.localStorage.removeItem(CHECKOUT_DRAFT_STORAGE_KEY);
        }
      }

      setHasLoadedDraft(true);
    });

    const handleStorageChange = (event: StorageEvent) => {
      if (!event.key || event.key === QUOTE_STORAGE_KEY) {
        syncQuoteItems();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener(QUOTE_UPDATED_EVENT, syncQuoteItems);

    return () => {
      isMounted = false;
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener(QUOTE_UPDATED_EVENT, syncQuoteItems);
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
    if (hasCheckedAuth && !currentUser) {
      router.push("/login");
    }
  }, [currentUser, hasCheckedAuth, router]);

  const selectedKeySet = useMemo(() => new Set(selectedKeys), [selectedKeys]);

  const selectedGroupedItems = useMemo<Record<string, CartItem[]>>(() => {
    const groupedItems = new Map<string, QuoteItem[]>();

    items.forEach((item) => {
      const variantKey = getVariantKey(item.productId, item.variation);

      if (!selectedKeySet.has(variantKey)) {
        return;
      }

      const existingItems = groupedItems.get(item.productId);

      if (existingItems) {
        existingItems.push(item);
        return;
      }

      groupedItems.set(item.productId, [item]);
    });

    return Array.from(groupedItems.entries()).reduce<Record<string, CartItem[]>>((result, [productId, groupItems]) => {
      const productMatch = productRecordMap.get(productId);
      const selectedShippingProfileId = selectedShippingProfiles[productId] ?? shippingProfiles[0].id;
      const selectedShippingProfile =
        shippingProfiles.find((profile) => profile.id === selectedShippingProfileId) ?? shippingProfiles[0];

      result[productId] = groupItems.map((item) => ({
        productId: item.productId,
        name: item.name,
        image: item.image,
        variation: item.variation,
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
  }, [items, productRecordMap, selectedKeySet, selectedShippingProfiles]);

  const totals = useMemo(() => calculateCartTotals(selectedGroupedItems), [selectedGroupedItems]);
  const selectedCartItems = useMemo(() => Object.values(selectedGroupedItems).flat(), [selectedGroupedItems]);

  const selectedProductGroups = useMemo<SelectedProductGroup[]>(() => {
    const groups = new Map<string, SelectedProductGroup>();

    items.forEach((item) => {
      const variantKey = getVariantKey(item.productId, item.variation);

      if (!selectedKeySet.has(variantKey)) {
        return;
      }

      const selectedShippingProfileId = selectedShippingProfiles[item.productId] ?? shippingProfiles[0].id;
      const selectedShippingProfile =
        shippingProfiles.find((profile) => profile.id === selectedShippingProfileId) ?? shippingProfiles[0];
      const existingGroup = groups.get(item.productId);

      if (existingGroup) {
        existingGroup.items.push(item);
        return;
      }

      groups.set(item.productId, {
        productId: item.productId,
        name: item.name,
        image: item.image,
        items: [item],
        shippingProfileName: selectedShippingProfile.name,
      });
    });

    return Array.from(groups.values());
  }, [items, selectedKeySet, selectedShippingProfiles]);

  const handleBuyerFieldChange = (field: keyof BuyerForm, value: string) => {
    setBuyerForm((current) => ({
      ...current,
      [field]: value,
    }));

    setBuyerErrors((current) => {
      if (!current[field]) {
        return current;
      }

      const nextErrors = { ...current };
      delete nextErrors[field];
      return nextErrors;
    });
  };

  const handlePlaceOrder = async () => {
    if (selectedCartItems.length === 0 || isPlacingOrder) {
      return;
    }

    const nextBuyerErrors = validateBuyerForm(buyerForm);

    if (Object.keys(nextBuyerErrors).length > 0) {
      setBuyerErrors(nextBuyerErrors);
      setOrderError("Please complete the required buyer details.");
      return;
    }

    const supabase = getSupabaseClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user?.id || !user.email) {
      router.push("/login");
      return;
    }

    const shippingMethods: ShippingMethod[] = selectedProductGroups.map((group) => {
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

    const summary: OrderSummary = {
      quantity: totals.totalQuantity,
      totalQuantity: totals.totalQuantity,
      productPrice: totals.productPrice,
      cddCharge: totals.cddCharge,
      shippingCost: totals.shippingCost,
      hasUnknownShipping: totals.hasUnknownShipping,
      payNow: totals.payNow,
      payOnDelivery: totals.hasUnknownShipping ? "Confirmed after review" : totals.payOnDelivery,
    };

    setOrderError("");
    setBuyerErrors({});
    setIsPlacingOrder(true);

    try {
      const orderNumber = `PLZ-${Date.now()}`;
      const buyer = {
        fullName: buyerForm.fullName.trim(),
        phone: buyerForm.phone.trim(),
        country: buyerForm.country.trim(),
        city: buyerForm.city.trim(),
        address: buyerForm.address.trim(),
        note: buyerForm.note.trim(),
      };

      const { data: insertedOrder, error: orderInsertError } = await supabase
        .from("orders")
        .insert({
          order_number: orderNumber,
          user_id: user.id,
          user_email: user.email,
          status: "Pending",
          payment_method: PAYMENT_METHOD,
          payment_status: DEFAULT_PAYMENT_STATUS,
          buyer,
          summary,
          shipping_methods: shippingMethods,
        } as never)
        .select("id, order_number")
        .single();

      const createdOrder = insertedOrder as { id: string; order_number: string } | null;

      if (orderInsertError || !createdOrder) {
        const insertMessage = orderInsertError?.message ?? "Unable to save your order.";

        if (
          insertMessage.toLowerCase().includes("payment_method") ||
          insertMessage.toLowerCase().includes("payment_status")
        ) {
          throw new Error(
            "Payment columns are missing. Run: alter table orders add column payment_method text default 'Bank Transfer'; alter table orders add column payment_status text default 'Pending';",
          );
        }

        throw new Error(insertMessage);
      }

      const orderItemsPayload = selectedCartItems.map((item) => ({
        order_id: createdOrder.id,
        product_id: item.productId,
        product_name: item.name,
        product_image: item.image,
        variation: item.variation,
        price: item.price,
        quantity: item.quantity,
        weight: item.weight ?? null,
      }));

      const { error: orderItemsError } = await supabase
        .from("order_items")
        .insert(orderItemsPayload as never);

      if (orderItemsError) {
        throw new Error(orderItemsError.message);
      }

      selectedCartItems.forEach((item) => {
        removeQuoteItem(item.productId, item.variation);
      });

      window.localStorage.removeItem(CHECKOUT_DRAFT_STORAGE_KEY);
      router.push(`/orders/${createdOrder.id}`);
    } catch (error) {
      setOrderError(
        error instanceof Error ? error.message : "Unable to place order right now. Please try again.",
      );
    } finally {
      setIsPlacingOrder(false);
    }
  };

  if (!hasCheckedAuth || !currentUser || !hasLoadedDraft) {
    return (
      <main className="min-h-screen bg-white">
        <Header />

        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center">
            <h2 className="text-2xl font-semibold text-slate-900">Loading...</h2>
            <p className="mt-2 text-sm text-slate-500">
              Preparing your checkout details.
            </p>
          </div>
        </section>
      </main>
    );
  }

  if (selectedCartItems.length === 0) {
    return (
      <main className="min-h-screen bg-white">
        <Header />

        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center">
            <h1 className="text-2xl font-semibold text-slate-900">No checkout items selected</h1>
            <p className="mt-2 text-sm text-slate-500">
              Go back to your cart and choose the items you want to order.
            </p>
            <Link
              href="/cart"
              className="mt-6 inline-flex items-center justify-center rounded-full bg-[#615FFF] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#5552e6]"
            >
              Back to Cart
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white">
      <Header />

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#615FFF]">
            Checkout
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
            Complete Your Order
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Add your buyer details and review the final summary before placing the order.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
          <div className="space-y-4">
            <section className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-slate-900">Buyer Details</h2>
                <p className="text-sm text-slate-500">
                  These details will be used for delivery and order confirmation.
                </p>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor="buyer-full-name" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Full Name
                  </label>
                  <input
                    id="buyer-full-name"
                    type="text"
                    value={buyerForm.fullName}
                    onChange={(event) => handleBuyerFieldChange("fullName", event.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition-colors focus:border-[#615FFF]"
                    placeholder="Enter your full name"
                  />
                  {buyerErrors.fullName ? (
                    <p className="mt-1 text-sm text-rose-500">{buyerErrors.fullName}</p>
                  ) : null}
                </div>

                <div>
                  <label htmlFor="buyer-phone" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Phone
                  </label>
                  <input
                    id="buyer-phone"
                    type="text"
                    value={buyerForm.phone}
                    onChange={(event) => handleBuyerFieldChange("phone", event.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition-colors focus:border-[#615FFF]"
                    placeholder="Phone number"
                  />
                  {buyerErrors.phone ? (
                    <p className="mt-1 text-sm text-rose-500">{buyerErrors.phone}</p>
                  ) : null}
                </div>

                <div>
                  <label htmlFor="buyer-country" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Country
                  </label>
                  <input
                    id="buyer-country"
                    type="text"
                    value={buyerForm.country}
                    onChange={(event) => handleBuyerFieldChange("country", event.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition-colors focus:border-[#615FFF]"
                    placeholder="Country"
                  />
                  {buyerErrors.country ? (
                    <p className="mt-1 text-sm text-rose-500">{buyerErrors.country}</p>
                  ) : null}
                </div>

                <div>
                  <label htmlFor="buyer-city" className="mb-1.5 block text-sm font-medium text-slate-700">
                    City
                  </label>
                  <input
                    id="buyer-city"
                    type="text"
                    value={buyerForm.city}
                    onChange={(event) => handleBuyerFieldChange("city", event.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition-colors focus:border-[#615FFF]"
                    placeholder="City"
                  />
                  {buyerErrors.city ? (
                    <p className="mt-1 text-sm text-rose-500">{buyerErrors.city}</p>
                  ) : null}
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="buyer-address" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Address
                  </label>
                  <textarea
                    id="buyer-address"
                    value={buyerForm.address}
                    onChange={(event) => handleBuyerFieldChange("address", event.target.value)}
                    className="min-h-24 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 outline-none transition-colors focus:border-[#615FFF]"
                    placeholder="Street address, area, and landmarks"
                  />
                  {buyerErrors.address ? (
                    <p className="mt-1 text-sm text-rose-500">{buyerErrors.address}</p>
                  ) : null}
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="buyer-note" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Note
                  </label>
                  <textarea
                    id="buyer-note"
                    value={buyerForm.note}
                    onChange={(event) => handleBuyerFieldChange("note", event.target.value)}
                    className="min-h-24 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 outline-none transition-colors focus:border-[#615FFF]"
                    placeholder="Optional delivery or order note"
                  />
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="text-lg font-semibold text-slate-900">Selected Products</h2>

              <div className="mt-4 space-y-4">
                {selectedProductGroups.map((group) => (
                  <article key={group.productId} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex gap-4 border-b border-slate-200 pb-4">
                      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-slate-100 bg-slate-50">
                        <Image
                          src={group.image}
                          alt={group.name}
                          fill
                          sizes="80px"
                          className="object-cover"
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="text-base font-semibold text-slate-900">{group.name}</h3>
                        <p className="mt-1 text-sm text-slate-500">
                          Shipping Method: {group.shippingProfileName}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {group.items.length} variation{group.items.length > 1 ? "s" : ""} selected
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 space-y-2">
                      {group.items.map((item) => (
                        <div
                          key={getVariantKey(item.productId, item.variation)}
                          className="rounded-lg border border-slate-200 px-4 py-3"
                        >
                          <div className="grid gap-2 text-sm text-slate-600 sm:grid-cols-4">
                            <p className="font-semibold text-slate-900">{item.variation}</p>
                            <p>Qty: {item.quantity}</p>
                            <p>Unit: {formatBDT(item.price)}</p>
                            <p className="font-medium text-slate-900">
                              Total: {formatBDT(item.price * item.quantity)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>

          <aside className="space-y-5 lg:sticky lg:top-6">
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
                disabled={selectedCartItems.length === 0 || isPlacingOrder}
                onClick={handlePlaceOrder}
                className="inline-flex w-full items-center justify-center rounded-full bg-[#615FFF] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#5552e6] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
              >
                {isPlacingOrder ? "Placing Order..." : "Place Order"}
              </button>
              <Link
                href="/cart"
                className="inline-flex w-full items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:text-slate-900"
              >
                Back to Cart
              </Link>
            </div>

            {orderError ? (
              <p className="text-center text-sm font-medium text-rose-500">{orderError}</p>
            ) : null}

            <p className="text-sm leading-6 text-slate-500">
              Final shipping cost will be confirmed after order review.
            </p>
          </aside>
        </div>
      </section>
    </main>
  );
}
