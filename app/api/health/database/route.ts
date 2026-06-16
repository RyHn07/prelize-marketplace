import { NextResponse } from "next/server";

import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

function getDatabaseUrlSummary() {
  const value = process.env.DATABASE_URL;

  if (!value) {
    return {
      configured: false,
      host: null,
      port: null,
      database: null,
      user: null,
    };
  }

  try {
    const url = new URL(value);

    return {
      configured: true,
      host: url.hostname,
      port: url.port || "5432",
      database: url.pathname.replace(/^\//, "") || null,
      user: decodeURIComponent(url.username),
    };
  } catch {
    return {
      configured: true,
      host: "invalid DATABASE_URL",
      port: null,
      database: null,
      user: null,
    };
  }
}

export async function GET() {
  const startedAt = Date.now();
  const databaseUrl = getDatabaseUrlSummary();

  try {
    const connectionResult = await query<{
      current_database: string;
      current_user: string;
      server_address: string | null;
      server_port: number | null;
    }>(
      `
        select
          current_database(),
          current_user,
          inet_server_addr()::text as server_address,
          inet_server_port() as server_port
      `,
    );

    const countsResult = await query<{ key: string; value: string }>(
      `
        select 'homepage_themes_active' as key, count(*)::text as value
        from public.homepage_themes
        where is_active = true and status = 'active'
        union all
        select 'homepage_theme_sections_enabled', count(*)::text
        from public.homepage_theme_sections
        where is_enabled = true
        union all
        select 'products_active', count(*)::text
        from public.products
        where coalesce(is_active, true) = true
          and coalesce(status, 'active') = 'active'
        union all
        select 'categories', count(*)::text
        from public.categories
        union all
        select 'users', count(*)::text
        from public.users
      `,
    );

    return NextResponse.json({
      ok: true,
      databaseUrl,
      connection: connectionResult.rows[0] ?? null,
      counts: Object.fromEntries(countsResult.rows.map((row) => [row.key, Number(row.value)])),
      durationMs: Date.now() - startedAt,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        databaseUrl,
        error: error instanceof Error ? error.message : "Unknown database error.",
        durationMs: Date.now() - startedAt,
      },
      { status: 503 },
    );
  }
}
