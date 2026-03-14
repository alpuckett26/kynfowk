alter table public.call_sessions
add column if not exists reminder_status text,
add column if not exists reminder_sent_at timestamptz;

update public.call_sessions
set reminder_status = case
  when status in ('completed', 'canceled') then 'not_needed'
  else 'pending'
end
where reminder_status is null;

alter table public.call_sessions
alter column reminder_status set default 'pending';

alter table public.call_sessions
alter column reminder_status set not null;

alter table public.call_sessions
drop constraint if exists call_sessions_reminder_status_check;

alter table public.call_sessions
add constraint call_sessions_reminder_status_check
check (reminder_status in ('pending', 'sent', 'not_needed'));
