import { NextResponse } from "next/server";

import { updateProductEditorRecordWithClient, type ProductEditorSavePayload } from "@/lib/products/actions";
import { getAuthenticatedUserFromRequest, getSupabaseServiceRoleClient } from "@/lib/supabase-admin";

async function getActiveVendorMembership(userId: string) {
  const supabase = getSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("vendor_members")
    .select("vendor_id, status")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return {
      data: null as { vendor_id: string; status: string } | null,
      error,
    };
  }

  return {
    data: (data as { vendor_id: string; status: string } | null) ?? null,
    error: null,
  };
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await getAuthenticatedUserFromRequest(request);

  if (authResult.error || !authResult.user) {
    return NextResponse.json({ error: authResult.error ?? "Unauthorized." }, { status: 401 });
  }

  try {
    const membershipResult = await getActiveVendorMembership(authResult.user.id);

    if (membershipResult.error) {
      return NextResponse.json({ error: membershipResult.error.message }, { status: 500 });
    }

    if (!membershipResult.data?.vendor_id) {
      return NextResponse.json({ error: "No vendor account found." }, { status: 403 });
    }

    const { id } = await params;
    const supabase = getSupabaseServiceRoleClient();
    const { data: existingProduct, error: existingProductError } = await supabase
      .from("products")
      .select("id, vendor_id")
      .eq("id", id)
      .maybeSingle();

    if (existingProductError) {
      return NextResponse.json({ error: existingProductError.message }, { status: 500 });
    }

    if (!existingProduct || (existingProduct as { vendor_id: string | null }).vendor_id !== membershipResult.data.vendor_id) {
      return NextResponse.json(
        { error: "This product either does not exist or does not belong to your vendor account." },
        { status: 403 },
      );
    }

    const body = (await request.json()) as ProductEditorSavePayload;
    const result = await updateProductEditorRecordWithClient(supabase, id, {
      ...body,
      product: {
        ...body.product,
        vendor_id: membershipResult.data.vendor_id,
      },
    });

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 400 });
    }

    return NextResponse.json({ data: result.data });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to update the vendor product.",
      },
      { status: 500 },
    );
  }
}
