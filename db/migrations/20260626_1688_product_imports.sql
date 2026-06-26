create table if not exists public.product_imports (
  id uuid primary key default gen_random_uuid(),
  source text not null default '1688',
  source_url text not null,
  source_offer_id text not null,
  target_product_id uuid references public.products(id) on delete set null,
  import_mode text not null,
  status text not null default 'fetched',
  raw_data jsonb not null default '{}'::jsonb,
  mapped_data jsonb not null default '{}'::jsonb,
  downloaded_images jsonb not null default '{}'::jsonb,
  errors jsonb,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint product_imports_source_check check (source in ('1688')),
  constraint product_imports_import_mode_check check (import_mode in ('create', 'update')),
  constraint product_imports_status_check check (status in ('fetched', 'ready_for_review', 'saved', 'failed', 'cancelled'))
);

drop trigger if exists product_imports_touch_updated_at on public.product_imports;
create trigger product_imports_touch_updated_at
before update on public.product_imports
for each row execute function public.touch_updated_at();

create index if not exists product_imports_created_at_idx on public.product_imports (created_at desc);
create index if not exists product_imports_source_offer_idx on public.product_imports (source, source_offer_id);
create index if not exists product_imports_status_idx on public.product_imports (status);
create index if not exists product_imports_target_product_idx on public.product_imports (target_product_id);

alter table public.products
  add column if not exists seo_title text,
  add column if not exists seo_description text,
  add column if not exists tags jsonb not null default '[]'::jsonb,
  add column if not exists domestic_shipping_cost_cny numeric(12,2),
  add column if not exists estimated_international_shipping_cost numeric(12,2),
  add column if not exists shipping_note text,
  add column if not exists source text,
  add column if not exists source_url text,
  add column if not exists source_offer_id text;

create index if not exists products_source_offer_idx on public.products (source, source_offer_id);
