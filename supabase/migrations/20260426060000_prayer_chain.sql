-- M23 — prayer chain
-- Per-circle intentions + member supportive responses. Daily lectionary
-- reading is fetched at request time from a configurable feed; no new
-- table needed for that piece.

create table if not exists public.prayer_intentions (
  id                          uuid primary key default gen_random_uuid(),
  family_circle_id            uuid not null references public.family_circles(id) on delete cascade,
  author_membership_id        uuid not null references public.family_memberships(id) on delete cascade,
  body                        text not null,
  -- 'open' | 'answered' | 'archived'
  status                      text not null default 'open',
  created_at                  timestamptz not null default now()
);

create index if not exists prayer_intentions_circle_status_idx
  on public.prayer_intentions (family_circle_id, status);

create table if not exists public.prayer_responses (
  id              uuid primary key default gen_random_uuid(),
  intention_id    uuid not null references public.prayer_intentions(id) on delete cascade,
  membership_id   uuid not null references public.family_memberships(id) on delete cascade,
  message         text,
  created_at      timestamptz not null default now()
);

create index if not exists prayer_responses_intention_idx
  on public.prayer_responses (intention_id);

-- ── RLS ─────────────────────────────────────────────────────────────────────

alter table public.prayer_intentions enable row level security;
alter table public.prayer_responses enable row level security;

create policy "prayer_intentions_select"
  on public.prayer_intentions
  for select
  to authenticated
  using (family_circle_id in (select public.get_my_family_circle_ids()));

create policy "prayer_intentions_self_write"
  on public.prayer_intentions
  for all
  to authenticated
  using (
    author_membership_id in (
      select id from public.family_memberships where user_id = auth.uid()
    )
    or family_circle_id in (
      select id from public.family_circles where created_by = auth.uid()
    )
  )
  with check (
    author_membership_id in (
      select id from public.family_memberships where user_id = auth.uid()
    )
    or family_circle_id in (
      select id from public.family_circles where created_by = auth.uid()
    )
  );

create policy "prayer_responses_select"
  on public.prayer_responses
  for select
  to authenticated
  using (
    intention_id in (
      select id from public.prayer_intentions
      where family_circle_id in (select public.get_my_family_circle_ids())
    )
  );

create policy "prayer_responses_self_write"
  on public.prayer_responses
  for all
  to authenticated
  using (
    membership_id in (
      select id from public.family_memberships where user_id = auth.uid()
    )
  )
  with check (
    membership_id in (
      select id from public.family_memberships where user_id = auth.uid()
    )
  );
