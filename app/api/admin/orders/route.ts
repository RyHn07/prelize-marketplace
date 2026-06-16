import { NextResponse } from "next/server";

import { getAdminOrders } from "@/lib/admin/vps-data";
import { query } from "@/lib/db";
import { ORDER_STATUSES } from "@/lib/orders/utils";
import { requireAdminRequest } from "@/lib/auth/request";
import type { VendorOrderStatus } from "@/types/product-db";

type StatusBody = {
  orderId?: string;
  status?: VendorOrderStatus;
};

export async function GET(request: Request) {
  const auth = await requireAdminRequest(request);

  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  try {
    const result = await getAdminOrders();
    return NextResponse.json({ userEmail: auth.user?.email ?? null, orders: result.rows });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load orders." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAdminRequest(request);

  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  try {
    const body = (await request.json()) as StatusBody;

    if (!body.orderId || !body.status || !ORDER_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: "A valid order and status are required." }, { status: 400 });
    }

    await query("update public.orders set status = $1 where id = $2", [body.status, body.orderId]);

    return NextResponse.json({ success: true, status: body.status });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update order status." },
      { status: 500 },
    );
  }
}
