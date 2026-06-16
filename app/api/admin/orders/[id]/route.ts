import { NextResponse } from "next/server";

import { query } from "@/lib/db";
import { ORDER_STATUSES } from "@/lib/orders/utils";
import { requireAdminRequest } from "@/lib/auth/request";
import type { OrderItemRow, VendorOrderRow, VendorOrderStatus, VendorRow } from "@/types/product-db";

type OrderPatchBody = {
  status?: VendorOrderStatus;
  adminNote?: string | null;
  paymentStatus?: "Pending" | "Paid" | "Rejected";
};

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminRequest(request);

  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  try {
    const { id } = await params;
    const [orderResult, itemsResult, vendorOrdersResult] = await Promise.all([
      query("select * from public.orders where id = $1 limit 1", [id]),
      query<OrderItemRow>("select * from public.order_items where order_id = $1", [id]),
      query<VendorOrderRow>("select * from public.vendor_orders where order_id = $1", [id]),
    ]);

    const order = orderResult.rows[0] ?? null;

    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    const vendorIds = Array.from(
      new Set(vendorOrdersResult.rows.map((vendorOrder) => vendorOrder.vendor_id).filter(Boolean)),
    );
    const vendorsResult =
      vendorIds.length > 0
        ? await query<VendorRow>("select * from public.vendors where id = any($1::uuid[])", [vendorIds])
        : { rows: [] as VendorRow[] };

    return NextResponse.json({
      userEmail: auth.user?.email ?? null,
      order,
      orderItems: itemsResult.rows,
      vendorOrders: vendorOrdersResult.rows,
      vendors: vendorsResult.rows,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load order." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminRequest(request);

  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  try {
    const { id } = await params;
    const body = (await request.json()) as OrderPatchBody;

    if (body.status) {
      if (!ORDER_STATUSES.includes(body.status)) {
        return NextResponse.json({ error: "A valid order status is required." }, { status: 400 });
      }

      await query("update public.orders set status = $1 where id = $2", [body.status, id]);
      return NextResponse.json({ success: true, status: body.status });
    }

    if (body.paymentStatus) {
      const nextPaymentStatus = body.paymentStatus;
      const nextOrderStatus = nextPaymentStatus === "Paid" ? "Payment Verified" : null;

      if (nextOrderStatus) {
        await query("update public.orders set payment_status = $1, status = $2 where id = $3", [
          nextPaymentStatus,
          nextOrderStatus,
          id,
        ]);
        return NextResponse.json({ success: true, paymentStatus: nextPaymentStatus, status: nextOrderStatus });
      }

      await query("update public.orders set payment_status = $1 where id = $2", [nextPaymentStatus, id]);
      return NextResponse.json({ success: true, paymentStatus: nextPaymentStatus });
    }

    if ("adminNote" in body) {
      await query("update public.orders set admin_note = $1 where id = $2", [body.adminNote?.trim() || null, id]);
      return NextResponse.json({ success: true, adminNote: body.adminNote?.trim() || null });
    }

    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update order." },
      { status: 500 },
    );
  }
}
