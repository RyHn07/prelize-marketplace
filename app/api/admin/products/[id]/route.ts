import { NextResponse } from "next/server";

import {
  deleteProductRecordWithClient,
  updateProductEditorRecordWithClient,
  type ProductEditorSavePayload,
} from "@/lib/products/actions";
import { getProductEditorRecord } from "@/lib/products/queries";
import { getSupabaseServiceRoleClient, requireAdminRequest } from "@/lib/supabase-admin";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminRequest(request);

  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  try {
    const { id } = await params;
    const supabase = getSupabaseServiceRoleClient();
    const result = await getProductEditorRecord(id, supabase);

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
    const supabase = getSupabaseServiceRoleClient();
    const result = await updateProductEditorRecordWithClient(supabase, id, body);

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
    const supabase = getSupabaseServiceRoleClient();
    const result = await deleteProductRecordWithClient(supabase, id);

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
