-- M29 — super-admin role + audit log
-- Adds an internal-only flag on profiles plus an append-only audit table
-- so every admin-only action is traceable. Bootstrap the first super
-- admin via the Supabase SQL editor:
--
--   update public.profiles set is_super_admin = true
--     where id = (select id from auth.users where email = '<you>');

alter table public.profiles
  add column if not exists is_super_admin boolean not null default false;

create table if not exists public.admin_audit_log (
  id                uuid primary key default gen_random_uuid(),
  actor_user_id     uuid not null references auth.users(id) on delete cascade,
  action_kind       text not null,
  target_user_id    uuid references auth.users(id) on delete set null,
  target_circle_id  uuid references public.family_circles(id) on delete set null,
  payload           jsonb,
  created_at        timestamptz not null default now()
);

create index if not exists admin_audit_log_actor_idx
  on public.admin_audit_log (actor_user_id, created_at desc);
create index if not exists admin_audit_log_target_user_idx
  on public.admin_audit_log (target_user_id);
create index if not exists admin_audit_log_target_circle_idx
  on public.admin_audit_log (target_circle_id);

alter table public.admin_audit_log enable row level security;

drop policy if exists "admin_audit_log_select" on public.admin_audit_log;
create policy "admin_audit_log_select"
  on public.admin_audit_log
  for select
  to authenticated
  using (
    actor_user_id = auth.uid()
    or (
      select coalesce((select is_super_admin from public.profiles where id = auth.uid()), false)
    )
  );
