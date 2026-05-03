create extension if not exists pgcrypto;

create table if not exists public.international_shipping_methods (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text null,
  delivery_min_days integer null,
  delivery_max_days integer null,
  minimum_weight_kg numeric(12,2) not null default 0.1,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.international_shipping_tiers (
  id uuid primary key default gen_random_uuid(),
  method_id uuid not null references public.international_shipping_methods(id) on delete cascade,
  min_weight_kg numeric(12,2) not null,
  max_weight_kg numeric(12,2) null,
  price_per_kg numeric(12,2) not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.international_shipping_methods
  add column if not exists name text,
  add column if not exists slug text,
  add column if not exists description text null,
  add column if not exists delivery_min_days integer null,
  add column if not exists delivery_max_days integer null,
  add column if not exists minimum_weight_kg numeric(12,2) not null default 0.1,
  add column if not exists is_active boolean not null default true,
  add column if not exists sort_order integer not null default 0,
  add column if not exists created_at timestamptz not null default timezone('utc'::text, now());

alter table public.international_shipping_tiers
  add column if not exists method_id uuid,
  add column if not exists min_weight_kg numeric(12,2),
  add column if not exists max_weight_kg numeric(12,2) null,
  add column if not exists price_per_kg numeric(12,2),
  add column if not exists sort_order integer not null default 0,
  add column if not exists created_at timestamptz not null default timezone('utc'::text, now());

alter table public.orders
  add column if not exists international_shipping_method_id uuid null,
  add column if not exists international_shipping_method_name text null,
  add column if not exists international_shipping_total numeric(12,2) not null default 0,
  add column if not exists international_shipping_status text not null default 'pending_review';

alter table public.order_items
  add column if not exists weight_kg numeric(12,2) null,
  add column if not exists total_weight_kg numeric(12,2) null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'orders_international_shipping_method_id_fkey'
  ) then
    alter table public.orders
      add constraint orders_international_shipping_method_id_fkey
      foreign key (international_shipping_method_id)
      references public.international_shipping_methods(id)
      on delete set null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'international_shipping_methods_minimum_weight_check'
  ) then
    alter table public.international_shipping_methods
      add constraint international_shipping_methods_minimum_weight_check
      check (minimum_weight_kg >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'international_shipping_tiers_min_weight_check'
  ) then
    alter table public.international_shipping_tiers
      add constraint international_shipping_tiers_min_weight_check
      check (min_weight_kg >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'international_shipping_tiers_max_weight_check'
  ) then
    alter table public.international_shipping_tiers
      add constraint international_shipping_tiers_max_weight_check
      check (max_weight_kg is null or max_weight_kg >= min_weight_kg);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'international_shipping_tiers_price_per_kg_check'
  ) then
    alter table public.international_shipping_tiers
      add constraint international_shipping_tiers_price_per_kg_check
      check (price_per_kg >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'orders_international_shipping_total_check'
  ) then
    alter table public.orders
      add constraint orders_international_shipping_total_check
      check (international_shipping_total >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'orders_international_shipping_status_check'
  ) then
    alter table public.orders
      add constraint orders_international_shipping_status_check
      check (international_shipping_status in ('pending_review', 'calculated'));
  end if;
end $$;

create index if not exists international_shipping_methods_active_sort_idx
  on public.international_shipping_methods (is_active, sort_order, created_at desc);

create index if not exists international_shipping_tiers_method_sort_idx
  on public.international_shipping_tiers (method_id, sort_order);

create index if not exists orders_international_shipping_method_id_idx
  on public.orders (international_shipping_method_id);

insert into public.international_shipping_methods (
  name,
  slug,
  description,
  delivery_min_days,
  delivery_max_days,
  minimum_weight_kg,
  is_active,
  sort_order
)
select *
from (
  values
    ('Air Shipping', 'air-shipping', 'Fast China to Bangladesh air shipping.', 7, 12, 0.10, true, 0),
    ('Sea Shipping', 'sea-shipping', 'Economical China to Bangladesh sea shipping.', 30, 45, 500.00, true, 1)
) as seed(name, slug, description, delivery_min_days, delivery_max_days, minimum_weight_kg, is_active, sort_order)
where not exists (
  select 1
  from public.international_shipping_methods methods
  where methods.slug = seed.slug
);

insert into public.international_shipping_tiers (
  method_id,
  min_weight_kg,
  max_weight_kg,
  price_per_kg,
  sort_order
)
select methods.id, seed.min_weight_kg, seed.max_weight_kg, seed.price_per_kg, seed.sort_order
from public.international_shipping_methods methods
join (
  values
    ('air-shipping', 0.10, null, 1000.00, 0),
    ('sea-shipping', 500.00, null, 350.00, 0)
) as seed(slug, min_weight_kg, max_weight_kg, price_per_kg, sort_order)
  on methods.slug = seed.slug
where not exists (
  select 1
  from public.international_shipping_tiers tiers
  where tiers.method_id = methods.id
);
