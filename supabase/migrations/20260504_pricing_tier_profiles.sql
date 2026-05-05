create extension if not exists pgcrypto;

create table if not exists public.pricing_tier_profiles (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid null references public.vendors(id) on delete cascade,
  name text not null,
  pricing_type text not null default 'unit',
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.pricing_tier_profile_rows (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.pricing_tier_profiles(id) on delete cascade,
  min_qty integer not null,
  max_qty integer null,
  price numeric(12,2) not null default 0,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc'::text, now())
);

alter table if exists public.pricing_tier_profiles
  add column if not exists vendor_id uuid null references public.vendors(id) on delete cascade,
  add column if not exists name text,
  add column if not exists pricing_type text not null default 'unit',
  add column if not exists is_active boolean not null default true,
  add column if not exists created_at timestamptz not null default timezone('utc'::text, now());

alter table if exists public.pricing_tier_profile_rows
  add column if not exists min_qty integer,
  add column if not exists max_qty integer null,
  add column if not exists price numeric(12,2) not null default 0,
  add column if not exists sort_order integer not null default 0,
  add column if not exists created_at timestamptz not null default timezone('utc'::text, now());

alter table if exists public.products
  add column if not exists pricing_tier_profile_id uuid null references public.pricing_tier_profiles(id) on delete set null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'pricing_tier_profiles_pricing_type_check'
  ) then
    alter table public.pricing_tier_profiles
      add constraint pricing_tier_profiles_pricing_type_check
      check (pricing_type in ('unit', 'fixed'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'pricing_tier_profile_rows_min_qty_check'
  ) then
    alter table public.pricing_tier_profile_rows
      add constraint pricing_tier_profile_rows_min_qty_check
      check (min_qty >= 1);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'pricing_tier_profile_rows_max_qty_check'
  ) then
    alter table public.pricing_tier_profile_rows
      add constraint pricing_tier_profile_rows_max_qty_check
      check (max_qty is null or max_qty >= min_qty);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'pricing_tier_profile_rows_price_check'
  ) then
    alter table public.pricing_tier_profile_rows
      add constraint pricing_tier_profile_rows_price_check
      check (price >= 0);
  end if;
end $$;

create index if not exists pricing_tier_profiles_vendor_idx
  on public.pricing_tier_profiles (vendor_id, is_active, created_at desc);

create index if not exists pricing_tier_profile_rows_profile_idx
  on public.pricing_tier_profile_rows (profile_id, sort_order, min_qty);

create index if not exists products_pricing_tier_profile_id_idx
  on public.products (pricing_tier_profile_id);
