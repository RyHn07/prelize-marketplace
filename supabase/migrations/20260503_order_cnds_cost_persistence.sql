alter table public.orders
  add column if not exists cnds_cost_total numeric(12,2) not null default 0;

alter table public.order_items
  add column if not exists cnds_cost numeric(12,2) not null default 0,
  add column if not exists cnds_profile_id uuid null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'order_items_cnds_profile_id_fkey'
  ) then
    alter table public.order_items
      add constraint order_items_cnds_profile_id_fkey
      foreign key (cnds_profile_id) references public.cnds_shipping_profiles(id) on delete set null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'order_items_cnds_cost_check'
  ) then
    alter table public.order_items
      add constraint order_items_cnds_cost_check
      check (cnds_cost >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'orders_cnds_cost_total_check'
  ) then
    alter table public.orders
      add constraint orders_cnds_cost_total_check
      check (cnds_cost_total >= 0);
  end if;
end $$;

create index if not exists order_items_cnds_profile_id_idx
  on public.order_items (cnds_profile_id);
