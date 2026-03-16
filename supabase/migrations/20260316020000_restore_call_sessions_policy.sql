-- Restore proper call_sessions_select policy.
-- The previous using(true) was a debug policy.
-- Now that recovery_dismissed_at column exists, the select query works correctly.

drop policy if exists "call_sessions_select" on public.call_sessions;

create policy "call_sessions_select"
  on public.call_sessions for select to authenticated
  using (
    created_by = (select auth.uid())
    or family_circle_id in (
      select fm.family_circle_id
      from public.family_memberships fm
      where fm.user_id = (select auth.uid())
        and fm.status = 'active'
    )
  );
