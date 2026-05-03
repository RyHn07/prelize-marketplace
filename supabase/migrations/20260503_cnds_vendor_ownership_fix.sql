alter table public.cnds_shipping_profiles
  drop constraint if exists cnds_shipping_profiles_vendor_required_check;

alter table public.cnds_shipping_profiles
  add constraint cnds_shipping_profiles_vendor_required_check
  check (vendor_id is not null) not valid;

drop policy if exists "Authenticated users read active global cnds profiles" on public.cnds_shipping_profiles;
drop policy if exists "Authenticated users read active global cnds tiers" on public.cnds_shipping_tiers;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'cnds_shipping_profiles'
      and policyname = 'Vendor members read own cnds profiles'
  ) then
    create policy "Vendor members read own cnds profiles"
      on public.cnds_shipping_profiles
      for select
      to authenticated
      using (
        exists (
          select 1
          from public.vendor_members members
          where members.vendor_id = cnds_shipping_profiles.vendor_id
            and members.user_id = auth.uid()
            and members.status = 'active'
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'cnds_shipping_profiles'
      and policyname = 'Vendor members insert own cnds profiles'
  ) then
    create policy "Vendor members insert own cnds profiles"
      on public.cnds_shipping_profiles
      for insert
      to authenticated
      with check (
        vendor_id is not null
        and exists (
          select 1
          from public.vendor_members members
          where members.vendor_id = cnds_shipping_profiles.vendor_id
            and members.user_id = auth.uid()
            and members.status = 'active'
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'cnds_shipping_profiles'
      and policyname = 'Vendor members update own cnds profiles'
  ) then
    create policy "Vendor members update own cnds profiles"
      on public.cnds_shipping_profiles
      for update
      to authenticated
      using (
        exists (
          select 1
          from public.vendor_members members
          where members.vendor_id = cnds_shipping_profiles.vendor_id
            and members.user_id = auth.uid()
            and members.status = 'active'
        )
      )
      with check (
        vendor_id is not null
        and exists (
          select 1
          from public.vendor_members members
          where members.vendor_id = cnds_shipping_profiles.vendor_id
            and members.user_id = auth.uid()
            and members.status = 'active'
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'cnds_shipping_profiles'
      and policyname = 'Vendor members delete own cnds profiles'
  ) then
    create policy "Vendor members delete own cnds profiles"
      on public.cnds_shipping_profiles
      for delete
      to authenticated
      using (
        exists (
          select 1
          from public.vendor_members members
          where members.vendor_id = cnds_shipping_profiles.vendor_id
            and members.user_id = auth.uid()
            and members.status = 'active'
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'cnds_shipping_tiers'
      and policyname = 'Vendor members read own cnds tiers'
  ) then
    create policy "Vendor members read own cnds tiers"
      on public.cnds_shipping_tiers
      for select
      to authenticated
      using (
        exists (
          select 1
          from public.cnds_shipping_profiles profiles
          join public.vendor_members members on members.vendor_id = profiles.vendor_id
          where profiles.id = cnds_shipping_tiers.profile_id
            and members.user_id = auth.uid()
            and members.status = 'active'
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'cnds_shipping_tiers'
      and policyname = 'Vendor members insert own cnds tiers'
  ) then
    create policy "Vendor members insert own cnds tiers"
      on public.cnds_shipping_tiers
      for insert
      to authenticated
      with check (
        exists (
          select 1
          from public.cnds_shipping_profiles profiles
          join public.vendor_members members on members.vendor_id = profiles.vendor_id
          where profiles.id = cnds_shipping_tiers.profile_id
            and members.user_id = auth.uid()
            and members.status = 'active'
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'cnds_shipping_tiers'
      and policyname = 'Vendor members update own cnds tiers'
  ) then
    create policy "Vendor members update own cnds tiers"
      on public.cnds_shipping_tiers
      for update
      to authenticated
      using (
        exists (
          select 1
          from public.cnds_shipping_profiles profiles
          join public.vendor_members members on members.vendor_id = profiles.vendor_id
          where profiles.id = cnds_shipping_tiers.profile_id
            and members.user_id = auth.uid()
            and members.status = 'active'
        )
      )
      with check (
        exists (
          select 1
          from public.cnds_shipping_profiles profiles
          join public.vendor_members members on members.vendor_id = profiles.vendor_id
          where profiles.id = cnds_shipping_tiers.profile_id
            and members.user_id = auth.uid()
            and members.status = 'active'
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'cnds_shipping_tiers'
      and policyname = 'Vendor members delete own cnds tiers'
  ) then
    create policy "Vendor members delete own cnds tiers"
      on public.cnds_shipping_tiers
      for delete
      to authenticated
      using (
        exists (
          select 1
          from public.cnds_shipping_profiles profiles
          join public.vendor_members members on members.vendor_id = profiles.vendor_id
          where profiles.id = cnds_shipping_tiers.profile_id
            and members.user_id = auth.uid()
            and members.status = 'active'
        )
      );
  end if;
end $$;
