-- M27 — auto-scheduling engine
-- Mandatory cadence-based call creation across every circle a member belongs
-- to. Tier rules (immediate=7d, close=14d, extended=30d, distant=90d) drive
-- the daily cron. Minors require their managing parent in the call before
-- the engine will materialize anything.

-- ── Extend the relationship_kind enum with kinds the M16 set didn't cover ──
alter type public.relationship_kind add value if not exists 'cousin';
alter type public.relationship_kind add value if not exists 'aunt';
alter type public.relationship_kind add value if not exists 'uncle';
alter type public.relationship_kind add value if not exists 'niece';
alter type public.relationship_kind add value if not exists 'nephew';
alter type public.relationship_kind add value if not exists 'great_grandparent';
alter type public.relationship_kind add value if not exists 'great_grandchild';

-- ── Cross-circle kin links ────────────────────────────────────────────────
-- Distinct from relationship_edges (which is single-circle). A pending row
-- waits for the other circle's owner to approve before it counts. When
-- linking an adult to a minor across circles, the minor's managing parent
-- must approve — enforced in the endpoint handler.
create table if not exists public.cross_circle_kin_links (
  id                       uuid primary key default gen_random_uuid(),
  source_membership_id     uuid not null references public.family_memberships(id) on delete cascade,
  target_membership_id     uuid not null references public.family_memberships(id) on delete cascade,
  kind                     public.relationship_kind not null,
  -- 'pending' | 'active' | 'declined'
  status                   text not null default 'pending',
  created_by               uuid references auth.users(id) on delete set null,
  approved_by              uuid references auth.users(id) on delete set null,
  created_at               timestamptz not null default now(),
  approved_at              timestamptz,
  unique (source_membership_id, target_membership_id, kind),
  check (source_membership_id <> target_membership_id)
);

create index if not exists cross_circle_kin_links_source_idx
  on public.cross_circle_kin_links (source_membership_id);
create index if not exists cross_circle_kin_links_target_idx
  on public.cross_circle_kin_links (target_membership_id);
create index if not exists cross_circle_kin_links_status_idx
  on public.cross_circle_kin_links (status);

alter table public.cross_circle_kin_links enable row level security;

-- A viewer sees a link if they belong to either side's circle.
create policy "cross_circle_kin_links_select"
  on public.cross_circle_kin_links
  for select
  to authenticated
  using (
    source_membership_id in (
      select fm.id from public.family_memberships fm
      where fm.family_circle_id in (select public.get_my_family_circle_ids())
    )
    or target_membership_id in (
      select fm.id from public.family_memberships fm
      where fm.family_circle_id in (select public.get_my_family_circle_ids())
    )
  );

-- Only the source circle's owner can create a link.
create policy "cross_circle_kin_links_owner_insert"
  on public.cross_circle_kin_links
  for insert
  to authenticated
  with check (
    source_membership_id in (
      select fm.id from public.family_memberships fm
      where fm.family_circle_id in (
        select id from public.family_circles where created_by = auth.uid()
      )
    )
  );

-- Either side's owner can update (approve/decline).
create policy "cross_circle_kin_links_owner_update"
  on public.cross_circle_kin_links
  for update
  to authenticated
  using (
    source_membership_id in (
      select fm.id from public.family_memberships fm
      where fm.family_circle_id in (
        select id from public.family_circles where created_by = auth.uid()
      )
    )
    or target_membership_id in (
      select fm.id from public.family_memberships fm
      where fm.family_circle_id in (
        select id from public.family_circles where created_by = auth.uid()
      )
    )
  );

create policy "cross_circle_kin_links_owner_delete"
  on public.cross_circle_kin_links
  for delete
  to authenticated
  using (
    source_membership_id in (
      select fm.id from public.family_memberships fm
      where fm.family_circle_id in (
        select id from public.family_circles where created_by = auth.uid()
      )
    )
  );

-- ── Tier configuration (read-only seed for v1) ────────────────────────────
create table if not exists public.connection_tiers (
  id                  text primary key, -- 'immediate' | 'close' | 'extended' | 'distant'
  name                text not null,
  min_days_between    int  not null,
  ordinal             int  not null
);

insert into public.connection_tiers (id, name, min_days_between, ordinal) values
  ('immediate', 'Immediate', 7,  1),
  ('close',     'Close',    14,  2),
  ('extended',  'Extended', 30,  3),
  ('distant',   'Distant',  90,  4)
on conflict (id) do nothing;

alter table public.connection_tiers enable row level security;
create policy "connection_tiers_select"
  on public.connection_tiers for select to authenticated using (true);

-- ── Map relationship_kind → tier ──────────────────────────────────────────
create table if not exists public.relationship_kind_tiers (
  kind public.relationship_kind primary key,
  tier text not null references public.connection_tiers(id)
);

-- Run inserts in a separate statement so the new enum values from above
-- have been committed by the time we reference them.
do $$
begin
  insert into public.relationship_kind_tiers (kind, tier) values
    ('parent','immediate'), ('child','immediate'),
    ('spouse','immediate'), ('partner','immediate'),
    ('sibling','close'), ('grandparent','close'), ('grandchild','close'),
    ('step_parent','close'), ('step_child','close'), ('in_law','close'),
    ('cousin','extended'), ('aunt','extended'), ('uncle','extended'),
    ('niece','extended'), ('nephew','extended'),
    ('great_grandparent','extended'), ('great_grandchild','extended'),
    ('other','distant'), ('ward','distant'), ('guardian','distant')
  on conflict (kind) do nothing;
exception
  when others then
    raise notice 'relationship_kind_tiers seed deferred — new enum values may need to commit first: %', sqlerrm;
end $$;

alter table public.relationship_kind_tiers enable row level security;
create policy "relationship_kind_tiers_select"
  on public.relationship_kind_tiers for select to authenticated using (true);

-- ── Per-user consent + circuit breakers ──────────────────────────────────
alter table public.profiles
  add column if not exists auto_schedule_enabled boolean not null default true,
  add column if not exists auto_schedule_paused_until timestamptz,
  add column if not exists auto_schedule_max_per_week int not null default 7;

-- ── Per-minor parental opt-in ─────────────────────────────────────────────
-- True at creation; managing parent can flip it off without removing the
-- minor from the circle. Engine treats false as "skip this minor entirely."
alter table public.family_memberships
  add column if not exists parental_auto_schedule_consent boolean not null default true;

-- ── Tag auto-scheduled calls so the UI can label them and the engine can ──
-- avoid double-counting / re-scheduling.
alter table public.call_sessions
  add column if not exists auto_scheduled boolean not null default false,
  add column if not exists auto_schedule_tier text references public.connection_tiers(id);

create index if not exists call_sessions_auto_idx
  on public.call_sessions (auto_scheduled, scheduled_start)
  where auto_scheduled = true;
