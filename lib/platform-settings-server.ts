import { createClient } from "@supabase/supabase-js";
import { cache } from "react";

import { query } from "@/lib/db";
import {
  PLATFORM_SETTINGS_SINGLETON_KEY,
  toPlatformSettingsFormValues,
} from "@/lib/platform-settings";
import type { PlatformSettingsRow } from "@/types/platform-settings";

const getServerSupabasePublicClient = cache(() => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
});

export async function getPlatformSettingsRecord(): Promise<PlatformSettingsRow | null> {
  if (process.env.DATABASE_URL && (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)) {
    const result = await query<PlatformSettingsRow>(
      "select * from public.platform_settings where singleton_key = $1 limit 1",
      [PLATFORM_SETTINGS_SINGLETON_KEY],
    );

    return result.rows[0] ?? null;
  }

  const supabase = getServerSupabasePublicClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("platform_settings")
    .select("*")
    .eq("singleton_key", PLATFORM_SETTINGS_SINGLETON_KEY)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as PlatformSettingsRow;
}

export async function getResolvedPlatformSettings() {
  return toPlatformSettingsFormValues(await getPlatformSettingsRecord());
}
