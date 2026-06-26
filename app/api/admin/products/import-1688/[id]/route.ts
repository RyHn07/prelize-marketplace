import { NextResponse } from "next/server";

import { requireAdminRequest } from "@/lib/auth/request";
import { get1688ProductImportReview } from "@/lib/product-imports/1688";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminRequest(request);

  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  try {
    const { id } = await params;
    const data = await get1688ProductImportReview(id);

    if (!data) {
      return NextResponse.json({ error: "Import record not found." }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load the import review." },
      { status: 500 },
    );
  }
}
