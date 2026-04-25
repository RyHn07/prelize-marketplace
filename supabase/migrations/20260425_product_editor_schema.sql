create extension if not exists pgcrypto;

alter table if exists products
  add column if not exists slug text,
  add column if not exists description text,
  add column if not exists image_url text,
  add column if not exists price numeric(12,2),
  add column if not exists moq integer default 1,
  add column if not exists weight text,
  add column if not exists badge text,
  add column if not exists is_active boolean default true,
  add column if not exists status text default 'draft',
  add column if not exists product_type text default 'single',
  add column if not exists regular_price numeric(12,2),
  add column if not exists discount_price numeric(12,2),
  add column if not exists gallery_images jsonb default '[]'::jsonb,
  add column if not exists attributes jsonb default '[]'::jsonb,
  add column if not exists cdd_shipping_profile text default 'standard',
  add column if not exists updated_at timestamptz default timezone('utc'::text, now());

update products
set slug = coalesce(
  nullif(slug, ''),
  lower(regexp_replace(coalesce(name, 'product-' || id::text), '[^a-zA-Z0-9]+', '-', 'g'))
)
where slug is null or slug = '';

update products
set price = 0
where price is null;

update products
set moq = 1
where moq is null or moq < 1;

update products
set status = case
  when is_active = true then 'active'
  else 'disabled'
end
where status is null or status = '';

update products
set product_type = 'single'
where product_type is null or product_type = '';

update products
set regular_price = price
where regular_price is null and price is not null;

update products
set gallery_images = '[]'::jsonb
where gallery_images is null;

update products
set attributes = '[]'::jsonb
where attributes is null;

update products
set cdd_shipping_profile = 'standard'
where cdd_shipping_profile is null or cdd_shipping_profile = '';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'products_status_check'
  ) then
    alter table products
      add constraint products_status_check
      check (status in ('active', 'disabled', 'draft'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'products_product_type_check'
  ) then
    alter table products
      add constraint products_product_type_check
      check (product_type in ('single', 'variable'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'products_cdd_shipping_profile_check'
  ) then
    alter table products
      add constraint products_cdd_shipping_profile_check
      check (cdd_shipping_profile in ('standard', 'express', 'fragile', 'bulk'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'products_moq_check'
  ) then
    alter table products
      add constraint products_moq_check
      check (moq >= 1);
  end if;
end $$;

create unique index if not exists products_slug_unique_idx on products (slug);
create index if not exists products_status_idx on products (status);
create index if not exists products_category_id_idx on products (category_id);

create table if not exists product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  name text not null,
  regular_price numeric(12,2),
  discount_price numeric(12,2),
  price numeric(12,2) not null default 0,
  moq integer not null default 1,
  image_url text,
  attribute_values jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists product_variants_product_id_idx on product_variants (product_id);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'product_variants_moq_check'
  ) then
    alter table product_variants
      add constraint product_variants_moq_check
      check (moq >= 1);
  end if;
end $$;
