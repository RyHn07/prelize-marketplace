import { NextResponse } from "next/server";

import { query } from "@/lib/db";
import { requireAdminRequest } from "@/lib/supabase-admin";

type BrandPayload = {
  name?: string;
  slug?: string;
  image_url?: string | null;
};

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-") || "brand";
}

async function resolveUniqueSlug(rawSlug: string) {
  const baseSlug = normalizeSlug(rawSlug);
  const existing = await query<{ slug: string }>(
    "select slug from public.brands where slug = $1 or slug like $2",
    [baseSlug, `${baseSlug}-%`],
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

export async function GET(request: Request) {
  const auth = await requireAdminRequest(request);

  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  try {
    const [brandsResult, countsResult] = await Promise.all([
      query("select id, name, slug, image_url, created_at from public.brands order by name asc"),
      query<{ brand_id: string; count: string }>(
        "select brand_id, count(*)::text as count from public.products where brand_id is not null group by brand_id",
      ),
    ]);

    return NextResponse.json({
      userEmail: auth.user?.email ?? null,
      brands: brandsResult.rows,
      productCounts: Object.fromEntries(countsResult.rows.map((row) => [row.brand_id, Number(row.count)])),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load brands." },
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
    const body = (await request.json()) as BrandPayload;
    const name = body.name?.trim();

    if (!name) {
      return NextResponse.json({ error: "Brand name is required." }, { status: 400 });
    }

    const slug = await resolveUniqueSlug(body.slug || name);
    const result = await query(
      `
        insert into public.brands (name, slug, image_url)
        values ($1, $2, $3)
        returning id, name, slug, image_url, created_at
      `,
      [name, slug, body.image_url || null],
    );

    return NextResponse.json({ data: result.rows[0] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to save brand." },
      { status: 500 },
    );
  }
}
