-- M20 — family prompts beyond this-or-that polls
-- Adds per-circle text/memory/photo prompts authored by the owner. Existing
-- shared this-or-that polls (family_polls / family_poll_responses) are
-- untouched — this is an additive parallel feature.

do $$ begin
  create type public.family_prompt_kind as enum (
    'memory','open_text','photo_request'
  );
exception
  when duplicate_object then null;
end $$;

create table if not exists public.family_prompts (
  id                          uuid primary key default gen_random_uuid(),
  family_circle_id            uuid not null references public.family_circles(id) on delete cascade,
  kind                        public.family_prompt_kind not null,
  prompt_text                 text not null,
  created_by_membership_id    uuid references public.family_memberships(id) on delete set null,
  created_at                  timestamptz not null default now(),
  closed_at                   timestamptz
);

create index if not exists family_prompts_circle_open_idx
  on public.family_prompts (family_circle_id)
  where closed_at is null;

create table if not exists public.family_prompt_responses (
  id              uuid primary key default gen_random_uuid(),
  prompt_id       uuid not null references public.family_prompts(id) on delete cascade,
  membership_id   uuid not null references public.family_memberships(id) on delete cascade,
  text_response   text,
  photo_url       text,
  created_at      timestamptz not null default now(),
  unique (prompt_id, membership_id),
  check (text_response is not null or photo_url is not null)
);

create index if not exists family_prompt_responses_prompt_idx
  on public.family_prompt_responses (prompt_id);

-- ── RLS ─────────────────────────────────────────────────────────────────────

alter table public.family_prompts enable row level security;
alter table public.family_prompt_responses enable row level security;

create policy "family_prompts_select"
  on public.family_prompts
  for select
  to authenticated
  using (family_circle_id in (select public.get_my_family_circle_ids()));

create policy "family_prompts_owner_write"
  on public.family_prompts
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

create policy "family_prompt_responses_select"
  on public.family_prompt_responses
  for select
  to authenticated
  using (
    prompt_id in (
      select id from public.family_prompts
      where family_circle_id in (select public.get_my_family_circle_ids())
    )
  );

create policy "family_prompt_responses_self_write"
  on public.family_prompt_responses
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
