import { NextResponse } from "next/server";

import {
  getAdminProductCategoryOptions,
  getAdminProducts,
  getAdminProductVendorOptions,
} from "@/lib/admin/vps-data";
import { createProductEditorRecordWithClient, type ProductEditorSavePayload } from "@/lib/products/actions";
import { getDatabaseServiceClient, requireAdminRequest } from "@/lib/auth/request";

export async function GET(request: Request) {
  const auth = await requireAdminRequest(request);

  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  try {
    const [productsResult, vendorResult, categoryResult] = await Promise.all([
      getAdminProducts(),
      getAdminProductVendorOptions(),
      getAdminProductCategoryOptions(),
    ]);

    return NextResponse.json({
      userEmail: auth.user?.email ?? null,
      hasPlatformAdminAccess: true,
      products: productsResult.rows,
      vendorOptions: vendorResult.rows,
      categoryOptions: categoryResult.rows,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load products." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireAdminRequest(request);

  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  try {
    const body = (await request.json()) as ProductEditorSavePayload;
    const dataClient = getDatabaseServiceClient();
    const result = await createProductEditorRecordWithClient(dataClient, body);

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 400 });
    }

    return NextResponse.json({ data: result.data });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to create the product.",
      },
      { status: 500 },
    );
  }
}
