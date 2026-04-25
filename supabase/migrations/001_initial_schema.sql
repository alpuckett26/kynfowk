-- ============================================================
-- Kynfowk – Initial Schema
-- Migration: 001_initial_schema
-- ============================================================

-- Extensions
create extension if not exists "uuid-ossp";

-- ─── Families ──────────────────────────────────────────────
create table if not exists families (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  created_at  timestamptz not null default now()
);

-- ─── Family Members ────────────────────────────────────────
create table if not exists family_members (
  id            uuid primary key default uuid_generate_v4(),
  family_id     uuid not null references families(id) on delete cascade,
  display_name  text not null,
  email         text not null unique,
  is_elder      boolean not null default false,
  avatar_url    text,
  created_at    timestamptz not null default now()
);

create index idx_family_members_family_id on family_members(family_id);

-- ─── Calls ─────────────────────────────────────────────────
create type call_status as enum ('scheduled', 'in_progress', 'completed', 'missed');

create table if not exists calls (
  id                uuid primary key default uuid_generate_v4(),
  family_id         uuid not null references families(id) on delete cascade,
  title             text,
  scheduled_at      timestamptz not null,
  started_at        timestamptz,
  ended_at          timestamptz,
  duration_seconds  integer,
  status            call_status not null default 'scheduled',
  participant_count integer,
  created_at        timestamptz not null default now()
);

create index idx_calls_family_id      on calls(family_id);
create index idx_calls_status         on calls(status);
create index idx_calls_scheduled_at   on calls(scheduled_at desc);

-- ─── Call Participants ─────────────────────────────────────
create table if not exists call_participants (
  id         uuid primary key default uuid_generate_v4(),
  call_id    uuid not null references calls(id) on delete cascade,
  member_id  uuid not null references family_members(id) on delete cascade,
  joined_at  timestamptz not null default now(),
  left_at    timestamptz,
  unique (call_id, member_id)
);

create index idx_call_participants_call_id   on call_participants(call_id);
create index idx_call_participants_member_id on call_participants(member_id);

-- ─── Connection Events ─────────────────────────────────────
-- One row per scoring event. Aggregated into family_connection_stats.
create type connection_event_type as enum (
  'call_completed',   -- base: every completed call (+1)
  'long_call',        -- call >= 10 min (+1)
  'group_call',       -- 3+ participants (+1)
  'reconnection',     -- first call in 30+ days (+2)
  'elder_call'        -- elder participated (+1)
);

create table if not exists connection_events (
  id          uuid primary key default uuid_generate_v4(),
  family_id   uuid not null references families(id) on delete cascade,
  call_id     uuid not null references calls(id) on delete cascade,
  member_id   uuid not null references family_members(id) on delete cascade,
  event_type  connection_event_type not null,
  score_delta integer not null default 0,
  metadata    jsonb,
  created_at  timestamptz not null default now()
);

create index idx_connection_events_family_id  on connection_events(family_id);
create index idx_connection_events_call_id    on connection_events(call_id);
create index idx_connection_events_member_id  on connection_events(member_id);
create index idx_connection_events_created_at on connection_events(created_at desc);

-- ─── Family Connection Stats (weekly aggregate) ────────────
create table if not exists family_connection_stats (
  id                        uuid primary key default uuid_generate_v4(),
  family_id                 uuid not null references families(id) on delete cascade,
  week_start                date not null,  -- Monday of ISO week
  completed_calls           integer not null default 0,
  total_minutes             integer not null default 0,
  unique_members_connected  integer not null default 0,
  connection_score          integer not null default 0,
  streak_weeks              integer not null default 0,
  updated_at                timestamptz not null default now(),
  unique (family_id, week_start)
);

create index idx_family_connection_stats_family_week
  on family_connection_stats(family_id, week_start desc);

-- ─── RLS Policies ──────────────────────────────────────────
alter table families              enable row level security;
alter table family_members        enable row level security;
alter table calls                 enable row level security;
alter table call_participants     enable row level security;
alter table connection_events     enable row level security;
alter table family_connection_stats enable row level security;

-- Members can read their own family data
-- (Auth integration assumed: auth.uid() maps to family_members.id via a profile join)
-- These are permissive placeholder policies — tighten for production:
create policy "family members can read their family"
  on families for select using (true);

create policy "family members can read family members"
  on family_members for select using (true);

create policy "family members can read calls"
  on calls for select using (true);

create policy "family members can read participants"
  on call_participants for select using (true);

create policy "family members can read connection events"
  on connection_events for select using (true);

create policy "family members can read stats"
  on family_connection_stats for select using (true);
