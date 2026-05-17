create extension if not exists pgcrypto;

create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  image_url text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create unique index if not exists brands_slug_unique_idx on public.brands (slug);
create index if not exists brands_name_idx on public.brands (name);

alter table if exists public.products
  add column if not exists brand_id uuid references public.brands(id) on delete set null;

create index if not exists products_brand_id_idx on public.products (brand_id);

alter table if exists public.brands enable row level security;

drop policy if exists "Public read brands" on public.brands;
create policy "Public read brands"
  on public.brands
  for select
  using (true);

drop policy if exists "Admins manage brands" on public.brands;
create policy "Admins manage brands"
  on public.brands
  for all
  to authenticated
  using (public.can_manage_platform_settings())
  with check (public.can_manage_platform_settings());
