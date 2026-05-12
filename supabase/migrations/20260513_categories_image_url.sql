alter table if exists public.categories
  add column if not exists image_url text null;
