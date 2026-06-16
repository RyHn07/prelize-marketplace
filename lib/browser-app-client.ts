"use client";

type BrowserUser = {
  id?: string;
  email?: string | null;
  role?: string | null;
  [key: string]: unknown;
};

type BrowserSession = {
  access_token: string;
  user: BrowserUser;
};

type BrowserAppClient = {
  auth: {
    getSession: () => Promise<{ data: { session: BrowserSession | null }; error: null }>;
    getUser: () => Promise<{ data: { user: BrowserUser | null }; error: null }>;
    signOut: () => Promise<{ error: null }>;
    signInWithOAuth: (...args: unknown[]) => Promise<{ error: { message: string } }>;
    updateUser: (...args: unknown[]) => Promise<{ error: { message: string } }>;
    resetPasswordForEmail: (...args: unknown[]) => Promise<{ error: { message: string } }>;
    onAuthStateChange: (
      callback?: (event: string, session: BrowserSession | null) => void,
    ) => { data: { subscription: { unsubscribe: () => void } } };
  };
  from: (_tableName?: string) => ReturnType<typeof unsupportedDataClient>;
  rpc: () => Promise<{ data: never[]; error: null }>;
  storage: {
    from: (_bucketName?: string) => {
      upload: (...args: unknown[]) => Promise<{ data: null; error: { message: string } }>;
      list: (...args: unknown[]) => Promise<{ data: any[]; error: null }>;
      remove: (...args: unknown[]) => Promise<{ data: null; error: null }>;
      createSignedUrl: (...args: unknown[]) => Promise<{ data: { signedUrl: string }; error: null }>;
      getPublicUrl: (path: string) => { data: { publicUrl: string } };
    };
  };
};

async function fetchCurrentUser() {
  const response = await fetch("/api/auth/me", { cache: "no-store" });
  const payload = (await response.json().catch(() => null)) as { user?: BrowserUser | null } | null;

  return response.ok ? payload?.user ?? null : null;
}

function unsupportedDataClient(): any {
  return {
    select: (..._args: unknown[]) => unsupportedDataClient(),
    eq: (..._args: unknown[]) => unsupportedDataClient(),
    neq: (..._args: unknown[]) => unsupportedDataClient(),
    in: (..._args: unknown[]) => unsupportedDataClient(),
    not: (..._args: unknown[]) => unsupportedDataClient(),
    or: (..._args: unknown[]) => unsupportedDataClient(),
    order: (..._args: unknown[]) => unsupportedDataClient(),
    limit: (..._args: unknown[]) => unsupportedDataClient(),
    maybeSingle: async () => ({ data: null, error: { message: "Use an API route for database access." } }),
    single: async () => ({ data: null, error: { message: "Use an API route for database access." } }),
    insert: (..._args: unknown[]) => unsupportedDataClient(),
    update: (..._args: unknown[]) => unsupportedDataClient(),
    delete: (..._args: unknown[]) => unsupportedDataClient(),
    then: (resolve: (value: { data: null; error: { message: string } }) => unknown) =>
      Promise.resolve({ data: null, error: { message: "Use an API route for database access." } }).then(resolve),
  };
}

export function hasBrowserAppClient() {
  return true;
}

export const hasPgDataClientEnv = hasBrowserAppClient;

export function getBrowserAppClient(): BrowserAppClient {
  return {
    auth: {
      async getSession() {
        const user = await fetchCurrentUser();
        return {
          data: {
            session: user ? { access_token: "", user } : null,
          },
          error: null,
        };
      },
      async getUser() {
        const user = await fetchCurrentUser();
        return {
          data: { user },
          error: null,
        };
      },
      async signOut() {
        await fetch("/api/auth/logout", { method: "POST" });
        return { error: null };
      },
      async signInWithOAuth() {
        return { error: { message: "Google sign-in is not available in this deployment yet." } };
      },
      async updateUser() {
        return { error: { message: "Password reset is not available in this deployment yet." } };
      },
      async resetPasswordForEmail() {
        return { error: { message: "Password reset is not available in this deployment yet." } };
      },
      onAuthStateChange() {
        return {
          data: {
            subscription: {
              unsubscribe() {},
            },
          },
        };
      },
    },
    from: () => unsupportedDataClient(),
    rpc: async () => ({ data: [], error: null }),
    storage: {
      from() {
        return {
          upload: async () => ({ data: null, error: { message: "Use the media API route for uploads." } }),
          list: async () => ({ data: [], error: null }),
          remove: async () => ({ data: null, error: null }),
          createSignedUrl: async (path: unknown) => ({
            data: { signedUrl: typeof path === "string" ? path : "" },
            error: null,
          }),
          getPublicUrl: (path: string) => ({ data: { publicUrl: path } }),
        };
      },
    },
  };
}

export function getPgDataClient(): BrowserAppClient {
  return getBrowserAppClient();
}
