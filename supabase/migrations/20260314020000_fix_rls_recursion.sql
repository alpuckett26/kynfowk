-- Helper function that returns the family_circle_ids the current user belongs to.
-- SECURITY DEFINER bypasses RLS so policies can call this without triggering recursion.
create or replace function public.get_my_family_circle_ids()
returns setof uuid
language sql
security definer
stable
set search_path = public
as $$
  select family_circle_id
  from public.family_memberships
  where user_id = auth.uid();
$$;

-- ─── family_memberships ───────────────────────────────────────────────────────
-- Replace the self-referencing SELECT policy with one that uses the helper.

drop policy if exists "family_memberships_select" on public.family_memberships;
create policy "family_memberships_select"
  on public.family_memberships
  for select
  to authenticated
  using (
    family_circle_id in (select public.get_my_family_circle_ids())
    or user_id = auth.uid()
    or invite_email = (select email from public.profiles where id = auth.uid())
  );

-- ─── availability_windows ─────────────────────────────────────────────────────

drop policy if exists "availability_windows_select" on public.availability_windows;
create policy "availability_windows_select"
  on public.availability_windows
  for select
  to authenticated
  using (
    family_circle_id in (select public.get_my_family_circle_ids())
  );

-- ─── call_sessions ────────────────────────────────────────────────────────────

drop policy if exists "call_sessions_select" on public.call_sessions;
create policy "call_sessions_select"
  on public.call_sessions
  for select
  to authenticated
  using (
    family_circle_id in (select public.get_my_family_circle_ids())
  );

drop policy if exists "call_sessions_insert" on public.call_sessions;
create policy "call_sessions_insert"
  on public.call_sessions
  for insert
  to authenticated
  with check (
    family_circle_id in (select public.get_my_family_circle_ids())
  );

drop policy if exists "call_sessions_update" on public.call_sessions;
create policy "call_sessions_update"
  on public.call_sessions
  for update
  to authenticated
  using (
    family_circle_id in (select public.get_my_family_circle_ids())
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
      where family_circle_id in (select public.get_my_family_circle_ids())
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
      where family_circle_id in (select public.get_my_family_circle_ids())
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
      where family_circle_id in (select public.get_my_family_circle_ids())
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
      where family_circle_id in (select public.get_my_family_circle_ids())
    )
  );

-- ─── family_activity ──────────────────────────────────────────────────────────

drop policy if exists "family_activity_select" on public.family_activity;
create policy "family_activity_select"
  on public.family_activity
  for select
  to authenticated
  using (
    family_circle_id in (select public.get_my_family_circle_ids())
  );

drop policy if exists "family_activity_insert" on public.family_activity;
create policy "family_activity_insert"
  on public.family_activity
  for insert
  to authenticated
  with check (
    family_circle_id in (select public.get_my_family_circle_ids())
  );
