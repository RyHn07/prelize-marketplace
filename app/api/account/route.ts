import { NextResponse } from "next/server";

import { getCurrentUserFromCookie } from "@/lib/auth/session";
import { query } from "@/lib/db";

type AccountOrderRow = {
  id: string;
  order_number: string;
  status: string | null;
  payment_method: string | null;
  payment_status: string | null;
  user_email: string | null;
  created_at: string;
  summary: { payNow?: number } | null;
};

export async function GET() {
  const user = await getCurrentUserFromCookie();
  if (!user) {
    return NextResponse.json({ user: null, orders: [] });
  }

  const ordersResult = await query<AccountOrderRow>(
    `
      select id, order_number, status, payment_method, payment_status, user_email, created_at, summary
      from public.orders
      where user_id = $1 or lower(coalesce(user_email, '')) = lower($2)
      order by created_at desc
    `,
    [user.id, user.email],
  );

  return NextResponse.json({
    user,
    orders: ordersResult.rows,
  });
}

export async function PATCH(request: Request) {
  const currentUser = await getCurrentUserFromCookie();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    name?: unknown;
    email?: unknown;
    phone?: unknown;
    address?: unknown;
  } | null;
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const phone = typeof body?.phone === "string" ? body.phone.trim() : "";

  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const duplicate = await query<{ id: string }>(
    "select id from public.users where lower(email) = $1 and id <> $2 limit 1",
    [email, currentUser.id],
  );

  if (duplicate.rows[0]) {
    return NextResponse.json({ error: "Another account already uses this email." }, { status: 409 });
  }

  const result = await query(
    `
      update public.users
      set name = $1, email = $2, phone = $3, updated_at = now()
      where id = $4
      returning id, email, nullif(name, '') as name, coalesce(nullif(role, ''), 'customer') as role,
                nullif(avatar_url, '') as "avatarUrl"
    `,
    [name || null, email, phone || null, currentUser.id],
  );

  return NextResponse.json({ user: result.rows[0] });
}
