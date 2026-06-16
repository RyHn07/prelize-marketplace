import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

import { connect } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CreateOrderItem = {
  productId?: string;
  quantity?: number;
};

type CreateOrderRequest = {
  userId?: string;
  items?: CreateOrderItem[];
};

function parseOrderPayload(body: CreateOrderRequest) {
  const userId = typeof body.userId === "string" ? body.userId.trim() : "";
  const items = Array.isArray(body.items) ? body.items : [];

  return {
    userId,
    items: items
      .map((item) => ({
        productId: typeof item.productId === "string" ? item.productId.trim() : "",
        quantity: Number(item.quantity),
      }))
      .filter((item) => item.productId && Number.isInteger(item.quantity) && item.quantity > 0),
  };
}

export async function POST(request: Request) {
  const body = (await request.json()) as CreateOrderRequest;
  const { userId, items } = parseOrderPayload(body);

  if (!userId) {
    return NextResponse.json({ error: "userId is required." }, { status: 400 });
  }

  if (items.length === 0) {
    return NextResponse.json({ error: "At least one order item is required." }, { status: 400 });
  }

  const client = await connect();

  try {
    await client.query("begin");

    const userResult = await client.query("select id from users where id = $1", [userId]);

    if (userResult.rowCount === 0) {
      await client.query("rollback");
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const orderId = randomUUID();
    let totalCents = 0;
    const createdItems = [];

    for (const item of items) {
      const productResult = await client.query<{
        id: string;
        price_cents: number;
        stock_quantity: number;
      }>(
        `
          select id, price_cents, stock_quantity
          from products
          where id = $1 and is_active = true
          for update
        `,
        [item.productId],
      );

      const product = productResult.rows[0];

      if (!product) {
        await client.query("rollback");
        return NextResponse.json({ error: `Product not found: ${item.productId}` }, { status: 404 });
      }

      if (product.stock_quantity < item.quantity) {
        await client.query("rollback");
        return NextResponse.json({ error: `Not enough stock for product: ${item.productId}` }, { status: 400 });
      }

      const lineTotalCents = product.price_cents * item.quantity;
      totalCents += lineTotalCents;

      await client.query("update products set stock_quantity = stock_quantity - $1 where id = $2", [
        item.quantity,
        product.id,
      ]);

      const orderItemResult = await client.query(
        `
          insert into order_items (id, order_id, product_id, quantity, unit_price_cents, line_total_cents)
          values ($1, $2, $3, $4, $5, $6)
          returning id, product_id, quantity, unit_price_cents, line_total_cents
        `,
        [randomUUID(), orderId, product.id, item.quantity, product.price_cents, lineTotalCents],
      );

      createdItems.push(orderItemResult.rows[0]);
    }

    const orderResult = await client.query(
      `
        insert into orders (id, user_id, status, total_cents)
        values ($1, $2, $3, $4)
        returning id, user_id, status, total_cents, created_at
      `,
      [orderId, userId, "pending", totalCents],
    );

    await client.query("commit");

    return NextResponse.json({ data: { ...orderResult.rows[0], items: createdItems } }, { status: 201 });
  } catch (error) {
    await client.query("rollback");

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create order." },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}
