import { NextResponse } from "next/server";

import { query } from "@/lib/db";
import type { VendorRow } from "@/types/product-db";

export async function GET() {
  const result = await query<VendorRow>(
    `
      select id, name, slug, logo_url, banner_url, description, contact_email,
             contact_phone, address, status, created_at, updated_at
      from public.vendors
      order by name asc
    `,
  );

  return NextResponse.json({ data: result.rows });
}
