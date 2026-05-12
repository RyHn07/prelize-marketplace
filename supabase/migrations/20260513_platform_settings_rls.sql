create or replace function public.can_manage_platform_settings()
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

alter table if exists public.platform_settings enable row level security;

drop policy if exists "Public read platform settings" on public.platform_settings;
create policy "Public read platform settings"
  on public.platform_settings
  for select
  using (true);

drop policy if exists "Admins manage platform settings" on public.platform_settings;
create policy "Admins manage platform settings"
  on public.platform_settings
  for all
  to authenticated
  using (public.can_manage_platform_settings())
  with check (public.can_manage_platform_settings());
