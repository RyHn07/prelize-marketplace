import { NextResponse } from "next/server";

import { query } from "@/lib/db";
import { requireAdminRequest } from "@/lib/supabase-admin";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireAdminRequest(request);

  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  const { id } = await context.params;
  try {
    const source = await query("select * from public.homepage_themes where id = $1 limit 1", [id]);
    const theme = source.rows[0] as { name?: string; slug?: string; description?: string | null; preview_image_url?: string | null; settings_json?: unknown } | undefined;

    if (!theme) {
      return NextResponse.json({ error: "Theme not found." }, { status: 404 });
    }

    const result = await query(
      `
        insert into public.homepage_themes (
          name, slug, description, preview_image_url, status, is_active, settings_json, updated_at
        )
        values ($1, $2, $3, $4, 'draft', false, $5::jsonb, now())
        returning *
      `,
      [
        `${theme.name ?? "Theme"} Copy`,
        `${theme.slug ?? "theme"}-copy-${Date.now()}`,
        theme.description ?? null,
        theme.preview_image_url ?? null,
        JSON.stringify(theme.settings_json ?? {}),
      ],
    );

    return NextResponse.json({ record: { theme: result.rows[0], sections: [] } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to duplicate homepage theme." },
      { status: 500 },
    );
  }
}
