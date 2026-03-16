-- Drop ALL existing policies on call_sessions and related tables,
-- then recreate cleanly using the SECURITY DEFINER helper.

do $$
declare pol record;
begin
  for pol in select policyname from pg_policies where schemaname = 'public' and tablename = 'call_sessions' loop
    execute format('drop policy if exists %I on public.call_sessions', pol.policyname);
  end loop;
end $$;

do $$
declare pol record;
begin
  for pol in select policyname from pg_policies where schemaname = 'public' and tablename = 'call_participants' loop
    execute format('drop policy if exists %I on public.call_participants', pol.policyname);
  end loop;
end $$;

do $$
declare pol record;
begin
  for pol in select policyname from pg_policies where schemaname = 'public' and tablename = 'call_recaps' loop
    execute format('drop policy if exists %I on public.call_recaps', pol.policyname);
  end loop;
end $$;

do $$
declare pol record;
begin
  for pol in select policyname from pg_policies where schemaname = 'public' and tablename = 'availability_windows' loop
    execute format('drop policy if exists %I on public.availability_windows', pol.policyname);
  end loop;
end $$;

do $$
declare pol record;
begin
  for pol in select policyname from pg_policies where schemaname = 'public' and tablename = 'family_activity' loop
    execute format('drop policy if exists %I on public.family_activity', pol.policyname);
  end loop;
end $$;

do $$
declare pol record;
begin
  for pol in select policyname from pg_policies where schemaname = 'public' and tablename = 'profiles' loop
    execute format('drop policy if exists %I on public.profiles', pol.policyname);
  end loop;
end $$;

-- ─── profiles ─────────────────────────────────────────────────────────────────

create policy "profiles_select"
  on public.profiles for select to authenticated
  using (true);

create policy "profiles_insert"
  on public.profiles for insert to authenticated
  with check (id = auth.uid());

create policy "profiles_update"
  on public.profiles for update to authenticated
  using (id = auth.uid());

-- ─── availability_windows ─────────────────────────────────────────────────────

create policy "availability_windows_select"
  on public.availability_windows for select to authenticated
  using (family_circle_id in (select public.get_my_family_circle_ids()));

create policy "availability_windows_insert"
  on public.availability_windows for insert to authenticated
  with check (user_id = auth.uid());

create policy "availability_windows_delete"
  on public.availability_windows for delete to authenticated
  using (user_id = auth.uid());

-- ─── call_sessions ────────────────────────────────────────────────────────────

create policy "call_sessions_select"
  on public.call_sessions for select to authenticated
  using (family_circle_id in (select public.get_my_family_circle_ids()));

create policy "call_sessions_insert"
  on public.call_sessions for insert to authenticated
  with check (family_circle_id in (select public.get_my_family_circle_ids()));

create policy "call_sessions_update"
  on public.call_sessions for update to authenticated
  using (family_circle_id in (select public.get_my_family_circle_ids()));

-- ─── call_participants ────────────────────────────────────────────────────────

create policy "call_participants_select"
  on public.call_participants for select to authenticated
  using (
    call_session_id in (
      select id from public.call_sessions
      where family_circle_id in (select public.get_my_family_circle_ids())
    )
  );

create policy "call_participants_insert"
  on public.call_participants for insert to authenticated
  with check (
    call_session_id in (
      select id from public.call_sessions
      where family_circle_id in (select public.get_my_family_circle_ids())
    )
  );

create policy "call_participants_update"
  on public.call_participants for update to authenticated
  using (
    call_session_id in (
      select id from public.call_sessions
      where family_circle_id in (select public.get_my_family_circle_ids())
    )
  );

-- ─── call_recaps ──────────────────────────────────────────────────────────────

create policy "call_recaps_select"
  on public.call_recaps for select to authenticated
  using (
    call_session_id in (
      select id from public.call_sessions
      where family_circle_id in (select public.get_my_family_circle_ids())
    )
  );

create policy "call_recaps_insert"
  on public.call_recaps for insert to authenticated
  with check (created_by = auth.uid());

create policy "call_recaps_update"
  on public.call_recaps for update to authenticated
  using (created_by = auth.uid());

-- ─── family_activity ──────────────────────────────────────────────────────────

create policy "family_activity_select"
  on public.family_activity for select to authenticated
  using (family_circle_id in (select public.get_my_family_circle_ids()));

create policy "family_activity_insert"
  on public.family_activity for insert to authenticated
  with check (family_circle_id in (select public.get_my_family_circle_ids()));
