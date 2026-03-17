-- Allow "blocked" as a family membership status and add tracking columns
alter table public.family_memberships
  add column if not exists blocked_at  timestamptz,
  add column if not exists blocked_reason text;

-- Index for quick lookup of blocked members per circle
create index if not exists family_memberships_blocked_idx
  on public.family_memberships(family_circle_id, status)
  where status = 'blocked';
