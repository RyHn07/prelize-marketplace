import { NextResponse } from "next/server";

import { query } from "@/lib/db";
import { requireAdminRequest } from "@/lib/supabase-admin";

type ProductSectionPayload = {
  title?: string;
  subtitle?: string | null;
  section_key?: string;
  source_type?: string;
  category_id?: string | null;
  product_ids?: string[];
  limit_count?: number;
  sort_order?: number;
  is_active?: boolean;
};

export async function GET(request: Request) {
  const auth = await requireAdminRequest(request);

  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  try {
    const result = await query("select * from public.homepage_product_sections order by sort_order asc, created_at desc");
    return NextResponse.json({ sections: result.rows });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load homepage product sections." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireAdminRequest(request);

  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  const payload = (await request.json()) as ProductSectionPayload;

  if (!payload.title?.trim() || !payload.section_key?.trim()) {
    return NextResponse.json({ error: "Title and section key are required." }, { status: 400 });
  }

  try {
    const result = await query(
      `
        insert into public.homepage_product_sections (
          title, subtitle, section_key, source_type, category_id, product_ids,
          limit_count, sort_order, is_active
        )
        values ($1, $2, $3, $4, $5, $6::text[], $7, $8, $9)
        returning *
      `,
      [
        payload.title.trim(),
        payload.subtitle || null,
        payload.section_key.trim(),
        payload.source_type || "newest",
        payload.category_id || null,
        payload.product_ids ?? [],
        payload.limit_count ?? 8,
        payload.sort_order ?? 0,
        payload.is_active ?? true,
      ],
    );

    return NextResponse.json({ section: result.rows[0] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create homepage product section." },
      { status: 500 },
    );
  }
}
