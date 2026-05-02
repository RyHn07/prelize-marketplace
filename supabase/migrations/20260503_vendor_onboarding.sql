create extension if not exists pgcrypto;

create table if not exists vendor_invitations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  invited_by uuid not null,
  status text not null default 'pending',
  created_at timestamptz not null default timezone('utc'::text, now())
);

create unique index if not exists vendor_invitations_user_id_idx
  on vendor_invitations (user_id);

create index if not exists vendor_invitations_status_idx
  on vendor_invitations (status);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'vendor_invitations_status_check'
  ) then
    alter table vendor_invitations
      add constraint vendor_invitations_status_check
      check (status in ('pending', 'accepted', 'rejected'));
  end if;
end $$;

alter table if exists vendor_invitations enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'vendor_invitations'
      and policyname = 'Users read own vendor invitations'
  ) then
    create policy "Users read own vendor invitations"
      on vendor_invitations
      for select
      to authenticated
      using (user_id = auth.uid());
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'vendor_invitations'
      and policyname = 'Platform admins read vendor invitations'
  ) then
    create policy "Platform admins read vendor invitations"
      on vendor_invitations
      for select
      to authenticated
      using (public.is_platform_admin());
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'vendor_invitations'
      and policyname = 'Platform admins insert vendor invitations'
  ) then
    create policy "Platform admins insert vendor invitations"
      on vendor_invitations
      for insert
      to authenticated
      with check (public.is_platform_admin());
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'vendor_invitations'
      and policyname = 'Platform admins update vendor invitations'
  ) then
    create policy "Platform admins update vendor invitations"
      on vendor_invitations
      for update
      to authenticated
      using (public.is_platform_admin())
      with check (public.is_platform_admin());
  end if;
end $$;
