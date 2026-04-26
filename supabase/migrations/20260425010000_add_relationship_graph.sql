-- Relationship graph: edges, family units, households, managed-profile link.
-- Endpoints reference family_memberships.id (not profiles.id) so the schema
-- supports placeholder / deceased / non-tech members who don't have a
-- profiles row.

-- 1. relationship_edges -------------------------------------------------------

create table if not exists public.relationship_edges (
  id uuid primary key default gen_random_uuid(),
  family_circle_id uuid not null references public.family_circles(id) on delete cascade,
  from_membership_id uuid not null references public.family_memberships(id) on delete cascade,
  to_membership_id   uuid not null references public.family_memberships(id) on delete cascade,
  relationship_type text not null check (relationship_type in (
    'parent','child','spouse','partner','sibling','grandparent','grandchild',
    'aunt_uncle','niece_nephew','cousin','in_law','step_parent','step_child',
    'half_sibling','guardian','dependent','chosen_family','friend_like_family',
    'ex_spouse','co_parent'
  )),
  relationship_label text,
  is_primary_link boolean not null default false,
  is_immediate_family boolean not null default false,
  is_household_link boolean not null default false,
  is_blood_relation boolean not null default false,
  is_marriage_relation boolean not null default false,
  is_guardian_relation boolean not null default false,
  status text not null default 'active' check (status in ('active','pending','ended')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint relationship_edges_no_self
    check (from_membership_id <> to_membership_id),
  constraint relationship_edges_unique
    unique (family_circle_id, from_membership_id, to_membership_id, relationship_type)
);

create index if not exists relationship_edges_circle_from_idx
  on public.relationship_edges (family_circle_id, from_membership_id);
create index if not exists relationship_edges_circle_to_idx
  on public.relationship_edges (family_circle_id, to_membership_id);

-- 2. family_units + family_unit_members --------------------------------------

create table if not exists public.family_units (
  id uuid primary key default gen_random_uuid(),
  family_circle_id uuid not null references public.family_circles(id) on delete cascade,
  name text not null,
  unit_type text not null default 'nuclear' check (unit_type in (
    'nuclear','single_parent','blended','guardian','custom'
  )),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists family_units_circle_idx
  on public.family_units (family_circle_id);

create table if not exists public.family_unit_members (
  id uuid primary key default gen_random_uuid(),
  family_unit_id uuid not null references public.family_units(id) on delete cascade,
  membership_id  uuid not null references public.family_memberships(id) on delete cascade,
  unit_role text not null check (unit_role in ('parent','child','guardian','partner','other')),
  is_primary_household boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  unique (family_unit_id, membership_id)
);

create index if not exists family_unit_members_membership_idx
  on public.family_unit_members (membership_id);

-- 3. households + household_members -------------------------------------------

create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  family_circle_id uuid not null references public.family_circles(id) on delete cascade,
  name text not null,
  address_optional text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists households_circle_idx
  on public.households (family_circle_id);

create table if not exists public.household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  membership_id uuid not null references public.family_memberships(id) on delete cascade,
  role text not null default 'member',
  started_at timestamptz not null default timezone('utc', now()),
  ended_at timestamptz,
  unique (household_id, membership_id)
);

create index if not exists household_members_membership_idx
  on public.household_members (membership_id);

-- 4. Managed-profile link -----------------------------------------------------

alter table public.family_memberships
  add column if not exists managed_by_membership_id
    uuid references public.family_memberships(id) on delete set null;

create index if not exists family_memberships_managed_by_idx
  on public.family_memberships (managed_by_membership_id)
  where managed_by_membership_id is not null;

-- 5. RLS ----------------------------------------------------------------------

alter table public.relationship_edges enable row level security;
alter table public.family_units enable row level security;
alter table public.family_unit_members enable row level security;
alter table public.households enable row level security;
alter table public.household_members enable row level security;

-- relationship_edges: any active circle member can read; insert/update/delete
-- when viewer is the circle owner OR the from-side membership is the viewer's
-- own membership (so members can manage their own outgoing edges).

create policy "relationship_edges_select" on public.relationship_edges
  for select using (
    family_circle_id in (
      select fm.family_circle_id from family_memberships fm
      where fm.user_id = (select auth.uid()) and fm.status = 'active'
    )
  );

create policy "relationship_edges_insert" on public.relationship_edges
  for insert with check (
    family_circle_id in (
      select fm.family_circle_id from family_memberships fm
      where fm.user_id = (select auth.uid()) and fm.status = 'active'
        and (fm.role = 'owner' or fm.id = relationship_edges.from_membership_id)
    )
  );

create policy "relationship_edges_update" on public.relationship_edges
  for update using (
    family_circle_id in (
      select fm.family_circle_id from family_memberships fm
      where fm.user_id = (select auth.uid()) and fm.status = 'active'
        and (fm.role = 'owner' or fm.id = relationship_edges.from_membership_id)
    )
  );

create policy "relationship_edges_delete" on public.relationship_edges
  for delete using (
    family_circle_id in (
      select fm.family_circle_id from family_memberships fm
      where fm.user_id = (select auth.uid()) and fm.status = 'active'
        and (fm.role = 'owner' or fm.id = relationship_edges.from_membership_id)
    )
  );

-- family_units / family_unit_members: read by any active circle member;
-- write by circle owners only (units are an organizational concept).

create policy "family_units_select" on public.family_units
  for select using (
    family_circle_id in (
      select fm.family_circle_id from family_memberships fm
      where fm.user_id = (select auth.uid()) and fm.status = 'active'
    )
  );

create policy "family_units_owner_write" on public.family_units
  for all using (
    family_circle_id in (
      select fm.family_circle_id from family_memberships fm
      where fm.user_id = (select auth.uid()) and fm.status = 'active' and fm.role = 'owner'
    )
  ) with check (
    family_circle_id in (
      select fm.family_circle_id from family_memberships fm
      where fm.user_id = (select auth.uid()) and fm.status = 'active' and fm.role = 'owner'
    )
  );

create policy "family_unit_members_select" on public.family_unit_members
  for select using (
    family_unit_id in (
      select fu.id from family_units fu
      where fu.family_circle_id in (
        select fm.family_circle_id from family_memberships fm
        where fm.user_id = (select auth.uid()) and fm.status = 'active'
      )
    )
  );

create policy "family_unit_members_owner_write" on public.family_unit_members
  for all using (
    family_unit_id in (
      select fu.id from family_units fu
      where fu.family_circle_id in (
        select fm.family_circle_id from family_memberships fm
        where fm.user_id = (select auth.uid())
          and fm.status = 'active' and fm.role = 'owner'
      )
    )
  ) with check (
    family_unit_id in (
      select fu.id from family_units fu
      where fu.family_circle_id in (
        select fm.family_circle_id from family_memberships fm
        where fm.user_id = (select auth.uid())
          and fm.status = 'active' and fm.role = 'owner'
      )
    )
  );

-- households / household_members: same pattern as family_units.

create policy "households_select" on public.households
  for select using (
    family_circle_id in (
      select fm.family_circle_id from family_memberships fm
      where fm.user_id = (select auth.uid()) and fm.status = 'active'
    )
  );

create policy "households_owner_write" on public.households
  for all using (
    family_circle_id in (
      select fm.family_circle_id from family_memberships fm
      where fm.user_id = (select auth.uid())
        and fm.status = 'active' and fm.role = 'owner'
    )
  ) with check (
    family_circle_id in (
      select fm.family_circle_id from family_memberships fm
      where fm.user_id = (select auth.uid())
        and fm.status = 'active' and fm.role = 'owner'
    )
  );

create policy "household_members_select" on public.household_members
  for select using (
    household_id in (
      select h.id from households h
      where h.family_circle_id in (
        select fm.family_circle_id from family_memberships fm
        where fm.user_id = (select auth.uid()) and fm.status = 'active'
      )
    )
  );

create policy "household_members_owner_write" on public.household_members
  for all using (
    household_id in (
      select h.id from households h
      where h.family_circle_id in (
        select fm.family_circle_id from family_memberships fm
        where fm.user_id = (select auth.uid())
          and fm.status = 'active' and fm.role = 'owner'
      )
    )
  ) with check (
    household_id in (
      select h.id from households h
      where h.family_circle_id in (
        select fm.family_circle_id from family_memberships fm
        where fm.user_id = (select auth.uid())
          and fm.status = 'active' and fm.role = 'owner'
      )
    )
  );

-- 6. Inverse-edge trigger -----------------------------------------------------
-- One INSERT creates both directions. The on-conflict prevents the inverse
-- from re-triggering itself.

create or replace function public.create_inverse_relationship_edge()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  inverse_type text;
begin
  inverse_type := case new.relationship_type
    when 'parent'       then 'child'
    when 'child'        then 'parent'
    when 'grandparent'  then 'grandchild'
    when 'grandchild'   then 'grandparent'
    when 'aunt_uncle'   then 'niece_nephew'
    when 'niece_nephew' then 'aunt_uncle'
    when 'step_parent'  then 'step_child'
    when 'step_child'   then 'step_parent'
    when 'guardian'     then 'dependent'
    when 'dependent'    then 'guardian'
    -- symmetric types map to themselves
    when 'spouse' then 'spouse' when 'partner' then 'partner'
    when 'sibling' then 'sibling' when 'cousin' then 'cousin'
    when 'half_sibling' then 'half_sibling' when 'in_law' then 'in_law'
    when 'co_parent' then 'co_parent' when 'ex_spouse' then 'ex_spouse'
    when 'chosen_family' then 'chosen_family'
    when 'friend_like_family' then 'friend_like_family'
    else null end;
  if inverse_type is null then return new; end if;
  insert into public.relationship_edges (
    family_circle_id, from_membership_id, to_membership_id, relationship_type,
    is_primary_link, is_immediate_family, is_household_link,
    is_blood_relation, is_marriage_relation, is_guardian_relation,
    status, created_by
  ) values (
    new.family_circle_id, new.to_membership_id, new.from_membership_id, inverse_type,
    new.is_primary_link, new.is_immediate_family, new.is_household_link,
    new.is_blood_relation, new.is_marriage_relation, new.is_guardian_relation,
    new.status, new.created_by
  )
  on conflict (family_circle_id, from_membership_id, to_membership_id, relationship_type)
  do nothing;
  return new;
end $$;

drop trigger if exists relationship_edges_create_inverse on public.relationship_edges;
create trigger relationship_edges_create_inverse
  after insert on public.relationship_edges
  for each row execute function public.create_inverse_relationship_edge();

-- 7. updated_at touch trigger -------------------------------------------------

create or replace function public.relationship_edges_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end $$;

drop trigger if exists relationship_edges_touch on public.relationship_edges;
create trigger relationship_edges_touch
  before update on public.relationship_edges
  for each row execute function public.relationship_edges_touch_updated_at();
