import { NextResponse } from "next/server";

import { query } from "@/lib/db";
import { requireAdminRequest } from "@/lib/auth/request";

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

async function resolveUniqueSlug(rawSlug: string, excludeId: string) {
  const baseSlug = normalizeSlug(rawSlug);
  const existing = await query<{ slug: string }>(
    "select slug from public.brands where (slug = $1 or slug like $2) and id <> $3",
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
    const body = (await request.json()) as BrandPayload;
    const name = body.name?.trim();

    if (!name) {
      return NextResponse.json({ error: "Brand name is required." }, { status: 400 });
    }

    const slug = await resolveUniqueSlug(body.slug || name, id);
    const result = await query(
      `
        update public.brands
        set name = $1, slug = $2, image_url = $3
        where id = $4
        returning id, name, slug, image_url, created_at
      `,
      [name, slug, body.image_url || null, id],
    );

    if (!result.rows[0]) {
      return NextResponse.json({ error: "Brand not found." }, { status: 404 });
    }

    return NextResponse.json({ data: result.rows[0] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update brand." },
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
    const productsResult = await query<{ count: string }>(
      "select count(*)::text as count from public.products where brand_id = $1",
      [id],
    );

    if (Number(productsResult.rows[0]?.count ?? 0) > 0) {
      return NextResponse.json(
        { error: "This brand is still assigned to products. Set those products to Non Brand or reassign them first." },
        { status: 400 },
      );
    }

    await query("delete from public.brands where id = $1", [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to delete brand." },
      { status: 500 },
    );
  }
}
