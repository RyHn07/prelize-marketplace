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

async function resolveUniqueSlug(rawSlug: string, excludeId?: string) {
  const baseSlug = normalizeSlug(rawSlug);
  const params: unknown[] = [baseSlug, `${baseSlug}-%`];
  let sql = "select slug from public.categories where (slug = $1 or slug like $2)";

  if (excludeId) {
    params.push(excludeId);
    sql += " and id <> $3";
  }

  const existing = await query<{ slug: string }>(sql, params);
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

async function listCategories() {
  const [categoriesResult, countsResult] = await Promise.all([
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
  ]);

  return {
    categories: categoriesResult.rows,
    productCounts: Object.fromEntries(countsResult.rows.map((row) => [row.category_id, Number(row.count)])),
  };
}

export async function GET(request: Request) {
  const auth = await requireAdminRequest(request);

  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  try {
    const data = await listCategories();
    return NextResponse.json({ userEmail: auth.user?.email ?? null, ...data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load categories." },
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
    const body = (await request.json()) as CategoryPayload;
    const name = body.name?.trim();

    if (!name) {
      return NextResponse.json({ error: "Category name is required." }, { status: 400 });
    }

    const slug = await resolveUniqueSlug(body.slug || name);
    const result = await query(
      `
        insert into public.categories (name, slug, parent_id, image_url)
        values ($1, $2, $3, $4)
        returning id, name, slug, parent_id, coalesce(image_url, image) as image_url, created_at
      `,
      [name, slug, body.parent_id || null, body.image_url || null],
    );

    return NextResponse.json({ data: result.rows[0] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to save category." },
      { status: 500 },
    );
  }
}
