import { NextResponse } from "next/server";

import { getAdminMediaItems } from "@/lib/admin/vps-data";
import { getCurrentUserFromCookie } from "@/lib/auth/session";
import { query } from "@/lib/db";

async function getActiveVendorId(userId: string) {
  const result = await query<{ vendor_id: string }>(
    `
      select vendor_id
      from public.vendor_members
      where user_id = $1 and status = 'active'
      order by created_at desc
      limit 1
    `,
    [userId],
  );

  return result.rows[0]?.vendor_id ?? null;
}

export async function GET() {
  const user = await getCurrentUserFromCookie();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const vendorId = await getActiveVendorId(user.id);

    if (!vendorId) {
      return NextResponse.json({ error: "No vendor account found." }, { status: 403 });
    }

    const allItems = await getAdminMediaItems();
    const vendorProducts = await query<{ image_url: string | null; gallery_images: string[] | null }>(
      `
        select image_url, gallery_images
        from public.products
        where vendor_id = $1
      `,
      [vendorId],
    );
    const vendorUrls = new Set<string>();

    vendorProducts.rows.forEach((product) => {
      if (product.image_url) {
        vendorUrls.add(product.image_url);
      }

      if (Array.isArray(product.gallery_images)) {
        product.gallery_images.forEach((url) => {
          if (typeof url === "string" && url.trim()) {
            vendorUrls.add(url);
          }
        });
      }
    });

    const vendorScopedItems = allItems.filter(
      (item) => item.publicUrl.includes(`vendor-${vendorId}-`) || vendorUrls.has(item.publicUrl),
    );
    const items = vendorScopedItems.length > 0 ? vendorScopedItems : allItems;

    return NextResponse.json({ userEmail: user.email, vendorId, items });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load vendor media." },
      { status: 500 },
    );
  }
}
