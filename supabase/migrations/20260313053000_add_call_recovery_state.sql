alter table public.call_sessions
add column if not exists recovery_dismissed_at timestamptz;
