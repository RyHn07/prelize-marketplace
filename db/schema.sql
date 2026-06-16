create extension if not exists pgcrypto;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text,
  name text,
  role text not null default 'customer',
  avatar_url text,
  phone text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint users_role_check check (role in ('customer', 'vendor', 'admin'))
);

drop trigger if exists users_touch_updated_at on public.users;
create trigger users_touch_updated_at
before update on public.users
for each row execute function public.touch_updated_at();

create table if not exists public.platform_settings (
  id uuid primary key default gen_random_uuid(),
  singleton_key text not null default 'default',
  marketplace_name text not null default 'Prelize',
  site_title text not null default 'Prelize | Wholesale Products, Sourcing & Cross-Border Trade',
  site_short_title text not null default 'Prelize',
  site_description text,
  site_url text,
  logo_url text,
  favicon_url text,
  share_image_url text,
  support_email text,
  support_phone text,
  order_support_message text,
  shipping_support_message text,
  base_currency text not null default 'CNY',
  display_currency text not null default 'BDT',
  cny_to_bdt_rate numeric(12,4) not null default 16.0000,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint platform_settings_singleton_key_unique unique (singleton_key),
  constraint platform_settings_cny_to_bdt_rate_check check (cny_to_bdt_rate > 0)
);

drop trigger if exists platform_settings_touch_updated_at on public.platform_settings;
create trigger platform_settings_touch_updated_at
before update on public.platform_settings
for each row execute function public.touch_updated_at();

create table if not exists public.platform_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  constraint platform_roles_user_role_unique unique (user_id, role),
  constraint platform_roles_role_check check (role in ('platform_admin'))
);

create table if not exists public.vendors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  logo_url text,
  banner_url text,
  description text,
  contact_email text,
  contact_phone text,
  address text,
  status text not null default 'pending',
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint vendors_slug_unique unique (slug),
  constraint vendors_status_check check (status in ('pending', 'active', 'suspended'))
);

drop trigger if exists vendors_touch_updated_at on public.vendors;
create trigger vendors_touch_updated_at
before update on public.vendors
for each row execute function public.touch_updated_at();

create table if not exists public.vendor_members (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null,
  status text not null default 'active',
  created_at timestamptz not null default timezone('utc'::text, now()),
  constraint vendor_members_vendor_user_role_unique unique (vendor_id, user_id, role),
  constraint vendor_members_role_check check (role in ('owner', 'staff')),
  constraint vendor_members_status_check check (status in ('active', 'invited', 'disabled'))
);

create table if not exists public.vendor_invitations (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid references public.vendors(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  invited_by uuid references public.users(id) on delete set null,
  email text,
  role text not null default 'staff',
  status text not null default 'pending',
  token text,
  expires_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint vendor_invitations_role_check check (role in ('owner', 'staff')),
  constraint vendor_invitations_status_check check (status in ('pending', 'accepted', 'expired', 'cancelled'))
);

drop trigger if exists vendor_invitations_touch_updated_at on public.vendor_invitations;
create trigger vendor_invitations_touch_updated_at
before update on public.vendor_invitations
for each row execute function public.touch_updated_at();

create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  image text,
  item_count integer,
  image_url text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint brands_slug_unique unique (slug)
);

drop trigger if exists brands_touch_updated_at on public.brands;
create trigger brands_touch_updated_at
before update on public.brands
for each row execute function public.touch_updated_at();

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.categories(id) on delete set null,
  name text not null,
  slug text not null,
  image text,
  item_count integer,
  image_url text,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint categories_slug_unique unique (slug)
);

drop trigger if exists categories_touch_updated_at on public.categories;
create trigger categories_touch_updated_at
before update on public.categories
for each row execute function public.touch_updated_at();

create table if not exists public.cnds_shipping_profiles (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid references public.vendors(id) on delete cascade,
  name text not null,
  description text,
  pricing_type text not null default 'fixed',
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint cnds_shipping_profiles_pricing_type_check check (pricing_type in ('unit', 'fixed'))
);

drop trigger if exists cnds_shipping_profiles_touch_updated_at on public.cnds_shipping_profiles;
create trigger cnds_shipping_profiles_touch_updated_at
before update on public.cnds_shipping_profiles
for each row execute function public.touch_updated_at();

create table if not exists public.cnds_shipping_tiers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.cnds_shipping_profiles(id) on delete cascade,
  min_qty integer not null,
  max_qty integer,
  price numeric(12,2) not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc'::text, now()),
  constraint cnds_shipping_tiers_min_qty_check check (min_qty >= 1),
  constraint cnds_shipping_tiers_max_qty_check check (max_qty is null or max_qty >= min_qty),
  constraint cnds_shipping_tiers_price_check check (price >= 0)
);

create table if not exists public.pricing_tier_profiles (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid references public.vendors(id) on delete cascade,
  name text not null,
  pricing_type text not null default 'unit',
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint pricing_tier_profiles_pricing_type_check check (pricing_type in ('unit', 'fixed'))
);

drop trigger if exists pricing_tier_profiles_touch_updated_at on public.pricing_tier_profiles;
create trigger pricing_tier_profiles_touch_updated_at
before update on public.pricing_tier_profiles
for each row execute function public.touch_updated_at();

create table if not exists public.pricing_tier_profile_rows (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.pricing_tier_profiles(id) on delete cascade,
  min_qty integer not null,
  max_qty integer,
  price numeric(12,2) not null default 0,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc'::text, now()),
  constraint pricing_tier_profile_rows_min_qty_check check (min_qty >= 1),
  constraint pricing_tier_profile_rows_max_qty_check check (max_qty is null or max_qty >= min_qty),
  constraint pricing_tier_profile_rows_price_check check (price >= 0)
);

create table if not exists public.international_shipping_methods (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  description text,
  delivery_min_days integer,
  delivery_max_days integer,
  minimum_weight_kg numeric(12,2) not null default 0.1,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint international_shipping_methods_slug_unique unique (slug),
  constraint international_shipping_methods_minimum_weight_check check (minimum_weight_kg >= 0)
);

drop trigger if exists international_shipping_methods_touch_updated_at on public.international_shipping_methods;
create trigger international_shipping_methods_touch_updated_at
before update on public.international_shipping_methods
for each row execute function public.touch_updated_at();

create table if not exists public.international_shipping_tiers (
  id uuid primary key default gen_random_uuid(),
  method_id uuid not null references public.international_shipping_methods(id) on delete cascade,
  min_weight_kg numeric(12,2) not null,
  max_weight_kg numeric(12,2),
  price_per_kg numeric(12,2) not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc'::text, now()),
  constraint international_shipping_tiers_min_weight_check check (min_weight_kg >= 0),
  constraint international_shipping_tiers_max_weight_check check (max_weight_kg is null or max_weight_kg >= min_weight_kg),
  constraint international_shipping_tiers_price_per_kg_check check (price_per_kg >= 0)
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid references public.vendors(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  brand_id uuid references public.brands(id) on delete set null,
  cnds_profile_id uuid references public.cnds_shipping_profiles(id) on delete set null,
  pricing_tier_profile_id uuid references public.pricing_tier_profiles(id) on delete set null,
  name text not null,
  slug text not null,
  sku text,
  short_description text,
  description text,
  specifications jsonb not null default '{}'::jsonb,
  image text,
  gallery jsonb,
  price_from numeric(12,2),
  cdd_tiers jsonb,
  reviews jsonb,
  image_url text,
  gallery_images jsonb default '[]'::jsonb,
  attributes jsonb default '[]'::jsonb,
  price numeric(12,2) default 0,
  price_cents integer not null default 0,
  regular_price numeric(12,2),
  discount_price numeric(12,2),
  buying_price_cny numeric(12,2),
  profit_percent numeric(7,2) not null default 0,
  profit_amount_cny numeric(12,2) not null default 0,
  selling_price_cny numeric(12,2) not null default 0,
  exchange_rate_cny_to_bdt numeric(12,4) not null default 16.0000,
  moq integer default 1,
  stock_quantity integer not null default 0,
  weight text,
  legacy_weight numeric(12,2),
  weight_kg numeric(12,2),
  badge text,
  is_featured boolean not null default false,
  is_active boolean default true,
  status text default 'draft',
  product_type text default 'single',
  cdd_shipping_profile text default 'standard',
  pricing_mode text not null default 'single',
  pricing_source text not null default 'use_product_tier',
  sold_count integer not null default 0,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint products_slug_unique unique (slug),
  constraint products_price_check check (price >= 0),
  constraint products_price_cents_check check (price_cents >= 0),
  constraint products_moq_check check (moq >= 1),
  constraint products_stock_quantity_check check (stock_quantity >= 0),
  constraint products_profit_percent_check check (profit_percent >= 0),
  constraint products_exchange_rate_check check (exchange_rate_cny_to_bdt > 0),
  constraint products_status_check check (status in ('active', 'disabled', 'draft')),
  constraint products_product_type_check check (product_type in ('single', 'variable')),
  constraint products_cdd_shipping_profile_check check (cdd_shipping_profile in ('standard', 'express', 'fragile', 'bulk')),
  constraint products_pricing_mode_check check (pricing_mode in ('single', 'tiered', 'variable')),
  constraint products_pricing_source_check check (pricing_source in ('use_product_tier', 'use_fixed_price'))
);

drop trigger if exists products_touch_updated_at on public.products;
create trigger products_touch_updated_at
before update on public.products
for each row execute function public.touch_updated_at();

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  image_url text not null,
  alt_text text,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc'::text, now()),
  constraint product_images_product_url_unique unique (product_id, image_url)
);

create table if not exists public.product_specs (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  label text not null,
  value text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.product_media_metadata (
  path text primary key,
  alt_text text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

drop trigger if exists product_media_metadata_touch_updated_at on public.product_media_metadata;
create trigger product_media_metadata_touch_updated_at
before update on public.product_media_metadata
for each row execute function public.touch_updated_at();

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  pricing_tier_set_id uuid,
  sku text,
  name text not null,
  variation text,
  value text,
  regular_price numeric(12,2),
  discount_price numeric(12,2),
  price numeric(12,2) not null default 0,
  buying_price_cny numeric(12,2),
  profit_amount_cny numeric(12,2) not null default 0,
  selling_price_cny numeric(12,2) not null default 0,
  moq integer default 1,
  min_order_quantity integer,
  stock integer,
  stock_quantity integer not null default 0,
  weight text,
  legacy_weight numeric(12,2),
  weight_kg numeric(12,2),
  image text,
  image_url text,
  attribute_values jsonb default '{}'::jsonb,
  sort_order integer default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint product_variants_price_check check (price >= 0),
  constraint product_variants_moq_check check (moq >= 1),
  constraint product_variants_stock_quantity_check check (stock_quantity >= 0)
);

drop trigger if exists product_variants_touch_updated_at on public.product_variants;
create trigger product_variants_touch_updated_at
before update on public.product_variants
for each row execute function public.touch_updated_at();

create table if not exists public.product_pricing_tiers (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  pricing_type text not null default 'unit',
  min_qty integer not null,
  max_qty integer,
  price numeric(12,2) not null default 0,
  buying_price_cny numeric(12,2),
  profit_amount_cny numeric(12,2) not null default 0,
  selling_price_cny numeric(12,2) not null default 0,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc'::text, now()),
  constraint product_pricing_tiers_pricing_type_check check (pricing_type in ('unit', 'fixed')),
  constraint product_pricing_tiers_min_qty_check check (min_qty >= 1),
  constraint product_pricing_tiers_max_qty_check check (max_qty is null or max_qty >= min_qty),
  constraint product_pricing_tiers_price_check check (price >= 0)
);

create table if not exists public.product_pricing_tier_sets (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null,
  fallback_price numeric(12,2) not null default 0,
  pricing_type text not null default 'unit',
  buying_price_cny numeric(12,2),
  profit_amount_cny numeric(12,2) not null default 0,
  selling_price_cny numeric(12,2) not null default 0,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc'::text, now()),
  constraint product_pricing_tier_sets_pricing_type_check check (pricing_type in ('unit', 'fixed')),
  constraint product_pricing_tier_sets_fallback_price_check check (fallback_price >= 0)
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'product_variants_pricing_tier_set_id_fkey') then
    alter table public.product_variants
      add constraint product_variants_pricing_tier_set_id_fkey
      foreign key (pricing_tier_set_id) references public.product_pricing_tier_sets(id) on delete set null;
  end if;
end $$;

create table if not exists public.product_pricing_tier_set_rows (
  id uuid primary key default gen_random_uuid(),
  tier_set_id uuid not null references public.product_pricing_tier_sets(id) on delete cascade,
  min_qty integer not null,
  max_qty integer,
  price numeric(12,2) not null default 0,
  buying_price_cny numeric(12,2),
  profit_amount_cny numeric(12,2) not null default 0,
  selling_price_cny numeric(12,2) not null default 0,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc'::text, now()),
  constraint product_pricing_tier_set_rows_min_qty_check check (min_qty >= 1),
  constraint product_pricing_tier_set_rows_max_qty_check check (max_qty is null or max_qty >= min_qty),
  constraint product_pricing_tier_set_rows_price_check check (price >= 0)
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null,
  user_id uuid not null references public.users(id) on delete restrict,
  user_email text,
  status text not null default 'Order Placed',
  payment_method text,
  payment_status text default 'pending',
  payment_proof_path text,
  payment_proof_uploaded_at timestamptz,
  buyer jsonb,
  summary jsonb default '{}'::jsonb,
  shipping_methods jsonb,
  international_shipping_method_id uuid references public.international_shipping_methods(id) on delete set null,
  international_shipping_method_name text,
  international_shipping_total numeric(12,2) not null default 0,
  international_shipping_status text not null default 'pending_review',
  cnds_cost_total numeric(12,2),
  cnds_total numeric(12,2) not null default 0,
  total_cents integer not null default 0,
  admin_note text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint orders_order_number_unique unique (order_number),
  constraint orders_international_shipping_total_check check (international_shipping_total >= 0),
  constraint orders_international_shipping_status_check check (international_shipping_status in ('pending_review', 'calculated')),
  constraint orders_total_cents_check check (total_cents >= 0)
);

drop trigger if exists orders_touch_updated_at on public.orders;
create trigger orders_touch_updated_at
before update on public.orders
for each row execute function public.touch_updated_at();

create table if not exists public.vendor_orders (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  status text not null default 'Order Placed',
  summary jsonb not null default '{}'::jsonb,
  shipping_method jsonb,
  vendor_note text,
  admin_note text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint vendor_orders_order_vendor_unique unique (order_id, vendor_id)
);

drop trigger if exists vendor_orders_touch_updated_at on public.vendor_orders;
create trigger vendor_orders_touch_updated_at
before update on public.vendor_orders
for each row execute function public.touch_updated_at();

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  vendor_order_id uuid references public.vendor_orders(id) on delete set null,
  product_id text,
  product_variant_id uuid references public.product_variants(id) on delete set null,
  variant_id uuid references public.product_variants(id) on delete set null,
  vendor_id uuid references public.vendors(id) on delete set null,
  product_name text not null,
  product_image text,
  variation text,
  variant_name text,
  variant_value text,
  price numeric(12,2) not null default 0,
  unit_price numeric(12,2),
  total_price numeric(12,2),
  quantity integer not null,
  weight numeric(12,2),
  weight_kg numeric(12,2),
  total_weight_kg numeric(12,2),
  cnds_profile_id uuid references public.cnds_shipping_profiles(id) on delete set null,
  cnds_profile_name text,
  cnds_cost numeric(12,2) default 0,
  unit_price_cents integer not null default 0,
  line_total_cents integer not null default 0,
  buying_price_cny numeric(12,2),
  profit_percent numeric(7,2),
  profit_amount_cny numeric(12,2),
  selling_price_cny numeric(12,2),
  exchange_rate_cny_to_bdt numeric(12,4),
  display_currency text not null default 'BDT',
  total_profit_cny numeric(12,2),
  created_at timestamptz not null default timezone('utc'::text, now()),
  constraint order_items_price_check check (price >= 0),
  constraint order_items_quantity_check check (quantity > 0),
  constraint order_items_cnds_cost_check check (cnds_cost >= 0),
  constraint order_items_unit_price_cents_check check (unit_price_cents >= 0),
  constraint order_items_line_total_cents_check check (line_total_cents >= 0)
);

create table if not exists public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  vendor_id uuid references public.vendors(id) on delete set null,
  order_id uuid not null references public.orders(id) on delete cascade,
  order_item_id uuid references public.order_items(id) on delete set null,
  user_id uuid not null references public.users(id) on delete cascade,
  user_email text,
  rating integer not null,
  title text,
  comment text not null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint product_reviews_product_order_user_unique unique (product_id, order_id, user_id),
  constraint product_reviews_rating_check check (rating between 1 and 5)
);

drop trigger if exists product_reviews_touch_updated_at on public.product_reviews;
create trigger product_reviews_touch_updated_at
before update on public.product_reviews
for each row execute function public.touch_updated_at();

create table if not exists public.vendor_review_notification_states (
  user_id uuid not null references public.users(id) on delete cascade,
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  last_read_at timestamptz not null default timezone('utc'::text, now()),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  primary key (user_id, vendor_id)
);

drop trigger if exists vendor_review_notification_states_touch_updated_at on public.vendor_review_notification_states;
create trigger vendor_review_notification_states_touch_updated_at
before update on public.vendor_review_notification_states
for each row execute function public.touch_updated_at();

create table if not exists public.admin_notification_states (
  user_id uuid primary key references public.users(id) on delete cascade,
  last_read_at timestamptz not null default timezone('utc'::text, now()),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

drop trigger if exists admin_notification_states_touch_updated_at on public.admin_notification_states;
create trigger admin_notification_states_touch_updated_at
before update on public.admin_notification_states
for each row execute function public.touch_updated_at();

create table if not exists public.homepage_themes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  description text,
  preview_image_url text,
  status text not null default 'draft',
  is_active boolean not null default false,
  settings_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint homepage_themes_slug_unique unique (slug),
  constraint homepage_themes_status_check check (status in ('draft', 'active', 'archived'))
);

drop trigger if exists homepage_themes_touch_updated_at on public.homepage_themes;
create trigger homepage_themes_touch_updated_at
before update on public.homepage_themes
for each row execute function public.touch_updated_at();

create table if not exists public.homepage_theme_sections (
  id uuid primary key default gen_random_uuid(),
  theme_id uuid not null references public.homepage_themes(id) on delete cascade,
  section_key text not null,
  section_type text not null,
  component_name text not null,
  sort_order integer not null default 0,
  is_enabled boolean not null default true,
  layout_settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint homepage_theme_sections_theme_key_unique unique (theme_id, section_key)
);

drop trigger if exists homepage_theme_sections_touch_updated_at on public.homepage_theme_sections;
create trigger homepage_theme_sections_touch_updated_at
before update on public.homepage_theme_sections
for each row execute function public.touch_updated_at();

create table if not exists public.homepage_content_blocks (
  id uuid primary key default gen_random_uuid(),
  content_key text not null,
  title text,
  subtitle text,
  description text,
  image_url text,
  button_text text,
  button_link text,
  data_json jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint homepage_content_blocks_content_key_unique unique (content_key)
);

drop trigger if exists homepage_content_blocks_touch_updated_at on public.homepage_content_blocks;
create trigger homepage_content_blocks_touch_updated_at
before update on public.homepage_content_blocks
for each row execute function public.touch_updated_at();

create table if not exists public.homepage_banners (
  id uuid primary key default gen_random_uuid(),
  title text,
  subtitle text,
  image_url text,
  link_url text,
  placement text,
  sort_order integer not null default 0,
  start_date timestamptz,
  end_date timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.homepage_product_sections (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  section_key text not null,
  source_type text not null,
  category_id uuid references public.categories(id) on delete set null,
  product_ids uuid[] not null default '{}'::uuid[],
  limit_count integer not null default 8,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc'::text, now()),
  constraint homepage_product_sections_section_key_unique unique (section_key),
  constraint homepage_product_sections_source_type_check check (source_type in ('manual', 'newest', 'featured', 'category', 'low_moq'))
);

create or replace function public.is_platform_admin(check_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.platform_roles
    where user_id = check_user_id
      and role = 'platform_admin'
  );
$$;

create or replace function public.is_active_vendor_member(check_user_id uuid, check_vendor_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.vendor_members
    where user_id = check_user_id
      and vendor_id = check_vendor_id
      and status = 'active'
  );
$$;

create or replace function public.can_submit_product_review(
  check_user_id uuid,
  check_product_id uuid,
  check_order_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.orders o
    join public.order_items oi on oi.order_id = o.id
    where o.id = check_order_id
      and o.user_id = check_user_id
      and o.status = 'Delivered'
      and oi.product_id = check_product_id::text
  );
$$;

create or replace function public.get_public_product_sold_count(check_product_id uuid)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(order_items.quantity), 0)::bigint
  from public.products
  left join public.order_items on order_items.product_id = products.id::text
  left join public.orders on orders.id = order_items.order_id and orders.status = 'Delivered'
  where products.id = check_product_id
    and products.status = 'active'
    and products.is_active = true
    and (order_items.id is null or orders.id is not null);
$$;

create index if not exists users_email_idx on public.users (email);
create index if not exists platform_roles_user_id_idx on public.platform_roles (user_id);
create index if not exists vendors_status_idx on public.vendors (status);
create index if not exists vendor_members_user_id_idx on public.vendor_members (user_id);
create index if not exists vendor_members_vendor_id_idx on public.vendor_members (vendor_id);
create index if not exists vendor_invitations_email_idx on public.vendor_invitations (email);
create index if not exists brands_name_idx on public.brands (name);
create index if not exists categories_parent_id_idx on public.categories (parent_id);
create index if not exists categories_active_sort_idx on public.categories (is_active, sort_order, name);
create index if not exists cnds_shipping_profiles_vendor_id_idx on public.cnds_shipping_profiles (vendor_id);
create index if not exists cnds_shipping_profiles_is_active_idx on public.cnds_shipping_profiles (is_active);
create index if not exists cnds_shipping_tiers_profile_id_idx on public.cnds_shipping_tiers (profile_id, sort_order);
create index if not exists pricing_tier_profiles_vendor_idx on public.pricing_tier_profiles (vendor_id, is_active, created_at desc);
create index if not exists pricing_tier_profile_rows_profile_idx on public.pricing_tier_profile_rows (profile_id, sort_order, min_qty);
create index if not exists international_shipping_methods_active_sort_idx on public.international_shipping_methods (is_active, sort_order, created_at desc);
create index if not exists international_shipping_tiers_method_sort_idx on public.international_shipping_tiers (method_id, sort_order);
create index if not exists products_vendor_id_idx on public.products (vendor_id);
create index if not exists products_category_id_idx on public.products (category_id);
create index if not exists products_brand_id_idx on public.products (brand_id);
create index if not exists products_status_idx on public.products (status);
create index if not exists products_public_idx on public.products (is_active, status, created_at desc);
create index if not exists products_pricing_source_idx on public.products (pricing_source);
create index if not exists products_cnds_profile_id_idx on public.products (cnds_profile_id);
create index if not exists products_pricing_tier_profile_id_idx on public.products (pricing_tier_profile_id);
create index if not exists product_images_product_sort_idx on public.product_images (product_id, sort_order);
create index if not exists product_specs_product_sort_idx on public.product_specs (product_id, sort_order);
create index if not exists product_variants_product_id_idx on public.product_variants (product_id, sort_order);
create index if not exists product_variants_pricing_tier_set_id_idx on public.product_variants (pricing_tier_set_id);
create index if not exists product_pricing_tiers_product_sort_idx on public.product_pricing_tiers (product_id, min_qty, sort_order);
create index if not exists product_pricing_tier_sets_product_id_idx on public.product_pricing_tier_sets (product_id, sort_order);
create index if not exists product_pricing_tier_set_rows_tier_set_id_idx on public.product_pricing_tier_set_rows (tier_set_id, min_qty, sort_order);
create index if not exists orders_user_id_created_at_idx on public.orders (user_id, created_at desc);
create index if not exists orders_status_created_at_idx on public.orders (status, created_at desc);
create index if not exists orders_international_shipping_method_id_idx on public.orders (international_shipping_method_id);
create index if not exists vendor_orders_vendor_id_idx on public.vendor_orders (vendor_id);
create index if not exists vendor_orders_order_id_idx on public.vendor_orders (order_id);
create index if not exists order_items_order_id_idx on public.order_items (order_id);
create index if not exists order_items_product_id_idx on public.order_items (product_id);
create index if not exists order_items_vendor_id_idx on public.order_items (vendor_id);
create index if not exists order_items_vendor_order_id_idx on public.order_items (vendor_order_id);
create index if not exists product_reviews_product_id_idx on public.product_reviews (product_id, created_at desc);
create index if not exists product_reviews_vendor_id_idx on public.product_reviews (vendor_id, created_at desc);
create index if not exists product_reviews_user_id_idx on public.product_reviews (user_id, created_at desc);
create index if not exists product_reviews_order_id_idx on public.product_reviews (order_id);
create index if not exists homepage_themes_active_idx on public.homepage_themes (is_active, status);
create index if not exists homepage_theme_sections_theme_sort_idx on public.homepage_theme_sections (theme_id, sort_order);
create index if not exists homepage_content_blocks_active_idx on public.homepage_content_blocks (is_active, content_key);
create index if not exists homepage_banners_active_sort_idx on public.homepage_banners (is_active, placement, sort_order);
create index if not exists homepage_product_sections_active_sort_idx on public.homepage_product_sections (is_active, sort_order);
