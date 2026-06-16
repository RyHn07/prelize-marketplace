import { NextResponse } from "next/server";

import { query } from "@/lib/db";
import { requireAdminRequest } from "@/lib/auth/request";

export async function GET(request: Request) {
  const auth = await requireAdminRequest(request);

  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  try {
    const result = await query("select * from public.homepage_content_blocks order by content_key asc");
    return NextResponse.json({ blocks: result.rows });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load homepage content blocks." },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  const auth = await requireAdminRequest(request);

  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  const body = await request.json();
  const rawBlocks = Array.isArray(body?.blocks) ? body.blocks : [];
  const savedBlocks = [];

  for (const rawBlock of rawBlocks) {
    const contentKey = typeof rawBlock?.content_key === "string" ? rawBlock.content_key.trim() : "";

    if (!contentKey) {
      return NextResponse.json({ error: "Content key is required." }, { status: 400 });
    }

    const result = await query(
      `
        insert into public.homepage_content_blocks (
          content_key, title, subtitle, description, image_url, button_text,
          button_link, data_json, is_active, updated_at
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, now())
        on conflict (content_key) do update set
          title = excluded.title,
          subtitle = excluded.subtitle,
          description = excluded.description,
          image_url = excluded.image_url,
          button_text = excluded.button_text,
          button_link = excluded.button_link,
          data_json = excluded.data_json,
          is_active = excluded.is_active,
          updated_at = now()
        returning *
      `,
      [
        contentKey,
        rawBlock.title ?? null,
        rawBlock.subtitle ?? null,
        rawBlock.description ?? null,
        rawBlock.image_url ?? null,
        rawBlock.button_text ?? null,
        rawBlock.button_link ?? null,
        JSON.stringify(rawBlock.data_json ?? {}),
        Boolean(rawBlock.is_active),
      ],
    );

    savedBlocks.push(result.rows[0]);
  }

  return NextResponse.json({ blocks: savedBlocks });
}
