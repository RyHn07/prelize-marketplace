import { NextResponse } from "next/server";

import { query } from "@/lib/db";
import { requireAdminRequest } from "@/lib/auth/request";

function parseCustomerKey(rawKey: string) {
  const decoded = decodeURIComponent(rawKey);

  if (decoded.startsWith("user:")) {
    return { type: "user" as const, value: decoded.slice(5) };
  }

  if (decoded.startsWith("email:")) {
    return { type: "email" as const, value: decoded.slice(6) };
  }

  return null;
}

export async function GET(request: Request, { params }: { params: Promise<{ customerKey: string }> }) {
  const auth = await requireAdminRequest(request);

  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  try {
    const { customerKey } = await params;
    const parsedKey = parseCustomerKey(customerKey);

    if (!parsedKey?.value) {
      return NextResponse.json({ error: "Invalid customer identifier." }, { status: 400 });
    }

    const result =
      parsedKey.type === "user"
        ? await query(
            `
              select *
              from public.orders
              where user_id = $1
              order by created_at desc
            `,
            [parsedKey.value],
          )
        : await query(
            `
              select *
              from public.orders
              where lower(user_email) = lower($1)
              order by created_at desc
            `,
            [parsedKey.value],
          );

    return NextResponse.json({ userEmail: auth.user?.email ?? null, orders: result.rows });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load customer orders." },
      { status: 500 },
    );
  }
}
