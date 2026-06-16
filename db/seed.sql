insert into public.platform_settings (
  singleton_key,
  marketplace_name,
  site_title,
  site_short_title,
  site_description,
  site_url,
  base_currency,
  display_currency,
  cny_to_bdt_rate
)
values (
  'default',
  'Prelize',
  'Prelize | Wholesale Products, Sourcing & Cross-Border Trade',
  'Prelize',
  'Prelize helps buyers discover wholesale products, browse marketplace categories, request sourcing quotes, and connect with vendors for cross-border trade.',
  'http://localhost:3000',
  'CNY',
  'BDT',
  16.0000
)
on conflict (singleton_key) do update
set
  marketplace_name = excluded.marketplace_name,
  site_title = excluded.site_title,
  site_short_title = excluded.site_short_title,
  site_description = excluded.site_description,
  site_url = excluded.site_url,
  base_currency = excluded.base_currency,
  display_currency = excluded.display_currency,
  cny_to_bdt_rate = excluded.cny_to_bdt_rate;

insert into public.users (id, email, name, role)
values
  ('11111111-1111-1111-1111-111111111111', 'demo@prelize.local', 'Demo Customer', 'customer'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'admin@prelize.local', 'Demo Admin', 'admin')
on conflict (id) do update
set email = excluded.email,
    name = excluded.name,
    role = excluded.role;

insert into public.platform_roles (user_id, role)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'platform_admin')
on conflict (user_id, role) do nothing;

insert into public.vendors (id, name, slug, status, contact_email)
values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Prelize Sample Vendor', 'prelize-sample-vendor', 'active', 'vendor@prelize.local')
on conflict (slug) do update
set name = excluded.name,
    status = excluded.status,
    contact_email = excluded.contact_email;

insert into public.vendor_members (vendor_id, user_id, role, status)
values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'owner', 'active')
on conflict (vendor_id, user_id, role) do nothing;

insert into public.categories (id, name, slug, sort_order, is_active)
values
  ('cccccccc-0000-0000-0000-000000000001', 'Fashion', 'fashion', 10, true),
  ('cccccccc-0000-0000-0000-000000000002', 'Bags', 'bags', 20, true)
on conflict (slug) do update
set name = excluded.name,
    sort_order = excluded.sort_order,
    is_active = excluded.is_active;

insert into public.brands (id, name, slug)
values ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Prelize Basics', 'prelize-basics')
on conflict (slug) do update
set name = excluded.name;

insert into public.cnds_shipping_profiles (id, vendor_id, name, description, pricing_type, is_active)
values ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', null, 'Standard C&DS', 'Default local clearing and delivery profile.', 'fixed', true)
on conflict (id) do update
set name = excluded.name,
    description = excluded.description,
    pricing_type = excluded.pricing_type,
    is_active = excluded.is_active;

insert into public.cnds_shipping_tiers (profile_id, min_qty, max_qty, price, sort_order)
values
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 1, 10, 120, 10),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 11, null, 95, 20)
on conflict do nothing;

insert into public.international_shipping_methods (
  id,
  name,
  slug,
  description,
  delivery_min_days,
  delivery_max_days,
  minimum_weight_kg,
  is_active,
  sort_order
)
values
  ('ffffffff-0000-0000-0000-000000000001', 'Air Shipping', 'air-shipping', 'Fast international delivery by air.', 7, 14, 0.1, true, 10),
  ('ffffffff-0000-0000-0000-000000000002', 'Sea Shipping', 'sea-shipping', 'Lower-cost bulk shipping by sea.', 25, 45, 1.0, true, 20)
on conflict (slug) do update
set name = excluded.name,
    description = excluded.description,
    delivery_min_days = excluded.delivery_min_days,
    delivery_max_days = excluded.delivery_max_days,
    minimum_weight_kg = excluded.minimum_weight_kg,
    is_active = excluded.is_active,
    sort_order = excluded.sort_order;

insert into public.international_shipping_tiers (method_id, min_weight_kg, max_weight_kg, price_per_kg, sort_order)
values
  ('ffffffff-0000-0000-0000-000000000001', 0.1, 10, 850, 10),
  ('ffffffff-0000-0000-0000-000000000001', 10.01, null, 750, 20),
  ('ffffffff-0000-0000-0000-000000000002', 1, 50, 260, 10),
  ('ffffffff-0000-0000-0000-000000000002', 50.01, null, 210, 20)
on conflict do nothing;

insert into public.products (
  id,
  vendor_id,
  category_id,
  brand_id,
  cnds_profile_id,
  name,
  slug,
  description,
  image_url,
  price,
  price_cents,
  regular_price,
  buying_price_cny,
  profit_percent,
  profit_amount_cny,
  selling_price_cny,
  exchange_rate_cny_to_bdt,
  moq,
  stock_quantity,
  weight,
  weight_kg,
  badge,
  is_featured,
  is_active,
  status,
  product_type,
  pricing_mode,
  pricing_source
)
values
  (
    '22222222-2222-2222-2222-222222222222',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'cccccccc-0000-0000-0000-000000000001',
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    'Sample Cotton Hoodie',
    'sample-cotton-hoodie',
    'A local PostgreSQL sample product.',
    '/placeholder-product.svg',
    4999,
    499900,
    4999,
    250,
    25,
    62.50,
    312.50,
    16,
    5,
    25,
    '0.8 kg',
    0.8,
    'New',
    true,
    true,
    'active',
    'single',
    'single',
    'use_fixed_price'
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'cccccccc-0000-0000-0000-000000000002',
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    'Sample Canvas Tote',
    'sample-canvas-tote',
    'Another sample product for API testing.',
    '/placeholder-product.svg',
    1850,
    185000,
    1850,
    90,
    28.5,
    25.65,
    115.65,
    16,
    10,
    40,
    '0.35 kg',
    0.35,
    'Best Value',
    true,
    true,
    'active',
    'single',
    'single',
    'use_fixed_price'
  )
on conflict (id) do update
set name = excluded.name,
    slug = excluded.slug,
    description = excluded.description,
    price = excluded.price,
    price_cents = excluded.price_cents,
    regular_price = excluded.regular_price,
    stock_quantity = excluded.stock_quantity,
    is_active = excluded.is_active,
    status = excluded.status;

insert into public.product_images (product_id, image_url, alt_text, sort_order)
values
  ('22222222-2222-2222-2222-222222222222', '/placeholder-product.svg', 'Sample Cotton Hoodie', 10),
  ('33333333-3333-3333-3333-333333333333', '/placeholder-product.svg', 'Sample Canvas Tote', 10)
on conflict (product_id, image_url) do update
set alt_text = excluded.alt_text,
    sort_order = excluded.sort_order;

insert into public.homepage_themes (id, name, slug, description, status, is_active)
values ('99999999-9999-9999-9999-999999999999', 'Default Local Theme', 'default-local-theme', 'Local PostgreSQL starter homepage theme.', 'active', true)
on conflict (slug) do update
set name = excluded.name,
    description = excluded.description,
    status = excluded.status,
    is_active = excluded.is_active;

insert into public.homepage_theme_sections (theme_id, section_key, section_type, component_name, sort_order, is_enabled)
values
  ('99999999-9999-9999-9999-999999999999', 'hero', 'hero', 'hero-section', 10, true),
  ('99999999-9999-9999-9999-999999999999', 'featured-categories', 'categories', 'featured-categories', 20, true),
  ('99999999-9999-9999-9999-999999999999', 'product-showcase', 'products', 'product-showcase', 30, true)
on conflict (theme_id, section_key) do update
set section_type = excluded.section_type,
    component_name = excluded.component_name,
    sort_order = excluded.sort_order,
    is_enabled = excluded.is_enabled;

insert into public.homepage_content_blocks (content_key, title, subtitle, description, button_text, button_link, is_active)
values (
  'hero',
  'Wholesale products from China, prepared for Bangladesh buyers',
  'Local PostgreSQL starter',
  'This homepage data is loaded from your local PostgreSQL database.',
  'Browse Products',
  '/products',
  true
)
on conflict (content_key) do update
set title = excluded.title,
    subtitle = excluded.subtitle,
    description = excluded.description,
    button_text = excluded.button_text,
    button_link = excluded.button_link,
    is_active = excluded.is_active;

insert into public.homepage_product_sections (title, subtitle, section_key, source_type, product_ids, limit_count, sort_order, is_active)
values (
  'Newest arrivals',
  'Fresh sample products from local PostgreSQL.',
  'newest-arrivals',
  'newest',
  '{}',
  8,
  10,
  true
)
on conflict (section_key) do update
set title = excluded.title,
    subtitle = excluded.subtitle,
    source_type = excluded.source_type,
    limit_count = excluded.limit_count,
    sort_order = excluded.sort_order,
    is_active = excluded.is_active;
