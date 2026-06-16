import { NextResponse } from "next/server";

import { query } from "@/lib/db";
import { requireAdminRequest } from "@/lib/auth/request";

export async function GET(request: Request) {
  const auth = await requireAdminRequest(request);

  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  try {
    const result = await query(
      `
        select
          reviews.id,
          reviews.product_id,
          coalesce(products.name, 'Unknown product') as product_name,
          coalesce(products.slug, '') as product_slug,
          vendors.name as vendor_name,
          reviews.user_email,
          reviews.rating,
          reviews.title,
          reviews.comment,
          reviews.created_at
        from public.product_reviews reviews
        left join public.products products on products.id = reviews.product_id
        left join public.vendors vendors on vendors.id = reviews.vendor_id
        order by reviews.created_at desc
      `,
    );

    return NextResponse.json({ data: result.rows });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to load product reviews.",
      },
      { status: 500 },
    );
  }
}
