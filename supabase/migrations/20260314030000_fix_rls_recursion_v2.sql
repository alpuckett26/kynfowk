-- Drop ALL existing policies on family_memberships regardless of name,
-- including any created directly in the Supabase dashboard.
do $$
declare
  pol record;
begin
  for pol in
    select policyname
    from pg_policies
    where schemaname = 'public' and tablename = 'family_memberships'
  loop
    execute format('drop policy if exists %I on public.family_memberships', pol.policyname);
  end loop;
end $$;

-- Also drop all policies on family_circles in case they reference family_memberships.
do $$
declare
  pol record;
begin
  for pol in
    select policyname
    from pg_policies
    where schemaname = 'public' and tablename = 'family_circles'
  loop
    execute format('drop policy if exists %I on public.family_circles', pol.policyname);
  end loop;
end $$;

-- Recreate the SECURITY DEFINER helper (idempotent).
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

-- If is_family_member exists, replace it with a SECURITY DEFINER version
-- so notification policies that call it don't cause recursion either.
create or replace function public.is_family_member(circle_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.family_memberships
    where family_circle_id = circle_id
      and user_id = auth.uid()
      and status = 'active'
  );
$$;

-- ─── family_circles ──────────────────────────────────────────────────────────

create policy "family_circles_insert"
  on public.family_circles
  for insert
  to authenticated
  with check (created_by = auth.uid());

create policy "family_circles_select"
  on public.family_circles
  for select
  to authenticated
  using (
    created_by = auth.uid()
    or id in (select public.get_my_family_circle_ids())
  );

create policy "family_circles_update"
  on public.family_circles
  for update
  to authenticated
  using (created_by = auth.uid());

-- ─── family_memberships ───────────────────────────────────────────────────────

create policy "family_memberships_select"
  on public.family_memberships
  for select
  to authenticated
  using (
    family_circle_id in (select public.get_my_family_circle_ids())
    or user_id = auth.uid()
    or invite_email = (select email from public.profiles where id = auth.uid())
  );

create policy "family_memberships_insert"
  on public.family_memberships
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    or family_circle_id in (
      select id from public.family_circles where created_by = auth.uid()
    )
  );

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

create policy "family_memberships_delete"
  on public.family_memberships
  for delete
  to authenticated
  using (
    family_circle_id in (
      select id from public.family_circles where created_by = auth.uid()
    )
  );
