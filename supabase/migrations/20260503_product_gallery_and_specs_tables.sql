create extension if not exists pgcrypto;

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  image_url text not null,
  sort_order integer,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.product_specs (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  label text not null,
  value text not null,
  sort_order integer,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists product_images_product_id_idx
  on public.product_images (product_id);

create index if not exists product_images_sort_order_idx
  on public.product_images (sort_order);

create index if not exists product_specs_product_id_idx
  on public.product_specs (product_id);

create index if not exists product_specs_sort_order_idx
  on public.product_specs (sort_order);
