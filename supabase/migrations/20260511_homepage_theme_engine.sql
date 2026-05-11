create extension if not exists pgcrypto;

create or replace function public.can_manage_homepage()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(public.is_platform_admin(), false)
    or coalesce(auth.jwt() ->> 'email', '') = 'reaz1006@gmail.com';
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

create table if not exists public.homepage_themes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  preview_image_url text,
  status text not null default 'draft',
  is_active boolean not null default false,
  settings_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.homepage_theme_sections (
  id uuid primary key default gen_random_uuid(),
  theme_id uuid not null references public.homepage_themes(id) on delete cascade,
  section_key text not null,
  section_type text not null,
  component_name text not null,
  sort_order integer not null default 0,
  is_enabled boolean not null default true,
  layout_settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint homepage_theme_sections_theme_key_unique unique (theme_id, section_key)
);

create table if not exists public.homepage_content_blocks (
  id uuid primary key default gen_random_uuid(),
  content_key text not null unique,
  title text,
  subtitle text,
  description text,
  image_url text,
  button_text text,
  button_link text,
  data_json jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.homepage_banners (
  id uuid primary key default gen_random_uuid(),
  title text,
  subtitle text,
  image_url text,
  link_url text,
  placement text,
  sort_order integer not null default 0,
  start_date timestamptz,
  end_date timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.homepage_product_sections (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  section_key text not null unique,
  source_type text not null,
  category_id uuid references public.categories(id) on delete set null,
  product_ids uuid[] not null default '{}'::uuid[],
  limit_count integer not null default 8,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc'::text, now())
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'homepage_themes_status_check'
  ) then
    alter table public.homepage_themes
      add constraint homepage_themes_status_check
      check (status in ('draft', 'active', 'archived'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'homepage_product_sections_source_type_check'
  ) then
    alter table public.homepage_product_sections
      add constraint homepage_product_sections_source_type_check
      check (source_type in ('manual', 'newest', 'featured', 'category', 'low_moq'));
  end if;
end $$;

create index if not exists homepage_themes_slug_idx
  on public.homepage_themes (slug);

create index if not exists homepage_themes_active_idx
  on public.homepage_themes (is_active, status);

create index if not exists homepage_theme_sections_theme_sort_idx
  on public.homepage_theme_sections (theme_id, sort_order);

create index if not exists homepage_content_blocks_active_idx
  on public.homepage_content_blocks (is_active, content_key);

create index if not exists homepage_banners_active_sort_idx
  on public.homepage_banners (is_active, placement, sort_order);

create index if not exists homepage_product_sections_active_sort_idx
  on public.homepage_product_sections (is_active, sort_order);

drop trigger if exists homepage_themes_touch_updated_at on public.homepage_themes;
create trigger homepage_themes_touch_updated_at
before update on public.homepage_themes
for each row execute function public.touch_updated_at();

drop trigger if exists homepage_theme_sections_touch_updated_at on public.homepage_theme_sections;
create trigger homepage_theme_sections_touch_updated_at
before update on public.homepage_theme_sections
for each row execute function public.touch_updated_at();

drop trigger if exists homepage_content_blocks_touch_updated_at on public.homepage_content_blocks;
create trigger homepage_content_blocks_touch_updated_at
before update on public.homepage_content_blocks
for each row execute function public.touch_updated_at();

alter table if exists public.homepage_themes enable row level security;
alter table if exists public.homepage_theme_sections enable row level security;
alter table if exists public.homepage_content_blocks enable row level security;
alter table if exists public.homepage_banners enable row level security;
alter table if exists public.homepage_product_sections enable row level security;

drop policy if exists "Public read active homepage themes" on public.homepage_themes;
create policy "Public read active homepage themes"
  on public.homepage_themes
  for select
  using (is_active = true and status = 'active');

drop policy if exists "Admins manage homepage themes" on public.homepage_themes;
create policy "Admins manage homepage themes"
  on public.homepage_themes
  for all
  to authenticated
  using (public.can_manage_homepage())
  with check (public.can_manage_homepage());

drop policy if exists "Public read active homepage theme sections" on public.homepage_theme_sections;
create policy "Public read active homepage theme sections"
  on public.homepage_theme_sections
  for select
  using (
    is_enabled = true
    and exists (
      select 1
      from public.homepage_themes t
      where t.id = homepage_theme_sections.theme_id
        and t.is_active = true
        and t.status = 'active'
    )
  );

drop policy if exists "Admins manage homepage theme sections" on public.homepage_theme_sections;
create policy "Admins manage homepage theme sections"
  on public.homepage_theme_sections
  for all
  to authenticated
  using (public.can_manage_homepage())
  with check (public.can_manage_homepage());

drop policy if exists "Public read active homepage content blocks" on public.homepage_content_blocks;
create policy "Public read active homepage content blocks"
  on public.homepage_content_blocks
  for select
  using (is_active = true);

drop policy if exists "Admins manage homepage content blocks" on public.homepage_content_blocks;
create policy "Admins manage homepage content blocks"
  on public.homepage_content_blocks
  for all
  to authenticated
  using (public.can_manage_homepage())
  with check (public.can_manage_homepage());

drop policy if exists "Public read active homepage banners" on public.homepage_banners;
create policy "Public read active homepage banners"
  on public.homepage_banners
  for select
  using (
    is_active = true
    and (start_date is null or start_date <= timezone('utc'::text, now()))
    and (end_date is null or end_date >= timezone('utc'::text, now()))
  );

drop policy if exists "Admins manage homepage banners" on public.homepage_banners;
create policy "Admins manage homepage banners"
  on public.homepage_banners
  for all
  to authenticated
  using (public.can_manage_homepage())
  with check (public.can_manage_homepage());

drop policy if exists "Public read active homepage product sections" on public.homepage_product_sections;
create policy "Public read active homepage product sections"
  on public.homepage_product_sections
  for select
  using (is_active = true);

drop policy if exists "Admins manage homepage product sections" on public.homepage_product_sections;
create policy "Admins manage homepage product sections"
  on public.homepage_product_sections
  for all
  to authenticated
  using (public.can_manage_homepage())
  with check (public.can_manage_homepage());

insert into public.homepage_themes (
  name,
  slug,
  description,
  preview_image_url,
  status,
  is_active,
  settings_json
)
values (
  'Nextmerce Inspired',
  'nextmerce-inspired',
  'A dynamic marketplace homepage inspired by high-conversion wholesale layouts.',
  null,
  'active',
  true,
  '{"accentColor":"#615FFF","surfaceStyle":"soft"}'::jsonb
)
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  status = excluded.status,
  is_active = excluded.is_active,
  settings_json = excluded.settings_json,
  updated_at = timezone('utc'::text, now());

update public.homepage_themes
set
  is_active = case when slug = 'nextmerce-inspired' then true else false end,
  status = case when slug = 'nextmerce-inspired' then 'active' else status end,
  updated_at = timezone('utc'::text, now());

with theme_row as (
  select id
  from public.homepage_themes
  where slug = 'nextmerce-inspired'
  limit 1
)
insert into public.homepage_theme_sections (
  theme_id,
  section_key,
  section_type,
  component_name,
  sort_order,
  is_enabled,
  layout_settings
)
select
  theme_row.id,
  seed.section_key,
  seed.section_type,
  seed.component_name,
  seed.sort_order,
  true,
  '{}'::jsonb
from theme_row
cross join (
  values
    ('hero', 'hero', 'hero-section', 0),
    ('featured_categories', 'featured_categories', 'featured-categories', 1),
    ('promo_banners', 'promo_banners', 'promo-banners', 2),
    ('product_showcase', 'product_showcase', 'product-showcase', 3),
    ('why_choose_prelize', 'why_choose_prelize', 'why-choose', 4),
    ('how_it_works', 'how_it_works', 'how-it-works', 5),
    ('lead_capture', 'lead_capture', 'lead-capture', 6),
    ('testimonials', 'testimonials', 'testimonials', 7)
) as seed(section_key, section_type, component_name, sort_order)
on conflict (theme_id, section_key) do update
set
  section_type = excluded.section_type,
  component_name = excluded.component_name,
  sort_order = excluded.sort_order,
  is_enabled = excluded.is_enabled,
  updated_at = timezone('utc'::text, now());

insert into public.homepage_content_blocks (
  content_key,
  title,
  subtitle,
  description,
  image_url,
  button_text,
  button_link,
  data_json,
  is_active
)
values
  (
    'hero',
    'Source wholesale products from China with more confidence',
    'Prelize Marketplace',
    'Compare suppliers, plan MOQ-friendly orders, and move products toward Bangladesh with a cleaner sourcing workflow.',
    null,
    'Explore Products',
    '/products',
    '{"secondary_button_text":"Browse Categories","secondary_button_link":"/categories","stats":[{"label":"Active Categories","value":"120+"},{"label":"MOQ Friendly Products","value":"5,000+"},{"label":"Vendor Partners","value":"150+"}]}'::jsonb,
    true
  ),
  (
    'why_choose_prelize',
    'Why buyers use Prelize',
    'Built for sourcing teams and growing resellers',
    'Everything on the homepage stays content-driven, while each theme can present the same data in a completely different layout.',
    null,
    null,
    null,
    '{"items":[{"title":"MOQ-aware sourcing","description":"Surface low-MOQ and wholesale-friendly products faster."},{"title":"China-to-BD workflow","description":"Keep shipping and order context close to the catalog."},{"title":"Theme-ready content","description":"Reuse the same homepage content across multiple designs."}]}'::jsonb,
    true
  ),
  (
    'how_it_works',
    'How it works',
    'From discovery to delivery planning',
    'Use the homepage to guide buyers through the sourcing journey without hardcoding the layout.',
    null,
    null,
    null,
    '{"steps":[{"title":"Discover products","description":"Browse dynamic product sections powered by admin rules."},{"title":"Compare MOQ and pricing","description":"Review marketplace pricing, low-MOQ offers, and vendor options."},{"title":"Plan shipping and orders","description":"Move selected items into quote, cart, and shipping workflows."}]}'::jsonb,
    true
  ),
  (
    'lead_capture',
    'Need help planning your next wholesale order?',
    'Talk to the Prelize team',
    'Use this flexible section for lead capture, sourcing callbacks, or campaign CTAs, regardless of which theme is active.',
    null,
    'Request a Callback',
    '/quote',
    '{"placeholder":"Enter your business email","note":"Our team usually replies within one business day."}'::jsonb,
    true
  ),
  (
    'testimonials',
    'Trusted by growing buyers',
    'Social proof that can move between themes',
    'Testimonials are stored separately from the design, so they stay reusable when you switch homepage themes.',
    null,
    null,
    null,
    '{"items":[{"name":"Dhaka Gadget House","role":"Retail Buyer","quote":"The marketplace flow makes it easier to compare MOQ and move into quote planning quickly."},{"name":"Nafisa Fashion Hub","role":"Boutique Owner","quote":"We can highlight the same campaign content without rebuilding the whole homepage design."},{"name":"BD Home Essentials","role":"Category Manager","quote":"Theme switching is useful because the content stays dynamic while the layout changes."}]}'::jsonb,
    true
  )
on conflict (content_key) do update
set
  title = excluded.title,
  subtitle = excluded.subtitle,
  description = excluded.description,
  button_text = excluded.button_text,
  button_link = excluded.button_link,
  data_json = excluded.data_json,
  is_active = excluded.is_active,
  updated_at = timezone('utc'::text, now());

insert into public.homepage_product_sections (
  title,
  subtitle,
  section_key,
  source_type,
  product_ids,
  limit_count,
  sort_order,
  is_active
)
values (
  'Newest wholesale arrivals',
  'Fresh products from the marketplace catalog',
  'default-newest-products',
  'newest',
  '{}'::uuid[],
  8,
  0,
  true
)
on conflict (section_key) do update
set
  title = excluded.title,
  subtitle = excluded.subtitle,
  source_type = excluded.source_type,
  product_ids = excluded.product_ids,
  limit_count = excluded.limit_count,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;
