-- M106 - consent-based, time-limited location sharing for immediate family.

create table if not exists public.member_location_shares (
  id uuid primary key default gen_random_uuid(),
  family_circle_id uuid not null references public.family_circles(id) on delete cascade,
  membership_id uuid not null unique references public.family_memberships(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  accuracy_meters double precision check (accuracy_meters is null or accuracy_meters >= 0),
  recipient_membership_ids uuid[] not null default '{}',
  shared_until timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (shared_until <= now() + interval '24 hours')
);

create index if not exists member_location_shares_circle_active_idx
  on public.member_location_shares (family_circle_id, shared_until desc);

create trigger set_member_location_shares_updated_at
before update on public.member_location_shares
for each row execute function public.set_updated_at();

alter table public.member_location_shares enable row level security;

create policy "location shares are visible to owner and chosen family"
on public.member_location_shares
for select to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.family_memberships viewer
    where viewer.user_id = auth.uid()
      and viewer.family_circle_id = member_location_shares.family_circle_id
      and viewer.status = 'active'
      and viewer.blocked_at is null
      and viewer.id = any(member_location_shares.recipient_membership_ids)
  )
);

create policy "members create their own location share"
on public.member_location_shares
for insert to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.family_memberships membership
    where membership.id = membership_id
      and membership.user_id = auth.uid()
      and membership.family_circle_id = family_circle_id
      and membership.status = 'active'
      and membership.blocked_at is null
  )
);

create policy "members update their own location share"
on public.member_location_shares
for update to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.family_memberships membership
    where membership.id = membership_id
      and membership.user_id = auth.uid()
      and membership.family_circle_id = family_circle_id
      and membership.status = 'active'
      and membership.blocked_at is null
  )
);

create policy "members delete their own location share"
on public.member_location_shares
for delete to authenticated
using (user_id = auth.uid());

revoke all on table public.member_location_shares from anon;
grant select, insert, update, delete on table public.member_location_shares to authenticated;

alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (
  type in (
    'call_scheduled', 'reminder_24h_before', 'reminder_15m_before',
    'starting_now', 'missing_join_link_warning',
    'call_passed_without_completion', 'invite_claimed', 'recap_posted',
    'weekly_connection_digest', 'weekly_briefing', 'incoming_call',
    'call_missed', 'call_declined', 'location_shared'
  )
);
