import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import { query } from "@/lib/db";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { email?: unknown; password?: unknown } | null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
  }

  const existing = await query<{ id: string }>(
    "select id from public.users where lower(email) = $1 limit 1",
    [email],
  );

  if (existing.rows[0]) {
    return NextResponse.json({ error: "An account already exists for this email." }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const result = await query<{ id: string; email: string; role: string }>(
    `
      insert into public.users (email, password_hash, role)
      values ($1, $2, 'customer')
      returning id, email, role
    `,
    [email, passwordHash],
  );

  return NextResponse.json({ user: result.rows[0] }, { status: 201 });
}
