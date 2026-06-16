import { NextResponse } from "next/server";

import { getCurrentUserFromCookie, type AuthUser } from "@/lib/auth/session";
import { getAdminProductCategoryOptions, getAdminProductVendorOptions, getAdminProducts } from "@/lib/admin/vps-data";
import { query } from "@/lib/db";
import { createProductEditorRecordWithClient, type ProductEditorSavePayload } from "@/lib/products/actions";
import { getAuthenticatedUserFromRequest, getSupabaseServiceRoleClient } from "@/lib/supabase-admin";

async function getActiveVendorMembership(userId: string) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
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

async function getRequestUser(request: Request): Promise<{ id: string; email?: string | null } | AuthUser | null> {
  const authResult = await getAuthenticatedUserFromRequest(request);

  if (!authResult.error && authResult.user) {
    return authResult.user;
  }

  return getCurrentUserFromCookie();
}

export async function GET(request: Request) {
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

    const [productsResult, vendorResult, categoryResult] = await Promise.all([
      getAdminProducts(),
      getAdminProductVendorOptions(),
      getAdminProductCategoryOptions(),
    ]);

    return NextResponse.json({
      userEmail: user.email ?? null,
      vendorId: membershipResult.data.vendor_id,
      products: productsResult.rows.filter((product) => product.vendor_id === membershipResult.data?.vendor_id),
      vendorOptions: vendorResult.rows,
      categoryOptions: categoryResult.rows,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load vendor products." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
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

    const body = (await request.json()) as ProductEditorSavePayload;
    const supabase = getSupabaseServiceRoleClient();
    const result = await createProductEditorRecordWithClient(supabase, {
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
        error: error instanceof Error ? error.message : "Unable to create the vendor product.",
      },
      { status: 500 },
    );
  }
}
