-- Presence tracking and phone number for family members
ALTER TABLE family_memberships
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- Index for presence queries
CREATE INDEX IF NOT EXISTS family_memberships_last_seen_idx
  ON family_memberships (family_circle_id, last_seen_at DESC)
  WHERE last_seen_at IS NOT NULL;
