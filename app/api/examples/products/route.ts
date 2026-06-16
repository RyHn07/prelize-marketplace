import { NextResponse } from "next/server";

import { query } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ProductRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: string;
  stock_quantity: number;
  created_at: Date;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? 20), 100);
  const offset = Math.max(Number(searchParams.get("offset") ?? 0), 0);

  try {
    const result = await query<ProductRow>(
      `
        select id, name, slug, description, price, stock_quantity, created_at
        from products
        where is_active = true
        order by created_at desc
        limit $1 offset $2
      `,
      [Number.isFinite(limit) ? limit : 20, Number.isFinite(offset) ? offset : 0],
    );

    return NextResponse.json({ data: result.rows });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to fetch products." },
      { status: 500 },
    );
  }
}
