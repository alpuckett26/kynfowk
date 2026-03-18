-- Add placeholder / deceased / avatar support to family_memberships

ALTER TABLE family_memberships
  ADD COLUMN IF NOT EXISTS is_placeholder   BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_deceased      BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS placeholder_notes TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url       TEXT;

-- Allow public read of the member-avatars bucket via RLS (bucket created via dashboard or storage API)
-- Application layer handles upload → stores public URL in avatar_url.
