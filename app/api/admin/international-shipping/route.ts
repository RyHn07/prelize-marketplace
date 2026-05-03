import { NextResponse } from "next/server";

import {
  createInternationalShippingMethod,
  parseInternationalShippingMethodInput,
  validateInternationalShippingMethodInput,
} from "@/lib/international-shipping/admin";
import { getAdminInternationalShippingMethods } from "@/lib/international-shipping/queries";
import { getSupabaseServiceRoleClient, requireAdminRequest } from "@/lib/supabase-admin";

export async function GET(request: Request) {
  const auth = await requireAdminRequest(request);

  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  try {
    const supabase = getSupabaseServiceRoleClient();
    const result = await getAdminInternationalShippingMethods(supabase);

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    return NextResponse.json({ methods: result.data });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load international shipping methods.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireAdminRequest(request);

  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  try {
    const payload = parseInternationalShippingMethodInput(await request.json());
    const validationError = validateInternationalShippingMethodInput(payload);

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const supabase = getSupabaseServiceRoleClient();
    const result = await createInternationalShippingMethod(supabase, payload);

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    return NextResponse.json({ method: result.data }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to create international shipping method.",
      },
      { status: 500 },
    );
  }
}
