import { NextResponse } from "next/server";

import { getAuthenticatedUserFromRequest, getSupabaseServiceRoleClient } from "@/lib/supabase-admin";

type RegisterBody = {
  vendor_name?: string;
  slug?: string;
  contact_email?: string;
  contact_phone?: string;
  logo_url?: string;
  banner_url?: string;
  address?: string;
  description?: string;
};

function normalizeVendorSlug(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return normalized || "vendor";
}

function normalizeOptionalText(value: string | undefined) {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

async function resolveUniqueVendorSlug(
  supabase: ReturnType<typeof getSupabaseServiceRoleClient>,
  rawSlug: string,
) {
  const baseSlug = normalizeVendorSlug(rawSlug);
  const slugPattern = `${baseSlug}-%`;
  const { data, error } = await supabase
    .from("vendors")
    .select("slug")
    .or(`slug.eq.${baseSlug},slug.like.${slugPattern}`);

  if (error) {
    return {
      slug: baseSlug,
      error,
    };
  }

  const existingSlugs = new Set(
    ((data ?? []) as Array<{ slug: string | null }>)
      .map((row) => row.slug ?? "")
      .filter(Boolean),
  );

  if (!existingSlugs.has(baseSlug)) {
    return {
      slug: baseSlug,
      error: null,
    };
  }

  let suffix = 2;

  while (existingSlugs.has(`${baseSlug}-${suffix}`)) {
    suffix += 1;
  }

  return {
    slug: `${baseSlug}-${suffix}`,
    error: null,
  };
}

export async function POST(request: Request) {
  const authResult = await getAuthenticatedUserFromRequest(request);

  if (authResult.error || !authResult.user) {
    return NextResponse.json({ error: authResult.error ?? "Unauthorized." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as RegisterBody;
    const vendorName = body.vendor_name?.trim() ?? "";

    if (!vendorName) {
      return NextResponse.json({ error: "Vendor name is required." }, { status: 400 });
    }

    const supabase = getSupabaseServiceRoleClient();
    const [{ data: invitation }, { data: existingMembership }] = await Promise.all([
      supabase
        .from("vendor_invitations")
        .select("id, status")
        .eq("user_id", authResult.user.id)
        .maybeSingle(),
      supabase
        .from("vendor_members")
        .select("id")
        .eq("user_id", authResult.user.id)
        .limit(1)
        .maybeSingle(),
    ]);

    if (!invitation || invitation.status !== "pending") {
      return NextResponse.json({ error: "You do not have a pending vendor invitation." }, { status: 403 });
    }

    if (existingMembership) {
      return NextResponse.json({ error: "This user already has a vendor membership." }, { status: 400 });
    }

    const slugResult = await resolveUniqueVendorSlug(supabase, body.slug?.trim() || vendorName);

    if (slugResult.error) {
      return NextResponse.json({ error: slugResult.error.message }, { status: 500 });
    }

    const { data: createdVendor, error: vendorError } = await supabase
      .from("vendors")
      .insert({
        name: vendorName,
        slug: slugResult.slug,
        contact_email: normalizeOptionalText(body.contact_email) ?? authResult.user.email ?? null,
        contact_phone: normalizeOptionalText(body.contact_phone),
        logo_url: normalizeOptionalText(body.logo_url),
        banner_url: normalizeOptionalText(body.banner_url),
        address: normalizeOptionalText(body.address),
        description: normalizeOptionalText(body.description),
        status: "pending",
      } as never)
      .select("id")
      .single();

    if (vendorError || !createdVendor) {
      return NextResponse.json({ error: vendorError?.message ?? "Unable to create vendor record." }, { status: 500 });
    }

    const { error: membershipError } = await supabase.from("vendor_members").insert({
      vendor_id: (createdVendor as { id: string }).id,
      user_id: authResult.user.id,
      role: "owner",
      status: "active",
    } as never);

    if (membershipError) {
      await supabase.from("vendors").delete().eq("id", (createdVendor as { id: string }).id);
      return NextResponse.json({ error: membershipError.message }, { status: 500 });
    }

    const { error: invitationError } = await supabase
      .from("vendor_invitations")
      .update({ status: "accepted" } as never)
      .eq("id", invitation.id);

    if (invitationError) {
      return NextResponse.json({ error: invitationError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      vendorId: (createdVendor as { id: string }).id,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to register this vendor profile.",
      },
      { status: 500 },
    );
  }
}
