-- Ensure RLS is enabled on core tables
alter table public.family_circles enable row level security;
alter table public.family_memberships enable row level security;
alter table public.availability_windows enable row level security;
alter table public.call_sessions enable row level security;
alter table public.call_participants enable row level security;
alter table public.call_recaps enable row level security;
alter table public.family_activity enable row level security;
alter table public.profiles enable row level security;

-- ─── family_circles ──────────────────────────────────────────────────────────

drop policy if exists "family_circles_insert" on public.family_circles;
create policy "family_circles_insert"
  on public.family_circles
  for insert
  to authenticated
  with check (created_by = auth.uid());

drop policy if exists "family_circles_select" on public.family_circles;
create policy "family_circles_select"
  on public.family_circles
  for select
  to authenticated
  using (
    exists (
      select 1 from public.family_memberships
      where family_circle_id = family_circles.id
        and user_id = auth.uid()
    )
    or created_by = auth.uid()
  );

drop policy if exists "family_circles_update" on public.family_circles;
create policy "family_circles_update"
  on public.family_circles
  for update
  to authenticated
  using (created_by = auth.uid());

-- ─── profiles ─────────────────────────────────────────────────────────────────

drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select"
  on public.profiles
  for select
  to authenticated
  using (true);

drop policy if exists "profiles_insert" on public.profiles;
create policy "profiles_insert"
  on public.profiles
  for insert
  to authenticated
  with check (id = auth.uid());

drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_update"
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid());

-- ─── family_memberships ───────────────────────────────────────────────────────

drop policy if exists "family_memberships_select" on public.family_memberships;
create policy "family_memberships_select"
  on public.family_memberships
  for select
  to authenticated
  using (
    family_circle_id in (
      select family_circle_id from public.family_memberships
      where user_id = auth.uid()
    )
    or user_id = auth.uid()
    or invite_email = (select email from public.profiles where id = auth.uid())
  );

drop policy if exists "family_memberships_insert" on public.family_memberships;
create policy "family_memberships_insert"
  on public.family_memberships
  for insert
  to authenticated
  with check (
    -- owner inserting their own membership during onboarding
    user_id = auth.uid()
    or
    -- owner adding other members to their circle
    family_circle_id in (
      select id from public.family_circles where created_by = auth.uid()
    )
  );

drop policy if exists "family_memberships_update" on public.family_memberships;
create policy "family_memberships_update"
  on public.family_memberships
  for update
  to authenticated
  using (
    user_id = auth.uid()
    or family_circle_id in (
      select id from public.family_circles where created_by = auth.uid()
    )
  );

drop policy if exists "family_memberships_delete" on public.family_memberships;
create policy "family_memberships_delete"
  on public.family_memberships
  for delete
  to authenticated
  using (
    family_circle_id in (
      select id from public.family_circles where created_by = auth.uid()
    )
  );

-- ─── availability_windows ─────────────────────────────────────────────────────

drop policy if exists "availability_windows_select" on public.availability_windows;
create policy "availability_windows_select"
  on public.availability_windows
  for select
  to authenticated
  using (
    family_circle_id in (
      select family_circle_id from public.family_memberships
      where user_id = auth.uid()
    )
  );

drop policy if exists "availability_windows_insert" on public.availability_windows;
create policy "availability_windows_insert"
  on public.availability_windows
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "availability_windows_delete" on public.availability_windows;
create policy "availability_windows_delete"
  on public.availability_windows
  for delete
  to authenticated
  using (user_id = auth.uid());

-- ─── call_sessions ────────────────────────────────────────────────────────────

drop policy if exists "call_sessions_select" on public.call_sessions;
create policy "call_sessions_select"
  on public.call_sessions
  for select
  to authenticated
  using (
    family_circle_id in (
      select family_circle_id from public.family_memberships
      where user_id = auth.uid()
    )
  );

drop policy if exists "call_sessions_insert" on public.call_sessions;
create policy "call_sessions_insert"
  on public.call_sessions
  for insert
  to authenticated
  with check (
    family_circle_id in (
      select family_circle_id from public.family_memberships
      where user_id = auth.uid() and status = 'active'
    )
  );

drop policy if exists "call_sessions_update" on public.call_sessions;
create policy "call_sessions_update"
  on public.call_sessions
  for update
  to authenticated
  using (
    family_circle_id in (
      select family_circle_id from public.family_memberships
      where user_id = auth.uid() and status = 'active'
    )
  );

-- ─── call_participants ────────────────────────────────────────────────────────

drop policy if exists "call_participants_select" on public.call_participants;
create policy "call_participants_select"
  on public.call_participants
  for select
  to authenticated
  using (
    call_session_id in (
      select id from public.call_sessions
      where family_circle_id in (
        select family_circle_id from public.family_memberships
        where user_id = auth.uid()
      )
    )
  );

drop policy if exists "call_participants_insert" on public.call_participants;
create policy "call_participants_insert"
  on public.call_participants
  for insert
  to authenticated
  with check (
    call_session_id in (
      select id from public.call_sessions
      where family_circle_id in (
        select family_circle_id from public.family_memberships
        where user_id = auth.uid() and status = 'active'
      )
    )
  );

drop policy if exists "call_participants_update" on public.call_participants;
create policy "call_participants_update"
  on public.call_participants
  for update
  to authenticated
  using (
    call_session_id in (
      select id from public.call_sessions
      where family_circle_id in (
        select family_circle_id from public.family_memberships
        where user_id = auth.uid() and status = 'active'
      )
    )
  );

-- ─── call_recaps ──────────────────────────────────────────────────────────────

drop policy if exists "call_recaps_select" on public.call_recaps;
create policy "call_recaps_select"
  on public.call_recaps
  for select
  to authenticated
  using (
    call_session_id in (
      select id from public.call_sessions
      where family_circle_id in (
        select family_circle_id from public.family_memberships
        where user_id = auth.uid()
      )
    )
  );

drop policy if exists "call_recaps_insert" on public.call_recaps;
create policy "call_recaps_insert"
  on public.call_recaps
  for insert
  to authenticated
  with check (created_by = auth.uid());

drop policy if exists "call_recaps_update" on public.call_recaps;
create policy "call_recaps_update"
  on public.call_recaps
  for update
  to authenticated
  using (created_by = auth.uid());

-- ─── family_activity ──────────────────────────────────────────────────────────

drop policy if exists "family_activity_select" on public.family_activity;
create policy "family_activity_select"
  on public.family_activity
  for select
  to authenticated
  using (
    family_circle_id in (
      select family_circle_id from public.family_memberships
      where user_id = auth.uid()
    )
  );

drop policy if exists "family_activity_insert" on public.family_activity;
create policy "family_activity_insert"
  on public.family_activity
  for insert
  to authenticated
  with check (
    family_circle_id in (
      select family_circle_id from public.family_memberships
      where user_id = auth.uid() and status = 'active'
    )
  );
