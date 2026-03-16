-- Replace call_sessions policies with inline subquery approach.
-- This avoids relying on get_my_family_circle_ids() SECURITY DEFINER,
-- which may have auth.uid() resolution issues in some Supabase configs.
-- The inline subquery with (select auth.uid()) optimization barrier is
-- the most reliable pattern for Supabase RLS.

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

-- ─── call_sessions ────────────────────────────────────────────────────────────

create policy "call_sessions_select"
  on public.call_sessions for select to authenticated
  using (
    family_circle_id in (
      select fm.family_circle_id
      from public.family_memberships fm
      where fm.user_id = (select auth.uid())
        and fm.status = 'active'
    )
  );

create policy "call_sessions_insert"
  on public.call_sessions for insert to authenticated
  with check (
    family_circle_id in (
      select fm.family_circle_id
      from public.family_memberships fm
      where fm.user_id = (select auth.uid())
        and fm.status = 'active'
    )
  );

create policy "call_sessions_update"
  on public.call_sessions for update to authenticated
  using (
    family_circle_id in (
      select fm.family_circle_id
      from public.family_memberships fm
      where fm.user_id = (select auth.uid())
        and fm.status = 'active'
    )
  );

-- ─── call_participants ────────────────────────────────────────────────────────

create policy "call_participants_select"
  on public.call_participants for select to authenticated
  using (
    call_session_id in (
      select cs.id
      from public.call_sessions cs
      join public.family_memberships fm on fm.family_circle_id = cs.family_circle_id
      where fm.user_id = (select auth.uid())
        and fm.status = 'active'
    )
  );

create policy "call_participants_insert"
  on public.call_participants for insert to authenticated
  with check (
    call_session_id in (
      select cs.id
      from public.call_sessions cs
      join public.family_memberships fm on fm.family_circle_id = cs.family_circle_id
      where fm.user_id = (select auth.uid())
        and fm.status = 'active'
    )
  );

create policy "call_participants_update"
  on public.call_participants for update to authenticated
  using (
    call_session_id in (
      select cs.id
      from public.call_sessions cs
      join public.family_memberships fm on fm.family_circle_id = cs.family_circle_id
      where fm.user_id = (select auth.uid())
        and fm.status = 'active'
    )
  );

-- ─── call_recaps ──────────────────────────────────────────────────────────────

create policy "call_recaps_select"
  on public.call_recaps for select to authenticated
  using (
    call_session_id in (
      select cs.id
      from public.call_sessions cs
      join public.family_memberships fm on fm.family_circle_id = cs.family_circle_id
      where fm.user_id = (select auth.uid())
        and fm.status = 'active'
    )
  );

create policy "call_recaps_insert"
  on public.call_recaps for insert to authenticated
  with check (created_by = (select auth.uid()));

create policy "call_recaps_update"
  on public.call_recaps for update to authenticated
  using (created_by = (select auth.uid()));
