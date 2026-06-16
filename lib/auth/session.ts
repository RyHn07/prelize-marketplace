import "server-only";

import crypto from "node:crypto";
import { cookies } from "next/headers";

import { query } from "@/lib/db";

export const AUTH_COOKIE_NAME = "prelize_session";

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  avatarUrl: string | null;
};

type SessionPayload = AuthUser & {
  iat: number;
  exp: number;
};

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function getAuthSecret() {
  return process.env.AUTH_SECRET || process.env.DATABASE_URL || "prelize-local-dev-secret";
}

function encodeBase64Url(value: string | Buffer) {
  return Buffer.from(value).toString("base64url");
}

function sign(value: string) {
  return crypto.createHmac("sha256", getAuthSecret()).update(value).digest("base64url");
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function createSessionToken(user: AuthUser) {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    ...user,
    iat: now,
    exp: now + SESSION_MAX_AGE_SECONDS,
  };
  const body = encodeBase64Url(JSON.stringify(payload));

  return `${body}.${sign(body)}`;
}

export function verifySessionToken(token: string | undefined | null): SessionPayload | null {
  if (!token) {
    return null;
  }

  const [body, signature] = token.split(".");
  if (!body || !signature || !safeEqual(sign(body), signature)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
    if (!payload.id || !payload.email || !payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}

export async function getCurrentUserFromCookie(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const payload = verifySessionToken(cookieStore.get(AUTH_COOKIE_NAME)?.value);
  if (!payload) {
    return null;
  }

  const result = await query<AuthUser>(
    `
      select
        users.id,
        users.email,
        nullif(users.name, '') as name,
        coalesce(platform_roles.role, nullif(users.role, ''), 'customer') as role,
        nullif(users.avatar_url, '') as "avatarUrl"
      from public.users
      left join public.platform_roles
        on platform_roles.user_id = users.id
        and platform_roles.role = 'platform_admin'
      where users.id = $1
      limit 1
    `,
    [payload.id],
  );

  return result.rows[0] ?? null;
}
