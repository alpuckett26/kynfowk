-- TEMPORARY DEBUG: Make call_sessions fully readable by all authenticated users.
-- If the E2E test passes with this policy, the issue is with the policy conditions.
-- If it still fails, the issue is elsewhere (e.g. circle ID mismatch in app logic).
-- This will be locked down again once the root cause is identified.

drop policy if exists "call_sessions_select" on public.call_sessions;

create policy "call_sessions_select"
  on public.call_sessions for select to authenticated
  using (true);
