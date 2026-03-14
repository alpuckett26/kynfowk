create table if not exists public.pilot_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  family_circle_id uuid references public.family_circles (id) on delete set null,
  call_session_id uuid references public.call_sessions (id) on delete set null,
  category text not null check (category in ('bug', 'confusing', 'suggestion', 'positive')),
  page_path text,
  message text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.product_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  family_circle_id uuid references public.family_circles (id) on delete set null,
  call_session_id uuid references public.call_sessions (id) on delete set null,
  event_name text not null check (
    event_name in (
      'signup_completed',
      'signin_completed',
      'family_circle_created',
      'invite_claimed',
      'availability_saved',
      'call_scheduled',
      'join_clicked',
      'call_completed',
      'recap_saved',
      'push_enabled'
    )
  ),
  metadata jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.pilot_feedback enable row level security;
alter table public.product_events enable row level security;

create policy "users can insert their own pilot feedback"
on public.pilot_feedback
for insert
with check (user_id = auth.uid());

create policy "users can view their own pilot feedback"
on public.pilot_feedback
for select
using (user_id = auth.uid());

create policy "users can insert their own product events"
on public.product_events
for insert
with check (user_id = auth.uid() or user_id is null);
