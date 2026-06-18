import { NextResponse } from "next/server";

import { getAuthenticatedUserFromRequest, getDatabaseServiceClient } from "@/lib/auth/request";
import { getCurrentUserFromCookie, type AuthUser } from "@/lib/auth/session";
import { query } from "@/lib/db";
import { getAdminProductCategoryOptions, getAdminProductVendorOptions } from "@/lib/admin/vps-data";
import type { ProductBrandOption } from "@/types/product-db";

async function getActiveVendorMembership(userId: string) {
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

    const [brandResult, categoryResult, vendorResult] = await Promise.all([
      query<ProductBrandOption>("select id, name, slug, image_url from public.brands order by name asc"),
      getAdminProductCategoryOptions(),
      getAdminProductVendorOptions(),
    ]);

    return NextResponse.json({
      vendorId: membershipResult.data.vendor_id,
      brands: brandResult.rows,
      categories: categoryResult.rows,
      vendors: vendorResult.rows,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load product options." },
      { status: 500 },
    );
  }
}
