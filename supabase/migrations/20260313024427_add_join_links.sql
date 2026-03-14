alter table public.call_sessions
add column if not exists meeting_provider text,
add column if not exists meeting_url text,
add column if not exists actual_started_at timestamptz,
add column if not exists actual_ended_at timestamptz;

alter table public.call_sessions
drop constraint if exists call_sessions_status_check;

alter table public.call_sessions
add constraint call_sessions_status_check
check (status in ('scheduled', 'live', 'completed', 'canceled'));