-- ============================================================
-- Kynfowk – Calls write policies
-- Migration: 005_calls_rls
-- ============================================================
-- Lets signed-in members schedule, update, and participate in calls
-- inside their own family. Read policies were added in 004_auth.sql.

create policy "members create calls in own family" on calls
  for insert
  with check (family_id = current_family_id());

create policy "members update calls in own family" on calls
  for update
  using (family_id = current_family_id());

create policy "members add participants to own family calls" on call_participants
  for insert
  with check (
    call_id in (select id from calls where family_id = current_family_id())
  );

create policy "members update participants in own family calls" on call_participants
  for update
  using (
    call_id in (select id from calls where family_id = current_family_id())
  );
