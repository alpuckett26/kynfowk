-- M16 — relationship graph + family units
-- Spec §38 "Immediate Next Build Target". Lets the app understand structured
-- relationships (parent, sibling, spouse, etc.) and group memberships into
-- households / branches.

-- ── enum ────────────────────────────────────────────────────────────────────

do $$ begin
  create type public.relationship_kind as enum (
    'parent','child','spouse','sibling','grandparent','grandchild',
    'in_law','step_parent','step_child','guardian','ward','partner','other'
  );
exception
  when duplicate_object then null;
end $$;

-- ── relationship_edges ──────────────────────────────────────────────────────

create table if not exists public.relationship_edges (
  id                    uuid primary key default gen_random_uuid(),
  family_circle_id      uuid not null references public.family_circles(id) on delete cascade,
  source_membership_id  uuid not null references public.family_memberships(id) on delete cascade,
  target_membership_id  uuid not null references public.family_memberships(id) on delete cascade,
  kind                  public.relationship_kind not null,
  notes                 text,
  created_by            uuid references auth.users(id) on delete set null,
  created_at            timestamptz not null default now(),
  unique (source_membership_id, target_membership_id, kind),
  check (source_membership_id <> target_membership_id)
);

create index if not exists relationship_edges_circle_idx
  on public.relationship_edges (family_circle_id);
create index if not exists relationship_edges_source_idx
  on public.relationship_edges (source_membership_id);
create index if not exists relationship_edges_target_idx
  on public.relationship_edges (target_membership_id);

alter table public.relationship_edges enable row level security;

create policy "relationship_edges_select"
  on public.relationship_edges
  for select
  to authenticated
  using (family_circle_id in (select public.get_my_family_circle_ids()));

create policy "relationship_edges_insert"
  on public.relationship_edges
  for insert
  to authenticated
  with check (
    family_circle_id in (
      select id from public.family_circles where created_by = auth.uid()
    )
  );

create policy "relationship_edges_delete"
  on public.relationship_edges
  for delete
  to authenticated
  using (
    family_circle_id in (
      select id from public.family_circles where created_by = auth.uid()
    )
  );

-- ── family_units ────────────────────────────────────────────────────────────

create table if not exists public.family_units (
  id                uuid primary key default gen_random_uuid(),
  family_circle_id  uuid not null references public.family_circles(id) on delete cascade,
  name              text not null,
  -- 'household' | 'branch' | 'other'
  kind              text not null default 'household',
  created_by        uuid references auth.users(id) on delete set null,
  created_at        timestamptz not null default now()
);

create index if not exists family_units_circle_idx
  on public.family_units (family_circle_id);

alter table public.family_units enable row level security;

create policy "family_units_select"
  on public.family_units
  for select
  to authenticated
  using (family_circle_id in (select public.get_my_family_circle_ids()));

create policy "family_units_owner_write"
  on public.family_units
  for all
  to authenticated
  using (
    family_circle_id in (
      select id from public.family_circles where created_by = auth.uid()
    )
  )
  with check (
    family_circle_id in (
      select id from public.family_circles where created_by = auth.uid()
    )
  );

-- ── family_unit_members ─────────────────────────────────────────────────────

create table if not exists public.family_unit_members (
  family_unit_id    uuid not null references public.family_units(id) on delete cascade,
  membership_id     uuid not null references public.family_memberships(id) on delete cascade,
  -- 'head' | 'spouse' | 'child' | 'other'
  role              text,
  primary key (family_unit_id, membership_id)
);

create index if not exists family_unit_members_membership_idx
  on public.family_unit_members (membership_id);

alter table public.family_unit_members enable row level security;

create policy "family_unit_members_select"
  on public.family_unit_members
  for select
  to authenticated
  using (
    family_unit_id in (
      select id from public.family_units
      where family_circle_id in (select public.get_my_family_circle_ids())
    )
  );

create policy "family_unit_members_owner_write"
  on public.family_unit_members
  for all
  to authenticated
  using (
    family_unit_id in (
      select id from public.family_units
      where family_circle_id in (
        select id from public.family_circles where created_by = auth.uid()
      )
    )
  )
  with check (
    family_unit_id in (
      select id from public.family_units
      where family_circle_id in (
        select id from public.family_circles where created_by = auth.uid()
      )
    )
  );
