import { NextResponse } from "next/server";

import { requireAdminRequest } from "@/lib/auth/request";
import { create1688ProductImport } from "@/lib/product-imports/1688";
import type { ProductImportMode } from "@/types/product-import";

export async function POST(request: Request) {
  const auth = await requireAdminRequest(request);

  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  try {
    const body = (await request.json()) as {
      sourceUrl?: string;
      importMode?: ProductImportMode;
      targetProductId?: string | null;
    };
    const importRecord = await create1688ProductImport({
      sourceUrl: body.sourceUrl ?? "",
      importMode: body.importMode === "update" ? "update" : "create",
      targetProductId: body.targetProductId ?? null,
      createdBy: auth.user?.id ?? null,
    });

    return NextResponse.json({ data: importRecord });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Product data could not be fetched. Please try again." },
      { status: 400 },
    );
  }
}
