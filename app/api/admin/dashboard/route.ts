import { NextResponse } from "next/server";

import { getAdminOrders, getAdminProducts, getAdminVendors } from "@/lib/admin/vps-data";
import { requireAdminRequest } from "@/lib/auth/request";

export async function GET(request: Request) {
  const auth = await requireAdminRequest(request);

  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  try {
    const [ordersResult, productsResult, vendorsResult] = await Promise.all([
      getAdminOrders(),
      getAdminProducts(),
      getAdminVendors(),
    ]);

    return NextResponse.json({
      userEmail: auth.user?.email ?? null,
      orders: ordersResult.rows,
      products: productsResult.rows,
      vendors: vendorsResult.rows,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load dashboard data." },
      { status: 500 },
    );
  }
}
