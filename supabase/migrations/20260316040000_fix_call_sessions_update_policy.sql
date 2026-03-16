-- The call_sessions_update policy only had family_circle_id check,
-- but call_sessions_select has created_by OR family_circle_id.
-- When auth.uid() can't find a matching family_membership row (e.g. RLS on
-- family_memberships blocks the subquery inside the update policy), the
-- SELECT still passes via created_by but the UPDATE is silently blocked.
-- Fix: add created_by fallback to the update (and insert) policies too.

drop policy if exists "call_sessions_update" on public.call_sessions;

create policy "call_sessions_update"
  on public.call_sessions for update to authenticated
  using (
    created_by = (select auth.uid())
    or family_circle_id in (
      select fm.family_circle_id
      from public.family_memberships fm
      where fm.user_id = (select auth.uid())
        and fm.status = 'active'
    )
  );
