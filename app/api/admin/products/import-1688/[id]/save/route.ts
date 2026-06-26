import { NextResponse } from "next/server";

import { requireAdminRequest } from "@/lib/auth/request";
import { save1688ProductImport } from "@/lib/product-imports/1688";
import type { ProductImportSavePayload } from "@/types/product-import";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminRequest(request);

  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  try {
    const { id } = await params;
    const body = (await request.json()) as ProductImportSavePayload;
    const result = await save1688ProductImport(id, body);

    return NextResponse.json({ data: result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Database save error." },
      { status: 400 },
    );
  }
}
