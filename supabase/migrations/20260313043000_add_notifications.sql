create table if not exists public.notification_preferences (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  in_app_enabled boolean not null default true,
  email_enabled boolean not null default true,
  weekly_digest_enabled boolean not null default true,
  reminder_24h_enabled boolean not null default true,
  reminder_15m_enabled boolean not null default true,
  starting_now_enabled boolean not null default true,
  push_enabled boolean not null default false,
  quiet_hours_start smallint check (quiet_hours_start between 0 and 23),
  quiet_hours_end smallint check (quiet_hours_end between 0 and 23),
  timezone text not null default 'America/Chicago',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  family_circle_id uuid references public.family_circles (id) on delete cascade,
  call_session_id uuid references public.call_sessions (id) on delete cascade,
  type text not null check (
    type in (
      'call_scheduled',
      'reminder_24h_before',
      'reminder_15m_before',
      'starting_now',
      'missing_join_link_warning',
      'call_passed_without_completion',
      'invite_claimed',
      'recap_posted',
      'weekly_connection_digest'
    )
  ),
  title text not null,
  body text not null,
  cta_label text,
  cta_href text,
  metadata jsonb,
  dedupe_key text unique,
  read_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists notifications_user_created_at_idx
  on public.notifications (user_id, created_at desc);

create table if not exists public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  channel text not null check (channel in ('in_app', 'email', 'push')),
  status text not null default 'queued' check (status in ('queued', 'sent', 'skipped', 'failed')),
  recipient text,
  provider_message_id text,
  error_message text,
  sent_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists notification_deliveries_user_status_idx
  on public.notification_deliveries (user_id, status, channel);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  last_seen_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists push_subscriptions_endpoint_idx
  on public.push_subscriptions (endpoint);

create trigger set_notification_preferences_updated_at
before update on public.notification_preferences
for each row
execute function public.set_updated_at();

alter table public.notification_preferences enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_deliveries enable row level security;
alter table public.push_subscriptions enable row level security;

create policy "notification preferences are viewable by owner"
on public.notification_preferences
for select
using (user_id = auth.uid());

create policy "notification preferences are insertable by owner"
on public.notification_preferences
for insert
with check (user_id = auth.uid());

create policy "notification preferences are editable by owner"
on public.notification_preferences
for update
using (user_id = auth.uid());

create policy "notifications are viewable by recipient"
on public.notifications
for select
using (user_id = auth.uid());

create policy "notifications are editable by recipient"
on public.notifications
for update
using (user_id = auth.uid());

create policy "family notifications can be created by circle members"
on public.notifications
for insert
with check (
  (
    user_id = auth.uid()
    and family_circle_id is null
  )
  or (
    family_circle_id is not null
    and public.is_family_member(family_circle_id)
  )
);

create policy "notification deliveries are viewable by recipient"
on public.notification_deliveries
for select
using (user_id = auth.uid());

create policy "notification deliveries can be created by circle members"
on public.notification_deliveries
for insert
with check (
  user_id = auth.uid()
  or exists (
    select 1
    from public.notifications notification
    where notification.id = notification_id
      and (
        notification.user_id = auth.uid()
        or (
          notification.family_circle_id is not null
          and public.is_family_member(notification.family_circle_id)
        )
      )
  )
);

create policy "notification deliveries are editable by recipient"
on public.notification_deliveries
for update
using (user_id = auth.uid());

create policy "push subscriptions are viewable by owner"
on public.push_subscriptions
for select
using (user_id = auth.uid());

create policy "push subscriptions are insertable by owner"
on public.push_subscriptions
for insert
with check (user_id = auth.uid());

create policy "push subscriptions are editable by owner"
on public.push_subscriptions
for update
using (user_id = auth.uid());
