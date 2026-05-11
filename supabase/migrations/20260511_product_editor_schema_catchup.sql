create extension if not exists pgcrypto;

alter table if exists public.products
  add column if not exists vendor_id uuid null references public.vendors(id) on delete set null,
  add column if not exists sku text null,
  add column if not exists image_url text null,
  add column if not exists price numeric(12,2) null,
  add column if not exists moq integer not null default 1,
  add column if not exists status text not null default 'draft',
  add column if not exists product_type text not null default 'single',
  add column if not exists regular_price numeric(12,2) null,
  add column if not exists discount_price numeric(12,2) null,
  add column if not exists gallery_images jsonb not null default '[]'::jsonb,
  add column if not exists attributes jsonb not null default '[]'::jsonb,
  add column if not exists cdd_shipping_profile text not null default 'standard',
  add column if not exists cnds_profile_id uuid null references public.cnds_shipping_profiles(id) on delete set null,
  add column if not exists pricing_tier_profile_id uuid null references public.pricing_tier_profiles(id) on delete set null,
  add column if not exists pricing_source text not null default 'use_product_tier';

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'products_pricing_source_check'
  ) then
    alter table public.products
      drop constraint products_pricing_source_check;
  end if;
exception
  when undefined_table then
    null;
  when undefined_object then
    null;
end $$;

update public.products
set price = 0
where price is null;

update public.products
set moq = 1
where moq is null or moq < 1;

update public.products
set status = case
  when coalesce(is_active, false) = true then 'active'
  else 'draft'
end
where status is null or status = '';

update public.products
set product_type = 'single'
where product_type is null or product_type = '';

update public.products
set regular_price = price
where regular_price is null and price is not null;

update public.products
set gallery_images = '[]'::jsonb
where gallery_images is null;

update public.products
set attributes = '[]'::jsonb
where attributes is null;

update public.products
set cdd_shipping_profile = 'standard'
where cdd_shipping_profile is null or cdd_shipping_profile = '';

update public.products
set pricing_source = case
  when pricing_source in ('use_pricing_tiers', 'use_product_tier') then 'use_product_tier'
  when pricing_source in ('use_variant_price', 'use_fixed_price') then 'use_fixed_price'
  else 'use_product_tier'
end
where pricing_source is null
   or pricing_source not in ('use_product_tier', 'use_fixed_price');

alter table if exists public.product_variants
  add column if not exists pricing_tier_set_id uuid null references public.product_pricing_tier_sets(id) on delete set null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'products_status_check'
  ) then
    alter table public.products
      add constraint products_status_check
      check (status in ('active', 'disabled', 'draft'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'products_product_type_check'
  ) then
    alter table public.products
      add constraint products_product_type_check
      check (product_type in ('single', 'variable'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'products_moq_check'
  ) then
    alter table public.products
      add constraint products_moq_check
      check (moq >= 1);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'products_cdd_shipping_profile_check'
  ) then
    alter table public.products
      add constraint products_cdd_shipping_profile_check
      check (cdd_shipping_profile in ('standard', 'express', 'fragile', 'bulk'));
  end if;

  alter table public.products
    add constraint products_pricing_source_check
    check (pricing_source in ('use_product_tier', 'use_fixed_price'));
exception
  when duplicate_object then
    null;
end $$;

create index if not exists products_vendor_id_idx
  on public.products (vendor_id);

create index if not exists products_status_idx
  on public.products (status);

create index if not exists products_pricing_source_idx
  on public.products (pricing_source);

create index if not exists products_cnds_profile_id_idx
  on public.products (cnds_profile_id);

create index if not exists products_pricing_tier_profile_id_idx
  on public.products (pricing_tier_profile_id);

create index if not exists product_variants_pricing_tier_set_id_idx
  on public.product_variants (pricing_tier_set_id);
