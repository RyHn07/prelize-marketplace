import { NextResponse } from "next/server";

import { getCurrentUserFromCookie } from "@/lib/auth/session";
import { connect } from "@/lib/db";

export const dynamic = "force-dynamic";

const orderColumns = [
  "id",
  "order_number",
  "user_id",
  "user_email",
  "status",
  "payment_method",
  "payment_status",
  "buyer",
  "cnds_cost_total",
  "international_shipping_method_id",
  "international_shipping_method_name",
  "international_shipping_total",
  "international_shipping_status",
  "summary",
  "shipping_methods",
] as const;

const vendorOrderColumns = [
  "id",
  "order_id",
  "vendor_id",
  "status",
  "summary",
  "shipping_method",
  "vendor_note",
  "admin_note",
] as const;

const orderItemColumns = [
  "order_id",
  "product_id",
  "variant_id",
  "product_name",
  "product_image",
  "variation",
  "variant_name",
  "variant_value",
  "price",
  "unit_price",
  "total_price",
  "buying_price_cny",
  "profit_percent",
  "profit_amount_cny",
  "selling_price_cny",
  "exchange_rate_cny_to_bdt",
  "display_currency",
  "total_profit_cny",
  "quantity",
  "weight",
  "weight_kg",
  "total_weight_kg",
  "cnds_cost",
  "cnds_profile_id",
  "vendor_id",
  "vendor_order_id",
] as const;

type OrderRequest = {
  order?: Record<string, unknown>;
  vendorOrders?: Record<string, unknown>[];
  orderItems?: Record<string, unknown>[];
};

function quoteIdentifier(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function pickColumns<T extends readonly string[]>(row: Record<string, unknown>, columns: T) {
  return Object.fromEntries(columns.map((column) => [column, row[column]]));
}

async function insertRows(
  client: Awaited<ReturnType<typeof connect>>,
  tableName: string,
  columns: readonly string[],
  rows: Record<string, unknown>[],
) {
  if (rows.length === 0) {
    return;
  }

  const values: unknown[] = [];
  const placeholders = rows.map((row, rowIndex) => {
    const rowPlaceholders = columns.map((column, columnIndex) => {
      values.push(row[column] ?? null);
      return `$${rowIndex * columns.length + columnIndex + 1}`;
    });

    return `(${rowPlaceholders.join(", ")})`;
  });

  await client.query(
    `
      insert into public.${quoteIdentifier(tableName)}
        (${columns.map(quoteIdentifier).join(", ")})
      values ${placeholders.join(", ")}
    `,
    values,
  );
}

export async function POST(request: Request) {
  const currentUser = await getCurrentUserFromCookie();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as OrderRequest | null;
  const order = body?.order;
  const vendorOrders = Array.isArray(body?.vendorOrders) ? body.vendorOrders : [];
  const orderItems = Array.isArray(body?.orderItems) ? body.orderItems : [];

  if (!order?.id || typeof order.id !== "string" || orderItems.length === 0) {
    return NextResponse.json({ error: "A valid order and at least one order item are required." }, { status: 400 });
  }

  if (order.user_id !== currentUser.id || order.user_email !== currentUser.email) {
    return NextResponse.json({ error: "Order user does not match the signed-in account." }, { status: 403 });
  }

  const orderId = order.id;
  const sanitizedOrder = pickColumns(order, orderColumns);
  const sanitizedVendorOrders = vendorOrders.map((vendorOrder) => pickColumns(vendorOrder, vendorOrderColumns));
  const sanitizedOrderItems = orderItems.map((orderItem) => pickColumns(orderItem, orderItemColumns));

  if (
    sanitizedVendorOrders.some((vendorOrder) => vendorOrder.order_id !== orderId) ||
    sanitizedOrderItems.some((orderItem) => orderItem.order_id !== orderId)
  ) {
    return NextResponse.json({ error: "Order item references do not match the order." }, { status: 400 });
  }

  const client = await connect();

  try {
    await client.query("begin");
    await insertRows(client, "orders", orderColumns, [sanitizedOrder]);
    await insertRows(client, "vendor_orders", vendorOrderColumns, sanitizedVendorOrders);
    await insertRows(client, "order_items", orderItemColumns, sanitizedOrderItems);
    await client.query("commit");

    return NextResponse.json({
      order: {
        id: orderId,
        order_number: typeof order.order_number === "string" ? order.order_number : "",
      },
    });
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    const message = error instanceof Error ? error.message : "Unable to save your order.";

    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    client.release();
  }
}
