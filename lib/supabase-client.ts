import { createClient } from "@supabase/supabase-js";

let supabaseClient: ReturnType<typeof createClient> | null = null;
let disabledSupabaseClient: ReturnType<typeof createClient> | null = null;

export function hasSupabaseClientEnv() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) && Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

function createDisabledQueryResult(method?: string) {
  const result = {
    data: method === "maybeSingle" || method === "single" ? null : [],
    error: null,
    count: 0,
  };
  const chain: Record<string, unknown> = new Proxy(
    {},
    {
      get(_target, property) {
        if (property === "then") {
          return Promise.resolve(result).then.bind(Promise.resolve(result));
        }

        if (property === "catch") {
          return Promise.resolve(result).catch.bind(Promise.resolve(result));
        }

        if (property === "finally") {
          return Promise.resolve(result).finally.bind(Promise.resolve(result));
        }

        return (..._args: unknown[]) => createDisabledQueryResult(String(property));
      },
    },
  );

  return chain;
}

function createDisabledSupabaseClient() {
  return {
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({
        data: {
          subscription: {
            unsubscribe() {},
          },
        },
      }),
      signOut: async () => ({ error: null }),
      signInWithPassword: async () => ({
        data: { user: null, session: null },
        error: { message: "Supabase auth is disabled. Use VPS auth routes." },
      }),
      signInWithOAuth: async () => ({
        data: { provider: null, url: null },
        error: { message: "Supabase auth is disabled. Use VPS auth routes." },
      }),
      signUp: async () => ({
        data: { user: null, session: null },
        error: { message: "Supabase auth is disabled. Use VPS auth routes." },
      }),
      updateUser: async () => ({
        data: { user: null },
        error: { message: "Supabase auth is disabled. Use VPS auth routes." },
      }),
      resetPasswordForEmail: async () => ({
        data: {},
        error: { message: "Supabase auth is disabled. Use VPS auth routes." },
      }),
    },
    from: () => createDisabledQueryResult(),
    rpc: () => createDisabledQueryResult(),
    storage: {
      from: () => ({
        upload: async () => ({ data: null, error: { message: "Supabase storage is disabled." } }),
        download: async () => ({ data: null, error: { message: "Supabase storage is disabled." } }),
        list: async () => ({ data: [], error: null }),
        getPublicUrl: () => ({ data: { publicUrl: "" } }),
      }),
      listBuckets: async () => ({ data: [], error: null }),
    },
  } as unknown as ReturnType<typeof createClient>;
}

export function getDisabledSupabaseClient() {
  disabledSupabaseClient ??= createDisabledSupabaseClient();
  return disabledSupabaseClient;
}

export function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return getDisabledSupabaseClient();
  }

  if (!supabaseClient) {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }

  return supabaseClient;
}
