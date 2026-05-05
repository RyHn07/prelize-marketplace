update public.products
set pricing_source = case
  when pricing_source = 'use_pricing_tiers' then 'use_product_tier'
  when pricing_source = 'use_variant_price' then 'use_fixed_price'
  else pricing_source
end
where pricing_source in ('use_pricing_tiers', 'use_variant_price');

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'products_pricing_source_check'
  ) then
    alter table public.products
      drop constraint products_pricing_source_check;
  end if;

  alter table public.products
    add constraint products_pricing_source_check
    check (pricing_source in ('use_product_tier', 'use_fixed_price'));
end $$;
