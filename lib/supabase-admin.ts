import { createClient } from "@supabase/supabase-js";

import { LEGACY_ADMIN_EMAILS, PLATFORM_ADMIN_ROLE } from "@/lib/admin-access";

function getSupabaseUrl() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is required.");
  }

  return supabaseUrl;
}

function getSupabaseAnonKey() {
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseAnonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is required.");
  }

  return supabaseAnonKey;
}

function getSupabaseServiceRoleKey() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for admin onboarding routes.");
  }

  return serviceRoleKey;
}

export function getSupabaseServiceRoleClient() {
  return createClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function getSupabaseServerUserClient(accessToken: string) {
  return createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}

export async function getAuthenticatedUserFromRequest(request: Request) {
  const authorizationHeader = request.headers.get("authorization");

  if (!authorizationHeader?.startsWith("Bearer ")) {
    return {
      accessToken: null,
      user: null,
      error: "Missing bearer token.",
    };
  }

  const accessToken = authorizationHeader.slice("Bearer ".length).trim();

  if (!accessToken) {
    return {
      accessToken: null,
      user: null,
      error: "Missing bearer token.",
    };
  }

  const supabase = getSupabaseServerUserClient(accessToken);
  const { data, error } = await supabase.auth.getUser(accessToken);

  if (error || !data.user) {
    return {
      accessToken,
      user: null,
      error: error?.message ?? "Unable to verify the current user.",
    };
  }

  return {
    accessToken,
    user: data.user,
    error: null,
  };
}

export async function isAdminAccessToken(accessToken: string, userId: string, userEmail: string | null) {
  if (userEmail && LEGACY_ADMIN_EMAILS.includes(userEmail)) {
    return true;
  }

  const supabase = getSupabaseServerUserClient(accessToken);
  const { data, error } = await supabase
    .from("platform_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", PLATFORM_ADMIN_ROLE)
    .maybeSingle();

  return !error && Boolean(data);
}

export async function requireAdminRequest(request: Request) {
  const authResult = await getAuthenticatedUserFromRequest(request);

  if (authResult.error || !authResult.accessToken || !authResult.user) {
    return {
      errorResponse: Response.json({ error: authResult.error ?? "Unauthorized." }, { status: 401 }),
      user: null,
      accessToken: null,
    };
  }

  const hasAdminAccess = await isAdminAccessToken(
    authResult.accessToken,
    authResult.user.id,
    authResult.user.email ?? null,
  );

  if (!hasAdminAccess) {
    return {
      errorResponse: Response.json({ error: "Admin access is required." }, { status: 403 }),
      user: null,
      accessToken: null,
    };
  }

  return {
    errorResponse: null,
    user: authResult.user,
    accessToken: authResult.accessToken,
  };
}
