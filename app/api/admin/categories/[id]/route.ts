import { NextResponse } from "next/server";

import { query } from "@/lib/db";
import { requireAdminRequest } from "@/lib/supabase-admin";

type CategoryPayload = {
  name?: string;
  slug?: string;
  parent_id?: string | null;
  image_url?: string | null;
};

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-") || "category";
}

async function resolveUniqueSlug(rawSlug: string, excludeId: string) {
  const baseSlug = normalizeSlug(rawSlug);
  const existing = await query<{ slug: string }>(
    "select slug from public.categories where (slug = $1 or slug like $2) and id <> $3",
    [baseSlug, `${baseSlug}-%`, excludeId],
  );
  const slugs = new Set(existing.rows.map((row) => row.slug));

  if (!slugs.has(baseSlug)) {
    return baseSlug;
  }

  let suffix = 2;
  while (slugs.has(`${baseSlug}-${suffix}`)) {
    suffix += 1;
  }

  return `${baseSlug}-${suffix}`;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminRequest(request);

  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  try {
    const { id } = await params;
    const body = (await request.json()) as CategoryPayload;
    const name = body.name?.trim();

    if (!name) {
      return NextResponse.json({ error: "Category name is required." }, { status: 400 });
    }

    const slug = await resolveUniqueSlug(body.slug || name, id);
    const result = await query(
      `
        update public.categories
        set name = $1, slug = $2, parent_id = $3, image_url = $4
        where id = $5
        returning id, name, slug, parent_id, coalesce(image_url, image) as image_url, created_at
      `,
      [name, slug, body.parent_id || null, body.image_url || null, id],
    );

    if (!result.rows[0]) {
      return NextResponse.json({ error: "Category not found." }, { status: 404 });
    }

    return NextResponse.json({ data: result.rows[0] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update category." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminRequest(request);

  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  try {
    const { id } = await params;
    const [productsResult, childrenResult] = await Promise.all([
      query<{ count: string }>("select count(*)::text as count from public.products where category_id = $1", [id]),
      query<{ count: string }>("select count(*)::text as count from public.categories where parent_id = $1", [id]),
    ]);

    if (Number(productsResult.rows[0]?.count ?? 0) > 0) {
      return NextResponse.json(
        { error: "This category is still assigned to products. Reassign those products before deleting it." },
        { status: 400 },
      );
    }

    if (Number(childrenResult.rows[0]?.count ?? 0) > 0) {
      return NextResponse.json(
        { error: "This category still has subcategories. Move or remove those subcategories before deleting it." },
        { status: 400 },
      );
    }

    await query("delete from public.categories where id = $1", [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to delete category." },
      { status: 500 },
    );
  }
}
