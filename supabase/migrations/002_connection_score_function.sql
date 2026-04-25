-- ============================================================
-- Kynfowk – Connection Score Function + Trigger
-- Migration: 002_connection_score_function
-- ============================================================

-- Called after a call is marked completed.
-- Inserts connection_events and upserts family_connection_stats.
create or replace function record_connection_events(p_call_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_call           calls%rowtype;
  v_duration_min   integer;
  v_participant    call_participants%rowtype;
  v_last_call_date timestamptz;
  v_is_elder       boolean;
  v_score          integer;
  v_week_start     date;
  v_unique_members integer;
begin
  -- Fetch call
  select * into v_call from calls where id = p_call_id;
  if not found or v_call.status <> 'completed' then
    return;
  end if;

  v_duration_min := coalesce(v_call.duration_seconds, 0) / 60;
  v_week_start   := date_trunc('week', v_call.ended_at)::date;

  -- Count unique members
  select count(*) into v_unique_members
  from call_participants where call_id = p_call_id;

  -- Iterate participants
  for v_participant in
    select * from call_participants where call_id = p_call_id
  loop
    -- Base: call_completed (+1)
    insert into connection_events
      (family_id, call_id, member_id, event_type, score_delta)
    values
      (v_call.family_id, p_call_id, v_participant.member_id, 'call_completed', 1)
    on conflict do nothing;

    -- Long call (+1)
    if v_duration_min >= 10 then
      insert into connection_events
        (family_id, call_id, member_id, event_type, score_delta)
      values
        (v_call.family_id, p_call_id, v_participant.member_id, 'long_call', 1)
      on conflict do nothing;
    end if;

    -- Group call (+1)
    if v_unique_members >= 3 then
      insert into connection_events
        (family_id, call_id, member_id, event_type, score_delta)
      values
        (v_call.family_id, p_call_id, v_participant.member_id, 'group_call', 1)
      on conflict do nothing;
    end if;

    -- Reconnection after 30+ days (+2)
    select max(c.ended_at) into v_last_call_date
    from calls c
    join call_participants cp on cp.call_id = c.id
    where cp.member_id = v_participant.member_id
      and c.status = 'completed'
      and c.id <> p_call_id;

    if v_last_call_date is null or
       (v_call.ended_at - v_last_call_date) > interval '30 days' then
      insert into connection_events
        (family_id, call_id, member_id, event_type, score_delta)
      values
        (v_call.family_id, p_call_id, v_participant.member_id, 'reconnection', 2)
      on conflict do nothing;
    end if;

    -- Elder participation (+1)
    select is_elder into v_is_elder
    from family_members where id = v_participant.member_id;

    if v_is_elder then
      insert into connection_events
        (family_id, call_id, member_id, event_type, score_delta)
      values
        (v_call.family_id, p_call_id, v_participant.member_id, 'elder_call', 1)
      on conflict do nothing;
    end if;
  end loop;

  -- Upsert weekly stats
  insert into family_connection_stats (
    family_id,
    week_start,
    completed_calls,
    total_minutes,
    unique_members_connected,
    connection_score,
    streak_weeks,
    updated_at
  )
  select
    v_call.family_id,
    v_week_start,
    count(distinct c.id)                  as completed_calls,
    sum(coalesce(c.duration_seconds,0))/60 as total_minutes,
    count(distinct cp.member_id)          as unique_members_connected,
    sum(ce.score_delta)                   as connection_score,
    0                                     as streak_weeks, -- computed separately
    now()                                 as updated_at
  from calls c
  join call_participants cp on cp.call_id = c.id
  join connection_events ce on ce.call_id = c.id and ce.member_id = cp.member_id
  where c.family_id = v_call.family_id
    and date_trunc('week', c.ended_at)::date = v_week_start
    and c.status = 'completed'
  on conflict (family_id, week_start) do update
    set completed_calls          = excluded.completed_calls,
        total_minutes            = excluded.total_minutes,
        unique_members_connected = excluded.unique_members_connected,
        connection_score         = excluded.connection_score,
        updated_at               = now();

  -- Compute streak: consecutive weeks with ≥1 completed call
  with weeks as (
    select week_start,
           row_number() over (order by week_start desc) as rn
    from family_connection_stats
    where family_id = v_call.family_id
      and completed_calls > 0
      and week_start <= v_week_start
  ),
  consecutive as (
    select week_start, rn,
           (v_week_start - (rn - 1) * interval '1 week')::date as expected
    from weeks
  ),
  streak_count as (
    select count(*) as streak
    from consecutive
    where week_start = expected
  )
  update family_connection_stats
  set streak_weeks = (select streak from streak_count)
  where family_id = v_call.family_id
    and week_start = v_week_start;

end;
$$;

-- Auto-trigger when a call transitions to 'completed'
create or replace function trigger_connection_events()
returns trigger
language plpgsql
as $$
begin
  if NEW.status = 'completed' and (OLD.status is distinct from 'completed') then
    perform record_connection_events(NEW.id);
  end if;
  return NEW;
end;
$$;

drop trigger if exists on_call_completed on calls;
create trigger on_call_completed
  after update on calls
  for each row
  execute function trigger_connection_events();
