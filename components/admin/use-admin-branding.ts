"use client";

import { useEffect, useState } from "react";

import {
  DEFAULT_PLATFORM_SETTINGS,
  PLATFORM_SETTINGS_SINGLETON_KEY,
} from "@/lib/platform-settings";
import { getPgDataClient } from "@/lib/browser-app-client";
import type { PlatformSettingsRow } from "@/types/platform-settings";

export type AdminBrandState = {
  logoUrl: string;
  marketplaceName: string;
  siteShortTitle: string;
  adminLabel: string;
};

type AdminBrandSettingsRecord = Pick<
  PlatformSettingsRow,
  "logo_url" | "site_short_title" | "marketplace_name"
>;

const DEFAULT_ADMIN_BRAND_STATE: AdminBrandState = {
  logoUrl: "",
  marketplaceName: DEFAULT_PLATFORM_SETTINGS.site_title,
  siteShortTitle: DEFAULT_PLATFORM_SETTINGS.site_short_title,
  adminLabel: `${DEFAULT_PLATFORM_SETTINGS.site_short_title.toUpperCase()} ADMIN`,
};

export function useAdminBranding() {
  const [brand, setBrand] = useState<AdminBrandState>(DEFAULT_ADMIN_BRAND_STATE);

  useEffect(() => {
    let isMounted = true;

    const loadBrand = async () => {
      try {
        const dataClient = getPgDataClient();
        const { data, error } = await dataClient
          .from("platform_settings")
          .select("logo_url, site_short_title, marketplace_name")
          .eq("singleton_key", PLATFORM_SETTINGS_SINGLETON_KEY)
          .maybeSingle();

        if (!isMounted || error || !data) {
          return;
        }

        const settings = data as AdminBrandSettingsRecord;
        const marketplaceName =
          settings.marketplace_name?.trim() ||
          DEFAULT_PLATFORM_SETTINGS.site_title;
        const siteShortTitle =
          settings.site_short_title?.trim() ||
          settings.marketplace_name?.trim() ||
          DEFAULT_PLATFORM_SETTINGS.site_short_title;

        setBrand({
          logoUrl: settings.logo_url?.trim() ?? "",
          marketplaceName,
          siteShortTitle,
          adminLabel: `${siteShortTitle.toUpperCase()} ADMIN`,
        });
      } catch {
        // Keep the default fallback branding when client settings are unavailable.
      }
    };

    void loadBrand();

    return () => {
      isMounted = false;
    };
  }, []);

  return brand;
}
