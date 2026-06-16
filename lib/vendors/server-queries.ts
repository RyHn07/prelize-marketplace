import "server-only";

import { query } from "@/lib/db";
import type { ProductVendorOption, VendorMemberRow, VendorRow } from "@/types/product-db";

function normalizeVendor(row: VendorRow): VendorRow {
  return {
    ...row,
    slug: typeof row.slug === "string" && row.slug.trim().length > 0 ? row.slug : String(row.id),
    logo_url: typeof row.logo_url === "string" ? row.logo_url : null,
    banner_url: typeof row.banner_url === "string" ? row.banner_url : null,
    description: typeof row.description === "string" ? row.description : null,
    contact_email: typeof row.contact_email === "string" ? row.contact_email : null,
    contact_phone: typeof row.contact_phone === "string" ? row.contact_phone : null,
    address: typeof row.address === "string" ? row.address : null,
    status: row.status === "active" || row.status === "suspended" ? row.status : "pending",
  };
}

const vendorSelect = `
  select id, name, slug, logo_url, banner_url, description, contact_email,
         contact_phone, address, status, created_at, updated_at
  from public.vendors
`;

export async function getServerVendors() {
  const result = await query<VendorRow>(`${vendorSelect} order by name asc`);

  return {
    data: result.rows.map(normalizeVendor),
    error: null,
  };
}

export async function getServerVendorOptions() {
  const result = await getServerVendors();

  return {
    data: result.data.map((vendor) => ({
      id: vendor.id,
      name: vendor.name,
      slug: vendor.slug,
      status: vendor.status,
    })) satisfies ProductVendorOption[],
    error: null,
  };
}

export async function getServerVendorBySlug(slug: string) {
  const result = await query<VendorRow>(`${vendorSelect} where slug = $1 limit 1`, [slug]);

  return {
    data: result.rows[0] ? normalizeVendor(result.rows[0]) : null,
    error: null,
  };
}

export async function getServerVendorsByIds(ids: string[]) {
  const scopedIds = Array.from(new Set(ids.filter(Boolean)));
  if (scopedIds.length === 0) {
    return { data: [] as VendorRow[], error: null };
  }

  const result = await query<VendorRow>(
    `${vendorSelect} where id = any($1::uuid[]) order by name asc`,
    [scopedIds],
  );

  return {
    data: result.rows.map(normalizeVendor),
    error: null,
  };
}

export async function getServerVendorProductCounts() {
  const result = await query<{ vendor_id: string; product_count: string }>(
    `
      select vendor_id, count(*)::text as product_count
      from public.products
      where vendor_id is not null
      group by vendor_id
    `,
  );

  return {
    data: Object.fromEntries(result.rows.map((row) => [row.vendor_id, Number(row.product_count)])),
    error: null,
  };
}

export async function getServerVendorMemberships() {
  const result = await query<VendorMemberRow>(
    `
      select id, vendor_id, user_id, role, status, created_at
      from public.vendor_members
      order by created_at desc
    `,
  );

  return {
    data: result.rows,
    error: null,
  };
}
