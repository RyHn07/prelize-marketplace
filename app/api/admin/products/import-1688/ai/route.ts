import { NextResponse } from "next/server";

import { requireAdminRequest } from "@/lib/auth/request";

type AiAction =
  | "title"
  | "short_description"
  | "full_description"
  | "seo_title"
  | "seo_description"
  | "tags"
  | "all";

type AiRequestBody = {
  action?: AiAction;
  values?: Record<string, unknown>;
  source?: Record<string, unknown>;
};

function firstString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function extractOpenAiJsonText(payload: Record<string, unknown> | null) {
  const outputText = firstString(payload?.output_text);

  if (outputText) {
    return outputText;
  }

  const output = Array.isArray(payload?.output) ? payload.output : [];

  for (const outputItem of output) {
    const outputRecord = outputItem && typeof outputItem === "object" ? (outputItem as Record<string, unknown>) : {};
    const content = Array.isArray(outputRecord.content) ? outputRecord.content : [];

    for (const contentItem of content) {
      const contentRecord = contentItem && typeof contentItem === "object" ? (contentItem as Record<string, unknown>) : {};
      const text = firstString(contentRecord.text);

      if (text) {
        return text;
      }
    }
  }

  return "";
}

export async function POST(request: Request) {
  const auth = await requireAdminRequest(request);

  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY is not configured." }, { status: 400 });
  }

  try {
    const body = (await request.json()) as AiRequestBody;
    const action = body.action ?? "all";

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
        input: [
          {
            role: "system",
            content:
              "You prepare marketplace product content in English. Only translate, rewrite, clean, and organize facts present in the provided source. Do not invent claims, materials, certifications, shipping promises, or specs.",
          },
          {
            role: "user",
            content: JSON.stringify({
              action,
              current_values: body.values ?? {},
              source_data: body.source ?? {},
              required_output:
                action === "all"
                  ? "Return all fields."
                  : `Return the requested ${action} field and leave unrelated fields as empty strings or empty arrays.`,
            }),
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "import_review_ai_content",
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                title: { type: "string" },
                slug: { type: "string" },
                short_description: { type: "string" },
                full_description: { type: "string" },
                seo_title: { type: "string" },
                seo_description: { type: "string" },
                tags: { type: "array", items: { type: "string" } },
              },
              required: [
                "title",
                "slug",
                "short_description",
                "full_description",
                "seo_title",
                "seo_description",
                "tags",
              ],
            },
          },
        },
      }),
      cache: "no-store",
    });

    const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
    const outputText = extractOpenAiJsonText(payload);
    const parsed = outputText ? JSON.parse(outputText) : null;

    if (!response.ok || !parsed) {
      const providerMessage = firstString(payload?.error) || firstString((payload?.error as Record<string, unknown> | undefined)?.message);
      return NextResponse.json(
        { error: providerMessage || "AI content generation failed." },
        { status: response.ok ? 400 : response.status },
      );
    }

    return NextResponse.json({ data: parsed });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error && error.message === "fetch failed"
            ? "OpenAI API could not be reached from this server."
            : error instanceof Error
              ? error.message
              : "AI content generation failed.",
      },
      { status: 400 },
    );
  }
}
