import "server-only";

import { LEGACY_ADMIN_EMAILS, PLATFORM_ADMIN_ROLE } from "@/lib/admin-access";
import { AUTH_COOKIE_NAME, getCurrentUserFromCookie, verifySessionToken, type AuthUser } from "@/lib/auth/session";
import { query } from "@/lib/db";
export { getDatabaseServiceClient } from "@/lib/postgres-data-client";

export type AuthenticatedRequestUser = AuthUser;

function readCookieFromRequest(request: Request, name: string) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const cookies = cookieHeader.split(";").map((item) => item.trim());
  const match = cookies.find((item) => item.startsWith(`${name}=`));

  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

async function getUserById(userId: string) {
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
        and platform_roles.role = $2
      where users.id = $1
      limit 1
    `,
    [userId, PLATFORM_ADMIN_ROLE],
  );

  return result.rows[0] ?? null;
}

export async function getAuthenticatedUserFromRequest(request: Request) {
  const token = readCookieFromRequest(request, AUTH_COOKIE_NAME);
  const payload = verifySessionToken(token);

  if (!payload) {
    return {
      user: null,
      error: "Unauthorized.",
    };
  }

  const user = await getUserById(payload.id);

  if (!user) {
    return {
      user: null,
      error: "Unable to verify the current user.",
    };
  }

  return {
    user,
    error: null,
  };
}

export async function isAdminUser(userId: string, userEmail: string | null) {
  if (userEmail && LEGACY_ADMIN_EMAILS.includes(userEmail)) {
    return true;
  }

  const result = await query<{ role: string }>(
    "select role from public.platform_roles where user_id = $1 and role = $2 limit 1",
    [userId, PLATFORM_ADMIN_ROLE],
  );

  return Boolean(result.rows[0]);
}

export async function requireAdminRequest(_request: Request) {
  const user = await getCurrentUserFromCookie();

  if (!user) {
    return {
      errorResponse: Response.json({ error: "Unauthorized." }, { status: 401 }),
      user: null,
    };
  }

  const hasAdminAccess = await isAdminUser(user.id, user.email);

  if (!hasAdminAccess) {
    return {
      errorResponse: Response.json({ error: "Admin access is required." }, { status: 403 }),
      user: null,
    };
  }

  return {
    errorResponse: null,
    user,
  };
}
