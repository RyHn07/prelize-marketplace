import type {
  PlatformSettingsFormValues,
  PlatformSettingsRow,
  PlatformSettingsUpsertPayload,
} from "@/types/platform-settings";

export const PLATFORM_SETTINGS_SINGLETON_KEY = "default";

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettingsFormValues = {
  marketplace_name: "Prelize",
  site_title: "Prelize | Wholesale Products, Sourcing & Cross-Border Trade",
  site_short_title: "Prelize",
  site_description:
    "Prelize helps buyers discover wholesale products, browse marketplace categories, request sourcing quotes, and connect with vendors for cross-border trade.",
  site_url: "https://prelize.com",
  logo_url: "",
  favicon_url: "",
  share_image_url: "",
  support_email: "",
  support_phone: "",
  order_support_message: "",
  shipping_support_message: "",
  base_currency: "CNY",
  display_currency: "BDT",
  cny_to_bdt_rate: "16",
};

function normalizeOptionalText(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

export function toPlatformSettingsFormValues(
  settings: Partial<PlatformSettingsRow> | null | undefined,
): PlatformSettingsFormValues {
  return {
    marketplace_name:
      settings?.marketplace_name?.trim() || DEFAULT_PLATFORM_SETTINGS.marketplace_name,
    site_title: settings?.site_title?.trim() || DEFAULT_PLATFORM_SETTINGS.site_title,
    site_short_title:
      settings?.site_short_title?.trim() || DEFAULT_PLATFORM_SETTINGS.site_short_title,
    site_description:
      settings?.site_description?.trim() || DEFAULT_PLATFORM_SETTINGS.site_description,
    site_url: settings?.site_url?.trim() ?? DEFAULT_PLATFORM_SETTINGS.site_url,
    logo_url: settings?.logo_url?.trim() ?? DEFAULT_PLATFORM_SETTINGS.logo_url,
    favicon_url: settings?.favicon_url?.trim() ?? DEFAULT_PLATFORM_SETTINGS.favicon_url,
    share_image_url:
      settings?.share_image_url?.trim() ?? DEFAULT_PLATFORM_SETTINGS.share_image_url,
    support_email: settings?.support_email?.trim() ?? DEFAULT_PLATFORM_SETTINGS.support_email,
    support_phone: settings?.support_phone?.trim() ?? DEFAULT_PLATFORM_SETTINGS.support_phone,
    order_support_message:
      settings?.order_support_message?.trim() ?? DEFAULT_PLATFORM_SETTINGS.order_support_message,
    shipping_support_message:
      settings?.shipping_support_message?.trim() ??
      DEFAULT_PLATFORM_SETTINGS.shipping_support_message,
    base_currency: settings?.base_currency?.trim() || DEFAULT_PLATFORM_SETTINGS.base_currency,
    display_currency: settings?.display_currency?.trim() || DEFAULT_PLATFORM_SETTINGS.display_currency,
    cny_to_bdt_rate:
      settings?.cny_to_bdt_rate === null || settings?.cny_to_bdt_rate === undefined
        ? DEFAULT_PLATFORM_SETTINGS.cny_to_bdt_rate
        : String(settings.cny_to_bdt_rate),
  };
}

export function toPlatformSettingsUpsertPayload(
  values: PlatformSettingsFormValues,
): PlatformSettingsUpsertPayload {
  const marketplaceName = values.marketplace_name.trim();
  const siteTitle = values.site_title.trim();
  const siteShortTitle = values.site_short_title.trim();
  const parsedExchangeRate = Number(values.cny_to_bdt_rate);

  return {
    singleton_key: PLATFORM_SETTINGS_SINGLETON_KEY,
    marketplace_name:
      marketplaceName.length > 0
        ? marketplaceName
        : DEFAULT_PLATFORM_SETTINGS.marketplace_name,
    site_title:
      siteTitle.length > 0 ? siteTitle : DEFAULT_PLATFORM_SETTINGS.site_title,
    site_short_title:
      siteShortTitle.length > 0
        ? siteShortTitle
        : (siteTitle.length > 0 ? siteTitle : DEFAULT_PLATFORM_SETTINGS.site_short_title),
    site_description: normalizeOptionalText(values.site_description),
    site_url: normalizeOptionalText(values.site_url),
    logo_url: normalizeOptionalText(values.logo_url),
    favicon_url: normalizeOptionalText(values.favicon_url),
    share_image_url: normalizeOptionalText(values.share_image_url),
    support_email: normalizeOptionalText(values.support_email),
    support_phone: normalizeOptionalText(values.support_phone),
    order_support_message: normalizeOptionalText(values.order_support_message),
    shipping_support_message: normalizeOptionalText(values.shipping_support_message),
    base_currency: "CNY",
    display_currency: "BDT",
    cny_to_bdt_rate: Number.isFinite(parsedExchangeRate) && parsedExchangeRate > 0 ? parsedExchangeRate : 16,
    updated_at: new Date().toISOString(),
  };
}
