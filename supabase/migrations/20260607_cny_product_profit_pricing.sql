alter table if exists public.platform_settings
  add column if not exists base_currency text not null default 'CNY',
  add column if not exists display_currency text not null default 'BDT',
  add column if not exists cny_to_bdt_rate numeric(12,4) not null default 16.0000;

update public.platform_settings
set base_currency = 'CNY',
    display_currency = 'BDT',
    cny_to_bdt_rate = case
      when cny_to_bdt_rate is null or cny_to_bdt_rate <= 0 then 16.0000
      else cny_to_bdt_rate
    end;

alter table if exists public.products
  add column if not exists buying_price_cny numeric(12,2),
  add column if not exists profit_percent numeric(7,2) not null default 0,
  add column if not exists profit_amount_cny numeric(12,2) not null default 0,
  add column if not exists selling_price_cny numeric(12,2) not null default 0,
  add column if not exists exchange_rate_cny_to_bdt numeric(12,4) not null default 16.0000;

update public.products
set buying_price_cny = coalesce(buying_price_cny, regular_price, price, 0),
    profit_percent = coalesce(profit_percent, 0),
    exchange_rate_cny_to_bdt = case
      when exchange_rate_cny_to_bdt is null or exchange_rate_cny_to_bdt <= 0
        then (select coalesce(nullif(cny_to_bdt_rate, 0), 16.0000) from public.platform_settings where singleton_key = 'default')
      else exchange_rate_cny_to_bdt
    end;

update public.products
set profit_amount_cny = round((coalesce(buying_price_cny, 0) * coalesce(profit_percent, 0) / 100)::numeric, 2),
    selling_price_cny = round((coalesce(buying_price_cny, 0) + (coalesce(buying_price_cny, 0) * coalesce(profit_percent, 0) / 100))::numeric, 2);

update public.products
set price = round((selling_price_cny * exchange_rate_cny_to_bdt)::numeric, 2),
    regular_price = round((selling_price_cny * exchange_rate_cny_to_bdt)::numeric, 2),
    discount_price = null
where buying_price_cny is not null;

alter table if exists public.product_variants
  add column if not exists buying_price_cny numeric(12,2),
  add column if not exists profit_amount_cny numeric(12,2) not null default 0,
  add column if not exists selling_price_cny numeric(12,2) not null default 0;

update public.product_variants variants
set buying_price_cny = coalesce(variants.buying_price_cny, variants.regular_price, variants.price, products.buying_price_cny, 0)
from public.products
where variants.product_id = products.id;

update public.product_variants variants
set profit_amount_cny = round((coalesce(variants.buying_price_cny, 0) * coalesce(products.profit_percent, 0) / 100)::numeric, 2),
    selling_price_cny = round((coalesce(variants.buying_price_cny, 0) + (coalesce(variants.buying_price_cny, 0) * coalesce(products.profit_percent, 0) / 100))::numeric, 2),
    price = round(((coalesce(variants.buying_price_cny, 0) + (coalesce(variants.buying_price_cny, 0) * coalesce(products.profit_percent, 0) / 100)) * products.exchange_rate_cny_to_bdt)::numeric, 2),
    regular_price = round(((coalesce(variants.buying_price_cny, 0) + (coalesce(variants.buying_price_cny, 0) * coalesce(products.profit_percent, 0) / 100)) * products.exchange_rate_cny_to_bdt)::numeric, 2),
    discount_price = null
from public.products
where variants.product_id = products.id;

alter table if exists public.product_pricing_tiers
  add column if not exists buying_price_cny numeric(12,2),
  add column if not exists profit_amount_cny numeric(12,2) not null default 0,
  add column if not exists selling_price_cny numeric(12,2) not null default 0;

update public.product_pricing_tiers tiers
set buying_price_cny = coalesce(tiers.buying_price_cny, tiers.price, 0),
    profit_amount_cny = round((coalesce(tiers.buying_price_cny, tiers.price, 0) * coalesce(products.profit_percent, 0) / 100)::numeric, 2),
    selling_price_cny = round((coalesce(tiers.buying_price_cny, tiers.price, 0) + (coalesce(tiers.buying_price_cny, tiers.price, 0) * coalesce(products.profit_percent, 0) / 100))::numeric, 2),
    price = round(((coalesce(tiers.buying_price_cny, tiers.price, 0) + (coalesce(tiers.buying_price_cny, tiers.price, 0) * coalesce(products.profit_percent, 0) / 100)) * products.exchange_rate_cny_to_bdt)::numeric, 2)
from public.products
where tiers.product_id = products.id;

alter table if exists public.product_pricing_tier_sets
  add column if not exists buying_price_cny numeric(12,2),
  add column if not exists profit_amount_cny numeric(12,2) not null default 0,
  add column if not exists selling_price_cny numeric(12,2) not null default 0;

update public.product_pricing_tier_sets sets
set buying_price_cny = coalesce(sets.buying_price_cny, sets.fallback_price, 0),
    profit_amount_cny = round((coalesce(sets.buying_price_cny, sets.fallback_price, 0) * coalesce(products.profit_percent, 0) / 100)::numeric, 2),
    selling_price_cny = round((coalesce(sets.buying_price_cny, sets.fallback_price, 0) + (coalesce(sets.buying_price_cny, sets.fallback_price, 0) * coalesce(products.profit_percent, 0) / 100))::numeric, 2),
    fallback_price = round(((coalesce(sets.buying_price_cny, sets.fallback_price, 0) + (coalesce(sets.buying_price_cny, sets.fallback_price, 0) * coalesce(products.profit_percent, 0) / 100)) * products.exchange_rate_cny_to_bdt)::numeric, 2)
from public.products
where sets.product_id = products.id;

alter table if exists public.product_pricing_tier_set_rows
  add column if not exists buying_price_cny numeric(12,2),
  add column if not exists profit_amount_cny numeric(12,2) not null default 0,
  add column if not exists selling_price_cny numeric(12,2) not null default 0;

update public.product_pricing_tier_set_rows rows
set buying_price_cny = coalesce(rows.buying_price_cny, rows.price, 0),
    profit_amount_cny = round((coalesce(rows.buying_price_cny, rows.price, 0) * coalesce(products.profit_percent, 0) / 100)::numeric, 2),
    selling_price_cny = round((coalesce(rows.buying_price_cny, rows.price, 0) + (coalesce(rows.buying_price_cny, rows.price, 0) * coalesce(products.profit_percent, 0) / 100))::numeric, 2),
    price = round(((coalesce(rows.buying_price_cny, rows.price, 0) + (coalesce(rows.buying_price_cny, rows.price, 0) * coalesce(products.profit_percent, 0) / 100)) * products.exchange_rate_cny_to_bdt)::numeric, 2)
from public.product_pricing_tier_sets sets
join public.products on products.id = sets.product_id
where rows.tier_set_id = sets.id;

alter table if exists public.order_items
  add column if not exists buying_price_cny numeric(12,2),
  add column if not exists profit_percent numeric(7,2),
  add column if not exists profit_amount_cny numeric(12,2),
  add column if not exists selling_price_cny numeric(12,2),
  add column if not exists exchange_rate_cny_to_bdt numeric(12,4),
  add column if not exists display_currency text not null default 'BDT',
  add column if not exists total_profit_cny numeric(12,2);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'platform_settings_cny_to_bdt_rate_check') then
    alter table public.platform_settings
      add constraint platform_settings_cny_to_bdt_rate_check check (cny_to_bdt_rate > 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'products_buying_price_cny_check') then
    alter table public.products
      add constraint products_buying_price_cny_check check (buying_price_cny is null or buying_price_cny >= 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'products_profit_percent_check') then
    alter table public.products
      add constraint products_profit_percent_check check (profit_percent >= 0);
  end if;
end $$;
