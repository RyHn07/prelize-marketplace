-- Storefront pricing queries use the public Supabase client. Expose pricing
-- configuration only when it belongs to an active public product.

alter table if exists public.product_pricing_tiers enable row level security;
alter table if exists public.product_pricing_tier_sets enable row level security;
alter table if exists public.product_pricing_tier_set_rows enable row level security;

drop policy if exists "Public read active product pricing tiers" on public.product_pricing_tiers;
create policy "Public read active product pricing tiers"
  on public.product_pricing_tiers
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.products
      where products.id = product_pricing_tiers.product_id
        and products.status = 'active'
        and products.is_active = true
    )
  );

drop policy if exists "Public read active product pricing tier sets" on public.product_pricing_tier_sets;
create policy "Public read active product pricing tier sets"
  on public.product_pricing_tier_sets
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.products
      where products.id = product_pricing_tier_sets.product_id
        and products.status = 'active'
        and products.is_active = true
    )
  );

drop policy if exists "Public read active product pricing tier set rows" on public.product_pricing_tier_set_rows;
create policy "Public read active product pricing tier set rows"
  on public.product_pricing_tier_set_rows
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.product_pricing_tier_sets
      join public.products
        on products.id = product_pricing_tier_sets.product_id
      where product_pricing_tier_sets.id = product_pricing_tier_set_rows.tier_set_id
        and products.status = 'active'
        and products.is_active = true
    )
  );
