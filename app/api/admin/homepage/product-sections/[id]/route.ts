import { NextResponse } from "next/server";

import { query } from "@/lib/db";
import { requireAdminRequest } from "@/lib/auth/request";

type RouteContext = {
  params: Promise<{ id: string }>;
};

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

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdminRequest(request);

  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  const { id } = await context.params;
  const payload = (await request.json()) as ProductSectionPayload;

  if (!payload.title?.trim() || !payload.section_key?.trim()) {
    return NextResponse.json({ error: "Title and section key are required." }, { status: 400 });
  }

  try {
    const result = await query(
      `
        update public.homepage_product_sections
        set title = $1,
            subtitle = $2,
            section_key = $3,
            source_type = $4,
            category_id = $5,
            product_ids = $6::text[],
            limit_count = $7,
            sort_order = $8,
            is_active = $9
        where id = $10
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
        id,
      ],
    );

    return NextResponse.json({ section: result.rows[0] ?? null });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update homepage product section." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await requireAdminRequest(request);

  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  const { id } = await context.params;
  try {
    await query("delete from public.homepage_product_sections where id = $1", [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to delete homepage product section." },
      { status: 500 },
    );
  }
}
