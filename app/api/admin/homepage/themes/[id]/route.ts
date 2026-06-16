import { NextResponse } from "next/server";

import { query } from "@/lib/db";
import { requireAdminRequest } from "@/lib/auth/request";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type ThemePayload = {
  name?: string;
  slug?: string;
  description?: string | null;
  preview_image_url?: string | null;
  status?: string;
  is_active?: boolean;
  settings_json?: unknown;
  sections?: Array<{
    id?: string | null;
    section_key?: string;
    section_type?: string;
    component_name?: string;
    sort_order?: number;
    is_enabled?: boolean;
    layout_settings?: unknown;
  }>;
};

export async function GET(request: Request, context: RouteContext) {
  const auth = await requireAdminRequest(request);

  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  const { id } = await context.params;
  const [themeResult, sectionResult] = await Promise.all([
    query("select * from public.homepage_themes where id = $1 limit 1", [id]),
    query("select * from public.homepage_theme_sections where theme_id = $1 order by sort_order asc", [id]),
  ]);

  const theme = themeResult.rows[0] ?? null;

  if (!theme) {
    return NextResponse.json({ error: "Theme not found." }, { status: 404 });
  }

  return NextResponse.json({ record: { theme, sections: sectionResult.rows } });
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdminRequest(request);

  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  const { id } = await context.params;
  const payload = (await request.json()) as ThemePayload;
  const name = payload.name?.trim();
  const slug = payload.slug?.trim();

  if (!name || !slug) {
    return NextResponse.json({ error: "Theme name and slug are required." }, { status: 400 });
  }

  try {
    if (payload.is_active) {
      await query("update public.homepage_themes set is_active = false, status = 'draft', updated_at = now()");
    }

    await query(
      `
        update public.homepage_themes
        set name = $1,
            slug = $2,
            description = $3,
            preview_image_url = $4,
            status = $5,
            is_active = $6,
            settings_json = $7::jsonb,
            updated_at = now()
        where id = $8
      `,
      [
        name,
        slug,
        payload.description ?? null,
        payload.preview_image_url ?? null,
        payload.is_active ? "active" : payload.status || "draft",
        payload.is_active ?? false,
        JSON.stringify(payload.settings_json ?? {}),
        id,
      ],
    );

    if (Array.isArray(payload.sections)) {
      await query("delete from public.homepage_theme_sections where theme_id = $1", [id]);

      for (const [index, section] of payload.sections.entries()) {
        await query(
          `
            insert into public.homepage_theme_sections (
              theme_id, section_key, section_type, component_name, sort_order,
              is_enabled, layout_settings, updated_at
            )
            values ($1, $2, $3, $4, $5, $6, $7::jsonb, now())
          `,
          [
            id,
            section.section_key || "hero",
            section.section_type || section.section_key || "hero",
            section.component_name || "hero-section",
            section.sort_order ?? index,
            section.is_enabled ?? true,
            JSON.stringify(section.layout_settings ?? {}),
          ],
        );
      }
    }

    const [themeResult, sectionResult] = await Promise.all([
      query("select * from public.homepage_themes where id = $1 limit 1", [id]),
      query("select * from public.homepage_theme_sections where theme_id = $1 order by sort_order asc", [id]),
    ]);

    return NextResponse.json({ record: { theme: themeResult.rows[0], sections: sectionResult.rows } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update homepage theme." },
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
    await query("delete from public.homepage_themes where id = $1", [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to delete homepage theme." },
      { status: 500 },
    );
  }
}
