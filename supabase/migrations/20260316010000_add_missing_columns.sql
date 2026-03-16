-- Add columns that were skipped because their migrations were marked as applied
-- without actually running (via migration repair after Supabase dashboard setup).

-- From 20260313053000_add_call_recovery_state.sql
alter table public.call_sessions
add column if not exists recovery_dismissed_at timestamptz;

-- Verify suggested reschedule columns from call recovery state as well
-- (added via Supabase dashboard originally)
alter table public.call_sessions
add column if not exists suggested_reschedule_start timestamptz;

alter table public.call_sessions
add column if not exists suggested_reschedule_end timestamptz;
