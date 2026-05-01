export type PlatformSettingsRow = {
  id: string;
  singleton_key: string;
  marketplace_name: string;
  support_email: string | null;
  support_phone: string | null;
  order_support_message: string | null;
  shipping_support_message: string | null;
  created_at: string;
  updated_at: string;
};

export type PlatformSettingsFormValues = {
  marketplace_name: string;
  support_email: string;
  support_phone: string;
  order_support_message: string;
  shipping_support_message: string;
};

export type PlatformSettingsUpsertPayload = {
  singleton_key: string;
  marketplace_name: string;
  support_email: string | null;
  support_phone: string | null;
  order_support_message: string | null;
  shipping_support_message: string | null;
  updated_at: string;
};
