import { NextResponse } from "next/server";

import {
  deleteProductRecordWithClient,
  updateProductEditorRecordWithClient,
  type ProductEditorSavePayload,
} from "@/lib/products/actions";
import { getAdminProductEditorRecord } from "@/lib/admin/vps-data";
import { getProductEditorRecord } from "@/lib/products/queries";
import { getDatabaseServiceClient, requireAdminRequest } from "@/lib/auth/request";
import { hasPgDataClientEnv } from "@/lib/browser-app-client";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminRequest(request);

  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  try {
    const { id } = await params;
    const result = hasPgDataClientEnv()
      ? await getProductEditorRecord(id, getDatabaseServiceClient())
      : await getAdminProductEditorRecord(id);

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 400 });
    }

    return NextResponse.json({ data: result.data });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to load the product.",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminRequest(request);

  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  try {
    const { id } = await params;
    const body = (await request.json()) as ProductEditorSavePayload;
    const dataClient = getDatabaseServiceClient();
    const result = await updateProductEditorRecordWithClient(dataClient, id, body);

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 400 });
    }

    return NextResponse.json({ data: result.data });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to update the product.",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminRequest(request);

  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  try {
    const { id } = await params;
    const dataClient = getDatabaseServiceClient();
    const result = await deleteProductRecordWithClient(dataClient, id);

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 400 });
    }

    return NextResponse.json({ data: result.data });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to delete the product.",
      },
      { status: 500 },
    );
  }
}
