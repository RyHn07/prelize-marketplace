import { NextResponse } from "next/server";

import { buildAdminCustomers, getAdminOrders } from "@/lib/admin/vps-data";
import { requireAdminRequest } from "@/lib/auth/request";

export async function GET(request: Request) {
  const auth = await requireAdminRequest(request);

  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  try {
    const ordersResult = await getAdminOrders();

    return NextResponse.json({
      userEmail: auth.user?.email ?? null,
      customers: buildAdminCustomers(ordersResult.rows),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load customers." },
      { status: 500 },
    );
  }
}
