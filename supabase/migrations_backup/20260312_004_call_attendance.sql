alter table public.call_participants
add column if not exists attended boolean;
