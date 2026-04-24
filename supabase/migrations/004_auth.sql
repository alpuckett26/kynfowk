-- ============================================================
-- Kynfowk – Auth Integration
-- Migration: 004_auth
-- ============================================================
-- Links Supabase auth.users to family_members. Auto-creates a
-- family + family_member on sign-up via trigger. Tightens RLS so
-- members can only read their own family's data.

-- ─── Link auth.users → family_members ──────────────────────────
alter table family_members
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

create unique index if not exists idx_family_members_user_id
  on family_members(user_id) where user_id is not null;

-- ─── Helper: family_id for the currently authenticated user ────
create or replace function current_family_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select family_id
  from family_members
  where user_id = auth.uid()
  limit 1;
$$;

-- ─── Trigger: create a family on user sign-up ──────────────────
-- New auth.users row → new family + new family_member linked to it.
-- security definer so it bypasses the family/family_members RLS
-- (the user has no perms yet at trigger-fire time).
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_family_id uuid;
  user_email    text;
  display       text;
begin
  user_email := new.email;
  display    := coalesce(split_part(user_email, '@', 1), 'You');

  insert into families (name)
  values (display || '''s Family')
  returning id into new_family_id;

  insert into family_members (family_id, user_id, display_name, email)
  values (new_family_id, new.id, display, user_email);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ─── Tighten RLS — replace permissive placeholder policies ─────
drop policy if exists "family members can read their family"        on families;
drop policy if exists "family members can read family members"      on family_members;
drop policy if exists "family members can read calls"               on calls;
drop policy if exists "family members can read participants"        on call_participants;
drop policy if exists "family members can read connection events"   on connection_events;
drop policy if exists "family members can read stats"               on family_connection_stats;

create policy "members read own family" on families
  for select using (id = current_family_id());

create policy "members read own family members" on family_members
  for select using (family_id = current_family_id());

create policy "members read own family calls" on calls
  for select using (family_id = current_family_id());

create policy "members read own family participants" on call_participants
  for select using (
    call_id in (select id from calls where family_id = current_family_id())
  );

create policy "members read own family events" on connection_events
  for select using (family_id = current_family_id());

create policy "members read own family stats" on family_connection_stats
  for select using (family_id = current_family_id());

-- Members can update their own family_member row (e.g. display_name)
create policy "members update own profile" on family_members
  for update using (user_id = auth.uid());
