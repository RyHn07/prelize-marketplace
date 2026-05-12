export type PlatformSettingsRow = {
  id: string;
  singleton_key: string;
  marketplace_name: string;
  site_title: string | null;
  site_short_title: string | null;
  site_description: string | null;
  site_url: string | null;
  logo_url: string | null;
  favicon_url: string | null;
  share_image_url: string | null;
  support_email: string | null;
  support_phone: string | null;
  order_support_message: string | null;
  shipping_support_message: string | null;
  created_at: string;
  updated_at: string;
};

export type PlatformSettingsFormValues = {
  marketplace_name: string;
  site_title: string;
  site_short_title: string;
  site_description: string;
  site_url: string;
  logo_url: string;
  favicon_url: string;
  share_image_url: string;
  support_email: string;
  support_phone: string;
  order_support_message: string;
  shipping_support_message: string;
};

export type PlatformSettingsUpsertPayload = {
  singleton_key: string;
  marketplace_name: string;
  site_title: string | null;
  site_short_title: string | null;
  site_description: string | null;
  site_url: string | null;
  logo_url: string | null;
  favicon_url: string | null;
  share_image_url: string | null;
  support_email: string | null;
  support_phone: string | null;
  order_support_message: string | null;
  shipping_support_message: string | null;
  updated_at: string;
};
