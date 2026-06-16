import { NextResponse } from "next/server";

import { getCurrentUserFromCookie } from "@/lib/auth/session";
import { query } from "@/lib/db";
import { getResolvedPlatformSettings } from "@/lib/platform-settings-server";
import { getServerVendorsByIds } from "@/lib/vendors/server-queries";

type OrderRow = {
  id: string;
  order_number: string;
  user_id: string | null;
  user_email: string;
  status: string;
  payment_method: string | null;
  payment_status: string | null;
  buyer: Record<string, string | number | boolean | null> | null;
  created_at: string;
  cnds_cost_total?: number | null;
  international_shipping_method_id?: string | null;
  international_shipping_method_name?: string | null;
  international_shipping_total?: number | null;
  international_shipping_status?: string | null;
  summary: Record<string, unknown>;
  shipping_methods: Array<Record<string, unknown>> | null;
};

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

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const currentUser = await getCurrentUserFromCookie();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  const orderResult = await query<OrderRow>("select * from public.orders where id = $1 limit 1", [id]);
  const order = orderResult.rows[0] ?? null;

  if (!order) {
    return NextResponse.json({ order: null, items: [], platformSettings: null, vendorNamesById: {} });
  }

  const matchesUserId = order.user_id === currentUser.id;
  const matchesUserEmail =
    typeof order.user_email === "string" &&
    order.user_email.toLowerCase() === currentUser.email.toLowerCase();

  if (!matchesUserId && !matchesUserEmail) {
    return NextResponse.json({ order: null, items: [], platformSettings: null, vendorNamesById: {} });
  }

  const itemsResult = await query<OrderItemRow>(
    "select * from public.order_items where order_id = $1 order by created_at asc",
    [id],
  );
  const vendorIds = Array.from(
    new Set(
      itemsResult.rows
        .map((item) => item.vendor_id)
        .filter((vendorId): vendorId is string => typeof vendorId === "string" && vendorId.length > 0),
    ),
  );
  const [platformSettings, vendorResult] = await Promise.all([
    getResolvedPlatformSettings(),
    vendorIds.length > 0 ? getServerVendorsByIds(vendorIds) : { data: [], error: null },
  ]);

  return NextResponse.json({
    order,
    items: itemsResult.rows,
    platformSettings,
    vendorNamesById: Object.fromEntries(vendorResult.data.map((vendor) => [vendor.id, vendor.name])),
  });
}
