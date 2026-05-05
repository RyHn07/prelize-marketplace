create extension if not exists pgcrypto;

create table if not exists public.product_pricing_tier_sets (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null,
  fallback_price numeric(12,2) not null default 0,
  pricing_type text not null default 'unit',
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.product_pricing_tier_set_rows (
  id uuid primary key default gen_random_uuid(),
  tier_set_id uuid not null references public.product_pricing_tier_sets(id) on delete cascade,
  min_qty integer not null,
  max_qty integer null,
  price numeric(12,2) not null default 0,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc'::text, now())
);

alter table if exists public.product_pricing_tier_sets
  add column if not exists name text,
  add column if not exists fallback_price numeric(12,2) not null default 0,
  add column if not exists pricing_type text not null default 'unit',
  add column if not exists sort_order integer not null default 0,
  add column if not exists created_at timestamptz not null default timezone('utc'::text, now());

alter table if exists public.product_pricing_tier_set_rows
  add column if not exists min_qty integer,
  add column if not exists max_qty integer null,
  add column if not exists price numeric(12,2) not null default 0,
  add column if not exists sort_order integer not null default 0,
  add column if not exists created_at timestamptz not null default timezone('utc'::text, now());

alter table if exists public.product_variants
  add column if not exists pricing_tier_set_id uuid null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'product_pricing_tier_sets_pricing_type_check'
  ) then
    alter table public.product_pricing_tier_sets
      add constraint product_pricing_tier_sets_pricing_type_check
      check (pricing_type in ('unit', 'fixed'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'product_pricing_tier_sets_fallback_price_check'
  ) then
    alter table public.product_pricing_tier_sets
      add constraint product_pricing_tier_sets_fallback_price_check
      check (fallback_price >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'product_pricing_tier_set_rows_min_qty_check'
  ) then
    alter table public.product_pricing_tier_set_rows
      add constraint product_pricing_tier_set_rows_min_qty_check
      check (min_qty >= 1);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'product_pricing_tier_set_rows_max_qty_check'
  ) then
    alter table public.product_pricing_tier_set_rows
      add constraint product_pricing_tier_set_rows_max_qty_check
      check (max_qty is null or max_qty >= min_qty);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'product_pricing_tier_set_rows_price_check'
  ) then
    alter table public.product_pricing_tier_set_rows
      add constraint product_pricing_tier_set_rows_price_check
      check (price >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'product_variants_pricing_tier_set_id_fkey'
  ) then
    alter table public.product_variants
      add constraint product_variants_pricing_tier_set_id_fkey
      foreign key (pricing_tier_set_id) references public.product_pricing_tier_sets(id) on delete set null;
  end if;
end $$;

create index if not exists product_pricing_tier_sets_product_id_idx
  on public.product_pricing_tier_sets (product_id, sort_order);

create index if not exists product_pricing_tier_set_rows_tier_set_id_idx
  on public.product_pricing_tier_set_rows (tier_set_id, min_qty, sort_order);

create index if not exists product_variants_pricing_tier_set_id_idx
  on public.product_variants (pricing_tier_set_id);
