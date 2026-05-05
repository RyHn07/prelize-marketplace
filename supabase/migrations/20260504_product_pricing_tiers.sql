create extension if not exists pgcrypto;

create table if not exists public.product_pricing_tiers (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  pricing_type text not null default 'unit',
  min_qty integer not null,
  max_qty integer null,
  price numeric(12,2) not null default 0,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc'::text, now())
);

alter table if exists public.product_pricing_tiers
  add column if not exists pricing_type text not null default 'unit',
  add column if not exists min_qty integer,
  add column if not exists max_qty integer null,
  add column if not exists price numeric(12,2) not null default 0,
  add column if not exists sort_order integer not null default 0,
  add column if not exists created_at timestamptz not null default timezone('utc'::text, now());

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'product_pricing_tiers_pricing_type_check'
  ) then
    alter table public.product_pricing_tiers
      add constraint product_pricing_tiers_pricing_type_check
      check (pricing_type in ('unit', 'fixed'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'product_pricing_tiers_min_qty_check'
  ) then
    alter table public.product_pricing_tiers
      add constraint product_pricing_tiers_min_qty_check
      check (min_qty >= 1);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'product_pricing_tiers_max_qty_check'
  ) then
    alter table public.product_pricing_tiers
      add constraint product_pricing_tiers_max_qty_check
      check (max_qty is null or max_qty >= min_qty);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'product_pricing_tiers_price_check'
  ) then
    alter table public.product_pricing_tiers
      add constraint product_pricing_tiers_price_check
      check (price >= 0);
  end if;
end $$;

create index if not exists product_pricing_tiers_product_id_idx
  on public.product_pricing_tiers (product_id);

create index if not exists product_pricing_tiers_product_sort_idx
  on public.product_pricing_tiers (product_id, min_qty, sort_order);
