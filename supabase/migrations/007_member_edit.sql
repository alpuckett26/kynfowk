-- ============================================================
-- Kynfowk – Family member edit + remove
-- Migration: 007_member_edit
-- ============================================================
-- Lets any signed-in family member edit other members in the same
-- family, and remove invitees that haven't claimed yet.

-- Replace the narrow "members update own profile" policy with a
-- broader one scoped to the current family. The own-profile policy
-- still works because user_id = auth.uid() implies the row's
-- family_id = current_family_id() (assuming the user belongs to
-- exactly one family).
drop policy if exists "members update own profile" on family_members;

create policy "members update family members"
  on family_members
  for update
  using (family_id = current_family_id())
  with check (family_id = current_family_id());

-- DELETE only invitees (rows without user_id) — protects against
-- accidentally booting a real signed-in member, which would orphan
-- their auth.users row. Real members leaving the family is a
-- separate flow (TBD).
create policy "members remove unclaimed invitees"
  on family_members
  for delete
  using (
    family_id = current_family_id()
    and user_id is null
  );
