create extension if not exists pgcrypto;

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null,
  value text null,
  price numeric(12,2) not null default 0,
  image_url text null,
  stock integer not null default 0,
  created_at timestamptz not null default timezone('utc'::text, now())
);

alter table if exists public.product_variants
  add column if not exists value text null,
  add column if not exists stock integer not null default 0;

update public.product_variants
set value = coalesce(
  nullif(value, ''),
  nullif(
    array_to_string(
      array(
        select entry.value
        from jsonb_each_text(coalesce(attribute_values, '{}'::jsonb)) as entry
      ),
      ' / '
    ),
    ''
  ),
  name
)
where value is null or value = '';

update public.product_variants
set stock = 0
where stock is null or stock < 0;

alter table public.order_items
  add column if not exists variant_id uuid null,
  add column if not exists variant_name text null,
  add column if not exists variant_value text null,
  add column if not exists unit_price numeric(12,2) null,
  add column if not exists total_price numeric(12,2) null;

update public.order_items
set unit_price = coalesce(unit_price, price),
    total_price = coalesce(total_price, coalesce(unit_price, price) * quantity),
    variant_value = coalesce(nullif(variant_value, ''), variation)
where unit_price is null
   or total_price is null
   or variant_value is null
   or variant_value = '';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'product_variants_stock_check'
  ) then
    alter table public.product_variants
      add constraint product_variants_stock_check
      check (stock >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'order_items_unit_price_check'
  ) then
    alter table public.order_items
      add constraint order_items_unit_price_check
      check (unit_price is null or unit_price >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'order_items_total_price_check'
  ) then
    alter table public.order_items
      add constraint order_items_total_price_check
      check (total_price is null or total_price >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'order_items_variant_id_fkey'
  ) then
    alter table public.order_items
      add constraint order_items_variant_id_fkey
      foreign key (variant_id) references public.product_variants(id) on delete set null;
  end if;
end $$;

create index if not exists product_variants_stock_idx
  on public.product_variants (product_id, stock);

create index if not exists order_items_variant_id_idx
  on public.order_items (variant_id);
