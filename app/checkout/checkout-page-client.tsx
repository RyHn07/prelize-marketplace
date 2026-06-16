"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  getQuoteItems,
  getQuoteItemKey,
  QUOTE_STORAGE_KEY,
  QUOTE_UPDATED_EVENT,
  removeQuoteItem,
  type QuoteItem,
} from "@/components/quote/quote-utils";
import { fetchCndsProfilesForCart } from "@/lib/cnds/actions";
import { fetchActiveInternationalShippingMethods } from "@/lib/international-shipping/actions";
import {
  calculateInternationalShippingEstimate,
  calculateTotalWeightKg,
  formatDeliveryWindow,
} from "@/lib/international-shipping/utils";
import { calculateProductGroupPricing, normalizeExchangeRate, roundCurrency } from "@/lib/product-pricing";
import { createVendorOrderSummary } from "@/lib/orders/utils";
import { fetchResolvedProductPricingMap } from "@/lib/products/public-actions";
import { getProductVariantMapByProductIds, getProductsByIds } from "@/lib/products/queries";
import { calculateCartTotals, calculateImmediateChargeBreakdown, type CartItem } from "@/lib/shipping-utils";
import { getPgDataClient } from "@/lib/browser-app-client";
import type {
  CndsShippingProfileRow,
  InternationalShippingMethodRow,
  InternationalShippingStatus,
  OrderSummaryRow,
  ProductDbRow,
  ProductDbVariantRow,
  ResolvedProductPricingConfig,
  ShippingMethodRow,
} from "@/types/product-db";

const CHECKOUT_DRAFT_STORAGE_KEY = "prelize_checkout_draft";
const PAYMENT_METHOD = "Bank Transfer";
const DEFAULT_PAYMENT_STATUS = "Pending";
const PAY_ON_DELIVERY_PLACEHOLDER = "Pending review";

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
  selectedInternationalShippingMethodId?: string;
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

type SelectedProductGroup = {
  productId: string;
  name: string;
  image: string;
  items: QuoteItem[];
  shippingMethodName: string;
};

type ItemAvailabilityIssue = {
  message: string;
  kind: "missing" | "inactive";
};

function mapAuthUser(
  user:
    | {
        id?: string;
        email?: string | null;
      }
    | null
    | undefined,
): AuthUser | null {
  if (!user?.id || !user.email) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
  };
}

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

function buildVariantRecordMap(variantsByProductId: Map<string, ProductDbVariantRow[]>) {
  const variantMap = new Map<string, ProductDbVariantRow>();

  variantsByProductId.forEach((variants) => {
    variants.forEach((variant) => {
      variantMap.set(variant.id, variant);
    });
  });

  return variantMap;
}

function resolveItemWeight(
  item: QuoteItem,
  product: ProductDbRow | undefined,
  variantRecordMap: Map<string, ProductDbVariantRow>,
) {
  if (typeof item.weight === "number" && Number.isFinite(item.weight) && item.weight > 0) {
    return item.weight;
  }

  if (item.variantId) {
    const variantWeight = variantRecordMap.get(item.variantId)?.weight;

    if (typeof variantWeight === "number" && Number.isFinite(variantWeight) && variantWeight > 0) {
      return variantWeight;
    }
  }

  return parseWeight(product?.weight == null ? undefined : String(product.weight));
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
  const [internationalShippingMethods, setInternationalShippingMethods] = useState<InternationalShippingMethodRow[]>([]);
  const [selectedInternationalShippingMethodId, setSelectedInternationalShippingMethodId] = useState("");
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [productRecords, setProductRecords] = useState<ProductDbRow[]>([]);
  const [productVariantsByProductId, setProductVariantsByProductId] = useState<Map<string, ProductDbVariantRow[]>>(new Map());
  const [pricingConfigByProductId, setPricingConfigByProductId] = useState<Record<string, ResolvedProductPricingConfig>>({});
  const [cndsProfilesById, setCndsProfilesById] = useState<Record<string, CndsShippingProfileRow>>({});
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
          setSelectedInternationalShippingMethodId(parsedDraft.selectedInternationalShippingMethodId ?? "");
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

    const loadInternationalShippingMethods = async () => {
      try {
        const result = await fetchActiveInternationalShippingMethods();

        if (!isMounted) {
          return;
        }

        setInternationalShippingMethods(result.methods);
        setSelectedInternationalShippingMethodId((current) =>
          current && result.methods.some((method) => method.id === current)
            ? current
            : result.methods[0]?.id ?? "",
        );
      } catch {
        if (isMounted) {
          setInternationalShippingMethods([]);
          setSelectedInternationalShippingMethodId("");
        }
      }
    };

    void loadInternationalShippingMethods();

    return () => {
      isMounted = false;
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
      const variantsResult = await getProductVariantMapByProductIds(result.data.map((product) => product.id));

      if (!isMounted) {
        return;
      }

      setProductVariantsByProductId(variantsResult.data);
      const pricingTierResult = await fetchResolvedProductPricingMap(result.data.map((product) => product.id));

      if (!isMounted) {
        return;
      }

      setPricingConfigByProductId(pricingTierResult.data);

      const cndsProfileIds = Array.from(
        new Set(
          result.data
            .map((product) => product.cnds_profile_id)
            .filter((profileId): profileId is string => typeof profileId === "string" && profileId.length > 0),
        ),
      );

      if (cndsProfileIds.length === 0) {
        setCndsProfilesById({});
        return;
      }

      const cndsProfileResult = await fetchCndsProfilesForCart(cndsProfileIds);

      if (!isMounted) {
        return;
      }

      setCndsProfilesById(
        Object.fromEntries(cndsProfileResult.profiles.map((profile) => [profile.id, profile])),
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
  const productVariantRecordMap = useMemo(
    () => buildVariantRecordMap(productVariantsByProductId),
    [productVariantsByProductId],
  );
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
  const selectedKeySet = useMemo(() => new Set(selectedKeys), [selectedKeys]);
  const hasUnavailableSelectedItems = useMemo(
    () => items.some((item) => selectedKeySet.has(getVariantKey(item)) && itemAvailabilityIssues.has(getVariantKey(item))),
    [itemAvailabilityIssues, items, selectedKeySet],
  );

  useEffect(() => {
    let isMounted = true;
    let unsubscribe = () => undefined;

    try {
      const dataClient = getPgDataClient();

      dataClient.auth
        .getUser()
        .then(({ data }) => {
          if (!isMounted) {
            return;
          }

          setCurrentUser(mapAuthUser(data.user));
          setHasCheckedAuth(true);
        })
        .catch(() => {
          if (!isMounted) {
            return;
          }

          setCurrentUser(null);
          setHasCheckedAuth(true);
        });

      const {
        data: { subscription },
      } = dataClient.auth.onAuthStateChange((_event, session) => {
        if (!isMounted) {
          return;
        }

        setCurrentUser(mapAuthUser(session?.user));
        setHasCheckedAuth(true);
      });

      unsubscribe = () => {
        subscription.unsubscribe();
      };
    } catch {
      if (isMounted) {
        setCurrentUser(null);
        setHasCheckedAuth(true);
      }
    }

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (hasCheckedAuth && !currentUser) {
      router.push("/login");
    }
  }, [currentUser, hasCheckedAuth, router]);

  const selectedGroupedItems = useMemo<Record<string, CartItem[]>>(() => {
    const groupedItems = new Map<string, QuoteItem[]>();

    items.forEach((item) => {
      const variantKey = getVariantKey(item);

      if (!selectedKeySet.has(variantKey) || itemAvailabilityIssues.has(variantKey)) {
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

      result[productId] = groupItems.map((item) => {
        const cndsProfileId = productMatch?.cnds_profile_id ?? null;
        const cndsProfile = cndsProfileId ? cndsProfilesById[cndsProfileId] ?? null : null;
        const variantAssignmentMap = new Map(
          (pricingConfigByProductId[productId]?.variant_assignments ?? []).map((assignment) => [
            assignment.variant_id,
            assignment.tier_set_id,
          ]),
        );
        const variantTierSetMap = new Map(
          (pricingConfigByProductId[productId]?.variant_tier_sets ?? []).map((tierSet) => [tierSet.id, tierSet]),
        );
        const assignedTierSetId = item.variantId ? variantAssignmentMap.get(item.variantId) ?? null : null;
        const assignedTierSet = assignedTierSetId ? variantTierSetMap.get(assignedTierSetId) ?? null : null;

        return {
          productId: item.productId,
          name: productMatch?.name ?? item.name,
          image: productMatch?.image_url ?? item.image,
          variation: item.variation,
          variantId: item.variantId,
          variantName: item.variantName ?? null,
          variantValue: item.variantValue ?? null,
          basePrice: item.price,
          price: item.price,
          quantity: item.quantity,
          productPricing: {
            pricingType: pricingConfigByProductId[productId]?.pricing_type ?? null,
            tiers: pricingConfigByProductId[productId]?.tiers ?? [],
            source: pricingConfigByProductId[productId]?.source ?? null,
            profileId: pricingConfigByProductId[productId]?.profile_id ?? null,
            profileName: pricingConfigByProductId[productId]?.profile_name ?? null,
          },
          variantPricing: assignedTierSet
            ? {
                tierSetId: assignedTierSet.id,
                tierSetName: assignedTierSet.name,
                fallbackPrice: assignedTierSet.fallback_price,
                pricingType: assignedTierSet.pricing_type,
                tiers: assignedTierSet.tiers,
              }
            : null,
          weight: resolveItemWeight(item, productMatch, productVariantRecordMap),
          shippingProfile: {
            id: selectedShippingProfile.id,
            name: selectedShippingProfile.name,
            ratePerKg: selectedShippingProfile.ratePerKg,
          },
          cndsProfile: cndsProfile
            ? {
                id: cndsProfile.id,
                name: cndsProfile.name,
                pricingType: cndsProfile.pricing_type,
                tiers: cndsProfile.tiers.map((tier) => ({
                  minQty: tier.min_qty,
                  maxQty: tier.max_qty,
                  price: tier.price,
                })),
              }
            : null,
          cddTiers: (productMatch as typeof productMatch & { cddTiers?: CartItem["cddTiers"] })?.cddTiers,
        };
      });

      return result;
    }, {});
  }, [cndsProfilesById, itemAvailabilityIssues, items, pricingConfigByProductId, productRecordMap, productVariantRecordMap, selectedKeySet, selectedShippingProfiles]);

  const totals = useMemo(() => calculateCartTotals(selectedGroupedItems), [selectedGroupedItems]);
  const pricingByProductId = useMemo(
    () =>
      new Map(
        Object.entries(selectedGroupedItems).map(([productId, groupItems]) => [
          productId,
          calculateProductGroupPricing(groupItems),
        ]),
      ),
    [selectedGroupedItems],
  );
  const immediateChargeBreakdowns = useMemo(
    () =>
      new Map(
        Object.entries(selectedGroupedItems).map(([productId, groupItems]) => [
          productId,
          calculateImmediateChargeBreakdown(groupItems),
        ]),
      ),
    [selectedGroupedItems],
  );
  const selectedCartItems = useMemo(() => Object.values(selectedGroupedItems).flat(), [selectedGroupedItems]);
  const selectedInternationalShippingMethod = useMemo(
    () =>
      internationalShippingMethods.find((method) => method.id === selectedInternationalShippingMethodId) ??
      internationalShippingMethods[0] ??
      null,
    [internationalShippingMethods, selectedInternationalShippingMethodId],
  );
  const internationalShippingSummary = useMemo(() => {
    const { totalWeightKg, hasUnknownWeight } = calculateTotalWeightKg(
      selectedCartItems.map((item) => ({
        weight: item.weight ?? null,
        quantity: item.quantity,
      })),
    );

    const estimate = calculateInternationalShippingEstimate(
      selectedInternationalShippingMethod,
      totalWeightKg,
      hasUnknownWeight,
    );

    return {
      totalWeightKg,
      hasUnknownWeight,
      ...estimate,
    };
  }, [selectedCartItems, selectedInternationalShippingMethod]);

  const selectedProductGroups = useMemo<SelectedProductGroup[]>(() => {
    const groups = new Map<string, SelectedProductGroup>();

    items.forEach((item) => {
      const variantKey = getVariantKey(item);

      if (!selectedKeySet.has(variantKey) || itemAvailabilityIssues.has(variantKey)) {
        return;
      }

      const existingGroup = groups.get(item.productId);

      if (existingGroup) {
        existingGroup.items.push(item);
        return;
      }

      groups.set(item.productId, {
        productId: item.productId,
        name: productRecordMap.get(item.productId)?.name ?? item.name,
        image: productRecordMap.get(item.productId)?.image_url ?? item.image,
        items: [item],
        shippingMethodName: selectedInternationalShippingMethod?.name ?? "Pending review",
      });
    });

    return Array.from(groups.values());
  }, [itemAvailabilityIssues, items, productRecordMap, selectedInternationalShippingMethod, selectedKeySet]);

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
    if (selectedCartItems.length === 0 || isPlacingOrder || hasUnavailableSelectedItems) {
      if (hasUnavailableSelectedItems) {
        setOrderError("Remove unavailable items from your cart before placing the order.");
      }
      return;
    }

    const nextBuyerErrors = validateBuyerForm(buyerForm);

    if (Object.keys(nextBuyerErrors).length > 0) {
      setBuyerErrors(nextBuyerErrors);
      setOrderError("Please complete the required buyer details.");
      return;
    }

    const dataClient = getPgDataClient();
    const {
      data: { user },
      error: userError,
    } = await dataClient.auth.getUser();

    if (userError || !user?.id || !user.email) {
      router.push("/login");
      return;
    }

    const shippingMethods: ShippingMethodRow[] = selectedProductGroups.map((group) => ({
      productId: group.productId,
      productName: group.name,
      shippingProfileId: selectedInternationalShippingMethod?.id ?? "",
      shippingProfileName: selectedInternationalShippingMethod?.name ?? "Pending review",
    }));

    const summary: OrderSummaryRow = {
      quantity: totals.totalQuantity,
      totalQuantity: totals.totalQuantity,
      productPrice: totals.productPrice,
      cddCharge: totals.cddCharge,
      shippingCost: internationalShippingSummary.total,
      hasUnknownShipping: internationalShippingSummary.status !== "calculated",
      payNow: totals.payNow,
      payOnDelivery:
        internationalShippingSummary.total === null
          ? PAY_ON_DELIVERY_PLACEHOLDER
          : internationalShippingSummary.total,
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
      const internationalShippingStatus: InternationalShippingStatus =
        internationalShippingSummary.total === null ? "pending_review" : "calculated";

      const { data: insertedOrder, error: orderInsertError } = await dataClient
        .from("orders")
        .insert({
          order_number: orderNumber,
          user_id: user.id,
          user_email: user.email,
          status: "Order Placed",
          payment_method: PAYMENT_METHOD,
          payment_status: DEFAULT_PAYMENT_STATUS,
          buyer,
          cnds_cost_total: totals.cddCharge,
          international_shipping_method_id: selectedInternationalShippingMethod?.id ?? null,
          international_shipping_method_name: selectedInternationalShippingMethod?.name ?? null,
          international_shipping_total: internationalShippingSummary.total ?? 0,
          international_shipping_status: internationalShippingStatus,
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

      const shippingMethodByProductId = new Map(
        shippingMethods.map((shippingMethod) => [shippingMethod.productId, shippingMethod]),
      );
      const vendorOrderGroups = new Map<
        string,
        {
          vendorId: string;
          items: typeof selectedCartItems;
          shippingMethods: ShippingMethodRow[];
        }
      >();

      selectedCartItems.forEach((item) => {
        const vendorId = productRecordMap.get(item.productId)?.vendor_id;

        if (!vendorId) {
          return;
        }

        const existingGroup = vendorOrderGroups.get(vendorId);
        const shippingMethod = shippingMethodByProductId.get(item.productId);

        if (existingGroup) {
          existingGroup.items.push(item);

          if (
            shippingMethod &&
            !existingGroup.shippingMethods.some(
              (currentMethod) =>
                currentMethod.productId === shippingMethod.productId &&
                currentMethod.shippingProfileId === shippingMethod.shippingProfileId,
            )
          ) {
            existingGroup.shippingMethods.push(shippingMethod);
          }

          return;
        }

        vendorOrderGroups.set(vendorId, {
          vendorId,
          items: [item],
          shippingMethods: shippingMethod ? [shippingMethod] : [],
        });
      });

      const vendorOrderIdByVendorId = new Map<string, string>();

      if (vendorOrderGroups.size > 0) {
        const vendorOrdersPayload = Array.from(vendorOrderGroups.values()).map((group) => {
          const vendorOrderId = crypto.randomUUID();
          vendorOrderIdByVendorId.set(group.vendorId, vendorOrderId);
          const productPricingIndex = new Map<string, number>();

          return {
            id: vendorOrderId,
            order_id: createdOrder.id,
            vendor_id: group.vendorId,
            status: "Order Placed",
            summary: createVendorOrderSummary(
              group.items.map((item) => {
                const pricing = pricingByProductId.get(item.productId) ?? null;
                const itemIndex = productPricingIndex.get(item.productId) ?? 0;
                productPricingIndex.set(item.productId, itemIndex + 1);

                return {
                  price: pricing?.itemUnitPrices[itemIndex] ?? item.price,
                  quantity: item.quantity,
                  totalPrice: pricing?.itemTotals[itemIndex] ?? item.price * item.quantity,
                };
              }),
              group.shippingMethods,
            ),
            shipping_method: group.shippingMethods,
            vendor_note: null,
            admin_note: null,
          };
        });

        const { error: vendorOrdersError } = await dataClient
          .from("vendor_orders")
          .insert(vendorOrdersPayload as never);

        if (vendorOrdersError) {
          const normalizedMessage = vendorOrdersError.message.toLowerCase();

          throw new Error(
            normalizedMessage.includes("vendor_orders") && normalizedMessage.includes("does not exist")
              ? "Vendor order tables are missing. Run the multivendor migration before placing vendor-owned orders."
              : `Unable to create vendor order records: ${vendorOrdersError.message}`,
          );
        }
      }

      const productItemCostIndex = new Map<string, number>();
      const orderItemsPayload = selectedCartItems.map((item) => {
        const productRecord = productRecordMap.get(item.productId);
        const vendorId = productRecord?.vendor_id ?? null;
        const costBreakdown = immediateChargeBreakdowns.get(item.productId);
        const pricing = pricingByProductId.get(item.productId) ?? null;
        const itemIndex = productItemCostIndex.get(item.productId) ?? 0;
        const cndsCost = costBreakdown?.itemCosts[itemIndex] ?? 0;
        const unitPrice = pricing?.itemUnitPrices[itemIndex] ?? item.price;
        const totalPrice = pricing?.itemTotals[itemIndex] ?? item.price * item.quantity;
        const exchangeRateCnyToBdt = normalizeExchangeRate(productRecord?.exchange_rate_cny_to_bdt);
        const profitPercent = Math.max(0, Number(productRecord?.profit_percent ?? 0));
        const sellingPriceCny = roundCurrency(unitPrice / exchangeRateCnyToBdt);
        const buyingPriceCny =
          profitPercent > 0 ? roundCurrency(sellingPriceCny / (1 + profitPercent / 100)) : sellingPriceCny;
        const profitAmountCny = roundCurrency(sellingPriceCny - buyingPriceCny);

        productItemCostIndex.set(item.productId, itemIndex + 1);

        return {
          order_id: createdOrder.id,
          product_id: item.productId,
          variant_id: item.variantId ?? null,
          product_name: item.name,
          product_image: item.image,
          variation: item.variation,
          variant_name: item.variantName ?? null,
          variant_value: item.variantValue ?? item.variation,
          price: unitPrice,
          unit_price: unitPrice,
          total_price: totalPrice,
          buying_price_cny: buyingPriceCny,
          profit_percent: profitPercent,
          profit_amount_cny: profitAmountCny,
          selling_price_cny: sellingPriceCny,
          exchange_rate_cny_to_bdt: exchangeRateCnyToBdt,
          display_currency: "BDT",
          total_profit_cny: roundCurrency(profitAmountCny * item.quantity),
          quantity: item.quantity,
          weight: item.weight ?? null,
          weight_kg: item.weight ?? null,
          total_weight_kg: item.weight ? item.weight * item.quantity : null,
          cnds_cost: cndsCost,
          cnds_profile_id: item.cndsProfile?.id ?? costBreakdown?.profileId ?? null,
          vendor_id: vendorId,
          vendor_order_id: vendorId ? vendorOrderIdByVendorId.get(vendorId) ?? null : null,
        };
      });

      const { error: orderItemsError } = await dataClient
        .from("order_items")
        .insert(orderItemsPayload as never);

      if (orderItemsError) {
        throw new Error(
          orderItemsError.message.toLowerCase().includes("vendor_order_id") ||
          orderItemsError.message.toLowerCase().includes("vendor_id")
            ? "Order item vendor columns are missing. Run the latest multivendor migration before placing vendor-owned orders."
            : orderItemsError.message,
        );
      }

      selectedCartItems.forEach((item) => {
        removeQuoteItem(item.productId, item.variation, item.variantId);
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
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center">
            <h2 className="text-2xl font-semibold text-slate-900">Loading...</h2>
            <p className="mt-2 text-sm text-slate-500">
              Preparing your checkout details.
            </p>
          </div>
      </section>
    );
  }

  if (selectedCartItems.length === 0) {
    return (
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
    );
  }

  return (
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

        {hasUnavailableSelectedItems ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
            Some selected items are no longer available. Go back to cart to remove them before checkout.
          </div>
        ) : null}

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
                {selectedProductGroups.map((group) => {
                  const groupPricing = pricingByProductId.get(group.productId) ?? null;

                  return (
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
                          International Shipping: {group.shippingMethodName}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {group.items.length} variation{group.items.length > 1 ? "s" : ""} selected
                        </p>
                        {groupPricing?.matchedTier ? (
                          <p className="mt-1 text-xs font-medium text-[#615FFF]">
                            Tier pricing active: {groupPricing.pricingType === "unit" ? "Per unit" : "Fixed total"}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-4 space-y-2">
                      {group.items.map((item, index) => (
                        <div
                          key={getVariantKey(item)}
                          className="rounded-lg border border-slate-200 px-4 py-3"
                        >
                          <div className="grid gap-2 text-sm text-slate-600 sm:grid-cols-4">
                            <p className="font-semibold text-slate-900">{item.variantValue ?? item.variation}</p>
                            <p>Qty: {item.quantity}</p>
                            <p>Unit: {formatBDT(groupPricing?.itemUnitPrices[index] ?? item.price)}</p>
                            <p className="font-medium text-slate-900">
                              Total: {formatBDT(groupPricing?.itemTotals[index] ?? item.price * item.quantity)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </article>
                )})}
              </div>
            </section>
          </div>

          <aside className="space-y-5 lg:sticky lg:top-6">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-slate-900">International Shipping</h2>
                <p className="text-sm text-slate-500">
                  China to Bangladesh shipping is paid on delivery and stays separate from CNDS.
                </p>
              </div>

              <div className="mt-4 space-y-2">
                <select
                  value={selectedInternationalShippingMethod?.id ?? ""}
                  onChange={(event) => setSelectedInternationalShippingMethodId(event.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none transition-colors focus:border-[#615FFF]"
                  aria-label="Select international shipping method"
                >
                  {internationalShippingMethods.length === 0 ? (
                    <option value="">No active methods</option>
                  ) : (
                    internationalShippingMethods.map((method) => (
                      <option key={method.id} value={method.id}>
                        {method.name} - {formatDeliveryWindow(method.delivery_min_days, method.delivery_max_days)}
                      </option>
                    ))
                  )}
                </select>

                <p className="text-xs text-slate-500">
                  Delivery estimate:{" "}
                  {selectedInternationalShippingMethod
                    ? formatDeliveryWindow(
                        selectedInternationalShippingMethod.delivery_min_days,
                        selectedInternationalShippingMethod.delivery_max_days,
                      )
                    : PAY_ON_DELIVERY_PLACEHOLDER}
                </p>
                {internationalShippingSummary.warning ? (
                  <p className="text-xs font-medium text-amber-700">
                    {internationalShippingSummary.warning}
                  </p>
                ) : internationalShippingSummary.totalWeightKg > 0 ? (
                  <p className="text-xs text-slate-500">
                    Total selected weight: {internationalShippingSummary.totalWeightKg} kg
                  </p>
                ) : null}
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-900">Order Summary</h2>
            </div>

            <div className="space-y-0 rounded-xl border border-slate-200 bg-white px-5">
              <SummaryRow label="Quantity" value={String(totals.totalQuantity)} />
              <SummaryRow label="Product Price" value={formatBDT(totals.productPrice)} />
              <SummaryRow label="CNDS Cost" value={formatBDT(totals.cddCharge)} />
              <SummaryRow label="Pay Now" value={formatBDT(totals.payNow)} strong />
              <SummaryRow
                label="International Shipping"
                value={
                  internationalShippingSummary.total === null
                    ? PAY_ON_DELIVERY_PLACEHOLDER
                    : formatBDT(internationalShippingSummary.total)
                }
              />
              <SummaryRow
                label="Pay on Delivery"
                value={
                  internationalShippingSummary.total === null
                    ? PAY_ON_DELIVERY_PLACEHOLDER
                    : formatBDT(internationalShippingSummary.total)
                }
              />
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
                    {internationalShippingSummary.total === null
                      ? PAY_ON_DELIVERY_PLACEHOLDER
                      : formatBDT(internationalShippingSummary.total)}
                  </p>
                  <p className="mt-2 whitespace-nowrap text-xs font-medium text-[#615FFF]">
                    International shipping
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                disabled={selectedCartItems.length === 0 || isPlacingOrder || hasUnavailableSelectedItems}
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
  );
}
