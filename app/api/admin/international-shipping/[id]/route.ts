import { NextResponse } from "next/server";

import {
  parseInternationalShippingMethodInput,
  updateInternationalShippingMethod,
  validateInternationalShippingMethodInput,
} from "@/lib/international-shipping/admin";
import { getSupabaseServiceRoleClient, requireAdminRequest } from "@/lib/supabase-admin";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdminRequest(request);

  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  try {
    const { id } = await context.params;
    const payload = parseInternationalShippingMethodInput(await request.json());
    const validationError = validateInternationalShippingMethodInput(payload);

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const supabase = getSupabaseServiceRoleClient();
    const result = await updateInternationalShippingMethod(supabase, id, payload);

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    return NextResponse.json({ method: result.data });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to update international shipping method.",
      },
      { status: 500 },
    );
  }
}
