import { NextResponse } from "next/server";

import { getCurrentUserFromCookie } from "@/lib/auth/session";
import {
  deriveParentOrderStatus,
  getVendorStatusTransitionError,
  normalizeVendorOrderRow,
  safeOrderStatus,
} from "@/lib/orders/utils";
import { query } from "@/lib/db";
import type { OrderItemRow, VendorOrderRow, VendorOrderStatus } from "@/types/product-db";

type ParentOrderRow = {
  id: string;
  order_number: string;
  user_email: string;
  created_at: string;
};

type VendorOrderListRow = VendorOrderRow & {
  parentOrder: ParentOrderRow | null;
  itemCount: number;
  totalQuantity: number;
};

async function getActiveVendorId(userId: string) {
  const result = await query<{ vendor_id: string }>(
    `
      select vendor_id
      from public.vendor_members
      where user_id = $1 and status = 'active'
      order by created_at desc
      limit 1
    `,
    [userId],
  );

  return result.rows[0]?.vendor_id ?? null;
}

export async function GET() {
  const user = await getCurrentUserFromCookie();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const vendorId = await getActiveVendorId(user.id);

  if (!vendorId) {
    return NextResponse.json({ error: "No vendor account found." }, { status: 403 });
  }

  const vendorOrdersResult = await query<VendorOrderRow>(
    `
      select *
      from public.vendor_orders
      where vendor_id = $1
      order by created_at desc
    `,
    [vendorId],
  );

  const vendorOrders = vendorOrdersResult.rows.map(normalizeVendorOrderRow);

  if (vendorOrders.length === 0) {
    return NextResponse.json({ vendorId, orders: [] });
  }

  const orderIds = vendorOrders.map((vendorOrder) => vendorOrder.order_id);
  const vendorOrderIds = vendorOrders.map((vendorOrder) => vendorOrder.id);

  const [parentOrdersResult, itemsResult] = await Promise.all([
    query<ParentOrderRow>(
      `
        select id, order_number, user_email, created_at
        from public.orders
        where id = any($1::uuid[])
      `,
      [orderIds],
    ),
    query<OrderItemRow>(
      `
        select *
        from public.order_items
        where vendor_order_id = any($1::uuid[])
      `,
      [vendorOrderIds],
    ),
  ]);

  const parentOrderById = new Map(parentOrdersResult.rows.map((order) => [order.id, order]));
  const itemsByVendorOrderId = new Map<string, OrderItemRow[]>();

  itemsResult.rows.forEach((item) => {
    if (!item.vendor_order_id) {
      return;
    }

    const currentItems = itemsByVendorOrderId.get(item.vendor_order_id) ?? [];
    currentItems.push(item);
    itemsByVendorOrderId.set(item.vendor_order_id, currentItems);
  });

  const orders: VendorOrderListRow[] = vendorOrders.map((vendorOrder) => {
    const items = itemsByVendorOrderId.get(vendorOrder.id) ?? [];

    return {
      ...vendorOrder,
      parentOrder: parentOrderById.get(vendorOrder.order_id) ?? null,
      itemCount: items.length,
      totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
    };
  });

  return NextResponse.json({ vendorId, orders });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUserFromCookie();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    vendorOrderId?: unknown;
    status?: unknown;
  } | null;
  const vendorOrderId = typeof body?.vendorOrderId === "string" ? body.vendorOrderId : "";
  const nextStatus = safeOrderStatus(body?.status);

  if (!vendorOrderId) {
    return NextResponse.json({ error: "Vendor order ID is required." }, { status: 400 });
  }

  const vendorId = await getActiveVendorId(user.id);

  if (!vendorId) {
    return NextResponse.json({ error: "No vendor account found." }, { status: 403 });
  }

  const existingResult = await query<Pick<VendorOrderRow, "id" | "order_id" | "status">>(
    `
      select id, order_id, status
      from public.vendor_orders
      where id = $1 and vendor_id = $2
      limit 1
    `,
    [vendorOrderId, vendorId],
  );
  const existingOrder = existingResult.rows[0];

  if (!existingOrder) {
    return NextResponse.json({ error: "Vendor order not found." }, { status: 404 });
  }

  const currentStatus = safeOrderStatus(existingOrder.status);
  const transitionError = getVendorStatusTransitionError(currentStatus, nextStatus);

  if (transitionError) {
    return NextResponse.json({ error: transitionError }, { status: 400 });
  }

  await query(
    `
      update public.vendor_orders
      set status = $1
      where id = $2 and vendor_id = $3
    `,
    [nextStatus, vendorOrderId, vendorId],
  );

  const siblingResult = await query<{ status: VendorOrderStatus }>(
    "select status from public.vendor_orders where order_id = $1",
    [existingOrder.order_id],
  );
  const parentStatus = deriveParentOrderStatus(siblingResult.rows.map((row) => row.status));

  await query("update public.orders set status = $1 where id = $2", [parentStatus, existingOrder.order_id]);

  return NextResponse.json({ success: true, status: nextStatus, parentStatus });
}
