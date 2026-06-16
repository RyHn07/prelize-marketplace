import { NextResponse } from "next/server";

import { PLATFORM_SETTINGS_SINGLETON_KEY } from "@/lib/platform-settings";
import { query } from "@/lib/db";
import { requireAdminRequest } from "@/lib/auth/request";
import type { PlatformSettingsUpsertPayload } from "@/types/platform-settings";

export async function GET(request: Request) {
  const auth = await requireAdminRequest(request);

  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  try {
    const result = await query(
      "select * from public.platform_settings where singleton_key = $1 limit 1",
      [PLATFORM_SETTINGS_SINGLETON_KEY],
    );

    return NextResponse.json({ userEmail: auth.user?.email ?? null, settings: result.rows[0] ?? null });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load settings." },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  const auth = await requireAdminRequest(request);

  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  try {
    const body = (await request.json()) as PlatformSettingsUpsertPayload;
    const result = await query(
      `
        insert into public.platform_settings (
          singleton_key, marketplace_name, site_title, site_short_title, site_description,
          site_url, logo_url, favicon_url, share_image_url, support_email, support_phone,
          order_support_message, shipping_support_message, base_currency, display_currency,
          cny_to_bdt_rate, updated_at
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, now())
        on conflict (singleton_key) do update set
          marketplace_name = excluded.marketplace_name,
          site_title = excluded.site_title,
          site_short_title = excluded.site_short_title,
          site_description = excluded.site_description,
          site_url = excluded.site_url,
          logo_url = excluded.logo_url,
          favicon_url = excluded.favicon_url,
          share_image_url = excluded.share_image_url,
          support_email = excluded.support_email,
          support_phone = excluded.support_phone,
          order_support_message = excluded.order_support_message,
          shipping_support_message = excluded.shipping_support_message,
          base_currency = excluded.base_currency,
          display_currency = excluded.display_currency,
          cny_to_bdt_rate = excluded.cny_to_bdt_rate,
          updated_at = now()
        returning *
      `,
      [
        PLATFORM_SETTINGS_SINGLETON_KEY,
        body.marketplace_name,
        body.site_title,
        body.site_short_title,
        body.site_description,
        body.site_url,
        body.logo_url,
        body.favicon_url,
        body.share_image_url,
        body.support_email,
        body.support_phone,
        body.order_support_message,
        body.shipping_support_message,
        body.base_currency,
        body.display_currency,
        body.cny_to_bdt_rate,
      ],
    );

    return NextResponse.json({ settings: result.rows[0] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to save settings." },
      { status: 500 },
    );
  }
}
