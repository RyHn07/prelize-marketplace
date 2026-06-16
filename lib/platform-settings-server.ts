import { query } from "@/lib/db";
import {
  PLATFORM_SETTINGS_SINGLETON_KEY,
  toPlatformSettingsFormValues,
} from "@/lib/platform-settings";
import type { PlatformSettingsRow } from "@/types/platform-settings";

export async function getPlatformSettingsRecord(): Promise<PlatformSettingsRow | null> {
  const result = await query<PlatformSettingsRow>(
    "select * from public.platform_settings where singleton_key = $1 limit 1",
    [PLATFORM_SETTINGS_SINGLETON_KEY],
  );

  return result.rows[0] ?? null;
}

export async function getResolvedPlatformSettings() {
  return toPlatformSettingsFormValues(await getPlatformSettingsRecord());
}
