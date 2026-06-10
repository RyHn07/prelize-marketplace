"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import OrderReviewSection from "@/components/orders/order-review-section";
import {
  ORDER_PROGRESS_STEPS,
  safeOrderStatus,
} from "@/lib/orders/utils";
import { DEFAULT_PLATFORM_SETTINGS, PLATFORM_SETTINGS_SINGLETON_KEY, toPlatformSettingsFormValues } from "@/lib/platform-settings";
import { getSupabaseClient } from "@/lib/supabase-client";
import { getVendorsByIds } from "@/lib/vendors/queries";
import type { PlatformSettingsFormValues } from "@/types/platform-settings";
import type { VendorOrderStatus } from "@/types/product-db";

type OrderStatus = VendorOrderStatus;

type OrderSummary = {
  quantity?: number;
  totalQuantity?: number;
  productPrice: number;
  cddCharge: number;
  payNow: number;
  payOnDelivery: number | string | null;
};

type ShippingMethod = {
  productId: string;
  productName: string;
  shippingProfileId: string;
  shippingProfileName: string;
};

type OrderRow = {
  id: string;
  order_number: string;
  user_id: string;
  user_email: string;
  status: OrderStatus;
  payment_method: string | null;
  payment_status: string | null;
  buyer?: BuyerInfo | null;
  created_at: string;
  cnds_cost_total?: number | null;
  international_shipping_method_id?: string | null;
  international_shipping_method_name?: string | null;
  international_shipping_total?: number | null;
  international_shipping_status?: string | null;
  summary: OrderSummary;
  shipping_methods: ShippingMethod[] | null;
};

type BuyerInfo = Record<string, string | number | boolean | null>;

type OrderItemRow = {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  product_image: string;
  variation: string;
  variant_name?: string | null;
  variant_value?: string | null;
  price: number;
  unit_price?: number | null;
  total_price?: number | null;
  quantity: number;
  weight: number | null;
  cnds_cost?: number | null;
  cnds_profile_id?: string | null;
  vendor_id?: string | null;
};

type GroupedOrderItem = {
  productId: string;
  name: string;
  image?: string;
  vendorName?: string | null;
  items: OrderItemRow[];
  variantCount: number;
  totalQuantity: number;
  subtotal: number;
};

function formatBDT(amount: number) {
  return `\u09F3${amount.toLocaleString()}`;
}

function formatOrderDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-BD", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const ORDER_STATUS_ICON_SRC: Partial<Record<OrderStatus, string>> = {
  "Order Placed": "/order-status/shopping-cart.svg",
  "Payment Verified": "/order-status/credit-card.svg",
  Processing: "/order-status/loader.svg",
  "Arrived in Warehouse": "/order-status/warehouse-storage.svg",
  Shipped: "/order-status/plane-departure.svg",
  "Ready to Deliver": "/order-status/delivery-parcel.svg",
  Delivered: "/order-status/verified-check.svg",
};

function OrderStatusStepIcon({ step }: { step: OrderStatus }) {
  const iconSrc = ORDER_STATUS_ICON_SRC[step] ?? "/order-status/verified-check.svg";

  return (
    <Image
      src={iconSrc}
      alt=""
      width={34}
      height={34}
      aria-hidden="true"
      className="h-7 w-7 object-contain"
    />
  );
}

function readBuyerString(buyer: BuyerInfo | null | undefined, keys: string[]) {
  if (!buyer) {
    return "";
  }

  for (const key of keys) {
    const value = buyer[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }

    if (typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }
  }

  return "";
}

function OrderStatusTimeline({
  currentStatus,
  currentOrderStepIndex,
}: {
  currentStatus: OrderStatus;
  currentOrderStepIndex: number;
}) {
  if (currentStatus === "Cancelled") {
    return (
      <div className="mt-6 rounded-xl border border-red-100 bg-red-50 px-5 py-6 text-center">
        <span className="inline-flex rounded-full bg-red-100 px-4 py-2 text-sm font-semibold text-red-700">
          Cancelled
        </span>
      </div>
    );
  }

  const renderStep = (step: OrderStatus, compact = false) => {
    const stepIndex = ORDER_PROGRESS_STEPS.indexOf(step);
    const isCompleted = currentOrderStepIndex > stepIndex && currentOrderStepIndex !== -1;
    const isCurrent = currentOrderStepIndex === stepIndex;
    const isActive = isCompleted || isCurrent;

    return (
      <div key={step} className="flex min-w-0 flex-col items-center text-center">
        <div
          className={`flex items-center justify-center rounded-full border shadow-sm transition-colors ${
            compact ? "h-11 w-11 border-[3px]" : "h-[72px] w-[72px] border-4"
          } ${
            isActive
              ? "border-[#DAD7FF] bg-[#615FFF] text-white"
              : "border-slate-200 bg-slate-400 text-white"
          }`}
        >
          <div className={compact ? "[&_img]:h-5 [&_img]:w-5" : ""}>
            <OrderStatusStepIcon step={step} />
          </div>
        </div>
        <span
          className={`mt-2 block font-semibold leading-4 ${
            compact ? "text-[11px]" : "text-sm"
          } ${isActive ? "text-slate-950" : "text-slate-400"}`}
        >
          {step}
        </span>
      </div>
    );
  };

  return (
    <>
      <div className="mt-6 space-y-5 md:hidden">
        {[ORDER_PROGRESS_STEPS.slice(0, 4), ORDER_PROGRESS_STEPS.slice(4)].map((row, rowIndex) => (
          <div key={rowIndex} className={`relative px-1 ${rowIndex === 1 ? "mx-auto w-3/4" : ""}`}>
            <div className="absolute left-[34px] right-[34px] top-[22px] h-1.5 rounded-full bg-slate-200" />
            <div
              className="absolute left-[34px] top-[22px] h-1.5 rounded-full bg-[#615FFF]"
              style={{
                width:
                  row.filter((step) => ORDER_PROGRESS_STEPS.indexOf(step) <= currentOrderStepIndex).length <= 1
                    ? "0%"
                    : `calc((100% - 68px) * ${
                        (row.filter((step) => ORDER_PROGRESS_STEPS.indexOf(step) <= currentOrderStepIndex).length - 1) /
                        Math.max(row.length - 1, 1)
                      })`,
              }}
            />
            <div
              className="relative z-10 grid gap-2"
              style={{ gridTemplateColumns: `repeat(${row.length}, minmax(0, 1fr))` }}
            >
              {row.map((step) => renderStep(step, true))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 hidden overflow-x-auto pb-2 md:block">
      <div className="relative min-w-[900px] px-3 pt-2">
        <div className="absolute left-[58px] right-[58px] top-[38px] h-2 rounded-full bg-slate-200" />
        <div
          className="absolute left-[58px] top-[38px] h-2 rounded-full bg-[#615FFF] transition-all"
          style={{
            width:
              currentOrderStepIndex <= 0
                ? "0%"
                : `calc((100% - 116px) * ${currentOrderStepIndex / (ORDER_PROGRESS_STEPS.length - 1)})`,
          }}
        />

        <div
          className="relative z-10 grid gap-3"
          style={{ gridTemplateColumns: `repeat(${ORDER_PROGRESS_STEPS.length}, minmax(0, 1fr))` }}
        >
          {ORDER_PROGRESS_STEPS.map((step) => renderStep(step))}
        </div>
      </div>
      </div>
    </>
  );
}

function ProductImage({ src, alt }: { src?: string; alt: string }) {
  if (!src) {
    return (
      <div className="flex h-14 w-14 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-[10px] font-medium text-slate-400">
        No Image
      </div>
    );
  }

  return (
    <div className="relative h-14 w-14 overflow-hidden rounded-md border border-slate-200 bg-slate-50">
      <Image src={src} alt={alt} fill sizes="56px" className="object-cover" />
    </div>
  );
}

function PrelizeInvoiceHeader({
  order,
  settings,
}: {
  order: OrderRow | null;
  settings: PlatformSettingsFormValues;
}) {
  const customerName = readBuyerString(order?.buyer, ["fullName", "name"]) || order?.user_email || "Customer";
  const customerAddress = readBuyerString(order?.buyer, ["address"]);
  const customerPhone = readBuyerString(order?.buyer, ["phone"]);
  const customerCityCountry = [readBuyerString(order?.buyer, ["city"]), readBuyerString(order?.buyer, ["country"])]
    .filter(Boolean)
    .join(", ");
  const brandName = settings.site_short_title || settings.marketplace_name || "Prelize";

  return (
    <div className="py-7">
      <div className="grid gap-6 md:grid-cols-2 md:items-start">
        <div className="flex items-center gap-3">
          {settings.logo_url ? (
            <div className="relative h-14 w-36">
              <Image src={settings.logo_url} alt={brandName} fill sizes="144px" className="object-contain object-left" />
            </div>
          ) : (
            <>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#ECEBFF] text-xl font-bold text-[#615FFF]">
                P
              </div>
              <div className="text-2xl font-bold leading-none text-[#615FFF]">{brandName}</div>
            </>
          )}
        </div>

        <div className="md:text-right">
          <p className="text-lg font-semibold text-slate-950">{order?.order_number ?? "Loading..."}</p>
          <p className="mt-1 text-sm font-medium text-slate-600">
            {order ? formatOrderDate(order.created_at) : "Loading..."}
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-8 md:grid-cols-2 md:items-start">
        <div className="space-y-1 text-sm text-slate-700">
          <p className="font-semibold text-slate-950">Contact Info:</p>
          <p>RAIHAN REAZ</p>
          <p>contact@prelize.com</p>
          <p>+8801630404147 or +8619138477680 (Whatsapp)</p>
          <p>Wechat: raihan_reaz</p>
        </div>

        <div className="md:text-right">
          <div className="space-y-1 text-sm text-slate-700 md:inline-block md:min-w-[260px] md:text-left">
            <p className="font-semibold text-slate-950">To:</p>
            <p className="font-medium text-slate-900">{customerName}</p>
            <p>{order?.user_email}</p>
            {customerPhone ? <p>{customerPhone}</p> : null}
            {customerAddress ? <p>{customerAddress}</p> : null}
            {customerCityCountry ? <p>{customerCityCountry}</p> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function OrderItemsTable({
  groups,
  order,
  settings,
}: {
  groups: GroupedOrderItem[];
  order: OrderRow | null;
  settings: PlatformSettingsFormValues;
}) {
  const flattenedItems = groups.flatMap((group) =>
    group.items.map((item) => ({
      group,
      item,
      unitPrice: item.unit_price ?? item.price,
      total: item.total_price ?? item.price * item.quantity,
    })),
  );
  const firstPageItemLimit = 7;
  const nextPageItemLimit = 12;
  const itemPages: typeof flattenedItems[] = [];

  if (flattenedItems.length === 0) {
    itemPages.push([]);
  } else {
    itemPages.push(flattenedItems.slice(0, firstPageItemLimit));

    for (let index = firstPageItemLimit; index < flattenedItems.length; index += nextPageItemLimit) {
      itemPages.push(flattenedItems.slice(index, index + nextPageItemLimit));
    }
  }

  const productSubtotal = groups.reduce((sum, group) => sum + group.subtotal, 0);
  const internationalShippingValue =
    order?.international_shipping_status === "calculated" &&
    typeof order.international_shipping_total === "number"
      ? formatBDT(order.international_shipping_total)
      : typeof order?.summary.payOnDelivery === "number"
        ? formatBDT(order.summary.payOnDelivery)
        : "Pending review";
  const lastPageIndex = itemPages.length - 1;

  const renderTableHeader = () => (
    <div className="grid grid-cols-[minmax(0,1fr)_110px_90px_110px] rounded-full bg-[#615FFF] px-7 py-5 text-xs font-semibold uppercase tracking-[0.08em] text-white">
      <span>Items Description</span>
      <span className="-translate-x-6">Unit Price</span>
      <span className="text-center">Quantity</span>
      <span className="text-right">Total</span>
    </div>
  );

  const renderRows = (rows: typeof flattenedItems) => (
    <div className="flex-1 divide-y divide-slate-200">
      {rows.map(({ group, item, unitPrice, total }) => (
        <div
          key={item.id}
          className="grid grid-cols-[minmax(0,1fr)_110px_90px_110px] items-center gap-3 px-7 py-4"
        >
          <div className="flex min-w-0 gap-3">
            <ProductImage src={item.product_image || group.image} alt={item.product_name || group.name} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-950">{item.product_name || group.name}</p>
              <p className="mt-1 text-xs text-slate-500">
                {item.variant_value ?? item.variation}
                {item.variant_name ? ` - ${item.variant_name}` : ""}
              </p>
              {group.vendorName ? <p className="mt-1 text-xs text-slate-400">Vendor: {group.vendorName}</p> : null}
            </div>
          </div>

          <div className="text-sm text-slate-600">{formatBDT(unitPrice)}</div>
          <div className="text-center text-sm text-slate-600">{item.quantity}</div>
          <div className="text-right text-sm font-semibold text-slate-950">{formatBDT(total)}</div>
        </div>
      ))}

      {flattenedItems.length === 0 ? (
        <div className="px-7 py-10 text-center text-sm text-slate-500">
          No ordered products found for this order.
        </div>
      ) : null}
    </div>
  );

  const renderFooter = () => (
    <div className="grid grid-cols-[minmax(0,1fr)_340px] gap-6 border-t border-slate-200 py-6">
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-950">Shipping</h3>
          <div className="mt-2 space-y-2 text-sm text-slate-600">
            {order?.shipping_methods && order.shipping_methods.length > 0 ? (
              order.shipping_methods.map((shippingMethod) => (
                <p key={`${shippingMethod.productId}-${shippingMethod.shippingProfileId}`}>
                  <span className="font-medium text-slate-800">{shippingMethod.productName}:</span>{" "}
                  {shippingMethod.shippingProfileName}
                </p>
              ))
            ) : (
              <p>Shipping method will be confirmed after review.</p>
            )}
            <p className="text-xs text-slate-500">Final weight will be confirmed after the order arrives at our warehouse.</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between text-sm text-slate-600">
          <span>Quantity</span>
          <span>{String(order?.summary.quantity ?? order?.summary.totalQuantity ?? 0)}</span>
        </div>
        <div className="flex justify-between text-sm text-slate-600">
          <span>Product Price</span>
          <span>{formatBDT(order?.summary.productPrice ?? productSubtotal)}</span>
        </div>
        <div className="flex justify-between text-sm text-slate-600">
          <span>CNDS Cost</span>
          <span>{formatBDT(order?.cnds_cost_total ?? order?.summary.cddCharge ?? 0)}</span>
        </div>
        <div className="flex justify-between text-sm text-slate-600">
          <span>International Shipping</span>
          <span>{internationalShippingValue}</span>
        </div>
        <div className="flex justify-between border-t border-slate-200 pt-2 text-sm text-slate-600">
          <span>Pay on Delivery</span>
          <span>{internationalShippingValue}</span>
        </div>
        <div className="flex justify-between rounded-full bg-[#615FFF] px-5 py-3 text-base font-semibold text-white">
          <span>Paid</span>
          <span>{formatBDT(order?.summary.payNow ?? 0)}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="pb-2">
      <div className="space-y-6">
        {itemPages.map((pageItems, pageIndex) => (
          <section
            key={pageIndex}
            className="relative mx-auto flex aspect-[210/297] w-full min-w-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white p-16 print:h-[297mm] print:w-[210mm] print:min-w-[210mm] print:break-after-page"
          >
            <div className="pointer-events-none absolute inset-0 overflow-hidden text-slate-300/20">
              <span className="absolute left-[3%] top-[6%] -rotate-45 text-sm font-light tracking-[0.12em]">https://prelize.com</span>
              <span className="absolute left-[34%] top-[8%] -rotate-45 text-lg font-light tracking-[0.14em]">https://prelize.com</span>
              <span className="absolute right-[2%] top-[8%] -rotate-45 text-sm font-light tracking-[0.12em]">https://prelize.com</span>
              <span className="absolute left-[14%] top-[18%] -rotate-45 text-xl font-light tracking-[0.16em] text-slate-300/25">https://prelize.com</span>
              <span className="absolute right-[18%] top-[20%] -rotate-45 text-sm font-light tracking-[0.12em]">https://prelize.com</span>
              <span className="absolute -left-[2%] top-[30%] -rotate-45 text-lg font-light tracking-[0.14em]">https://prelize.com</span>
              <span className="absolute left-[38%] top-[31%] -rotate-45 text-sm font-light tracking-[0.12em]">https://prelize.com</span>
              <span className="absolute right-[4%] top-[34%] -rotate-45 text-xl font-light tracking-[0.16em] text-slate-300/25">https://prelize.com</span>
              <span className="absolute left-[10%] top-[43%] -rotate-45 text-sm font-light tracking-[0.12em]">https://prelize.com</span>
              <span className="absolute left-[46%] top-[44%] -rotate-45 text-lg font-light tracking-[0.14em]">https://prelize.com</span>
              <span className="absolute right-[12%] top-[48%] -rotate-45 text-sm font-light tracking-[0.12em]">https://prelize.com</span>
              <span className="absolute -left-[4%] top-[58%] -rotate-45 text-xl font-light tracking-[0.16em] text-slate-300/25">https://prelize.com</span>
              <span className="absolute left-[30%] top-[59%] -rotate-45 text-sm font-light tracking-[0.12em]">https://prelize.com</span>
              <span className="absolute right-[2%] top-[62%] -rotate-45 text-lg font-light tracking-[0.14em]">https://prelize.com</span>
              <span className="absolute left-[12%] bottom-[24%] -rotate-45 text-lg font-light tracking-[0.14em]">https://prelize.com</span>
              <span className="absolute left-[52%] bottom-[23%] -rotate-45 text-sm font-light tracking-[0.12em]">https://prelize.com</span>
              <span className="absolute right-[7%] bottom-[18%] -rotate-45 text-xl font-light tracking-[0.16em] text-slate-300/25">https://prelize.com</span>
              <span className="absolute left-[3%] bottom-[9%] -rotate-45 text-sm font-light tracking-[0.12em]">https://prelize.com</span>
              <span className="absolute left-[36%] bottom-[8%] -rotate-45 text-xl font-light tracking-[0.16em] text-slate-300/25">https://prelize.com</span>
              <span className="absolute right-[1%] bottom-[6%] -rotate-45 text-sm font-light tracking-[0.12em]">https://prelize.com</span>
            </div>

            <div className="relative z-10 flex min-h-0 flex-1 flex-col">
              {pageIndex === 0 ? (
                <PrelizeInvoiceHeader order={order} settings={settings} />
              ) : (
                <div className="flex items-start justify-between py-6">
                  <div>
                    <p className="text-lg font-semibold text-slate-950">{order?.order_number ?? "Loading..."}</p>
                    <p className="mt-1 text-sm text-slate-500">Continued</p>
                  </div>
                  <p className="text-sm font-medium text-slate-600">
                    Page {pageIndex + 1} of {itemPages.length}
                  </p>
                </div>
              )}
              {renderTableHeader()}
              {renderRows(pageItems)}
              {pageIndex === lastPageIndex ? renderFooter() : null}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

export default function OrderDetailsPageClient() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<OrderRow | null>(null);
  const [items, setItems] = useState<OrderItemRow[]>([]);
  const [vendorNamesById, setVendorNamesById] = useState<Record<string, string>>({});
  const [platformSettings, setPlatformSettings] = useState<PlatformSettingsFormValues>(DEFAULT_PLATFORM_SETTINGS);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const supabase = getSupabaseClient();
    const currentOrderId = typeof params?.id === "string" ? params.id : "";

    if (!currentOrderId) {
      setHasLoaded(true);
      setIsAuthorized(true);
      setOrder(null);
      setItems([]);
      return () => {
        isMounted = false;
      };
    }

    const loadOrder = async () => {
      if (!isMounted) {
        return;
      }

      const { data: authData, error: authError } = await supabase.auth.getUser();

      if (authError) {
        if (isMounted) {
          setIsAuthorized(false);
          setOrder(null);
          setItems([]);
          setHasLoaded(true);
        }
        return;
      }

      const currentUserId = authData.user?.id ?? null;
      const currentUserEmail = authData.user?.email ?? null;

      if (!currentUserId) {
        if (isMounted) {
          setIsAuthorized(false);
          setHasLoaded(true);
        }
        return;
      }

      const { data: fetchedOrder, error: orderError } = await supabase
        .from("orders")
        .select("*")
        .eq("id", currentOrderId)
        .single();

      if (!isMounted) {
        return;
      }

      if (orderError || !fetchedOrder) {
        setIsAuthorized(true);
        setOrder(null);
        setItems([]);
        setHasLoaded(true);
        return;
      }

      const orderRow = {
        ...(fetchedOrder as OrderRow),
        status: safeOrderStatus((fetchedOrder as { status?: unknown }).status),
      };

      const matchesUserId = orderRow.user_id === currentUserId;
      const matchesUserEmail =
        currentUserEmail !== null &&
        typeof orderRow.user_email === "string" &&
        orderRow.user_email.toLowerCase() === currentUserEmail.toLowerCase();

      if (!matchesUserId && !matchesUserEmail) {
        setIsAuthorized(true);
        setOrder(null);
        setItems([]);
        setHasLoaded(true);
        return;
      }

      const { data: fetchedItems, error: itemsError } = await supabase
        .from("order_items")
        .select("*")
        .eq("order_id", currentOrderId);

      if (!isMounted) {
        return;
      }

      const normalizedItems = itemsError || !fetchedItems ? [] : (fetchedItems as OrderItemRow[]);
      const { data: fetchedSettings } = await supabase
        .from("platform_settings")
        .select("marketplace_name, site_short_title, site_url, logo_url, support_email, support_phone")
        .eq("singleton_key", PLATFORM_SETTINGS_SINGLETON_KEY)
        .maybeSingle();
      const vendorIds = Array.from(
        new Set(
          normalizedItems
            .map((item) => item.vendor_id)
            .filter((vendorId): vendorId is string => typeof vendorId === "string" && vendorId.length > 0),
        ),
      );
      const vendorResult = vendorIds.length > 0 ? await getVendorsByIds(vendorIds) : { data: [], error: null };

      if (!isMounted) {
        return;
      }

      setIsAuthorized(true);
      setOrder(orderRow);
      setItems(normalizedItems);
      setPlatformSettings(toPlatformSettingsFormValues(fetchedSettings));
      setVendorNamesById(
        Object.fromEntries(vendorResult.data.map((vendor) => [vendor.id, vendor.name])),
      );
      setHasLoaded(true);
    };

    loadOrder().catch(() => {
      if (!isMounted) {
        return;
      }

      setIsAuthorized(false);
      setOrder(null);
      setItems([]);
      setHasLoaded(true);
    });

    return () => {
      isMounted = false;
    };
  }, [params?.id]);

  useEffect(() => {
    if (hasLoaded && !isAuthorized) {
      router.push("/login");
    }
  }, [hasLoaded, isAuthorized, router]);

  const groupedItems = useMemo(() => {
    if (!order) {
      return [] as GroupedOrderItem[];
    }

    const groups = new Map<string, GroupedOrderItem>();

    items.forEach((item) => {
      const existingGroup = groups.get(item.product_id);

      if (existingGroup) {
        existingGroup.items.push(item);
        existingGroup.variantCount += 1;
        existingGroup.totalQuantity += item.quantity;
        existingGroup.subtotal += item.total_price ?? item.price * item.quantity;
        return;
      }

      groups.set(item.product_id, {
        productId: item.product_id,
        name: item.product_name,
        image: item.product_image,
        vendorName: item.vendor_id ? vendorNamesById[item.vendor_id] ?? null : null,
        items: [item],
        variantCount: 1,
        totalQuantity: item.quantity,
        subtotal: item.total_price ?? item.price * item.quantity,
      });
    });

    return Array.from(groups.values());
  }, [items, order, vendorNamesById]);

  const currentOrderStatus = order ? safeOrderStatus(order.status) : "Order Placed";
  const currentOrderStepIndex = order ? ORDER_PROGRESS_STEPS.indexOf(currentOrderStatus) : -1;

  if (!hasLoaded || !isAuthorized) {
    return (
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center">
            <h1 className="text-2xl font-semibold text-slate-900">Loading...</h1>
            <p className="mt-2 text-sm text-slate-500">
              Checking your account before opening this order.
            </p>
          </div>
      </section>
    );
  }

  if (hasLoaded && isAuthorized && !order) {
    return (
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center">
            <h1 className="text-2xl font-semibold text-slate-900">Order not found</h1>
            <p className="mt-2 text-sm text-slate-500">
              We could not find the order you were looking for.
            </p>
            <Link
              href="/account?view=orders"
              className="mt-6 inline-flex items-center justify-center rounded-full bg-[#615FFF] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#5552e6]"
            >
              Back to Orders
            </Link>
          </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
          <OrderStatusTimeline currentStatus={currentOrderStatus} currentOrderStepIndex={currentOrderStepIndex} />
        </div>

        <div className="space-y-4">
          <div className="space-y-4">
            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-slate-900">Ordered Products</h2>
              <OrderItemsTable
                groups={groupedItems}
                order={order}
                settings={platformSettings}
              />
            </section>

            {order ? <OrderReviewSection orderId={order.id} orderStatus={order.status} /> : null}

          </div>
        </div>
      </section>
  );
}
