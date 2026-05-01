-- M44 — monetization v1 schema
-- Backs the paid-tier gate that the web <AdSlot> component reads, plus the
-- referral_links + reward_pool_events tables that v2 (WLL Dynamo +
-- Tremendous payouts) will write to. Schema ships ahead of the integration
-- so v1 surfaces (AdSlot gating, referral CTAs) can already store and read
-- truthful state.
--
-- Three changes:
--   1. profiles.is_paid_tier (bool) + subscription_tier (text) — read by
--      AdSlot to decide whether to render an ad slot. Default to free so
--      every existing user sees ads until billing flips them.
--   2. referral_links — per-user shareable codes. v1 just needs the row
--      so the share button has something to copy; v2 will increment
--      claim_count + emit reward_pool_events when a claim converts.
--   3. reward_pool_events — append-only ledger of point/cash flows. v1
--      writes nothing; the table exists so the v2 worker has a target.

alter table public.profiles
  add column if not exists is_paid_tier boolean not null default false,
  add column if not exists subscription_tier text not null default 'free'
    check (subscription_tier in ('free', 'paid'));

create index if not exists profiles_is_paid_tier_idx
  on public.profiles (is_paid_tier)
  where is_paid_tier = true;

create table if not exists public.referral_links (
  id              uuid primary key default gen_random_uuid(),
  owner_user_id   uuid not null references auth.users(id) on delete cascade,
  code            text not null unique,
  claim_count     integer not null default 0,
  expires_at      timestamptz,
  created_at      timestamptz not null default now()
);

create index if not exists referral_links_owner_idx
  on public.referral_links (owner_user_id, created_at desc);

alter table public.referral_links enable row level security;

drop policy if exists "referral_links_select_own" on public.referral_links;
create policy "referral_links_select_own"
  on public.referral_links
  for select
  to authenticated
  using (owner_user_id = auth.uid());

drop policy if exists "referral_links_insert_own" on public.referral_links;
create policy "referral_links_insert_own"
  on public.referral_links
  for insert
  to authenticated
  with check (owner_user_id = auth.uid());

drop policy if exists "referral_links_update_own" on public.referral_links;
create policy "referral_links_update_own"
  on public.referral_links
  for update
  to authenticated
  using (owner_user_id = auth.uid())
  with check (owner_user_id = auth.uid());

create table if not exists public.reward_pool_events (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  event_kind          text not null check (event_kind in (
    'referral_paid',
    'community_roots_credit',
    'rewarded_video',
    'manual_adjustment'
  )),
  amount_points       integer not null default 0,
  amount_cents        integer not null default 0,
  currency            text not null default 'USD',
  source_referral_id  uuid references public.referral_links(id) on delete set null,
  source_call_id      uuid references public.call_sessions(id) on delete set null,
  notes               text,
  created_at          timestamptz not null default now()
);

create index if not exists reward_pool_events_user_idx
  on public.reward_pool_events (user_id, created_at desc);
create index if not exists reward_pool_events_kind_idx
  on public.reward_pool_events (event_kind, created_at desc);

alter table public.reward_pool_events enable row level security;

-- Read-only for the recipient. All writes go through service-role workers
-- (referral conversion, rewarded-video callback, manual admin tooling) so
-- no insert/update/delete policy is granted to the authenticated role.
drop policy if exists "reward_pool_events_select_own" on public.reward_pool_events;
create policy "reward_pool_events_select_own"
  on public.reward_pool_events
  for select
  to authenticated
  using (user_id = auth.uid());
