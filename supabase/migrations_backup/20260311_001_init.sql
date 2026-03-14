create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, timezone)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    'America/Chicago'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create or replace function public.is_family_member(circle_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.family_memberships membership
    where membership.family_circle_id = circle_id
      and membership.user_id = auth.uid()
  );
$$;

create or replace function public.is_circle_owner(circle_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.family_memberships membership
    where membership.family_circle_id = circle_id
      and membership.user_id = auth.uid()
      and membership.role = 'owner'
  );
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text unique,
  full_name text,
  timezone text not null default 'America/Chicago',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.family_circles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.family_memberships (
  id uuid primary key default gen_random_uuid(),
  family_circle_id uuid not null references public.family_circles (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  display_name text not null,
  invite_email text,
  relationship_label text,
  status text not null default 'invited' check (status in ('active', 'invited')),
  role text not null default 'member' check (role in ('owner', 'member')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists family_memberships_circle_user_idx
  on public.family_memberships (family_circle_id, user_id)
  where user_id is not null;

create table if not exists public.availability_windows (
  id uuid primary key default gen_random_uuid(),
  family_circle_id uuid not null references public.family_circles (id) on delete cascade,
  membership_id uuid not null references public.family_memberships (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  weekday integer not null check (weekday between 0 and 6),
  start_hour integer not null check (start_hour between 0 and 23),
  end_hour integer not null check (end_hour between 1 and 24 and end_hour > start_hour),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.call_sessions (
  id uuid primary key default gen_random_uuid(),
  family_circle_id uuid not null references public.family_circles (id) on delete cascade,
  title text not null,
  scheduled_start timestamptz not null,
  scheduled_end timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'completed')),
  actual_duration_minutes integer,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.call_participants (
  id uuid primary key default gen_random_uuid(),
  call_session_id uuid not null references public.call_sessions (id) on delete cascade,
  membership_id uuid not null references public.family_memberships (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  unique (call_session_id, membership_id)
);

create table if not exists public.family_activity (
  id uuid primary key default gen_random_uuid(),
  family_circle_id uuid not null references public.family_circles (id) on delete cascade,
  actor_membership_id uuid references public.family_memberships (id) on delete set null,
  activity_type text not null,
  summary text not null,
  metadata jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.call_recaps (
  call_session_id uuid primary key references public.call_sessions (id) on delete cascade,
  summary text,
  highlight text,
  next_step text,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create trigger set_family_circles_updated_at
before update on public.family_circles
for each row
execute function public.set_updated_at();

create trigger set_family_memberships_updated_at
before update on public.family_memberships
for each row
execute function public.set_updated_at();

create trigger set_call_recaps_updated_at
before update on public.call_recaps
for each row
execute function public.set_updated_at();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.family_circles enable row level security;
alter table public.family_memberships enable row level security;
alter table public.availability_windows enable row level security;
alter table public.call_sessions enable row level security;
alter table public.call_participants enable row level security;
alter table public.family_activity enable row level security;
alter table public.call_recaps enable row level security;

create policy "profiles are viewable by owner"
on public.profiles
for select
using (id = auth.uid());

create policy "profiles are editable by owner"
on public.profiles
for update
using (id = auth.uid());

create policy "profiles can be inserted by owner"
on public.profiles
for insert
with check (id = auth.uid());

create policy "family circles can be created by signed-in users"
on public.family_circles
for insert
with check (created_by = auth.uid());

create policy "family circles can be viewed by circle members"
on public.family_circles
for select
using (public.is_family_member(id));

create policy "family circles can be updated by owners"
on public.family_circles
for update
using (public.is_circle_owner(id));

create policy "memberships are viewable by family members"
on public.family_memberships
for select
using (public.is_family_member(family_circle_id));

create policy "owners can add memberships"
on public.family_memberships
for insert
with check (
  exists (
    select 1
    from public.family_circles circle
    where circle.id = family_circle_id
      and circle.created_by = auth.uid()
  )
  or public.is_circle_owner(family_circle_id)
);

create policy "owners can update memberships"
on public.family_memberships
for update
using (public.is_circle_owner(family_circle_id));

create policy "availability is viewable by family members"
on public.availability_windows
for select
using (public.is_family_member(family_circle_id));

create policy "members can add their own availability"
on public.availability_windows
for insert
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.family_memberships membership
    where membership.id = membership_id
      and membership.user_id = auth.uid()
      and membership.family_circle_id = family_circle_id
  )
);

create policy "call sessions are viewable by family members"
on public.call_sessions
for select
using (public.is_family_member(family_circle_id));

create policy "family members can create call sessions"
on public.call_sessions
for insert
with check (
  created_by = auth.uid()
  and public.is_family_member(family_circle_id)
);

create policy "family members can update call sessions"
on public.call_sessions
for update
using (public.is_family_member(family_circle_id));

create policy "call participants are viewable by family members"
on public.call_participants
for select
using (
  exists (
    select 1
    from public.call_sessions session
    where session.id = call_session_id
      and public.is_family_member(session.family_circle_id)
  )
);

create policy "family members can add participants"
on public.call_participants
for insert
with check (
  exists (
    select 1
    from public.call_sessions session
    where session.id = call_session_id
      and public.is_family_member(session.family_circle_id)
  )
);

create policy "family activity is viewable by family members"
on public.family_activity
for select
using (public.is_family_member(family_circle_id));

create policy "family members can add activity"
on public.family_activity
for insert
with check (public.is_family_member(family_circle_id));

create policy "call recaps are viewable by family members"
on public.call_recaps
for select
using (
  exists (
    select 1
    from public.call_sessions session
    where session.id = call_session_id
      and public.is_family_member(session.family_circle_id)
  )
);

create policy "family members can insert call recaps"
on public.call_recaps
for insert
with check (
  created_by = auth.uid()
  and exists (
    select 1
    from public.call_sessions session
    where session.id = call_session_id
      and public.is_family_member(session.family_circle_id)
  )
);

create policy "family members can update call recaps"
on public.call_recaps
for update
using (
  exists (
    select 1
    from public.call_sessions session
    where session.id = call_session_id
      and public.is_family_member(session.family_circle_id)
  )
);
