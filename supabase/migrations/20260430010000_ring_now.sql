-- M42 — "Ring now" / spontaneous incoming call
--
-- Lets one family member ring another in real time (vs. scheduling a
-- future call). The recipient gets a high-priority push immediately,
-- their device shows an incoming-call screen with Accept / Decline,
-- and a 30-second timeout marks unanswered rings as missed.
--
-- Schema additions:
--   - new notifications.type enum values: incoming_call, call_missed,
--     call_declined
--   - call_sessions.is_ring boolean — distinguishes spontaneous "ring
--     now" calls from scheduled ones in the UI + sweep logic
--
-- All else (call_sessions status flow, call_participants, push
-- delivery via lib/send-push.ts, WebRTC signaling via Supabase
-- Realtime) is reused as-is.

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
      'weekly_briefing',
      'incoming_call',
      'call_missed',
      'call_declined'
    )
  );

alter table public.call_sessions
  add column if not exists is_ring boolean not null default false;

create index if not exists call_sessions_is_ring_idx
  on public.call_sessions (is_ring, status, created_at desc)
  where is_ring = true;
