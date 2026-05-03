create extension if not exists pgcrypto;

create table if not exists public.cnds_shipping_profiles (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid null references public.vendors(id) on delete cascade,
  name text not null,
  description text null,
  pricing_type text not null default 'fixed',
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.cnds_shipping_tiers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.cnds_shipping_profiles(id) on delete cascade,
  min_qty integer not null,
  max_qty integer null,
  price numeric(12,2) not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.cnds_shipping_profiles
  add column if not exists vendor_id uuid null,
  add column if not exists name text,
  add column if not exists description text null,
  add column if not exists pricing_type text not null default 'fixed',
  add column if not exists is_active boolean not null default true,
  add column if not exists created_at timestamptz not null default timezone('utc'::text, now());

alter table public.cnds_shipping_tiers
  add column if not exists profile_id uuid,
  add column if not exists min_qty integer,
  add column if not exists max_qty integer null,
  add column if not exists price numeric(12,2),
  add column if not exists sort_order integer not null default 0,
  add column if not exists created_at timestamptz not null default timezone('utc'::text, now());

alter table public.products
  add column if not exists cnds_profile_id uuid null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'cnds_shipping_profiles_vendor_id_fkey'
  ) then
    alter table public.cnds_shipping_profiles
      add constraint cnds_shipping_profiles_vendor_id_fkey
      foreign key (vendor_id) references public.vendors(id) on delete cascade;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'cnds_shipping_tiers_profile_id_fkey'
  ) then
    alter table public.cnds_shipping_tiers
      add constraint cnds_shipping_tiers_profile_id_fkey
      foreign key (profile_id) references public.cnds_shipping_profiles(id) on delete cascade;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'products_cnds_profile_id_fkey'
  ) then
    alter table public.products
      add constraint products_cnds_profile_id_fkey
      foreign key (cnds_profile_id) references public.cnds_shipping_profiles(id) on delete set null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'cnds_shipping_profiles_pricing_type_check'
  ) then
    alter table public.cnds_shipping_profiles
      add constraint cnds_shipping_profiles_pricing_type_check
      check (pricing_type in ('unit', 'fixed'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'cnds_shipping_tiers_min_qty_check'
  ) then
    alter table public.cnds_shipping_tiers
      add constraint cnds_shipping_tiers_min_qty_check
      check (min_qty >= 1);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'cnds_shipping_tiers_max_qty_check'
  ) then
    alter table public.cnds_shipping_tiers
      add constraint cnds_shipping_tiers_max_qty_check
      check (max_qty is null or max_qty >= min_qty);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'cnds_shipping_tiers_price_check'
  ) then
    alter table public.cnds_shipping_tiers
      add constraint cnds_shipping_tiers_price_check
      check (price >= 0);
  end if;
end $$;

create index if not exists cnds_shipping_profiles_vendor_id_idx
  on public.cnds_shipping_profiles (vendor_id);

create index if not exists cnds_shipping_profiles_is_active_idx
  on public.cnds_shipping_profiles (is_active);

create index if not exists cnds_shipping_profiles_created_at_idx
  on public.cnds_shipping_profiles (created_at desc);

create index if not exists cnds_shipping_tiers_profile_id_idx
  on public.cnds_shipping_tiers (profile_id);

create index if not exists cnds_shipping_tiers_sort_order_idx
  on public.cnds_shipping_tiers (profile_id, sort_order);

create index if not exists products_cnds_profile_id_idx
  on public.products (cnds_profile_id);

alter table if exists public.cnds_shipping_profiles enable row level security;
alter table if exists public.cnds_shipping_tiers enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'cnds_shipping_profiles'
      and policyname = 'Authenticated users read active global cnds profiles'
  ) then
    create policy "Authenticated users read active global cnds profiles"
      on public.cnds_shipping_profiles
      for select
      to authenticated
      using (vendor_id is null and is_active = true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'cnds_shipping_profiles'
      and policyname = 'Platform admins read all cnds profiles'
  ) then
    create policy "Platform admins read all cnds profiles"
      on public.cnds_shipping_profiles
      for select
      to authenticated
      using (public.is_platform_admin());
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'cnds_shipping_profiles'
      and policyname = 'Platform admins insert cnds profiles'
  ) then
    create policy "Platform admins insert cnds profiles"
      on public.cnds_shipping_profiles
      for insert
      to authenticated
      with check (public.is_platform_admin());
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'cnds_shipping_profiles'
      and policyname = 'Platform admins update cnds profiles'
  ) then
    create policy "Platform admins update cnds profiles"
      on public.cnds_shipping_profiles
      for update
      to authenticated
      using (public.is_platform_admin())
      with check (public.is_platform_admin());
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'cnds_shipping_profiles'
      and policyname = 'Platform admins delete cnds profiles'
  ) then
    create policy "Platform admins delete cnds profiles"
      on public.cnds_shipping_profiles
      for delete
      to authenticated
      using (public.is_platform_admin());
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'cnds_shipping_tiers'
      and policyname = 'Authenticated users read active global cnds tiers'
  ) then
    create policy "Authenticated users read active global cnds tiers"
      on public.cnds_shipping_tiers
      for select
      to authenticated
      using (
        exists (
          select 1
          from public.cnds_shipping_profiles profiles
          where profiles.id = profile_id
            and profiles.vendor_id is null
            and profiles.is_active = true
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'cnds_shipping_tiers'
      and policyname = 'Platform admins read all cnds tiers'
  ) then
    create policy "Platform admins read all cnds tiers"
      on public.cnds_shipping_tiers
      for select
      to authenticated
      using (public.is_platform_admin());
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'cnds_shipping_tiers'
      and policyname = 'Platform admins insert cnds tiers'
  ) then
    create policy "Platform admins insert cnds tiers"
      on public.cnds_shipping_tiers
      for insert
      to authenticated
      with check (public.is_platform_admin());
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'cnds_shipping_tiers'
      and policyname = 'Platform admins update cnds tiers'
  ) then
    create policy "Platform admins update cnds tiers"
      on public.cnds_shipping_tiers
      for update
      to authenticated
      using (public.is_platform_admin())
      with check (public.is_platform_admin());
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'cnds_shipping_tiers'
      and policyname = 'Platform admins delete cnds tiers'
  ) then
    create policy "Platform admins delete cnds tiers"
      on public.cnds_shipping_tiers
      for delete
      to authenticated
      using (public.is_platform_admin());
  end if;
end $$;
