create table if not exists public.admin_notification_states (
  user_id uuid primary key,
  last_read_at timestamptz not null default '1970-01-01T00:00:00Z'::timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

alter table if exists public.admin_notification_states enable row level security;

drop policy if exists "Admins read own notification state" on public.admin_notification_states;
create policy "Admins read own notification state"
  on public.admin_notification_states
  for select
  to authenticated
  using (auth.uid() = user_id and public.can_manage_platform_settings());

drop policy if exists "Admins insert own notification state" on public.admin_notification_states;
create policy "Admins insert own notification state"
  on public.admin_notification_states
  for insert
  to authenticated
  with check (auth.uid() = user_id and public.can_manage_platform_settings());

drop policy if exists "Admins update own notification state" on public.admin_notification_states;
create policy "Admins update own notification state"
  on public.admin_notification_states
  for update
  to authenticated
  using (auth.uid() = user_id and public.can_manage_platform_settings())
  with check (auth.uid() = user_id and public.can_manage_platform_settings());
