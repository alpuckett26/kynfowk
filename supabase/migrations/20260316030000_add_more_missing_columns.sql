-- Add columns that existed in the Supabase dashboard but were never tracked
-- in migrations (they were created via the UI before migrations were set up).

-- call_sessions: actual_duration_minutes (set when completing a call)
alter table public.call_sessions
add column if not exists actual_duration_minutes integer;

-- call_participants: attended (set when completing a call)
alter table public.call_participants
add column if not exists attended boolean default false;

-- family_memberships: display_name (set during onboarding)
alter table public.family_memberships
add column if not exists display_name text;

-- call_recaps: all recap columns
alter table public.call_recaps
add column if not exists summary text,
add column if not exists highlight text,
add column if not exists next_step text;
