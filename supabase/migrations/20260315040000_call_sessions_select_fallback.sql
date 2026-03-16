-- Add created_by fallback to call_sessions_select policy, and add a debug RPC
-- to diagnose auth context from within the RLS evaluation chain.

-- Drop and recreate call_sessions_select with created_by fallback.
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

-- Debug function: returns RLS context for the calling user.
-- Useful for E2E test diagnostics — call via /rest/v1/rpc/debug_rls_context.
create or replace function public.debug_rls_context()
returns json
language sql
security invoker
stable
as $$
  select json_build_object(
    'uid', (select auth.uid()),
    'memberships', (
      select json_agg(row_to_json(fm))
      from public.family_memberships fm
      where fm.user_id = (select auth.uid())
    ),
    'definer_circle_ids', (
      select array_agg(cid)
      from (select public.get_my_family_circle_ids() as cid) x
    )
  );
$$;
