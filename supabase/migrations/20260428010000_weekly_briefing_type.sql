-- M37 — extend notifications.type check constraint with 'weekly_briefing'
-- The Sunday Family Briefing replaces the older weekly_connection_digest as
-- the canonical anchor email. The old value stays in the allow-list so
-- historical rows keep validating; new inserts use the new type.

alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check
  check (
    type in (
      'call_scheduled',
      'reminder_24h_before',
      'reminder_15m_before',
      'starting_now',
      'missing_join_link_warning',
      'call_passed_without_completion',
      'invite_claimed',
      'recap_posted',
      'weekly_connection_digest',
      'weekly_briefing'
    )
  );
