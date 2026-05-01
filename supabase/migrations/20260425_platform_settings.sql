create extension if not exists pgcrypto;

create table if not exists platform_settings (
  id uuid primary key default gen_random_uuid(),
  singleton_key text not null default 'default',
  marketplace_name text not null default 'Prelize',
  support_email text,
  support_phone text,
  order_support_message text,
  shipping_support_message text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create unique index if not exists platform_settings_singleton_key_idx
  on platform_settings (singleton_key);

insert into platform_settings (
  singleton_key,
  marketplace_name,
  support_email,
  support_phone,
  order_support_message,
  shipping_support_message
)
values (
  'default',
  'Prelize',
  null,
  null,
  null,
  null
)
on conflict (singleton_key) do nothing;
