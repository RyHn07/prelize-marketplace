import { getSupabaseClient } from "@/lib/supabase-client";

type OrderSummary = {
  payNow?: number | string | null;
};

type BuyerInfo = Record<string, string | number | boolean | null> | null;

type CustomerOrderRow = {
  id: string;
  order_number: string;
  user_id: string | null;
  user_email: string;
  created_at: string;
  summary: OrderSummary | null;
  buyer: BuyerInfo;
};

export type AdminCustomerRow = {
  key: string;
  userId: string | null;
  email: string;
  fullName: string | null;
  phone: string | null;
  country: string | null;
  city: string | null;
  orderCount: number;
  totalPayNow: number;
  latestOrderId: string;
  latestOrderNumber: string;
  latestOrderDate: string;
};

function readBuyerString(buyer: BuyerInfo, keys: string[]) {
  if (!buyer) {
    return null;
  }

  for (const key of keys) {
    const value = buyer[key];

    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
}

function toNumber(value: number | string | null | undefined) {
  const parsed = typeof value === "string" ? Number(value) : value;
  return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : 0;
}

function getCustomerKey(order: CustomerOrderRow) {
  if (order.user_id) {
    return `user:${order.user_id}`;
  }

  return `email:${order.user_email.toLowerCase()}`;
}

export async function getAdminCustomers() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("orders")
    .select("id, order_number, user_id, user_email, created_at, summary, buyer")
    .order("created_at", { ascending: false });

  if (error) {
    return {
      data: [] as AdminCustomerRow[],
      error,
    };
  }

  const groupedCustomers = new Map<string, AdminCustomerRow>();

  for (const order of (data ?? []) as CustomerOrderRow[]) {
    if (typeof order.user_email !== "string" || order.user_email.trim().length === 0) {
      continue;
    }

    const key = getCustomerKey(order);
    const existing = groupedCustomers.get(key);
    const fullName = readBuyerString(order.buyer, ["fullName", "name"]);
    const phone = readBuyerString(order.buyer, ["phone"]);
    const country = readBuyerString(order.buyer, ["country"]);
    const city = readBuyerString(order.buyer, ["city"]);
    const payNow = toNumber(order.summary?.payNow);

    if (!existing) {
      groupedCustomers.set(key, {
        key,
        userId: order.user_id,
        email: order.user_email,
        fullName,
        phone,
        country,
        city,
        orderCount: 1,
        totalPayNow: payNow,
        latestOrderId: order.id,
        latestOrderNumber: order.order_number,
        latestOrderDate: order.created_at,
      });
      continue;
    }

    groupedCustomers.set(key, {
      ...existing,
      fullName: existing.fullName ?? fullName,
      phone: existing.phone ?? phone,
      country: existing.country ?? country,
      city: existing.city ?? city,
      orderCount: existing.orderCount + 1,
      totalPayNow: existing.totalPayNow + payNow,
    });
  }

  return {
    data: Array.from(groupedCustomers.values()),
    error: null,
  };
}
