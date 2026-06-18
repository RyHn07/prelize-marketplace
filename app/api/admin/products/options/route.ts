import { NextResponse } from "next/server";

import { query } from "@/lib/db";
import { getAdminProductCategoryOptions, getAdminProductVendorOptions } from "@/lib/admin/vps-data";
import { requireAdminRequest } from "@/lib/auth/request";
import type { ProductBrandOption } from "@/types/product-db";

export async function GET(request: Request) {
  const auth = await requireAdminRequest(request);

  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  try {
    const [brandResult, categoryResult, vendorResult] = await Promise.all([
      query<ProductBrandOption>("select id, name, slug, image_url from public.brands order by name asc"),
      getAdminProductCategoryOptions(),
      getAdminProductVendorOptions(),
    ]);

    return NextResponse.json({
      brands: brandResult.rows,
      categories: categoryResult.rows,
      vendors: vendorResult.rows,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load product options." },
      { status: 500 },
    );
  }
}
