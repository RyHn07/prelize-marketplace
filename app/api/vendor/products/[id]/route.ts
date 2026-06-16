import { NextResponse } from "next/server";

import { getCurrentUserFromCookie, type AuthUser } from "@/lib/auth/session";
import { query } from "@/lib/db";
import {
  deleteProductRecordWithClient,
  updateProductEditorRecordWithClient,
  type ProductEditorSavePayload,
} from "@/lib/products/actions";
import { getProductEditorRecordForVendors } from "@/lib/products/queries";
import { getAuthenticatedUserFromRequest, getDatabaseServiceClient } from "@/lib/auth/request";

async function getActiveVendorMembership(userId: string) {
  if (!process.env.DATABASE_URL || !process.env.DATABASE_URL) {
    const result = await query<{ vendor_id: string; status: string }>(
      `
        select vendor_id, status
        from public.vendor_members
        where user_id = $1 and status = 'active'
        order by created_at desc
        limit 1
      `,
      [userId],
    );

    return {
      data: result.rows[0] ?? null,
      error: null,
    };
  }

  const dataClient = getDatabaseServiceClient();
  const { data, error } = await dataClient
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

async function getRequestUser(request: Request): Promise<{ id: string; email?: string | null } | AuthUser | null> {
  const authResult = await getAuthenticatedUserFromRequest(request);

  if (!authResult.error && authResult.user) {
    return authResult.user;
  }

  return getCurrentUserFromCookie();
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getRequestUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const membershipResult = await getActiveVendorMembership(user.id);

    if (membershipResult.error) {
      return NextResponse.json({ error: membershipResult.error.message }, { status: 500 });
    }

    if (!membershipResult.data?.vendor_id) {
      return NextResponse.json({ error: "No vendor account found." }, { status: 403 });
    }

    const { id } = await params;
    const dataClient = getDatabaseServiceClient();
    const { data: existingProduct, error: existingProductError } = await dataClient
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
    const result = await updateProductEditorRecordWithClient(dataClient, id, {
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

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getRequestUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const membershipResult = await getActiveVendorMembership(user.id);

    if (membershipResult.error) {
      return NextResponse.json({ error: membershipResult.error.message }, { status: 500 });
    }

    if (!membershipResult.data?.vendor_id) {
      return NextResponse.json({ error: "No vendor account found." }, { status: 403 });
    }

    const { id } = await params;
    const dataClient = getDatabaseServiceClient();
    const result = await getProductEditorRecordForVendors(id, [membershipResult.data.vendor_id], dataClient);

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 400 });
    }

    return NextResponse.json({ data: result.data });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to load the vendor product.",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getRequestUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const membershipResult = await getActiveVendorMembership(user.id);

    if (membershipResult.error) {
      return NextResponse.json({ error: membershipResult.error.message }, { status: 500 });
    }

    if (!membershipResult.data?.vendor_id) {
      return NextResponse.json({ error: "No vendor account found." }, { status: 403 });
    }

    const { id } = await params;
    const dataClient = getDatabaseServiceClient();
    const { data: existingProduct, error: existingProductError } = await dataClient
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

    const result = await deleteProductRecordWithClient(dataClient, id);

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 400 });
    }

    return NextResponse.json({ data: result.data });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to delete the vendor product.",
      },
      { status: 500 },
    );
  }
}
