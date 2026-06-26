import { NextResponse } from "next/server";

import { requireAdminRequest } from "@/lib/auth/request";
import { cancel1688ProductImport } from "@/lib/product-imports/1688";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminRequest(request);

  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  try {
    const { id } = await params;
    await cancel1688ProductImport(id);

    return NextResponse.json({ data: { id } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to cancel import." },
      { status: 400 },
    );
  }
}
