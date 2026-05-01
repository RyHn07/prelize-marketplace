import type {
  PlatformSettingsFormValues,
  PlatformSettingsRow,
  PlatformSettingsUpsertPayload,
} from "@/types/platform-settings";

export const PLATFORM_SETTINGS_SINGLETON_KEY = "default";

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettingsFormValues = {
  marketplace_name: "Prelize",
  support_email: "",
  support_phone: "",
  order_support_message: "",
  shipping_support_message: "",
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
    support_email: settings?.support_email?.trim() ?? DEFAULT_PLATFORM_SETTINGS.support_email,
    support_phone: settings?.support_phone?.trim() ?? DEFAULT_PLATFORM_SETTINGS.support_phone,
    order_support_message:
      settings?.order_support_message?.trim() ?? DEFAULT_PLATFORM_SETTINGS.order_support_message,
    shipping_support_message:
      settings?.shipping_support_message?.trim() ??
      DEFAULT_PLATFORM_SETTINGS.shipping_support_message,
  };
}

export function toPlatformSettingsUpsertPayload(
  values: PlatformSettingsFormValues,
): PlatformSettingsUpsertPayload {
  const marketplaceName = values.marketplace_name.trim();

  return {
    singleton_key: PLATFORM_SETTINGS_SINGLETON_KEY,
    marketplace_name:
      marketplaceName.length > 0
        ? marketplaceName
        : DEFAULT_PLATFORM_SETTINGS.marketplace_name,
    support_email: normalizeOptionalText(values.support_email),
    support_phone: normalizeOptionalText(values.support_phone),
    order_support_message: normalizeOptionalText(values.order_support_message),
    shipping_support_message: normalizeOptionalText(values.shipping_support_message),
    updated_at: new Date().toISOString(),
  };
}
