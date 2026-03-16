-- Fix get_my_family_circle_ids() to correctly resolve auth.uid() inside
-- a SECURITY DEFINER context. Key changes:
--   1. set search_path = '' (empty) forces all names to be schema-qualified,
--      which is the recommended Supabase security practice.
--   2. (select auth.uid()) acts as an optimization barrier — prevents PostgreSQL
--      from inlining the call in a way that loses the JWT session context.

create or replace function public.get_my_family_circle_ids()
returns setof uuid
language sql
security definer
stable
set search_path = ''
as $$
  select family_circle_id
  from public.family_memberships
  where user_id = (select auth.uid());
$$;
