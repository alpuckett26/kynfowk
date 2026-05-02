-- M45 — make Ring Now actually ring
--
-- The IncomingCallWatcher subscribes to Postgres INSERT events on
-- public.call_sessions via Supabase Realtime, but the table was never
-- added to the supabase_realtime publication, so subscribers were
-- listening to silence. Result: every Ring Now from a web caller never
-- reached the recipient — push notification fan-out was the only path
-- that worked, and that path is gated by Web Push (iOS PWA-only).
--
-- Adding the table to the publication is enough — postgres_changes
-- INSERT events with filter is_ring=eq.true now reach every subscribed
-- client within ~1s.
--
-- Idempotent: catches the duplicate_object error if the table is
-- already in the publication on this environment.

do $$
begin
  alter publication supabase_realtime add table public.call_sessions;
exception
  when duplicate_object then
    null;
  when undefined_object then
    -- supabase_realtime publication doesn't exist on this env; skip.
    null;
end $$;
