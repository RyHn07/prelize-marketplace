import { NextResponse } from "next/server";

import { getActiveInternationalShippingMethods } from "@/lib/international-shipping/queries";
import { getDatabaseServiceClient } from "@/lib/auth/request";

export async function GET() {
  try {
    const dataClient = getDatabaseServiceClient();
    const result = await getActiveInternationalShippingMethods(dataClient);

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
