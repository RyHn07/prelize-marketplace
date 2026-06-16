import { NextResponse } from "next/server";

import { getAdminVendorProductCounts, getAdminVendors } from "@/lib/admin/vps-data";
import { requireAdminRequest } from "@/lib/auth/request";

export async function GET(request: Request) {
  const auth = await requireAdminRequest(request);

  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  try {
    const [vendorsResult, productCounts] = await Promise.all([
      getAdminVendors(),
      getAdminVendorProductCounts(),
    ]);

    return NextResponse.json({
      userEmail: auth.user?.email ?? null,
      vendors: vendorsResult.rows,
      productCounts,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load vendors." },
      { status: 500 },
    );
  }
}
