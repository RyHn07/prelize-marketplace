import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import {
  AUTH_COOKIE_NAME,
  createSessionToken,
  getSessionCookieOptions,
  type AuthUser,
} from "@/lib/auth/session";
import { query } from "@/lib/db";

type LoginUserRow = AuthUser & {
  passwordHash: string | null;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { email?: unknown; password?: unknown } | null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const result = await query<LoginUserRow>(
    `
      select
        id,
        email,
        nullif(name, '') as name,
        coalesce(nullif(role, ''), 'customer') as role,
        nullif(avatar_url, '') as "avatarUrl",
        password_hash as "passwordHash"
      from public.users
      where lower(email) = $1
      limit 1
    `,
    [email],
  ).catch((error) => {
    console.error("[auth/login] Database query failed", error);
    return null;
  });

  if (!result) {
    return NextResponse.json(
      { error: "Login is temporarily unavailable. Please try again." },
      { status: 503 },
    );
  }

  const user = result.rows[0];
  const isPasswordValid = user?.passwordHash ? await bcrypt.compare(password, user.passwordHash) : false;

  if (!user || !isPasswordValid) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const { passwordHash: _passwordHash, ...safeUser } = user;
  const response = NextResponse.json({ user: safeUser });
  response.cookies.set(AUTH_COOKIE_NAME, createSessionToken(safeUser), getSessionCookieOptions());

  return response;
}
