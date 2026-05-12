alter table if exists public.platform_settings
  add column if not exists site_title text,
  add column if not exists site_short_title text,
  add column if not exists site_description text,
  add column if not exists site_url text,
  add column if not exists logo_url text,
  add column if not exists favicon_url text,
  add column if not exists share_image_url text;

update public.platform_settings
set
  site_title = coalesce(nullif(trim(site_title), ''), 'Prelize Marketplace'),
  site_short_title = coalesce(nullif(trim(site_short_title), ''), 'Prelize'),
  site_description = coalesce(
    nullif(trim(site_description), ''),
    'Source wholesale products with a cleaner marketplace workflow.'
  )
where singleton_key = 'default';
