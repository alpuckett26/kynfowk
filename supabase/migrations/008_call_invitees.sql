-- ============================================================
-- Kynfowk – Pre-call invitee list
-- Migration: 008_call_invitees
-- ============================================================
-- Stores who was invited to a scheduled call. Distinct from
-- call_participants (which records who actually joined and when —
-- populated when the call starts). Storing as a uuid[] column on
-- the call row keeps it simple — no separate join table to manage,
-- and the order is preserved.

alter table calls
  add column if not exists invited_member_ids uuid[] not null default '{}';

-- Optional GIN index in case we ever query "calls that invited member X".
-- Cheap to maintain at our expected scale.
create index if not exists idx_calls_invited_member_ids
  on calls using gin (invited_member_ids);
