create extension if not exists pgcrypto;

alter table if exists products
  add column if not exists short_description text,
  add column if not exists specifications jsonb,
  add column if not exists reviews jsonb;

comment on column products.short_description is 'Brief product summary for cards and quick-reference UI.';
comment on column products.specifications is 'Structured product specifications stored as JSON.';
comment on column products.gallery_images is 'Product gallery image URLs stored in the existing JSONB format.';
comment on column products.reviews is 'Structured customer review data stored as JSON.';

update products
set short_description = left(description, 220)
where short_description is null
  and description is not null
  and btrim(description) <> '';

update products
set specifications = attributes
where specifications is null
  and attributes is not null
  and jsonb_typeof(attributes) in ('array', 'object');

update products
set reviews = '[]'::jsonb
where reviews is null;

create table if not exists product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  name text not null,
  sku text,
  price numeric(12,2) not null default 0,
  weight numeric(12,2),
  image_url text,
  min_order_quantity integer not null default 1,
  is_active boolean not null default true,
  sort_order integer,
  created_at timestamptz not null default timezone('utc'::text, now())
);

alter table if exists product_variants
  add column if not exists sku text,
  add column if not exists weight numeric(12,2),
  add column if not exists min_order_quantity integer,
  add column if not exists is_active boolean default true,
  add column if not exists sort_order integer;

update product_variants
set min_order_quantity = coalesce(min_order_quantity, moq, 1)
where min_order_quantity is null;

update product_variants
set is_active = true
where is_active is null;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'product_variants'
      and column_name = 'min_order_quantity'
      and is_nullable = 'YES'
  ) then
    alter table product_variants
      alter column min_order_quantity set not null;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'product_variants'
      and column_name = 'is_active'
      and is_nullable = 'YES'
  ) then
    alter table product_variants
      alter column is_active set not null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'product_variants_min_order_quantity_check'
  ) then
    alter table product_variants
      add constraint product_variants_min_order_quantity_check
      check (min_order_quantity >= 1);
  end if;
end $$;

create index if not exists product_variants_is_active_idx on product_variants (is_active);
create index if not exists product_variants_sort_order_idx on product_variants (sort_order);
create index if not exists product_variants_sku_idx on product_variants (sku);

