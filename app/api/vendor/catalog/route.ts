import { NextResponse } from "next/server";

import { getCurrentUserFromCookie } from "@/lib/auth/session";
import { query } from "@/lib/db";

async function getActiveVendorId(userId: string) {
  const result = await query<{ vendor_id: string }>(
    `
      select vendor_id
      from public.vendor_members
      where user_id = $1 and status = 'active'
      order by created_at desc
      limit 1
    `,
    [userId],
  );

  return result.rows[0]?.vendor_id ?? null;
}

export async function GET() {
  const user = await getCurrentUserFromCookie();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const vendorId = await getActiveVendorId(user.id);

    if (!vendorId) {
      return NextResponse.json({ error: "No vendor account found." }, { status: 403 });
    }

    const [categoriesResult, categoryCountsResult, brandsResult, brandCountsResult] = await Promise.all([
      query(
        `
          select id, name, slug, parent_id, coalesce(image_url, image) as image_url, created_at
          from public.categories
          order by name asc
        `,
      ),
      query<{ category_id: string; count: string }>(
        `
          select category_id, count(*)::text as count
          from public.products
          where category_id is not null
          group by category_id
        `,
      ),
      query("select id, name, slug, image_url, created_at from public.brands order by name asc"),
      query<{ brand_id: string; count: string }>(
        "select brand_id, count(*)::text as count from public.products where brand_id is not null group by brand_id",
      ),
    ]);

    return NextResponse.json({
      userEmail: user.email,
      vendorId,
      categories: categoriesResult.rows,
      categoryProductCounts: Object.fromEntries(
        categoryCountsResult.rows.map((row) => [row.category_id, Number(row.count)]),
      ),
      brands: brandsResult.rows,
      brandProductCounts: Object.fromEntries(
        brandCountsResult.rows.map((row) => [row.brand_id, Number(row.count)]),
      ),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load vendor catalog data." },
      { status: 500 },
    );
  }
}
