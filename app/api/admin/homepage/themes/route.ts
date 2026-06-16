import { NextResponse } from "next/server";

import { query } from "@/lib/db";
import { requireAdminRequest } from "@/lib/auth/request";

type ThemePayload = {
  name?: string;
  slug?: string;
  description?: string | null;
  preview_image_url?: string | null;
  status?: string;
  is_active?: boolean;
  settings_json?: unknown;
};

function toSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "homepage-theme";
}

export async function GET(request: Request) {
  const auth = await requireAdminRequest(request);

  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  try {
    const result = await query("select * from public.homepage_themes order by updated_at desc");
    return NextResponse.json({ themes: result.rows });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to load homepage themes.",
      },
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
    const payload = (await request.json()) as ThemePayload;
    const name = payload.name?.trim();

    if (!name) {
      return NextResponse.json({ error: "Theme name is required." }, { status: 400 });
    }

    const result = await query(
      `
        insert into public.homepage_themes (
          name, slug, description, preview_image_url, status, is_active, settings_json, updated_at
        )
        values ($1, $2, $3, $4, $5, $6, $7::jsonb, now())
        returning *
      `,
      [
        name,
        toSlug(payload.slug || name),
        payload.description ?? null,
        payload.preview_image_url ?? null,
        payload.status || "draft",
        payload.is_active ?? false,
        JSON.stringify(payload.settings_json ?? {}),
      ],
    );

    return NextResponse.json({ record: { theme: result.rows[0], sections: [] } });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to create homepage theme.",
      },
      { status: 500 },
    );
  }
}
