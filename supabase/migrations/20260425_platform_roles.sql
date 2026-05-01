create extension if not exists pgcrypto;

create table if not exists platform_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role text not null,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create unique index if not exists platform_roles_user_role_idx
  on platform_roles (user_id, role);
