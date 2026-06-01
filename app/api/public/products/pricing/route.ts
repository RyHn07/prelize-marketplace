import { NextResponse } from "next/server";

import { getProductsByIds, getResolvedProductPricingMapByProducts } from "@/lib/products/queries";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get("ids") ?? "";
    const ids = Array.from(new Set(idsParam.split(",").map((value) => value.trim()).filter(Boolean)));

    if (ids.length === 0) {
      return NextResponse.json({ data: {} });
    }

    const productsResult = await getProductsByIds(ids);

    if (productsResult.error) {
      return NextResponse.json({ error: productsResult.error.message }, { status: 500 });
    }

    const publicProducts = productsResult.data.filter((product) => product.is_active && product.status === "active");
    const pricingResult = await getResolvedProductPricingMapByProducts(publicProducts);

    if (pricingResult.error) {
      return NextResponse.json({ error: pricingResult.error.message }, { status: 500 });
    }

    return NextResponse.json({
      data: Object.fromEntries(pricingResult.data.entries()),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to load product pricing.",
      },
      { status: 500 },
    );
  }
}
