-- Durable attendance events for in-app live calls
create table if not exists public.call_attendance_events (
  id             uuid primary key default gen_random_uuid(),
  call_session_id uuid not null references public.call_sessions(id) on delete cascade,
  membership_id  uuid not null references public.family_memberships(id) on delete cascade,
  joined_at      timestamptz not null default now(),
  left_at        timestamptz,
  created_at     timestamptz not null default now()
);

create index if not exists call_attendance_events_call_idx
  on public.call_attendance_events(call_session_id);

create index if not exists call_attendance_events_membership_idx
  on public.call_attendance_events(membership_id);

-- RLS
alter table public.call_attendance_events enable row level security;

-- Members can read attendance for their own family circle's calls
create policy "call_attendance_events_select"
  on public.call_attendance_events for select to authenticated
  using (
    call_session_id in (
      select cs.id
      from public.call_sessions cs
      where cs.family_circle_id in (
        select fm.family_circle_id
        from public.family_memberships fm
        where fm.user_id = (select auth.uid())
          and fm.status = 'active'
      )
    )
  );

-- Members can insert their own events
create policy "call_attendance_events_insert"
  on public.call_attendance_events for insert to authenticated
  with check (
    membership_id in (
      select fm.id
      from public.family_memberships fm
      where fm.user_id = (select auth.uid())
        and fm.status = 'active'
    )
  );

-- Members can update their own events (to set left_at)
create policy "call_attendance_events_update"
  on public.call_attendance_events for update to authenticated
  using (
    membership_id in (
      select fm.id
      from public.family_memberships fm
      where fm.user_id = (select auth.uid())
        and fm.status = 'active'
    )
  );
